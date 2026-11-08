package com.cardenaspiero255.jarvis.core

import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import kotlin.system.exitProcess

private fun reject(marker: String): Nothing {
    System.err.println(marker)
    exitProcess(7)
}

private class ZeroProgressProvider : InputStream() {
    override fun read(): Int = -1
    override fun read(buffer: ByteArray, off: Int, len: Int): Int = 0
}

fun main() {
    // This control is intentionally independent of the detector's syntax.
    // A repair that simply rejects all reads must fail here.
    try {
        val normal = BoundedImageInputStream(ByteArrayInputStream(byteArrayOf(11, 12)), 4)
        val buffer = ByteArray(3)
        if (normal.read(buffer, 0, 0) != 0 || normal.read(buffer, 0, 2) != 2 ||
            buffer[0].toInt() != 11 || buffer[1].toInt() != 12 ||
            normal.read(buffer, 0, 1) != -1) reject("BENIGN_READ_REJECTED")
    } catch (_: IOException) {
        reject("BENIGN_READ_REJECTED")
    }
    val stalled = BoundedImageInputStream(ZeroProgressProvider(), 4)
    try {
        val result = stalled.read(ByteArray(1), 0, 1)
        if (result == 0) reject("ZERO_PROGRESS_ACCEPTED")
        reject("UNEXPECTED_PROVIDER_RESULT")
    } catch (_: IOException) {
        println("READ_PROGRESS_ORACLE_PASS")
    }
}
