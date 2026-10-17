package com.cardenaspiero255.gamehubultra.domain

data class SessionCoachSnapshot(
    val timestampMillis: Long,
    val batteryPercent: Int? = null,
    val batteryCharging: Boolean? = false,
    val powerSaveMode: Boolean? = false
)
