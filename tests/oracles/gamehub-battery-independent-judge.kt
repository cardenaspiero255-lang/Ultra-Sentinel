package com.cardenaspiero255.gamehubultra.domain

private fun reading(min: Int, percent: Int?, charging: Boolean = false): SessionCoachSnapshot =
    SessionCoachSnapshot(min * 60_000L, percent, charging, false)

fun main() {
    val engine = BatteryAwareGamingEngine()
    val invalidOnly = engine.assess(listOf(reading(0, 200), reading(10, -100)))
    check(invalidOnly.currentPercent == null)
    check(invalidOnly.observedDropPercent == null)
    check(invalidOnly.recommendation == BatteryGamingRecommendation.NORMAL)

    val validBounds = engine.assess(listOf(reading(0, 100), reading(10, 0)))
    check(validBounds.currentPercent == 0)
    check(validBounds.observedDropPercent == 100)
    check(validBounds.recommendation == BatteryGamingRecommendation.CONSERVE)

    val charging = engine.assess(listOf(reading(0, 20, true), reading(10, 120, true)))
    check(charging.charging)
    check(charging.currentPercent == null)
    check(charging.observedDropPercent == null)

    val normal = engine.assess(listOf(reading(0, 85), reading(10, 85)))
    check(normal.currentPercent == 85)
    check(normal.observedDropPercent == 0)
    check(normal.recommendation == BatteryGamingRecommendation.NORMAL)
    println("GAMEHUB_BATTERY_INDEPENDENT_JUDGE_APPROVED")
}
