package oracle

import com.github.sanity.pav.BinarySearchResult
import com.github.sanity.pav.betterBinarySearch
import com.github.sanity.pav.spline.CubicHermiteSpline

// Independent closed-form references; no Hunter report is accepted as input.
fun main() {
    var splineControls = 0
    for (slope in -2..2) for (offset in listOf(-3, 0, 3)) {
        val original = CubicHermiteSpline(0.0, offset.toDouble(), slope.toDouble(),
            4.0, (offset + 4 * slope).toDouble(), slope.toDouble())
        for (x in 0..4) {
            check(original.interpolate(x.toDouble()) == (offset + slope * x).toDouble()) {
                "ORIGINAL_LINEAR_SPLINE_CONTROL_FAILED"
            }
            splineControls++
        }
    }
    val values = doubleArrayOf(-2.0, 0.0, 3.0, 9.0)
    var searchControls = 0
    for (i in values.indices) {
        check(values.betterBinarySearch(values[i]) == BinarySearchResult.Exact(i))
        searchControls++
    }
    for ((i, value) in listOf(-1.0, 1.0, 4.0).withIndex()) {
        check(values.betterBinarySearch(value) == BinarySearchResult.Between(i, i + 1))
        searchControls++
    }
    for (outside in listOf(-3.0, 10.0)) {
        check(runCatching { values.betterBinarySearch(outside) }.exceptionOrNull() is IllegalArgumentException)
        searchControls++
    }
    println("""{"schema":"ultra-sentinel-corrected-frozen-independent-controls/v1","splineControls":$splineControls,"binarySearchControls":$searchControls,"wholeFileTruthAvailable":false}""")
}
