package sample.admission

class DefaultOwner {
    companion object {
        fun positive(value: Double): Double {
            require(value > 0.0)
            return if (value == 2.0) 7.0 else 0.0
        }
    }
}

class NamedOwner {
    companion object Ops {
        fun signed(value: Long): Long = if (value == 0L) 7L else 0L
    }
}

object Unary {
    fun logarithm(value: Float): Float = kotlin.math.ln(value)
}

fun monotonic(value: Int): Int = value
