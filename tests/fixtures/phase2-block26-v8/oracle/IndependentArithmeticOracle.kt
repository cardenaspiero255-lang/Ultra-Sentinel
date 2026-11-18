package oracle

import java.lang.reflect.InvocationTargetException
import java.math.BigDecimal
import java.math.BigInteger
import java.math.RoundingMode

// Independently specified witnesses. Never read Hunter output or its source.
// This runner is compiled (but NOT executed) before the prediction seal.
// Execute it only in the existing networkless independent-oracle sandbox.
private fun q(text: String): String = "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"")
    .replace("\n", "\\n").replace("\r", "\\r") + "\""

private fun row(
    targetClass: String, method: String, arguments: List<String>,
    actual: String, expected: String, tolerance: String,
    contract: String, defectEligible: Boolean
): String {
    return "{\"class\":" + q(targetClass) +
        ",\"method\":" + q(method) +
        ",\"arguments\":[" + arguments.joinToString(",") { q(it) } + "]" +
        ",\"actual\":" + q(actual) + ",\"expected\":" + q(expected) +
        ",\"tolerance\":" + q(tolerance) + ",\"contract\":" + q(contract) +
        ",\"defectEligible\":" + defectEligible + "}"
}

private fun mathRows(): List<String> {
    val targetName = "com.elevenetc.utils.kotlin.math.ElevenMathImpl"
    val type = Class.forName(targetName)
    val constructor = type.getDeclaredConstructor()
    constructor.isAccessible = true
    val receiver = constructor.newInstance()
    val radians = type.getDeclaredMethod("toRadians", java.lang.Float.TYPE)
    val round = type.getDeclaredMethod("round", java.lang.Float.TYPE, java.lang.Integer.TYPE)
    radians.isAccessible = true
    round.isAccessible = true
    val results = mutableListOf<String>()
    // Precommitted finite input domain, including Hunter's [-1,0,1] band.
    for (x in listOf(-100f, -2f, -1f, 0f, 1f, 2f, 100f)) {
        val expected = Math.toRadians(x.toDouble()).toFloat()
        val actual = (radians.invoke(receiver, x) as Number).toFloat()
        require(actual.isFinite() && expected.isFinite()) { "NONFINITE_RADIAN_WITNESS" }
        results += row(targetName, "toRadians(float;)float",
            listOf(x.toString()), actual.toString(), expected.toString(),
            "0.0001", "degrees-to-radians using independent java.lang.Math.toRadians",
            true)
    }
    // A mathematically independent decimal reference is specified in advance.
    // Exclude halfway ties and precision >= 3 to avoid unspecified float and
    // scale-overflow semantics; do not extend the scope after observing Hunter.
    val values = listOf(-2.23f, -1.12f, -1f, 0f, 1f, 1.23f, 2.34f, 100f)
    for (precision in listOf(0, 1, 2)) for (x in values) {
        val expected = BigDecimal(x.toString())
            .setScale(precision, RoundingMode.HALF_UP).toFloat()
        val actual = (round.invoke(receiver, x, precision) as Number).toFloat()
        require(actual.isFinite() && expected.isFinite()) { "NONFINITE_ROUND_WITNESS" }
        results += row(targetName, "round(float;int;)float",
            listOf(x.toString(), precision.toString()), actual.toString(),
            expected.toString(), "0.0001",
            "independent base-ten decimal rounding for finite non-tie domain; p=0..2", true)
    }
    return results
}

private fun hexRows(): List<String> {
    val targetName = "com.github.kory33.bigmath.integer.BigUIntFactoryKt"
    val type = Class.forName(targetName)
    // Compiler-generated bridge to a private function: no public user contract.
    // Exercise for coverage only. Any mismatch is NOT an eligible novel defect.
    val bridge = type.getDeclaredMethod("access\$intFromUHex", String::class.java)
    bridge.isAccessible = true
    val results = mutableListOf<String>()
    for (input in listOf("0", "1", "a", "aa", "aaa", "f", "7fffffff", "ffffffff")) {
        val expected = BigInteger(input, 16).toInt()
        val actual = (bridge.invoke(null, input) as Number).toInt()
        results += row(targetName, "access\$intFromUHex(java.lang.String;)int",
            listOf(input), actual.toString(), expected.toString(), "0",
            "synthetic private JVM accessor; coverage only, no public semantic defect contract",
            false)
    }
    return results
}

fun main() {
    val observations = when {
        runCatching {
            Class.forName("com.elevenetc.utils.kotlin.math.ElevenMathImpl")
        }.isSuccess -> mathRows()
        runCatching {
            Class.forName("com.github.kory33.bigmath.integer.BigUIntFactoryKt")
        }.isSuccess -> hexRows()
        else -> error("UNKNOWN_ORIGINAL_COHORT")
    }
    println("{\"schema\":\"ultra-sentinel-v8-independent-oracle/v1\"," +
        "\"wholeCohortTruth\":false,\"oracleExecuted\":true,\"observations\":[" +
        observations.joinToString(",") + "]}")
}
