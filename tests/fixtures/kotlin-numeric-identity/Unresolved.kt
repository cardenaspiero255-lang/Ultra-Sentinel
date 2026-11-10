package numeric.unresolved
// Deliberately invalid source: unresolved calls must not produce semantic claims.
fun unknown(value: Long): Int = value.missing().coerceIn(0, 100)
