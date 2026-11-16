package sample.boxed

// Kotlin/JVM Array<T> uses exact boxed JVM component types.
// This fixture is synthetic COVERAGE ONLY, never an original defect or oracle.
class BoxedArrays {
    fun sizeOfInts(values: Array<Int>): Int = values.size
    fun sumDoubles(values: Array<Double>): Double = values.sum()
    fun sumFloats(values: Array<Float>): Float = values.sum()

    // Explicit negative control: arbitrary String arrays remain out of scope.
    fun sizeOfStrings(values: Array<String>): Int = values.size
}
