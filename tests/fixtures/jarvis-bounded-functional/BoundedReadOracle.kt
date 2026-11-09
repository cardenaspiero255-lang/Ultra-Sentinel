package com.cardenaspiero255.jarvis.core

import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream

// Standalone independent original-source JVM oracle. The named target is
// compiled from an SHA-pinned original file, never a product deployment.
// Its controls are independent of the JavaScript Fixer candidate generator.
private class NonProgressingBulkStream : InputStream() {
    override fun read(): Int = 7
    override fun read(buffer: ByteArray, off: Int, len: Int): Int = 0
}

fun main() {
    val unusual = BoundedImageInputStream(NonProgressingBulkStream(), 8L)
    try {
        val result = unusual.read(ByteArray(4), 0, 4)
        if (result == 0) error("ZERO_PROGRESS_ACCEPTED")
        error("UNEXPECTED_ZERO_PROGRESS_RESULT")
    } catch (_: IOException) {
        println("nonprogress_rejected=PASS")
    }

    val normal = BoundedImageInputStream(ByteArrayInputStream(byteArrayOf(17, 18)), 8L)
    val buffer = ByteArray(4)
    try {
        if (normal.read(buffer, 0, 2) != 2 || buffer[0] != 17.toByte() ||
            buffer[1] != 18.toByte()) {
            error("BENIGN_POSITIVE_READ_REGRESSION")
        }
    } catch (_: IOException) {
        error("BENIGN_POSITIVE_READ_REGRESSION")
    }
    println("benign_bulk_read=PASS")

    check(normal.read(buffer, 0, 0) == 0) { "ZERO_LENGTH_READ_REGRESSION" }
    println("zero_length_read=PASS")

    check(normal.read(buffer, 0, 2) == -1) { "EOF_READ_REGRESSION" }
    println("eof_read=PASS")

    val limited = BoundedImageInputStream(ByteArrayInputStream(byteArrayOf(9, 10)), 1L)
    check(limited.read() == 9) { "BYTE_BUDGET_BENIGN_READ_REGRESSION" }
    try {
        limited.read()
        error("BYTE_BUDGET_NOT_ENFORCED")
    } catch (_: IOException) {
        println("bounded_cap=PASS")
    }

    println("BOUND_READ_ORACLE_PASS")
}
