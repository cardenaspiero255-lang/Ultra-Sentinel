package com.cardenaspiero255.gamehubultra.domain

// Contract-shaped dependency for the original BatteryAwareGamingEngine.
data class SessionCoachSnapshot(
    val timestampMillis: Long,
    val batteryPercent: Int?,
    val batteryCharging: Boolean?,
    val powerSaveMode: Boolean?
)
