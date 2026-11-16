package oracle

import com.hackoeur.jglm.Vec3
import palasjir.viewer.coordinates.GLSphericalCoordinates
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sqrt

private val controls = mutableListOf<Map<String, Any?>>()
private val exceptions = mutableListOf<Map<String, Any?>>()

private fun json(value: Any?): String = when (value) {
    null -> "null"
    is String -> "\"" + buildString {
        for (c in value) append(when (c) {
            '\\' -> "\\\\"
            '"' -> "\\\""
            '\n' -> "\\n"
            '\r' -> "\\r"
            '\t' -> "\\t"
            else -> if (c.code < 32) "\\u" + c.code.toString(16).padStart(4, '0') else c.toString()
        })
    } + "\""
    is Boolean, is Number -> value.toString()
    is Map<*, *> -> value.entries.joinToString(",", "{", "}") { json(it.key.toString()) + ":" + json(it.value) }
    is Iterable<*> -> value.joinToString(",", "[", "]") { json(it) }
    else -> error("Unsupported JSON value")
}

private fun close(actual: Double, expected: Double): Boolean =
    actual.isFinite() && abs(actual - expected) <= 0.0001 * max(1.0, abs(expected))

private fun exception(name: String, input: List<String>, failure: Throwable) {
    exceptions.add(linkedMapOf("scenario" to name, "input" to input,
        "exceptionClass" to failure.javaClass.name, "defectEligible" to false,
        "excludedReason" to "Exceptional execution is outside the independent numeric evidence join."))
}

fun main() {
    val vectors = listOf(
        floatArrayOf(1f, 0f, 0f), floatArrayOf(0f, 1f, 0f), floatArrayOf(0f, 0f, 1f),
        floatArrayOf(-1f, 0f, 0f), floatArrayOf(0f, -1f, 0f), floatArrayOf(0f, 0f, -1f),
        floatArrayOf(1f, 2f, 3f), floatArrayOf(-1f, 2f, -3f), floatArrayOf(3f, -4f, 5f),
        floatArrayOf(-2.5f, -1.25f, 0.5f), floatArrayOf(0.125f, -0.5f, 2f),
        floatArrayOf(100f, -200f, 300f)
    )
    for (v in vectors) {
        val input = v.map { it.toString() }
        try {
            val coordinates = GLSphericalCoordinates(Vec3(v[0], v[1], v[2]))
            val result = coordinates.cartesian
            val actual = listOf(result.x.toDouble(), result.y.toDouble(), result.z.toDouble())
            val expected = v.map { it.toDouble() }
            controls.add(linkedMapOf("scenario" to "cartesian round trip", "input" to input,
                "actual" to actual.map { it.toString() }, "expected" to expected.map { it.toString() },
                "matchesWithinTolerance" to actual.indices.all { close(actual[it], expected[it]) },
                "tolerance" to "0.0001 times max(1, absolute expected component)",
                "contract" to "Converting a finite nonzero Cartesian vector to spherical coordinates and back recovers its components within floating-point tolerance.",
                "defectEligible" to false,
                "excludedReason" to "Vec3 constructor and Vec3 result are outside the frozen numeric evidence join."))
        } catch (failure: Throwable) {
            if (failure is VirtualMachineError || failure is ThreadDeath || failure is LinkageError) throw failure
            exception("cartesian round trip", input, failure)
        }
        try {
            val expected = sqrt(v.sumOf { it.toDouble() * it.toDouble() })
            val actual = GLSphericalCoordinates(Vec3(v[0], v[1], v[2])).r
            controls.add(linkedMapOf("scenario" to "cartesian radius", "input" to input,
                "actual" to actual.toString(), "expected" to expected.toString(),
                "matchesWithinTolerance" to close(actual, expected),
                "tolerance" to "0.0001 times max(1, absolute expected radius)",
                "contract" to "The radius of a Cartesian vector is its nonnegative Euclidean norm.",
                "defectEligible" to false,
                "excludedReason" to "Vec3 constructor and no-argument getter are outside the frozen numeric evidence join."))
        } catch (failure: Throwable) {
            if (failure is VirtualMachineError || failure is ThreadDeath || failure is LinkageError) throw failure
            exception("cartesian radius", input, failure)
        }
    }
    println(json(linkedMapOf(
        "schema" to "ultra-sentinel-kotlin-api-v2-independent/v1", "wholeCohortTruth" to false,
        "scopeStatus" to "NO_ORACLE_SCOPE", "observations" to emptyList<Any>(),
        "orderingObservations" to emptyList<Any>(), "unsupportedControls" to controls,
        "exceptionControls" to exceptions,
        "coverageNotes" to listOf(
            "No public source class implements Comparable with an admitted constructor; no ordering-law observations are asserted.",
            "Cartesian Vec3 and spherical conversion controls are structured, outside numeric evidence, and defect-ineligible.",
            "Source compilation requires JOGL, JGLM and Apache Commons Math, which are absent from the pinned JDK/Kotlin-only classpath; dependency abstention is expected pending isolated compilation.",
            "Reference specification: https://commons.apache.org/proper/commons-math/javadocs/api-3.6.1/org/apache/commons/math3/geometry/euclidean/threed/SphericalCoordinates.html .",
            "No full-cohort correctness or novelty conclusion is supplied."
        )
    )))
}
