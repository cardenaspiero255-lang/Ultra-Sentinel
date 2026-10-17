package com.cardenaspiero255.gamehubultra.domain

fun main() {
    val accepted = ThermalPredictionPolicy(minimumSamples = 3)
    check(accepted.minimumSamples == 3) {
        "C2_THERMAL_VALID_SAMPLE_MINIMUM_REJECTED"
    }
    println("C2_THERMAL_NORMAL_POLICY_CONTROL_PASS")

    val rejected = runCatching {
        ThermalPredictionPolicy(minimumSamples = 2)
    }.isFailure
    check(rejected) {
        "C2_THERMAL_UNDERSAMPLED_POLICY_ALLOWED"
    }
    println("C2_THERMAL_UNDERSAMPLED_POLICY_SAFE_PASS")
}
