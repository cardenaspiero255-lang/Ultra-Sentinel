package com.cardenaspiero255.gamehubultra.domain

fun main() {
    val samples = listOf(
        SessionCoachSnapshot(timestampMillis=0L,batteryPercent=80,batteryCharging=false),
        SessionCoachSnapshot(timestampMillis=600_000L,batteryPercent=69,batteryCharging=false)
    )
    val ordinary = BatteryAwareGamingEngine().assess(samples)
    check(ordinary.drainPercentPerHour != null && ordinary.drainPercentPerHour!! > 20f) {
        "C2_BATTERY_DRAIN_COMPUTATION_CONTROL"
    }
    check(ordinary.recommendation==BatteryGamingRecommendation.BALANCED) {
        "C2_BATTERY_EXPECTED_CONTROL"
    }
    println("C2_BATTERY_VALID_THRESHOLD_CONTROL_PASS")
    val rejected = runCatching {
        BatteryAwareGamingPolicy(highDrainPercentPerHour=Float.POSITIVE_INFINITY)
    }.isFailure
    check(rejected) { "C2_BATTERY_INFINITE_THRESHOLD_UNRESTRICTED" }
    println("C2_BATTERY_FINITE_THRESHOLD_REQUIRED_PASS")
}
