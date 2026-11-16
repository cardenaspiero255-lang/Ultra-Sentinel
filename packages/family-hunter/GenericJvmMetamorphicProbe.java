import java.io.File;
import java.io.OutputStream;
import java.io.PrintStream;
import java.lang.reflect.Field;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Array;
import java.lang.reflect.Type;
import java.lang.reflect.ParameterizedType;
import java.util.Collection;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

/**
 * Bounded, source-agnostic behavioral hypotheses for numeric JVM APIs.
 * Run only in the caller's no-network sandbox with a time and memory budget.
 * A turning point is not necessarily a defect: intended nonmonotonic functions
 * and stateful APIs must be adjudicated with an independent original oracle.
 */
public final class GenericJvmMetamorphicProbe {
    private static final int MAX_CLASSES = 256;
    private static final int MAX_METHODS = 512;
    private static final int MAX_FINDINGS = 256;
    private static final long MAX_JAR_BYTES = 32L * 1024 * 1024;

    private static boolean numeric(Class<?> type) {
        return type == byte.class || type == short.class || type == int.class || type == long.class ||
            type == Byte.class || type == Short.class || type == Integer.class || type == Long.class ||
            type == double.class || type == Double.class || type == float.class || type == Float.class;
    }

    private static Object value(Class<?> type, int variant) {
        if (type == double.class || type == Double.class)
            return new double[]{0.0, 1.0, Double.MAX_VALUE}[variant];
        if (type == byte.class || type == Byte.class) return Byte.valueOf((byte) (variant == 2 ? Byte.MAX_VALUE : variant));
        if (type == short.class || type == Short.class) return Short.valueOf((short) (variant == 2 ? Short.MAX_VALUE : variant));
        if (type == int.class || type == Integer.class) return Integer.valueOf(variant == 2 ? Integer.MAX_VALUE : variant);
        return Long.valueOf(variant == 2 ? Long.MAX_VALUE : variant);
    }

    private static Object anchor(Class<?> type, int anchor) {
        if (type == double.class || type == Double.class) return Double.valueOf(anchor);
        if (type == float.class || type == Float.class) return Float.valueOf(anchor);
        if (type == byte.class || type == Byte.class) return Byte.valueOf((byte) anchor);
        if (type == short.class || type == Short.class) return Short.valueOf((short) anchor);
        if (type == int.class || type == Integer.class) return Integer.valueOf(anchor);
        return Long.valueOf(anchor);
    }

    // Only exact, proven numeric element types are admitted. Erased/raw,
    // wildcard, nested and application-specific containers abstain.
    private static Class<?> element(Class<?> raw, Type generic) {
        if (raw.isArray() && raw.getComponentType().isPrimitive() && numeric(raw.getComponentType()))
            return raw.getComponentType();
        if ((raw == List.class || raw == Collection.class || raw == Iterable.class) &&
            generic instanceof ParameterizedType p && p.getActualTypeArguments().length == 1 &&
            p.getActualTypeArguments()[0] instanceof Class<?> item && numeric(item)) return item;
        return null;
    }

    private static Object argument(Class<?> raw, Type generic, int sample, int fixed, int band, boolean varying) {
        if (raw == String.class) {
            if (!varying) return fixed == 100 ? "aa" : "a";
            // Stable, bounded ASCII strings: length and lexical bands are hypotheses, not ground truth.
            return new String[][]{{"", "a", "aaa"}, {"a", "aa", "aaa"}}[band][sample];
        }
        if (numeric(raw)) {
            if (!varying) return anchor(raw, fixed);
            if (raw == double.class || raw == Double.class) {
                return new double[][]{{0, 1, Double.MAX_VALUE}, {0, .5, 1}, {-1, 0, 1}}[band][sample];
            }
            if (raw == float.class || raw == Float.class) {
                return new float[][]{{0f, 1f, Float.MAX_VALUE}, {0f, .5f, 1f}, {-1f, 0f, 1f}}[band][sample];
            }
            return value(raw, sample);
        }
        Class<?> item = element(raw, generic);
        int size = varying ? (band == 0 ? new int[]{0, 1, 3} : new int[]{1, 2, 3})[sample] : 1;
        Object array = raw.isArray() ? Array.newInstance(item, size) : null;
        List<Object> list = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            Object value = anchor(item, i);
            if (array != null) Array.set(array, i, value); else list.add(value);
        }
        return array != null ? array : list;
    }

    private static Number invoke(Method method, Object receiver, Constructor<?> ctor, Object[] seed,
                                 int position, int fixed, int band, int sample, Result result) {
        if (++result.invocations > 80000) throw new IllegalStateException("INVOCATION_BUDGET");
        try {
            Class<?>[] params = method.getParameterTypes();
            Type[] generic = method.getGenericParameterTypes();
            Object[] args = new Object[params.length];
            for (int i = 0; i < args.length; i++)
                args[i] = argument(params[i], generic[i], sample, fixed, band, i == position);
            // Ordinary objects and mutable inputs are recreated for EVERY call.
            // Singleton methods retain the existing repeated-call stability check.
            Object target = ctor == null ? receiver : ctor.newInstance(seed);
            Object value = method.invoke(target, args);
            if (value instanceof Double d) {
                if (!Double.isFinite(d)) return null;
                result.successfulInvocations++;
                return d;
            }
            if (value instanceof Float f) {
                if (!Float.isFinite(f)) return null;
                result.successfulInvocations++;
                return Double.valueOf(f.doubleValue());
            }
            if (value instanceof Byte || value instanceof Short || value instanceof Integer || value instanceof Long) {
                result.successfulInvocations++;
                return ((Number) value).longValue();
            }
            return null;
        } catch (ReflectiveOperationException | RuntimeException | LinkageError e) {
            return null;
        }
    }

    private static int compare(Number left, Number right) {
        if (left instanceof Double || right instanceof Double) {
            double a = left.doubleValue(), b = right.doubleValue();
            return a < b ? -1 : a > b ? 1 : 0;
        }
        return Long.compare(left.longValue(), right.longValue());
    }

    private static String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (var stream = Files.newInputStream(file.toPath())) {
            byte[] buffer = new byte[8192];
            for (int n; (n = stream.read(buffer)) != -1;) digest.update(buffer, 0, n);
        }
        StringBuilder out = new StringBuilder();
        for (byte b : digest.digest()) out.append(String.format("%02x", b & 0xff));
        return out.toString();
    }

    private static String methodKey(Method method) {
        StringBuilder out = new StringBuilder(method.getName()).append('(');
        for (Class<?> type : method.getParameterTypes()) out.append(type.getName()).append(';');
        return out.append(')').append(method.getReturnType().getName()).toString();
    }

    private static String quoted(String value) {
        StringBuilder out = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == '"' || c == '\\') out.append('\\').append(c);
            else if (c < 32) out.append(String.format("\\u%04x", (int) c));
            else out.append(c);
        }
        return out.append('"').toString();
    }

    private static final class Result {
        final List<String> findings = new ArrayList<>();
        int classes, methods, unsupported, abstained, unloadable, nestedSkipped, invocations;
        int candidates, completedTriples, successfulInvocations, doubleMethods, floatMethods, structuredMethods, instanceMethods;
        int comparableClasses, comparablePairs, comparableTriples, constructorAbstentions;
        int objectContractClasses, objectContractPairs, objectContractAbstentions;

        String json(String artifactSha) {
            String status = methods == 0 && comparablePairs == 0 && objectContractPairs == 0 ? "INCOMPLETE_NO_SUPPORTED_METHODS" :
                (abstained > 0 || unloadable > 0 || unsupported > 0 || nestedSkipped > 0 || constructorAbstentions > 0 || objectContractAbstentions > 0 ? "PARTIAL_HYPOTHESES_REQUIRE_ORACLE" :
                    "HYPOTHESES_REQUIRE_ORACLE");
            return "{\"schema\":\"ultra-sentinel-generic-jvm-metamorphic/v1\"," +
                "\"status\":" + quoted(status) + ",\"artifactSha256\":" + quoted(artifactSha) +
                ",\"classesInspected\":" + classes + ",\"methodsProbed\":" + methods +
                ",\"methodCandidates\":" + candidates + ",\"completedTriples\":" + completedTriples +
                ",\"successfulInvocations\":" + successfulInvocations + ",\"doubleMethodsExercised\":" + doubleMethods +
                ",\"floatMethodsExercised\":" + floatMethods +
                ",\"structuredMethodsExercised\":" + structuredMethods + ",\"instanceMethodsExercised\":" + instanceMethods +
                ",\"unsupportedMethods\":" + unsupported + ",\"abstainedProbes\":" + abstained +
                ",\"unloadableClasses\":" + unloadable + ",\"nestedClassesSkipped\":" + nestedSkipped + ",\"findings\":[" +
                String.join(",", findings) + "],\"comparableClasses\":" + comparableClasses +
                ",\"comparablePairs\":" + comparablePairs + ",\"comparableTriples\":" + comparableTriples +
                ",\"constructorAbstentions\":" + constructorAbstentions +
                ",\"objectContractClasses\":" + objectContractClasses +
                ",\"objectContractPairs\":" + objectContractPairs +
                ",\"objectContractAbstentions\":" + objectContractAbstentions +
                ",\"sourceAuthenticated\":false," +
                "\"oracleVerified\":false,\"novelFamilyVerified\":false," +
                "\"repairAuthorized\":false,\"remoteWrites\":false,\"mergeAllowed\":false}";
        }
    }

    // Interface law, independent of a project's names, implementation or oracle:
    // https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Comparable.html#compareTo(T)
    // No target constructors or expected answers are supplied by the caller.
    private static boolean constructible(Class<?> type) {
        return numeric(type) || type == String.class;
    }

    private static Object boundary(Class<?> type, int index) {
        if (type == double.class || type == Double.class)
            return new double[]{-Double.MAX_VALUE, -1, -.5, 0, .5, 1, Double.MAX_VALUE, Double.MIN_NORMAL, Double.MIN_VALUE}[index];
        if (type == float.class || type == Float.class)
            return new float[]{-Float.MAX_VALUE, -1f, -.5f, 0f, .5f, 1f, Float.MAX_VALUE, Float.MIN_NORMAL, Float.MIN_VALUE}[index];
        if (type == String.class) return new String[]{"", "a", "b", "\ud83d\ude00", "aa", "z", "\uffff"}[index];
        long max = type == byte.class || type == Byte.class ? Byte.MAX_VALUE :
            type == short.class || type == Short.class ? Short.MAX_VALUE :
            type == int.class || type == Integer.class ? Integer.MAX_VALUE : Long.MAX_VALUE;
        long n = new long[]{-max - 1, -max, -1, 0, 1, max - 1, max,
            Math.max(-max - 1, Integer.MIN_VALUE), Math.min(max, Integer.MAX_VALUE)}[index];
        if (type == byte.class || type == Byte.class) return Byte.valueOf((byte)n);
        if (type == short.class || type == Short.class) return Short.valueOf((short)n);
        if (type == int.class || type == Integer.class) return Integer.valueOf((int)n);
        return Long.valueOf(n);
    }

    @SuppressWarnings("unchecked")
    private static Integer order(Object left, Object right) {
        try {
            return Integer.signum(((Comparable<Object>)left).compareTo(right));
        } catch (RuntimeException | LinkageError e) {
            return null;
        }
    }

    private static String vector(Object[] values) {
        List<String> strings = new ArrayList<>();
        for (Object item : values) strings.add(quoted(item.toString()));
        return "[" + String.join(",", strings) + "]";
    }

    private static void comparable(Class<?> type, Result result) {
        if (!Comparable.class.isAssignableFrom(type) || type.isInterface() ||
            Modifier.isAbstract(type.getModifiers())) return;
        result.comparableClasses++;
        Constructor<?>[] constructors = type.getConstructors();
        Arrays.sort(constructors, (a, b) -> a.toString().compareTo(b.toString()));
        if (constructors.length > 32) throw new IllegalStateException("CONSTRUCTOR_BUDGET");
        if (constructors.length == 0) result.constructorAbstentions++;
        for (Constructor<?> ctor : constructors) {
            Class<?>[] params = ctor.getParameterTypes();
            if (params.length < 1 || params.length > 3 || Arrays.stream(params).anyMatch(p -> !constructible(p))) {
                result.constructorAbstentions++;
                continue;
            }
            List<Object[]> samples = new ArrayList<>();
            for (int axis = 0; axis < params.length; axis++) {
                for (int k = 0; k < (params[axis] == String.class ? 7 : 9); k++) {
                    Object[] args = new Object[params.length];
                    for (int i = 0; i < params.length; i++) args[i] = boundary(params[i], i == axis ? k : 3);
                    samples.add(args);
                }
            }
            // Ordering laws quantify over the SAME objects, not just matching
            // constructor arguments. Constructors may assign unique state.
            List<Object> receivers = new ArrayList<>();
            for (Object[] args : samples) {
                try { receivers.add(ctor.newInstance(args)); }
                catch (ReflectiveOperationException | RuntimeException | LinkageError e) {
                    receivers.add(null);
                    result.constructorAbstentions++;
                }
            }
            boolean reported = false;
            Integer[][] signs = new Integer[samples.size()][samples.size()];
            for (int a = 0; a < samples.size() && !reported; a++) {
                for (int b = a; b < samples.size(); b++) {
                    if (++result.comparablePairs > 50000) throw new IllegalStateException("COMPARABLE_PAIR_BUDGET");
                    Object[] x = samples.get(a), y = samples.get(b);
                    Object left = receivers.get(a), right = receivers.get(b);
                    if (left == null || right == null) { result.abstained++; continue; }
                    Integer xy = order(left, right), yx = order(right, left);
                    if (xy == null || yx == null || !xy.equals(order(left, right)) || !yx.equals(order(right, left))) {
                        result.abstained++;
                        continue;
                    }
                    signs[a][b] = xy;
                    signs[b][a] = yx;
                    if (xy != -yx) {
                        if (result.findings.size() >= MAX_FINDINGS) throw new IllegalStateException("FINDING_BUDGET");
                        result.findings.add("{\"rule\":\"COMPARABLE_ANTISYMMETRY_VIOLATION\",\"class\":" +
                            quoted(type.getName()) + ",\"constructor\":" +
                            vector(Arrays.stream(params).map(Class::getName).toArray()) +
                            ",\"left\":" + vector(x) + ",\"right\":" + vector(y) +
                            ",\"observedSigns\":[" + xy + "," + yx +
                            "],\"status\":\"HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE\"}");
                        reported = true;
                        break;
                    }
                }
            }
            if (!reported) transitivity(type, ctor, samples, receivers, signs, result);
        }
    }

    private static void transitivity(Class<?> type, Constructor<?> ctor, List<Object[]> samples,
                                     List<Object> receivers, Integer[][] signs, Result result) {
        for (int a = 0; a < samples.size(); a++) {
            for (int b = 0; b < samples.size(); b++) {
                if (signs[a][b] == null || signs[a][b] <= 0) continue;
                for (int c = 0; c < samples.size(); c++) {
                    if (++result.comparableTriples > 250000) throw new IllegalStateException("COMPARABLE_TRIPLE_BUDGET");
                    Integer bc = signs[b][c], ac = signs[a][c];
                    if (bc == null || ac == null || bc <= 0 || ac > 0) continue;
                    // Reconfirm all three edges on the same triple. A mutable or
                    // nondeterministic relation is an abstention, never a verdict.
                    if (!signs[a][b].equals(order(receivers.get(a), receivers.get(b))) ||
                        !bc.equals(order(receivers.get(b), receivers.get(c))) ||
                        !ac.equals(order(receivers.get(a), receivers.get(c)))) {
                        result.abstained++;
                        continue;
                    }
                    if (result.findings.size() >= MAX_FINDINGS) throw new IllegalStateException("FINDING_BUDGET");
                    result.findings.add("{\"rule\":\"COMPARABLE_TRANSITIVITY_VIOLATION\",\"class\":" +
                        quoted(type.getName()) + ",\"constructor\":" +
                        vector(Arrays.stream(ctor.getParameterTypes()).map(Class::getName).toArray()) +
                        ",\"left\":" + vector(samples.get(a)) + ",\"middle\":" + vector(samples.get(b)) +
                        ",\"right\":" + vector(samples.get(c)) + ",\"observedSigns\":[1," + bc + "," + ac +
                        "],\"status\":\"HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE\"}");
                    return;
                }
            }
        }
    }


    // These JVM equality laws are hypotheses until an independent oracle verifies them.
    // The probe remains source-agnostic, bounded and sandbox-only.
    private static Boolean stableEquals(Object left, Object right, Result result) {
        try {
            boolean first = left.equals(right), second = left.equals(right);
            if (first == second) return Boolean.valueOf(first);
        } catch (RuntimeException | LinkageError ignored) {
            // Target exceptions cannot become findings.
        }
        result.objectContractAbstentions++;
        return null;
    }

    private static Integer stableHash(Object receiver, Result result) {
        try {
            int first = receiver.hashCode(), second = receiver.hashCode();
            if (first == second) return Integer.valueOf(first);
        } catch (RuntimeException | LinkageError ignored) {
            // A throwing or unstable hash is an abstention.
        }
        result.objectContractAbstentions++;
        return null;
    }

    private static void objectFinding(Result result, String rule, Class<?> type,
                                      Constructor<?> ctor, Object[] left, Object[] right, String observed) {
        if (result.findings.size() >= MAX_FINDINGS) throw new IllegalStateException("FINDING_BUDGET");
        result.findings.add("{\"rule\":" + quoted(rule) + ",\"class\":" + quoted(type.getName()) +
            ",\"constructor\":" + vector(Arrays.stream(ctor.getParameterTypes()).map(Class::getName).toArray()) +
            ",\"left\":" + vector(left) + ",\"right\":" + vector(right) +
            ",\"observed\":" + observed + ",\"status\":\"HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE\"}");
    }

    private static void objectContracts(Class<?> type, Result result) {
        if (type.isInterface() || Modifier.isAbstract(type.getModifiers())) return;
        try {
            // Inherited Object.equals is already known to satisfy the interface law.
            if (type.getMethod("equals", Object.class).getDeclaringClass() == Object.class) return;
        } catch (NoSuchMethodException | SecurityException e) {
            result.objectContractAbstentions++;
            return;
        }
        result.objectContractClasses++;
        Constructor<?>[] constructors = type.getConstructors();
        Arrays.sort(constructors, (a, b) -> a.toString().compareTo(b.toString()));
        if (constructors.length > 32) throw new IllegalStateException("CONSTRUCTOR_BUDGET");
        boolean[] reported = new boolean[3]; // reflexivity, symmetry, hash
        for (Constructor<?> ctor : constructors) {
            Class<?>[] types = ctor.getParameterTypes();
            if (types.length > 3 || Arrays.stream(types).anyMatch(t -> !constructible(t))) {
                result.objectContractAbstentions++;
                continue;
            }
            List<Object[]> samples = new ArrayList<>();
            if (types.length == 0) samples.add(new Object[0]);
            else for (int axis = 0; axis < types.length; axis++) {
                for (int index : new int[]{3, 4, 6}) {
                    Object[] args = new Object[types.length];
                    for (int i = 0; i < types.length; i++)
                        args[i] = boundary(types[i], i == axis ? index : 3);
                    samples.add(args);
                }
            }
            List<Object> receivers = new ArrayList<>(), twins = new ArrayList<>();
            for (Object[] args : samples) {
                try {
                    receivers.add(ctor.newInstance(args));
                    twins.add(ctor.newInstance(args));
                } catch (ReflectiveOperationException | RuntimeException | LinkageError e) {
                    receivers.add(null);
                    twins.add(null);
                    result.objectContractAbstentions++;
                }
            }
            for (int a = 0; a < samples.size(); a++) {
                Object left = receivers.get(a), twin = twins.get(a);
                if (left == null || twin == null) continue;
                if (++result.objectContractPairs > 30000) throw new IllegalStateException("OBJECT_PAIR_BUDGET");
                Boolean reflexive = stableEquals(left, left, result);
                if (!reported[0] && Boolean.FALSE.equals(reflexive) &&
                    Boolean.FALSE.equals(stableEquals(left, left, result))) {
                    objectFinding(result, "OBJECT_EQUALS_REFLEXIVITY_VIOLATION", type, ctor,
                        samples.get(a), samples.get(a), "[false,false]");
                    reported[0] = true;
                }
                Boolean forward = stableEquals(left, twin, result);
                Boolean reverse = stableEquals(twin, left, result);
                if (forward != null && reverse != null) {
                    if (!reported[1] && !forward.equals(reverse) &&
                        forward.equals(stableEquals(left, twin, result)) &&
                        reverse.equals(stableEquals(twin, left, result))) {
                        objectFinding(result, "OBJECT_EQUALS_SYMMETRY_VIOLATION", type, ctor,
                            samples.get(a), samples.get(a), "[" + forward + "," + reverse + "]");
                        reported[1] = true;
                    } else if (!reported[2] && forward && reverse) {
                        Integer x = stableHash(left, result), y = stableHash(twin, result);
                        if (x != null && y != null && !x.equals(y) &&
                            Boolean.TRUE.equals(stableEquals(left, twin, result)) &&
                            Boolean.TRUE.equals(stableEquals(twin, left, result))) {
                            objectFinding(result, "OBJECT_EQUALS_HASHCODE_VIOLATION", type, ctor,
                                samples.get(a), samples.get(a), "[" + x + "," + y + "]");
                            reported[2] = true;
                        }
                    }
                }
                for (int b = a + 1; b < samples.size() && !reported[1]; b++) {
                    Object right = receivers.get(b);
                    if (right == null) continue;
                    if (++result.objectContractPairs > 30000) throw new IllegalStateException("OBJECT_PAIR_BUDGET");
                    Boolean ab = stableEquals(left, right, result);
                    Boolean ba = stableEquals(right, left, result);
                    if (ab != null && ba != null && !ab.equals(ba) &&
                        ab.equals(stableEquals(left, right, result)) &&
                        ba.equals(stableEquals(right, left, result))) {
                        objectFinding(result, "OBJECT_EQUALS_SYMMETRY_VIOLATION", type, ctor,
                            samples.get(a), samples.get(b), "[" + ab + "," + ba + "]");
                        reported[1] = true;
                    }
                }
            }
        }
    }

    private static void probe(Method method, Object receiver, Constructor<?> ctor, Object[] seed,
                              String className, Result result) {
        Class<?>[] params = method.getParameterTypes();
        Type[] generic = method.getGenericParameterTypes();
        for (int position = 0; position < params.length; position++) {
            int bands = params[position] == double.class || params[position] == Double.class ||
                params[position] == float.class || params[position] == Float.class ? 3 :
                (numeric(params[position]) ? 1 : 2);
            for (int band = 0; band < bands; band++) {
                for (int fixed : params.length == 1 ? new int[]{1} : new int[]{1, 100}) {
                    Number[] observations = new Number[3];
                    List<String> inputs = new ArrayList<>();
                    boolean incomplete = false;
                    for (int sample = 0; sample < 3; sample++) {
                        Number first = invoke(method, receiver, ctor, seed, position, fixed, band, sample, result);
                        Number second = invoke(method, receiver, ctor, seed, position, fixed, band, sample, result);
                        if (first == null || !first.equals(second)) { incomplete = true; break; }
                        observations[sample] = first;
                        Object input = argument(params[position], generic[position], sample, fixed, band, true);
                        inputs.add(quoted(numeric(params[position]) || params[position] == String.class ?
                            input.toString() :
                            "size=" + (band == 0 ? new int[]{0, 1, 3} : new int[]{1, 2, 3})[sample] + ";values=0..size-1"));
                    }
                    if (incomplete) { result.abstained++; continue; }
                    result.completedTriples++;
                    int ab = compare(observations[0], observations[1]), bc = compare(observations[1], observations[2]);
                    if ((ab < 0 && bc > 0) || (ab > 0 && bc < 0)) {
                        if (result.findings.size() >= MAX_FINDINGS) throw new IllegalStateException("FINDING_BUDGET");
                        String constructor = ctor == null ? "" : ",\"constructor\":" +
                            vector(Arrays.stream(ctor.getParameterTypes()).map(Class::getName).toArray()) +
                            ",\"constructorArguments\":" + vector(seed);
                        result.findings.add("{\"class\":" + quoted(className) + ",\"method\":" +
                            quoted(methodKey(method)) + ",\"argument\":" + position + ",\"otherArguments\":" + fixed +
                            constructor + ",\"inputs\":[" + String.join(",", inputs) + "]" +
                            ",\"observed\":" + vector(observations) +
                            ",\"status\":\"HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE\"}");
                    }
                }
            }
        }
    }

    private static void instanceProbe(Class<?> type, Method method, Result result) {
        Field field;
        try { field = type.getField("INSTANCE"); }
        catch (NoSuchFieldException absent) { field = null; }
        // An unrelated public INSTANCE field must not mask ordinary receivers.
        // Kotlin singleton fields are static and have the declaring object type.
        if (field != null && (!Modifier.isStatic(field.getModifiers()) ||
            !type.isAssignableFrom(field.getType()))) field = null;
        if (field != null) {
            Object receiver;
            try {
                receiver = field.get(null);
                if (!type.isInstance(receiver)) throw new IllegalAccessException("INVALID_INSTANCE");
            } catch (ReflectiveOperationException | RuntimeException | LinkageError e) {
                result.abstained++;
                return;
            }
            // Global probe budget failures must escape the receiver lookup.
            probe(method, receiver, null, null, type.getName(), result);
            return;
        }
        Constructor<?>[] constructors = type.getConstructors();
        Arrays.sort(constructors, (a, b) -> a.toString().compareTo(b.toString()));
        if (constructors.length > 32) throw new IllegalStateException("CONSTRUCTOR_BUDGET");
        boolean admitted = false;
        for (Constructor<?> ctor : constructors) {
            Class<?>[] types = ctor.getParameterTypes();
            if (types.length > 3 || Arrays.stream(types).anyMatch(p -> !constructible(p))) {
                result.constructorAbstentions++;
                continue;
            }
            admitted = true;
            for (int fixed : types.length == 0 ? new int[]{0} : new int[]{-1, 0, 1, 100}) {
                Object[] seed = new Object[types.length];
                for (int i = 0; i < seed.length; i++)
                    seed[i] = types[i] == String.class ? (fixed == 0 ? "" : "a") : anchor(types[i], fixed);
                probe(method, null, ctor, seed, type.getName(), result);
            }
        }
        if (!admitted) result.constructorAbstentions++;
    }

    private static void inspect(Class<?> type, Result result) {
        comparable(type, result);
        objectContracts(type, result);
        Method[] methods;
        try { methods = type.getDeclaredMethods(); }
        catch (LinkageError | SecurityException e) { result.unloadable++; return; }
        Arrays.sort(methods, (a, b) -> methodKey(a).compareTo(methodKey(b)));
        for (Method method : methods) {
            Class<?>[] params = method.getParameterTypes();
            Type[] generic;
            try { generic = method.getGenericParameterTypes(); }
            catch (TypeNotPresentException | java.lang.reflect.MalformedParameterizedTypeException |
                   java.lang.reflect.GenericSignatureFormatError e) {
                result.unsupported++;
                continue;
            }
            boolean supported = Modifier.isPublic(method.getModifiers()) && !method.isSynthetic() &&
                numeric(method.getReturnType()) && params.length >= 1 && params.length <= 3;
            for (int i = 0; i < params.length && supported; i++)
                supported = numeric(params[i]) || params[i] == String.class ||
                    element(params[i], generic[i]) != null;
            if (!supported) { result.unsupported++; continue; }
            if (++result.candidates > MAX_METHODS) throw new IllegalStateException("METHOD_BUDGET");
            int before = result.completedTriples;
            if (Modifier.isStatic(method.getModifiers())) probe(method, null, null, null, type.getName(), result);
            else instanceProbe(type, method, result);
            if (result.completedTriples > before) {
                result.methods++;
                if (!Modifier.isStatic(method.getModifiers())) result.instanceMethods++;
                if (method.getReturnType() == double.class || method.getReturnType() == Double.class ||
                    Arrays.stream(params).anyMatch(p -> p == double.class || p == Double.class)) result.doubleMethods++;
                if (method.getReturnType() == float.class || method.getReturnType() == Float.class ||
                    Arrays.stream(params).anyMatch(p -> p == float.class || p == Float.class ||
                        (p.isArray() && p.getComponentType() == float.class))) result.floatMethods++;
                if (Arrays.stream(params).anyMatch(p -> !numeric(p))) result.structuredMethods++;
            }
        }
    }

    private static boolean identifier(String name) {
        if (name.isEmpty()) return false;
        int offset = 0, cp = name.codePointAt(0);
        if (!Character.isJavaIdentifierStart(cp)) return false;
        while (offset < name.length()) {
            cp = name.codePointAt(offset);
            if (!Character.isJavaIdentifierPart(cp) || Character.isIdentifierIgnorable(cp)) return false;
            offset += Character.charCount(cp);
        }
        return true;
    }

    private static boolean qualified(String name) {
        if (name.length() > 500) return false;
        for (String part : name.split("\\.", -1)) if (!identifier(part)) return false;
        return true;
    }

    public static void main(String[] args) {
        PrintStream output = System.out;
        try {
            if (args.length != 2 || !(args[1].equals(".") || qualified(args[1])))
                throw new IllegalArgumentException("INPUT");
            File jar = new File(args[0]);
            if (Files.isSymbolicLink(jar.toPath()) || !Files.isRegularFile(jar.toPath()) ||
                jar.length() < 4 || jar.length() > MAX_JAR_BYTES) throw new IllegalArgumentException("JAR");
            String digest = sha256(jar), prefix = args[1].equals(".") ? "" : args[1].replace('.', '/') + "/";
            Result result = new Result();
            System.setOut(new PrintStream(OutputStream.nullOutputStream()));
            try (JarFile archive = new JarFile(jar); URLClassLoader loader = new URLClassLoader(
                new URL[]{jar.toURI().toURL()}, ClassLoader.getPlatformClassLoader())) {
                List<String> classes = new ArrayList<>();
                Enumeration<JarEntry> entries = archive.entries();
                int visited = 0;
                while (entries.hasMoreElements()) {
                    String name = entries.nextElement().getName();
                    if (++visited > 50000) throw new IllegalStateException("ENTRY_BUDGET");
                    if (!name.endsWith(".class") || !name.startsWith(prefix) || (prefix.isEmpty() && name.contains("/"))) continue;
                    String className = name.substring(0, name.length() - 6).replace('/', '.');
                    if (!qualified(className)) { result.unloadable++; continue; }
                    if (classes.size() >= MAX_CLASSES) throw new IllegalStateException("CLASS_BUDGET");
                    classes.add(className);
                }
                Collections.sort(classes);
                for (int i = 1; i < classes.size(); i++) {
                    if (classes.get(i).equals(classes.get(i - 1))) throw new IllegalStateException("DUPLICATE_CLASS");
                }
                for (String name : classes) {
                    try {
                        Class<?> type = Class.forName(name, false, loader);
                        if (name.contains("$") && !Comparable.class.isAssignableFrom(type)) { result.nestedSkipped++; continue; }
                        result.classes++;
                        inspect(type, result);
                    } catch (ClassNotFoundException | LinkageError | SecurityException e) { result.unloadable++; }
                }
            }
            if (!digest.equals(sha256(jar))) throw new IllegalStateException("ARTIFACT_CHANGED");
            output.println(result.json(digest));
        } catch (Exception | LinkageError e) {
            System.err.println("GENERIC_JVM_PROBE_BLOCKED");
            System.exit(2);
        }
    }
}
