package com.cardenaspiero255.gamehubultra.domain

data class SessionCoachSnapshot(
    val timestampMillis: Long, val batteryPercent: Int?, val thermalStatus: Int?,
    val thermalHeadroom: Float?, val refreshRateHz: Float?, val latencyMs: Long?,
    val memoryUsedPercent: Int?, val batteryCharging: Boolean?, val powerSaveMode: Boolean?
)
class GamingReadiness
data class GamingReadinessInput(
    val cpuCores: Int, val totalRamMb: Long, val gpuAvailable: Boolean,
    val thermalStatus: Int?, val thermalHeadroom: Float?, val batteryPercent: Int?,
    val charging: Boolean, val refreshRateHz: Float?, val networkValidated: Boolean,
    val networkLatencyMs: Long?, val downstreamBandwidthKbps: Int?,
    val storageFreePercent: Int, val inputDeviceCount: Int
)
object GamingReadinessCalculator { fun calculate(input: GamingReadinessInput) = GamingReadiness() }
