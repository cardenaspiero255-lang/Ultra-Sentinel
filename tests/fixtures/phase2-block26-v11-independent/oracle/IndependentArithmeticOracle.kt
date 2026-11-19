package oracle

import java.lang.reflect.Modifier

// Retrospective target re-execution for the already precommitted DHash
// source contract. Never loads Hunter's predictions or ground-truth labels.
// This does NOT retroactively turn the v11 oracle into a pre-Hunter oracle.
private fun q(s: String): String = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

fun main() {
    val original = Class.forName("DHash")
    val methods = original.declaredMethods.filter { method ->
        Modifier.isPublic(method.modifiers) &&
            Modifier.isStatic(method.modifiers) &&
            !method.isSynthetic &&
            method.name.matches(Regex("distanceTo-[A-Za-z0-9_-]{1,30}")) &&
            method.returnType == Int::class.javaPrimitiveType &&
            method.parameterTypes.toList() == listOf(
                Long::class.javaPrimitiveType, Long::class.javaPrimitiveType)
    }
    check(methods.size == 1) { "ORIGINAL_DHASH_AMBIGUOUS_PUBLIC_METHOD" }
    val method = methods.single()
    val fixedValues = listOf(1L, 100L)
    // Precommitted source contract is defined over the entire signed 64-bit
    // domain; these are fixed reference samples, not findings from Hunter.
    val varied = listOf(0L, 1L, 2L, 3L, -1L, Long.MAX_VALUE)
    val observations = mutableListOf<String>()
    var mismatches = 0
    for (position in 0..1) for (fixed in fixedValues) for (value in varied) {
        val first = if (position == 0) value else fixed
        val second = if (position == 1) value else fixed
        val reference = java.lang.Long.bitCount(first xor second)
        val actual = (method.invoke(null, first, second) as Number).toInt()
        if (actual != reference) mismatches++
        observations.add(
            "{\"class\":\"DHash\"," +
                "\"method\":" + q(method.name + "(long;long;)int") + "," +
                "\"arguments\":[" + q(first.toString()) + "," + q(second.toString()) + "]," +
                "\"actual\":" + q(actual.toString()) + "," +
                "\"expected\":" + q(reference.toString()) + "}"
        )
    }
    println(
        "{\"schema\":\"ultra-sentinel-v11-independent-dhash-replay/v1\"," +
            "\"originalSourceExecuted\":true," +
            "\"hunterPredictionsAccessible\":false," +
            "\"wholeCohortTruth\":false," +
            "\"observationsCount\":" + observations.size + "," +
            "\"referenceMismatches\":" + mismatches + "," +
            "\"observations\":[" + observations.joinToString(",") + "]}"
    )
}
