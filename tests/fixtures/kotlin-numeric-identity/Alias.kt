package numeric.alias
import kotlin.ranges.coerceIn as clamp
fun narrowed(value: Long): Int = value.toInt().clamp(0, 100)
