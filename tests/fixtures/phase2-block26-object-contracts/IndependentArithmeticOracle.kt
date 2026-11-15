package oracle

import io.uuddlrlrba.ktalgs.geometry.Point
import io.uuddlrlrba.ktalgs.math.lcm
import java.math.BigInteger

// Independent reference arithmetic. Neither Hunter nor its reports are inputs.
// https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/BigInteger.html#gcd(java.math.BigInteger)
fun main() {
    val domain = intArrayOf(0, 1, 2, 3, 12, 100, Int.MAX_VALUE)
    var boundedControls = 0
    var overflowCases = 0
    val observations = mutableListOf<String>()
    for (a in domain) for (b in domain) {
        if (a == 0 && b == 0) continue // No claim about the undefined 0/0 implementation path.
        val x = BigInteger.valueOf(a.toLong())
        val y = BigInteger.valueOf(b.toLong())
        val expected = if (a == 0 || b == 0) BigInteger.ZERO else x.divide(x.gcd(y)).multiply(y)
        val observed = runCatching { lcm(a, b) }
        if (expected <= BigInteger.valueOf(Int.MAX_VALUE.toLong())) {
            check(observed.getOrNull() == expected.intValueExact()) { "BOUNDED_LCM_CONTROL_FAILED" }
            boundedControls++
        } else {
            overflowCases++
        }
        val actual = observed.getOrNull()
        val negativeForNonnegativeInputs = actual != null && actual < 0
        observations += """{"a":$a,"b":$b,"expected":"$expected","actual":${actual ?: "null"},"threw":${observed.isFailure},"negativeForNonnegativeInputs":$negativeForNonnegativeInputs}"""
    }
    val values = intArrayOf(Int.MIN_VALUE, -1, 0, 1, Int.MAX_VALUE)
    var orderingControls = 0
    for (x in values) for (y in values) for (u in values) for (v in values) {
        val expected = if (x != u) BigInteger.valueOf(x.toLong()).compareTo(BigInteger.valueOf(u.toLong()))
                       else BigInteger.valueOf(y.toLong()).compareTo(BigInteger.valueOf(v.toLong()))
        check(Integer.signum(Point(x, y).compareTo(Point(u, v))) == Integer.signum(expected)) {
            "POINT_LEXICOGRAPHIC_CONTROL_FAILED"
        }
        orderingControls++
    }
    println("""{"schema":"ultra-sentinel-block26-independent-arithmetic/v1","boundedLcmControls":$boundedControls,"overflowCases":$overflowCases,"orderingControls":$orderingControls,"observations":[${observations.joinToString(",")}]}""")
}
