import java.io.File;
import java.io.OutputStream;
import java.io.PrintStream;
import java.lang.reflect.Field;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
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
            type == Byte.class || type == Short.class || type == Integer.class || type == Long.class;
    }

    private static Object value(Class<?> type, int variant) {
        if (type == byte.class || type == Byte.class) return Byte.valueOf((byte) (variant == 2 ? Byte.MAX_VALUE : variant));
        if (type == short.class || type == Short.class) return Short.valueOf((short) (variant == 2 ? Short.MAX_VALUE : variant));
        if (type == int.class || type == Integer.class) return Integer.valueOf(variant == 2 ? Integer.MAX_VALUE : variant);
        return Long.valueOf(variant == 2 ? Long.MAX_VALUE : variant);
    }

    private static Object anchor(Class<?> type, int anchor) {
        if (type == byte.class || type == Byte.class) return Byte.valueOf((byte) anchor);
        if (type == short.class || type == Short.class) return Short.valueOf((short) anchor);
        if (type == int.class || type == Integer.class) return Integer.valueOf(anchor);
        return Long.valueOf(anchor);
    }

    private static Long invoke(Method method, Object receiver, Object[] arguments) {
        try {
            Object result = method.invoke(receiver, arguments);
            if (result instanceof Byte || result instanceof Short || result instanceof Integer || result instanceof Long)
                return ((Number) result).longValue();
            return null;
        } catch (ReflectiveOperationException | IllegalArgumentException | LinkageError e) {
            return null;
        }
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
        int classes, methods, unsupported, abstained, unloadable, nestedSkipped;
        int comparableClasses, comparablePairs, comparableTriples, constructorAbstentions;

        String json(String artifactSha) {
            String status = methods == 0 && comparablePairs == 0 ? "INCOMPLETE_NO_SUPPORTED_METHODS" :
                (abstained > 0 || unloadable > 0 || unsupported > 0 || nestedSkipped > 0 || constructorAbstentions > 0 ? "PARTIAL_HYPOTHESES_REQUIRE_ORACLE" :
                    "HYPOTHESES_REQUIRE_ORACLE");
            return "{\"schema\":\"ultra-sentinel-generic-jvm-metamorphic/v1\"," +
                "\"status\":" + quoted(status) + ",\"artifactSha256\":" + quoted(artifactSha) +
                ",\"classesInspected\":" + classes + ",\"methodsProbed\":" + methods +
                ",\"unsupportedMethods\":" + unsupported + ",\"abstainedProbes\":" + abstained +
                ",\"unloadableClasses\":" + unloadable + ",\"nestedClassesSkipped\":" + nestedSkipped + ",\"findings\":[" +
                String.join(",", findings) + "],\"comparableClasses\":" + comparableClasses +
                ",\"comparablePairs\":" + comparablePairs + ",\"comparableTriples\":" + comparableTriples +
                ",\"constructorAbstentions\":" + constructorAbstentions +
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
    private static Integer order(Constructor<?> ctor, Object[] left, Object[] right) {
        try {
            Comparable<Object> a = (Comparable<Object>)ctor.newInstance(left);
            Object b = ctor.newInstance(right);
            return Integer.signum(a.compareTo(b));
        } catch (ReflectiveOperationException | RuntimeException | LinkageError e) {
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
            boolean reported = false;
            Integer[][] signs = new Integer[samples.size()][samples.size()];
            for (int a = 0; a < samples.size() && !reported; a++) {
                for (int b = a; b < samples.size(); b++) {
                    if (++result.comparablePairs > 50000) throw new IllegalStateException("COMPARABLE_PAIR_BUDGET");
                    Object[] x = samples.get(a), y = samples.get(b);
                    Integer xy = order(ctor, x, y), yx = order(ctor, y, x);
                    if (xy == null || yx == null || !xy.equals(order(ctor, x, y)) || !yx.equals(order(ctor, y, x))) {
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
            if (!reported) transitivity(type, ctor, samples, signs, result);
        }
    }

    private static void transitivity(Class<?> type, Constructor<?> ctor, List<Object[]> samples,
                                     Integer[][] signs, Result result) {
        for (int a = 0; a < samples.size(); a++) {
            for (int b = 0; b < samples.size(); b++) {
                if (signs[a][b] == null || signs[a][b] <= 0) continue;
                for (int c = 0; c < samples.size(); c++) {
                    if (++result.comparableTriples > 250000) throw new IllegalStateException("COMPARABLE_TRIPLE_BUDGET");
                    Integer bc = signs[b][c], ac = signs[a][c];
                    if (bc == null || ac == null || bc <= 0 || ac > 0) continue;
                    // Reconfirm all three edges with fresh receivers. A mutable or
                    // nondeterministic relation is an abstention, never a verdict.
                    if (!signs[a][b].equals(order(ctor, samples.get(a), samples.get(b))) ||
                        !bc.equals(order(ctor, samples.get(b), samples.get(c))) ||
                        !ac.equals(order(ctor, samples.get(a), samples.get(c)))) {
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

    private static void probe(Method method, Object receiver, String className, Result result) {
        Class<?>[] params = method.getParameterTypes();
        for (int position = 0; position < params.length; position++) {
            for (int fixed : params.length == 1 ? new int[]{1} : new int[]{1, 100}) {
                Long[] observations = new Long[3];
                boolean incomplete = false;
                for (int sample = 0; sample < 3; sample++) {
                    Object[] arguments = new Object[params.length];
                    for (int i = 0; i < arguments.length; i++) {
                        arguments[i] = i == position ? value(params[i], sample) : anchor(params[i], fixed);
                    }
                    Long first = invoke(method, receiver, arguments);
                    Long second = invoke(method, receiver, arguments);
                    if (first == null || !first.equals(second)) { incomplete = true; break; }
                    observations[sample] = first;
                }
                if (incomplete) { result.abstained++; continue; }
                long a = observations[0], b = observations[1], c = observations[2];
                if ((a < b && b > c) || (a > b && b < c)) {
                    if (result.findings.size() >= MAX_FINDINGS) throw new IllegalStateException("FINDING_BUDGET");
                    result.findings.add("{\"class\":" + quoted(className) + ",\"method\":" +
                        quoted(methodKey(method)) + ",\"argument\":" + position + ",\"otherArguments\":" + fixed +
                        ",\"inputs\":[\"0\",\"1\"," + quoted(value(params[position], 2).toString()) + "]" +
                        ",\"observed\":[" + quoted(Long.toString(a)) + "," + quoted(Long.toString(b)) +
                        "," + quoted(Long.toString(c)) + "],\"status\":\"HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE\"}");
                }
            }
        }
    }

    private static void inspect(Class<?> type, Result result) {
        comparable(type, result);
        Method[] methods;
        try { methods = type.getDeclaredMethods(); }
        catch (LinkageError | SecurityException e) { result.unloadable++; return; }
        Arrays.sort(methods, (a, b) -> methodKey(a).compareTo(methodKey(b)));
        for (Method method : methods) {
            Class<?>[] params = method.getParameterTypes();
            if (!Modifier.isPublic(method.getModifiers()) || method.isSynthetic() || !numeric(method.getReturnType()) ||
                params.length < 1 || params.length > 3 || Arrays.stream(params).anyMatch(p -> !numeric(p))) {
                result.unsupported++;
                continue;
            }
            Object receiver = null;
            if (!Modifier.isStatic(method.getModifiers())) {
                try {
                    Field field = type.getField("INSTANCE");
                    receiver = field.get(null);
                    if (!type.isInstance(receiver)) throw new IllegalAccessException("INVALID_INSTANCE");
                } catch (ReflectiveOperationException | LinkageError | RuntimeException e) {
                    result.abstained++;
                    continue;
                }
            }
            if (++result.methods > MAX_METHODS) throw new IllegalStateException("METHOD_BUDGET");
            probe(method, receiver, type.getName(), result);
        }
    }

    public static void main(String[] args) {
        PrintStream output = System.out;
        try {
            if (args.length != 2 || !args[1].matches("[A-Za-z_][A-Za-z0-9_]*(\\.[A-Za-z_][A-Za-z0-9_]*)+"))
                throw new IllegalArgumentException("INPUT");
            File jar = new File(args[0]);
            if (Files.isSymbolicLink(jar.toPath()) || !Files.isRegularFile(jar.toPath()) ||
                jar.length() < 4 || jar.length() > MAX_JAR_BYTES) throw new IllegalArgumentException("JAR");
            String digest = sha256(jar), prefix = args[1].replace('.', '/') + "/";
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
                    if (!name.endsWith(".class") || !name.startsWith(prefix)) continue;
                    String className = name.substring(0, name.length() - 6).replace('/', '.');
                    if (!className.matches("[A-Za-z_][A-Za-z0-9_.$]*")) { result.unloadable++; continue; }
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
