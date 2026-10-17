package com.cardenaspiero255.gamehubultra.ai

import com.cardenaspiero255.gamehubultra.domain.PerformanceProfile

data class GameHubAiContext(
    val selectedGamePackage: String? = "game.example",
    val sessionActive: Boolean = true,
    val selectedProfile: PerformanceProfile = PerformanceProfile.PERFORMANCE,
    val networkValidated: Boolean = true,
    val networkLatencyMs: Long? = null,
    val batteryPercent: Int? = 80,
    val charging: Boolean = false,
    val thermalStatus: Int? = null,
    val thermalHeadroom: Float? = null
)
