package com.cardenaspiero255.gamehubultra.domain

// Test-only ABI shims. The production explanation factory must be fetched at a pinned Git blob.
enum class PerformanceProfile { BALANCED, FRAME_INTERPOLATION, X4 }
data class C2Device(val cpuCores:Int=8,val totalRamMb:Int=12288,val gpuVendor:String?="ARM",val gpuRenderer:String?="Mali-G77")
data class C2Thermal(val status:Int?=0,val headroom:Float?=0.25f)
data class C2Battery(val percent:Int?=80)
data class C2Refresh(val currentRefreshRateHz:Float?=120f)
data class C2Connectivity(val latencyMs:Long?=30L)
data class C2Runtime(val thermal:C2Thermal=C2Thermal(),val battery:C2Battery=C2Battery(),val refresh:C2Refresh=C2Refresh(),val connectivity:C2Connectivity=C2Connectivity())
data class SmartPerformanceInput(
    val device:C2Device=C2Device(),val runtime:C2Runtime?=C2Runtime(),
    val gameVersion:String?="1.0",val currentProfile:PerformanceProfile=PerformanceProfile.BALANCED,
    val historicalObservations:List<String> = emptyList(),
    val externalEvidence:List<RecommendationExternalEvidence> = emptyList()
)
