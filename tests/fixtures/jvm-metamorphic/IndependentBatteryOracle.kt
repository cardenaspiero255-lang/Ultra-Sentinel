package com.cardenaspiero255.gamehubultra.proof

import com.cardenaspiero255.gamehubultra.BatteryTelemetry

fun main() {
    val benign = listOf(Triple(0, 100, 0), Triple(1, 100, 1), Triple(50, 100, 50),
        Triple(100, 100, 100), Triple(-1, 100, null), Triple(1, 0, null))
    if (!benign.all { (level, scale, expected) -> BatteryTelemetry.fromBroadcast(level, scale) == expected }) {
        System.err.println("BENIGN_BATTERY_REGRESSION")
        kotlin.system.exitProcess(3)
    }
    println("BENIGN_BATTERY_PASS")
    if (BatteryTelemetry.fromBroadcast(Int.MAX_VALUE, 1) != 100) {
        System.err.println("BATTERY_EXTREME_MISMATCH")
        kotlin.system.exitProcess(2)
    }
    println("BATTERY_ORACLE_PASS")
}
