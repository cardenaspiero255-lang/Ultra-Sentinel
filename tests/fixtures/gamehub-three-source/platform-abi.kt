package com.cardenaspiero255.gamehubultra.platform
import android.content.Context

data class PeripheralDiagnostics(val a: Int, val b: Int, val c: Int, val d: Int)
object PeripheralDiagnosticsProvider { fun get(context: Context) = PeripheralDiagnostics(0, 0, 0, 0) }
data class DeviceInfo(val cpuCores: Int, val totalRamMb: Long, val gpuRenderer: String?, val gpuVendor: String?)
