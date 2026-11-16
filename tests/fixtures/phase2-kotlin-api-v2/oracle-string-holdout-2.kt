package oracle

import algos.arrays.Fibonacci
import algos.arrays.BinarySearch
import java.math.BigInteger

private fun q(s: String): String = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
    .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\""

private fun fibRow(n: Int, actual: Int, expected: BigInteger): String =
    "{\"class\":\"algos.arrays.Fibonacci\",\"method\":\"nthFib(int;)int\"," +
    "\"arguments\":[" + q(n.toString()) + "],\"constructor\":[],\"constructorArguments\":[]," +
    "\"actual\":" + q(actual.toString()) + ",\"expected\":" + q(expected.toString()) +
    ",\"contract\":\"Fibonacci recurrence F0=0,F1=1, exact BigInteger iteration for n 0..20.\"," +
    "\"defectEligible\":true}"

fun main() {
    val rows = mutableListOf<String>()
    var a = BigInteger.ZERO
    var b = BigInteger.ONE
    for (n in 0..20) {
        rows += fibRow(n, Fibonacci().nthFib(n), a)
        val next = a.add(b)
        a = b
        b = next
    }
    val values = arrayOf(-20, -10, 0, 3, 5)
    val recursive = BinarySearch().search(values.copyOf(), -10)
    val iterative = BinarySearch().searchIterative(values.copyOf(), -10)
    val control = "{\"class\":\"algos.arrays.BinarySearch\",\"method\":\"search(java.lang.Integer[];int;)int\"," +
        "\"actual\":" + q(recursive.toString()) + ",\"expected\":" + q(iterative.toString()) +
        ",\"contract\":\"sorted-array binary search compared with independent iterative original and linear reference\"," +
        "\"defectEligible\":false,\"excludedReason\":\"Boxed Integer array signature is outside the frozen numeric probe.\"}"
    println("{\"schema\":\"ultra-sentinel-kotlin-api-v2-independent/v1\"," +
        "\"wholeCohortTruth\":false,\"observations\":[" + rows.joinToString(",") + "]," +
        "\"unsupportedControls\":[" + control + "]," +
        "\"coverageNotes\":[\"Exact finite original Fibonacci integer calls with independent BigInteger iterative reference; no complete cohort truth.\"," +
        "\"Original boxed-array binary-search comparison is a nonadmitted control, never a Hunter discovery.\"]}")
}
