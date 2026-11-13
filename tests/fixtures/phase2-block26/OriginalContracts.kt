package block26

import java.math.BigInteger
import math.average
import math.median
import mathematics.getFactorial
import search.binarySearch
import sort.bubbleSort

// Independent mathematical contracts over authentic, unmodified original files.
// No Hunter report, detector rule, patch, or expected verdict is an input.
fun main() {
    val controls = listOf(intArrayOf(), intArrayOf(1), intArrayOf(2, 1),
        intArrayOf(0, 0, 0), intArrayOf(-5, 2, -1),
        intArrayOf(Int.MAX_VALUE, Int.MIN_VALUE, 0), intArrayOf(3, 1, 2, 1), intArrayOf(-1, -2))
    for (input in controls) {
        val actual = input.toTypedArray()
        bubbleSort(actual)
        check(actual.contentEquals(input.sortedArray().toTypedArray())) { "SORT_CONTROL_FAILED" }
    }
    for (key in -1..6) {
        val input = arrayOf(0, 2, 4, 6)
        val actual = binarySearch(input, key)
        check(if (key in input) actual in input.indices && input[actual] == key else actual == -1) {
            "SEARCH_CONTROL_FAILED"
        }
    }
    var factorial = BigInteger.ONE
    for (n in 0..20) {
        if (n > 0) factorial *= BigInteger.valueOf(n.toLong())
        check(getFactorial(n.toLong()) == factorial.longValueExact()) { "FACTORIAL_CONTROL_FAILED" }
    }
    val domain = intArrayOf(Int.MIN_VALUE, -1, 0, 1, Int.MAX_VALUE)
    var cases = 0
    var medianMismatches = 0
    var averageMismatches = 0
    val medianExamples = mutableListOf<String>()
    val averageExamples = mutableListOf<String>()
    fun example(values: IntArray, expected: String, actual: String): String =
        "{\"input\":[${values.joinToString(",")}],\"expected\":\"$expected\",\"actual\":\"$actual\"}"
    fun observe(values: IntArray) {
        cases++
        // Independent wider-arithmetic reference: median in Long, average in BigInteger.
        val ordered = values.sortedArray()
        val expectedMedian = if (values.size % 2 == 1) ordered[values.size / 2].toDouble()
            else (ordered[values.size / 2 - 1].toLong() + ordered[values.size / 2].toLong()) / 2.0
        val actualMedian = median(values.copyOf())
        if (actualMedian != expectedMedian) {
            medianMismatches++
            if (medianExamples.size < 3) medianExamples += example(values, expectedMedian.toString(), actualMedian.toString())
        }
        val expectedAverage = values.fold(BigInteger.ZERO) { a, n -> a + BigInteger.valueOf(n.toLong()) }
            .divide(BigInteger.valueOf(values.size.toLong())).intValueExact()
        val actualAverage = average(values.toTypedArray())
        if (actualAverage != expectedAverage) {
            averageMismatches++
            if (averageExamples.size < 3) averageExamples += example(values, expectedAverage.toString(), actualAverage.toString())
        }
    }
    fun enumerate(values: IntArray, index: Int) {
        if (index == values.size) { observe(values); return }
        for (value in domain) { values[index] = value; enumerate(values, index + 1) }
    }
    for (length in 1..4) enumerate(IntArray(length), 0)
    check(cases == 780)
    println("""{"schema":"ultra-sentinel-block26-original-jvm-observations/v1","controls":{"sort":8,"search":8,"factorial":21},"numeric":[{"id":"median","cases":$cases,"mismatches":$medianMismatches,"examples":[${medianExamples.joinToString(",")}]},{"id":"average","cases":$cases,"mismatches":$averageMismatches,"examples":[${averageExamples.joinToString(",")}]}]}""")
}
