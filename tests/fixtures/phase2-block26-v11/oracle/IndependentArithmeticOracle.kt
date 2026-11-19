package oracle

import java.lang.reflect.Method
import java.lang.reflect.Modifier
import java.nio.ByteBuffer
import java.nio.ByteOrder

// Independent original Kotlin oracles, committed BEFORE opening the original
// frozen Hunter report artifact. No predictions, labels or repairs are inputs.
private fun q(value: String): String = "\"" + value.replace("\\", "\\\\")
    .replace("\"", "\\\"").replace("\r", "\\r").replace("\n", "\\n") + "\""

private fun methodKey(method: Method): String =
    method.name + "(" + method.parameterTypes.joinToString("") { it.name + ";" } +
        ")" + method.returnType.name

private fun row(
    original: String, method: Method, args: List<String>, actual: Long, expected: Long,
    contract: String, defectEligible: Boolean
): String =
    "{\"class\":" + q(original) + ",\"method\":" + q(methodKey(method)) +
        ",\"arguments\":[" + args.joinToString(",") { q(it) } + "]" +
        ",\"actual\":" + q(actual.toString()) + ",\"expected\":" + q(expected.toString()) +
        ",\"tolerance\":\"0\",\"contract\":" + q(contract) +
        ",\"defectEligible\":" + defectEligible + "}"

private fun acceptedMethod(method: Method, pattern: Regex, params: List<Class<*>>, result: Class<*>): Boolean =
    Modifier.isPublic(method.modifiers) && Modifier.isStatic(method.modifiers) &&
        pattern.matches(method.name) && method.parameterTypes.toList() == params &&
        method.returnType == result

private val inputs = listOf(Long.MIN_VALUE, -1L, 0L, 1L, 2L, 3L, 100L, Long.MAX_VALUE)

private fun dhashRows(): List<String> {
    val type = Class.forName("DHash")
    val methods = type.declaredMethods.toList()
    val distance = methods.singleOrNull {
        acceptedMethod(it, Regex("distanceTo-[A-Za-z0-9]+"),
            listOf(java.lang.Long.TYPE, java.lang.Long.TYPE), java.lang.Integer.TYPE)
    } ?: error("INDEPENDENT_DISTANCE_CONTRACT_UNAVAILABLE")
    val hash = methods.singleOrNull {
        acceptedMethod(it, Regex("hashCode-impl"),
            listOf(java.lang.Long.TYPE), java.lang.Integer.TYPE)
    }
    val construct = methods.singleOrNull {
        acceptedMethod(it, Regex("constructor-impl"),
            listOf(java.lang.Long.TYPE), java.lang.Long.TYPE)
    }
    val rows = mutableListOf<String>()
    // Both positions vary against independent fixed anchors; input choice
    // follows the mathematical XOR contract, never Hunter observations.
    for (anchor in listOf(1L, 100L)) for (value in inputs) {
        for ((left, right) in listOf(value to anchor, anchor to value)) {
            val actual = (distance.invoke(null, left, right) as Number).toLong()
            val expected = java.lang.Long.bitCount(left xor right).toLong()
            rows += row(type.name, distance, listOf(left.toString(), right.toString()),
                actual, expected, "xor64-popcount", true)
        }
    }
    for (value in inputs) {
        if (hash != null) rows += row(type.name, hash, listOf(value.toString()),
            (hash.invoke(null, value) as Number).toLong(),
            java.lang.Long.hashCode(value).toLong(),
            "compiler-inline-class-hashCode-not-public-contract", false)
        if (construct != null) rows += row(type.name, construct, listOf(value.toString()),
            (construct.invoke(null, value) as Number).toLong(), value,
            "compiler-inline-class-constructor-not-public-contract", false)
    }
    return rows
}

private fun runetopicRows(): List<String> {
    val result = mutableListOf<String>()
    // Internal byte-array utility against the independent Java Big Endian API.
    // Not a public contract, therefore never defect eligible by itself.
    val ext = Class.forName("com.runetopic.cryptography.CryptoExtensions")
    val get64 = ext.declaredMethods.singleOrNull {
        acceptedMethod(it, Regex("g8"), listOf(ByteArray::class.java, java.lang.Integer.TYPE),
            java.lang.Long.TYPE)
    }
    if (get64 != null) {
        val samples = listOf(
            ByteArray(16) { it.toByte() },
            ByteArray(16) { (255 - it).toByte() },
            ByteArray(16) { if (it % 2 == 0) -1 else 0 }
        )
        for ((index, sample) in samples.withIndex()) for (offset in listOf(0, 1, 4, 8)) {
            val expected = ByteBuffer.wrap(sample).order(ByteOrder.BIG_ENDIAN).getLong(offset)
            val actual = (get64.invoke(null, sample, offset) as Number).toLong()
            // The probe's array shape is not sufficient to recreate bytes;
            // these bounded controls must not claim to be the Hunter witness.
            result += row(ext.name, get64, listOf("byte-array-" + index, offset.toString()),
                actual, expected, "big-endian-64-bit-internal", false)
        }
    }
    // Internal Whirlpool helper, only GF(2^8) domain 0..511.
    val whirlpool = Class.forName("com.runetopic.cryptography.whirlpool.Whirlpool")
    val mask = whirlpool.methods.singleOrNull {
        Modifier.isPublic(it.modifiers) && !Modifier.isStatic(it.modifiers) &&
            it.name == "maskWithReductionPolynomial" &&
            it.parameterTypes.toList() == listOf(java.lang.Long.TYPE) &&
            it.returnType == java.lang.Long.TYPE
    }
    if (mask != null) {
        val instance = whirlpool.getConstructor(java.lang.Integer.TYPE, java.lang.Integer.TYPE)
            .newInstance(1, 64)
        for (value in listOf(0L, 1L, 2L, 3L, 100L, 255L, 256L, 257L, 285L, 510L, 511L)) {
            val expected = if (value >= 256) value xor 0x11dL else value
            result += row(whirlpool.name, mask, listOf(value.toString()),
                (mask.invoke(instance, value) as Number).toLong(), expected,
                "whirlpool-internal-gf256-scoped", false)
        }
    }
    return result
}

fun main() {
    val rows = when {
        runCatching { Class.forName("DHash") }.isSuccess -> dhashRows()
        runCatching { Class.forName("com.runetopic.cryptography.CryptoExtensions") }.isSuccess ->
            runetopicRows()
        else -> error("UNRECOGNIZED_FROZEN_ORIGINAL_COHORT")
    }
    println("{\"schema\":\"ultra-sentinel-v11-independent-oracle-execution/v1\"," +
        "\"oracleExecuted\":true,\"wholeCohortTruth\":false,\"observations\":[" +
        rows.joinToString(",") + "]}")
}
