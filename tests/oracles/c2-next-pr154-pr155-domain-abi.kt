package com.cardenaspiero255.gamehubultra.domain
// Minimal ABI-only contracts for exact original Kotlin implementation classes.
enum class SessionCoachSignal { THERMAL }
enum class SessionCoachPriority { INFO, ACTION }
data class SessionCoachMessage(
    val signal:SessionCoachSignal,
    val priority:SessionCoachPriority,
    val title:String,
    val detail:String,
    val action:String?
)
enum class ThermalRisk { LOW, MEDIUM, HIGH }
enum class ThermalTrend { FALLING, STABLE, RISING }
data class ThermalPrediction(
    val recovering:Boolean=false,
    val allowPreventiveSignal:Boolean=false,
    val confidence:Float=0f,
    val trend:ThermalTrend=ThermalTrend.STABLE,
    val risk:ThermalRisk=ThermalRisk.LOW
)
data class SessionCoachSnapshot(
    val timestampMillis:Long,
    val batteryPercent:Int?=null,
    val batteryCharging:Boolean=false,
    val powerSaveMode:Boolean=false
)
