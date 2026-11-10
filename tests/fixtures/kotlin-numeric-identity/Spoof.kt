package kotlin.ranges
// Deliberately forged namespace: a source declaration is not the stdlib.
fun Int.coerceIn(lower: Int, upper: Int): Int = this
fun spoof(value: Long): Int = value.toInt().coerceIn(0, 100)
