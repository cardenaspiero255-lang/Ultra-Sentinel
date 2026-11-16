// Independent original-source gcd oracle; never passed to the frozen Hunter.
package oracle

import algorithms.number.gcd
import java.math.BigInteger

fun main() {
    val pairs = listOf(
        0L to 0L, 0L to 1L, 48L to 18L, 12L to 8L,
        -1L to 0L, 12L to -4L, -12L to -4L, -12L to 4L, 0L to -7L
    )
    val observations = pairs.map { (a, b) ->
        val actual = gcd(a, b)
        val expected = BigInteger.valueOf(a).gcd(BigInteger.valueOf(b)).toString()
        """{"class":"algorithms.number.GreatestCommonDivisorKt","method":"gcd(long;long;)long","arguments":["$a","$b"],"actual":"$actual","expected":"$expected","contract":"greatest common divisor is nonnegative and divides both arguments","defectEligible":true}"""
    }
    println("""{"schema":"ultra-sentinel-kotlin-api-v2-independent/v1","wholeCohortTruth":false,"observations":[${observations.joinToString(",")}]}""")
}
