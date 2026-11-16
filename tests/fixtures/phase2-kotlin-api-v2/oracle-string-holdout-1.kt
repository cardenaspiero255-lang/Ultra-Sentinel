package oracle

import array.*
import string.*

private fun q(s: String): String = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
    .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\""

private fun control(name: String, actual: String, expected: String): String =
    "{\"name\":" + q(name) + ",\"actual\":" + q(actual) +
    ",\"expected\":" + q(expected) + ",\"defectEligible\":false}"

fun main() {
    val results = mutableListOf<String>()
    results += control("reverseString", reverseString("abc"), "cba")
    val left = arrayOf(1, 2, 3)
    rotateArrayLeftByOne(left)
    results += control("rotateArrayLeftByOne", left.joinToString(","), "2,3,1")
    val right = arrayOf(1, 2, 3)
    rotateArrayRightByOne(right)
    results += control("rotateArrayRightByOne", right.joinToString(","), "3,1,2")
    val limits = findMinMaxFromArray(arrayOf(4, -2, 7))
    results += control("findMinMaxFromArray", limits.toString(), "(-2, 7)")
    println("{\"schema\":\"ultra-sentinel-kotlin-api-v2-independent/v1\"," +
        "\"wholeCohortTruth\":false,\"observations\":[]," +
        "\"unsupportedControls\":[" + results.joinToString(",") + "]," +
        "\"coverageNotes\":[\"Original Kotlin generic arrays, Pair and String output are not admitted numeric probe APIs; these direct-call controls cannot establish autonomous discovery.\"]}")
}
