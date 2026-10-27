package com.cardenaspiero255.gamehubultra.domain

// Independent, distinct acceptance data; not an invocation of GREEN's assertions.
fun main() {
    val defaults = BatteryAwareGamingPolicy()
    check(defaults.highDrainPercentPerHour.isFinite())
    check(defaults.highDrainPercentPerHour > 0f)
    for (invalid in listOf(Float.POSITIVE_INFINITY, Float.NaN, Float.NEGATIVE_INFINITY, 0f, -1f)) {
        check(runCatching {
            BatteryAwareGamingPolicy(highDrainPercentPerHour = invalid)
        }.exceptionOrNull() is IllegalArgumentException)
    }
    val finite = BatteryAwareGamingPolicy(highDrainPercentPerHour = 20f)
    val engine = BatteryAwareGamingEngine(finite)
    val samples = listOf(
        SessionCoachSnapshot(0L, 80, false, false),
        SessionCoachSnapshot(10 * 60_000L, 75, false, false)
    )
    val observed = engine.assess(samples)
    check(observed.drainPercentPerHour == 30f)
    check(observed.recommendation == BatteryGamingRecommendation.BALANCED)
    check(observed.preventAggressiveProfiles)
    println("GAMEHUB_BATTERY_FINITE_POLICY_JUDGE_APPROVED")
}
