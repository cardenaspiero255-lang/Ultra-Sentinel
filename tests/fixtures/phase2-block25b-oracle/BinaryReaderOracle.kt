package kotlinx.datetime.internal

import java.nio.ByteBuffer
import java.nio.ByteOrder

// Independent JDK ByteBuffer reference over the untouched original Kotlin BinaryDataReader.
// No Hunter rule, oracle answer, or repair hint is imported into the source-only worker.
fun main() {
    val network = byteArrayOf(
        0x7f, 0x81.toByte(), 0x22, 0x33, 0x44,
        0x80.toByte(), 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0xff.toByte()
    )
    val expected = ByteBuffer.wrap(network).order(ByteOrder.BIG_ENDIAN)
    val original = BinaryDataReader(network)
    check(original.readUnsignedByte().toInt() == expected.get().toUByte().toInt()) { "UNSIGNED_BYTE_MISMATCH" }
    check(original.readInt() == expected.getInt()) { "BIG_ENDIAN_INT_MISMATCH" }
    check(original.readLong() == expected.getLong()) { "BIG_ENDIAN_LONG_MISMATCH" }

    val text = "caf\u00e9"
    val data = text.encodeToByteArray() + byteArrayOf(0, 0x2a, 0x51)
    val reader = BinaryDataReader(data)
    check(reader.readUtf8String(text.encodeToByteArray().size) == text) { "UTF8_EXACT_LENGTH_MISMATCH" }
    check(reader.readNullTerminatedUtf8String(2).isEmpty()) { "NULL_TERMINATED_FIELD_MISMATCH" }
    check(reader.readAsciiChar() == 'Q') { "NULL_TERMINATED_FIELD_ADVANCE_MISMATCH" }

    val skipper = BinaryDataReader(byteArrayOf(0x0b, 0x0c, 0x0d))
    skipper.skip(2)
    check(skipper.readByte() == 0x0d.toByte()) { "SKIP_OFFSET_MISMATCH" }

    var boundsRejected = false
    try {
        BinaryDataReader(byteArrayOf(0x01)).readLong()
    } catch (_: IndexOutOfBoundsException) {
        boundsRejected = true
    }
    check(boundsRejected) { "TRUNCATED_INPUT_MUST_NOT_BE_ACCEPTED" }
    println("ORIGINAL_DATETIME_BINARY_READER_BENIGN_CONTROLS_PASS")
}
