package com.cardenaspiero255.gamehubultra.session

import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import com.cardenaspiero255.gamehubultra.platform.RuntimeDiagnosticsProvider

// Independent observable contract for this bounded JVM experiment:
// represent a nonnegative level as a percentage capped at 100; invalid scale
// or negative level is unavailable. This checks a flow, not Android hardware.
fun main() {
    fun observed(level: Int, scale: Int): Int? {
        val intent = Intent(mapOf(BatteryManager.EXTRA_LEVEL to level, BatteryManager.EXTRA_SCALE to scale))
        val diagnostics = RuntimeDiagnosticsProvider.get(Context(intent))
        return SessionCoachTelemetryMapper.snapshot(0L, diagnostics).batteryPercent
    }
    val benign = listOf(Triple(0, 100, 0), Triple(40, 100, 40), Triple(100, 100, 100),
        Triple(101, 100, 100), Triple(-1, 100, null), Triple(1, 0, null))
    if (!benign.all { (level, scale, expected) -> observed(level, scale) == expected }) {
        System.err.println("BENIGN_TELEMETRY_REGRESSION")
        kotlin.system.exitProcess(3)
    }
    println("BENIGN_TELEMETRY_PASS")
    val actual = observed(Int.MAX_VALUE, 1)
    if (actual != 100) {
        System.err.println("EXTREME_TELEMETRY_MISMATCH")
        kotlin.system.exitProcess(2)
    }
    println("THREE_SOURCE_TELEMETRY_ORACLE_PASS")
}
