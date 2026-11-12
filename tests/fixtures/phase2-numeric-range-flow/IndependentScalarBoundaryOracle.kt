package experimental.rangeflow

import kotlin.math.abs
import kotlin.math.absoluteValue

/** Development oracle only: not blind, not a novel defect or proof of detector precision. */
private object UnrelatedScalarExamples {
    fun bucket(index: Int): Int = index.absoluteValue % 7
    fun normalizeCounter(counter: Long): Long = counter.absoluteValue
    fun normalizeIntAfterWidening(counter: Int): Long = counter.toLong().absoluteValue
    fun boundedId(counter: Int): Int = counter.coerceIn(0, 255).absoluteValue
    fun earlyReturn(counter: Int): Int {
        if (counter == Int.MIN_VALUE) return 0
        return counter.absoluteValue
    }
    fun throughAlias(counter: Int): Int {
        val reachable = counter
        return abs(reachable)
    }
    fun benignCopy(counter: Int): Int = abs(counter.coerceAtLeast(0))
}
fun main() {
    val signedMinimum = Int.MIN_VALUE
    val mathematicalMagnitude = -(signedMinimum.toLong())
    check(mathematicalMagnitude == 2147483648L)
    check(UnrelatedScalarExamples.bucket(signedMinimum) < 0) { "INT_BOUNDARY_NOT_REPRODUCED" }
    check(UnrelatedScalarExamples.normalizeCounter(Long.MIN_VALUE) == Long.MIN_VALUE) {
        "LONG_BOUNDARY_NOT_REPRODUCED"
    }
    check(UnrelatedScalarExamples.throughAlias(signedMinimum) == signedMinimum) {
        "REACHING_ALIAS_BOUNDARY_NOT_REPRODUCED"
    }
    check(UnrelatedScalarExamples.normalizeIntAfterWidening(signedMinimum) == mathematicalMagnitude) {
        "WIDENING_BENIGN_CONTROL_REGRESSION"
    }
    check(UnrelatedScalarExamples.boundedId(signedMinimum) == 0) {
        "CLAMPED_BENIGN_CONTROL_REGRESSION"
    }
    check(UnrelatedScalarExamples.earlyReturn(signedMinimum) == 0) {
        "EARLY_RETURN_BENIGN_CONTROL_REGRESSION"
    }
    check(UnrelatedScalarExamples.benignCopy(signedMinimum) == 0) {
        "SAFE_COPY_BENIGN_CONTROL_REGRESSION"
    }
    for (n in intArrayOf(-23, -1, 0, 1, 23)) {
        check(UnrelatedScalarExamples.normalizeIntAfterWidening(n) ==
            (if (n < 0) -n.toLong() else n.toLong()))
    }
    println("KOTLIN_GENERAL_NUMERIC_RANGE_DEVELOPMENT_ORACLE_PASS")
}
