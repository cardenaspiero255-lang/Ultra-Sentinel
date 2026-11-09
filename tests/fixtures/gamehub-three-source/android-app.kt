package android.app

class ActivityManager {
    class MemoryInfo { var totalMem: Long = 0; var availMem: Long = 0 }
    fun getMemoryInfo(info: MemoryInfo) = Unit
}
