package numeric.standard
fun narrowed(value: Long): Int = value.toInt().coerceIn(0, 100)
fun product(left: Int, right: Int): Long = (left * right).toLong()
fun safe(value: Long): Int = value.coerceIn(0L, 100L).toInt()
