package kotlinx.io.bytestring

import kotlin.random.Random

fun main() {
    val seed = 437
    val expected = Random(seed).nextBytes(32)
    val actual = Random(seed).nextByteString(32).getBackingArrayReference()
    check(actual.contentEquals(expected))
    check(Random(seed).nextByteString(0).size == 0)
    var negativeRejected = false
    try { Random(seed).nextByteString(-1) }
    catch (_: IllegalArgumentException) { negativeRejected = true }
    check(negativeRejected)
    println("ORIGINAL_IO_RANDOM_BENIGN_CONTROLS_PASS")
}
