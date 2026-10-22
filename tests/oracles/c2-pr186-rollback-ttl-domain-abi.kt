package com.cardenaspiero255.gamehubultra.domain

enum class PerformanceProfile { BALANCED, PERFORMANCE, X4 }
enum class ThermalPreference { BALANCED, PERFORMANCE }
enum class OrientationPreference { AUTO, PORTRAIT, LANDSCAPE }
data class ResolutionTarget(val width:Int,val height:Int)
data class GameProfileConfig(
    val performanceProfile:PerformanceProfile,
    val thermalPreference:ThermalPreference,
    val refreshRateTargetHz:Int?=null,
    val resolutionTarget:ResolutionTarget?=null,
    val orientationPreference:OrientationPreference=OrientationPreference.AUTO)
data class AiProfileProposal(val version:Int,val previousKnownGoodConfig:GameProfileConfig)
enum class ThermalTrend { UNKNOWN, STABLE, RISING }
enum class ThermalRisk { UNKNOWN, LOW, CRITICAL }
data class AdaptiveDecision(val profile:PerformanceProfile,val score:Int)
data class ThermalPrediction(
    val latestMeasuredHeadroom:Float?=null,
    val trend:ThermalTrend?=null,
    val risk:ThermalRisk?=null,
    val confidence:Float?=null)
data class SessionCoachSnapshot(
    val timestampMillis:Long,
    val batteryPercent:Int?=null,
    val batteryCharging:Boolean?=null,
    val powerSaveMode:Boolean?=null)
class ThermalPredictionEngine {
    fun predict(samples:List<SessionCoachSnapshot>):ThermalPrediction=ThermalPrediction()
}
