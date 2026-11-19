package oracle

private fun convertedTicks(ticks: Int): Int = gamma.convert(beta.convert(alpha.convert(ticks)))

fun main() {
    check(convertedTicks(0) == 0)
    println("BENIGN_PASS")
    val contractHolds = listOf(-3, 1, 5).all { convertedTicks(it) == it * 8 }
    println(if (contractHolds) "CONTRACT_PASS" else "CONTRACT_FAIL")
}
