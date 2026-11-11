package com.cardenaspiero255.gamehubultra.storageproof

import com.cardenaspiero255.gamehubultra.platform.StorageTelemetry
import java.math.BigDecimal
import java.math.RoundingMode

// Independent bounded contract: compute the percentage using decimal
// arithmetic, clamp to [0,100], and preserve the existing zero-total result.
private fun expected(free: Long, total: Long): Int {
    if (total <= 0) return 0
    return BigDecimal.valueOf(free).multiply(BigDecimal.valueOf(100))
        .divide(BigDecimal.valueOf(total), 0, RoundingMode.DOWN)
        .max(BigDecimal.ZERO).min(BigDecimal.valueOf(100)).toInt()
}

fun main() {
    val benign = listOf(20L to 80L, 0L to 100L, 2L to 1L, 1L to 0L, -1L to 100L)
    if (!benign.all { (free, total) -> StorageTelemetry(free, total).freePercent == expected(free, total) }) {
        System.err.println("BENIGN_STORAGE_REGRESSION")
        kotlin.system.exitProcess(3)
    }
    println("BENIGN_STORAGE_PASS")
    val extreme = listOf(30_000_000L to 1L, Long.MAX_VALUE / 2 to Long.MAX_VALUE,
        Long.MAX_VALUE to Long.MAX_VALUE, Long.MAX_VALUE to 1L, 0L to Long.MAX_VALUE)
    val results = extreme.mapIndexed { index, (free, total) ->
        val actual = StorageTelemetry(free, total).freePercent
        val reference = expected(free, total)
        println("STORAGE_CASE_${index}_ACTUAL_${actual}_EXPECTED_${reference}")
        actual == reference
    }
    if (!results.all { it }) {
        System.err.println("EXTREME_STORAGE_MISMATCH")
        kotlin.system.exitProcess(2)
    }
    println("STORAGE_ORACLE_PASS")
}
