@file:JvmName("NumericApis")

package métricas

// Synthetic coverage fixtures. Their intentional peaks are not defect labels.
fun cálculo(x: Double): Double = x * (1.0 - x)
fun monotonic(x: Double): Double = x

fun arrays(values: DoubleArray): Int = if (values.size == 1) 100 else 0
fun lists(values: List<Double>): Int = if (values.size == 1) 100 else 0
fun collections(values: Collection<Int>): Int = if (values.size == 1) 100 else 0
fun iterables(values: Iterable<Long>): Int = if (values.count() == 1) 100 else 0
fun nonempty(values: List<Double>): Int {
    require(values.isNotEmpty())
    return if (values.size == 2) 100 else 0
}

// An explicit wildcard remains outside the proven exact-element contract.
fun wildcard(values: List<@JvmWildcard Double>): Int = if (values.size == 1) 100 else 0

class NumericReceiver(private val seed: Double) {
    fun peak(x: Double): Double = x * (1.0 - x) + seed
}
