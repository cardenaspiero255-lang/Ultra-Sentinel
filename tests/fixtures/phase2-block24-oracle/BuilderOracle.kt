package kotlinx.io.bytestring

fun main() {
    val builder = ByteStringBuilder(2)
    check(builder.size == 0 && builder.capacity == 2)
    builder.append(byteArrayOf(1, 2, 3), 0, 2)
    builder.append(4.toByte())
    check(builder.size == 3)
    check(builder.toByteString().getBackingArrayReference().contentEquals(byteArrayOf(1, 2, 4)))
    val expanded = ByteStringBuilder()
    for (i in 0 until 128) expanded.append(i.toByte())
    check(expanded.size == 128 && expanded.capacity >= 128)
    check(expanded.toByteString().getBackingArrayReference().contentEquals(
        ByteArray(128) { it.toByte() }
    ))
    var reversedRejected = false
    try { builder.append(byteArrayOf(1, 2), 2, 1) }
    catch (_: IllegalArgumentException) { reversedRejected = true }
    check(reversedRejected)
    var outsideRejected = false
    try { builder.append(byteArrayOf(1), -1, 1) }
    catch (_: IndexOutOfBoundsException) { outsideRejected = true }
    check(outsideRejected)
    check(builder.size == 3)
    val created = buildByteString { append(byteArrayOf(9, 8)); append(7.toByte()) }
    check(created.getBackingArrayReference().contentEquals(byteArrayOf(9, 8, 7)))
    println("ORIGINAL_IO_BUILDER_BENIGN_CONTROLS_PASS")
}
