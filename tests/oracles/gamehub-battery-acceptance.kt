package com.cardenaspiero255.gamehubultra.domain

private fun s(min: Int, level: Int?, charging: Boolean = false): SessionCoachSnapshot =
    SessionCoachSnapshot(min * 60_000L, level, charging, false)

fun main() {
    val engine = BatteryAwareGamingEngine()
    val mixed = engine.assess(listOf(s(0, 80), s(10, 180), s(20, 76), s(30, -5)))
    if (mixed.currentPercent != 76 || mixed.observedDropPercent != 4 ||
        mixed.drainPercentPerHour != 12f ||
        mixed.recommendation != BatteryGamingRecommendation.NORMAL
    ) error("GAMEHUB_BATTERY_RED_INVALID_PERCENTAGE_ACCEPTED")
    val absent = engine.assess(listOf(s(0, 125), s(10, -5)))
    if (absent.currentPercent != null || absent.observedDropPercent != null ||
        absent.drainPercentPerHour != null
    ) error("GAMEHUB_BATTERY_RED_INVALID_PERCENTAGE_ACCEPTED")
    println("GAMEHUB_BATTERY_ACCEPTANCE_GREEN")
}
