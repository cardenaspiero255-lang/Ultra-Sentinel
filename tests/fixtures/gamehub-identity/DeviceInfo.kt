package com.cardenaspiero255.gamehubultra.platform

// JVM ABI stub used only with the original SHA-pinned Kotlin source.
data class DeviceInfo(
    val manufacturer: String,
    val model: String,
    val androidVersion: String = "14",
    val sdkInt: Int = 34,
    val supportedAbis: List<String> = emptyList(),
    val cpuModel: String = "test",
    val cpuCores: Int = 8,
    val totalRamMb: Long = 8192L,
    val gpuVendor: String? = "vendor",
    val gpuRenderer: String? = "renderer"
)
