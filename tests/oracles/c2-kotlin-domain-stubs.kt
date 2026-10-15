package com.cardenaspiero255.gamehubultra.domain
/* Test-only ABI shims; actual engines/policies/models are fetched byte-identically. */
enum class ThermalRisk { LOW, MEDIUM, HIGH, CRITICAL }
data class ThermalPrediction(val risk: ThermalRisk, val allowPreventiveSignal: Boolean = false, val confidence: Float = 0f)
data class BatteryGamingAssessment(val preventAggressiveProfiles: Boolean = false, val recommendation: String = "none")
