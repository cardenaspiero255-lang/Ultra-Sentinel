package com.cardenaspiero255.gamehubultra.network
/* Compile-only domain types matching fields used by original CAR-51 sources. */
enum class NetworkGameProfile { BALANCED, DATA_SAVER, COMPETITIVE }
enum class NetworkStability { OFFLINE, UNMEASURED, POOR, FAIR, GOOD, EXCELLENT }
data class NetworkMetrics(
    val averageLatencyMs: Double?,
    val jitterMs: Double?,
    val packetLossPercent: Double?,
    val spikeCount: Int,
    val stability: NetworkStability
)
