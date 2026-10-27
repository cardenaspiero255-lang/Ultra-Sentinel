package com.cardenaspiero255.gamehubultra.domain

// RED must fail on the actual original Kotlin for precisely +Infinity.
fun main() {
    for (invalid in listOf(Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY, Float.NaN)) {
        val rejected = try {
            BatteryAwareGamingPolicy(highDrainPercentPerHour = invalid)
            false
        } catch (_: IllegalArgumentException) {
            true
        }
        if (!rejected) error("GAMEHUB_BATTERY_RED_NONFINITE_POLICY_ACCEPTED")
    }
    println("GAMEHUB_BATTERY_FINITE_POLICY_GREEN")
}
