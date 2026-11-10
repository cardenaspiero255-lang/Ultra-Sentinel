package numeric.shadow
fun Int.coerceIn(lower: Int, upper: Int): Int = this
fun notClamped(value: Long): Int = value.toInt().coerceIn(0, 100)
