package com.cardenaspiero255.gamehubultra.domain
enum class PerformanceProfile(val title:String){ BALANCED("Equilibrado"),X4("X4"),FRAME_INTERPOLATION("Interpolación") }
enum class ThermalPreference { NORMAL,COOLER }
data class ResolutionTarget(val width:Int,val height:Int)
data class GameProfileConfig(
 val performanceProfile:PerformanceProfile=PerformanceProfile.BALANCED,
 val thermalPreference:ThermalPreference=ThermalPreference.NORMAL,
 val refreshRateTargetHz:Int?=null,val resolutionTarget:ResolutionTarget?=null)
enum class OptimizationFeedbackDecision { ACCEPTED, REJECTED, REVERTED, NONE }
data class OptimizationObservation(
 val profile:PerformanceProfile=PerformanceProfile.BALANCED,
 val stable:Boolean=false,val failed:Boolean=false,val highTemperature:Boolean=false,
 val thermalStatus:Int?=null,val feedbackDecision:OptimizationFeedbackDecision=OptimizationFeedbackDecision.NONE)
data class SessionCoachSnapshot(
 val timestampMillis:Long=0L,val refreshRateHz:Float?=null,
 val batteryPercent:Int?=null,val batteryCharging:Boolean?=false,val powerSaveMode:Boolean?=false)
