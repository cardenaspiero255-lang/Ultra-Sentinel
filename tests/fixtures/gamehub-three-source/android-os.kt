package android.os

object BatteryManager {
    const val EXTRA_LEVEL = "level"
    const val EXTRA_SCALE = "scale"
    const val EXTRA_STATUS = "status"
    const val BATTERY_STATUS_CHARGING = 2
    const val BATTERY_STATUS_FULL = 5
}
object Build {
    object VERSION { const val SDK_INT = 20 }
    object VERSION_CODES { const val Q = 29; const val R = 30 }
}
class PowerManager {
    val currentThermalStatus: Int = 0
    val isPowerSaveMode: Boolean = false
    fun getThermalHeadroom(seconds: Int): Float = 0f
}
class StatFs(path: String) { val availableBytes: Long = 0; val totalBytes: Long = 0 }
object Environment { fun getDataDirectory(): java.io.File = java.io.File("/") }
object SystemClock { fun elapsedRealtime(): Long = 0L }
