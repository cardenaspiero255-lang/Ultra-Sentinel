package com.cardenaspiero255.gamehubultra.domain

enum class PerformanceProfile { BALANCED, PERFORMANCE }
enum class ThermalTrend { UNKNOWN, STABLE, RISING }
enum class ThermalRisk { UNKNOWN, LOW, CRITICAL }
data class AdaptiveDecision(val profile: PerformanceProfile, val score: Int)
data class ThermalPrediction(
    val latestMeasuredHeadroom: Float? = null,
    val trend: ThermalTrend? = null,
    val risk: ThermalRisk? = null,
    val confidence: Float? = null
)
data class SessionCoachSnapshot(
    val timestampMillis: Long,
    val batteryPercent: Int? = null,
    val batteryCharging: Boolean? = null,
    val powerSaveMode: Boolean? = null
)
class ThermalPredictionEngine {
    fun predict(samples: List<SessionCoachSnapshot>): ThermalPrediction = ThermalPrediction()
}
