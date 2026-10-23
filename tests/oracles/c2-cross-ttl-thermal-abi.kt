package com.cardenaspiero255.gamehubultra.domain
enum class PerformanceProfile { BALANCED, PERFORMANCE }
enum class ThermalTrend { UNKNOWN, STABLE, RISING }
enum class ThermalRisk { UNKNOWN, LOW, CRITICAL }
data class AdaptiveDecision(val profile:PerformanceProfile,val score:Int)
data class ThermalPrediction(val latestMeasuredHeadroom:Float?=null,val trend:ThermalTrend?=null,val risk:ThermalRisk?=null,val confidence:Float?=null)
class ThermalPredictionEngine {fun predict(samples:List<SessionCoachSnapshot>):ThermalPrediction=ThermalPrediction()}
enum class BatteryGamingRecommendation { NORMAL, BALANCED }
data class BatteryGamingAssessment(val currentPercent:Int?=null,val charging:Boolean=false,val recommendation:BatteryGamingRecommendation=BatteryGamingRecommendation.NORMAL,val preventAggressiveProfiles:Boolean=false)
class BatteryAwareGamingEngine {fun assess(samples:List<SessionCoachSnapshot>):BatteryGamingAssessment=BatteryGamingAssessment()}
data class GamingReadiness(val score:Int,val label:String,val reasons:List<String>)
