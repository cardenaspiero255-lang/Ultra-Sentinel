package android.content

open class Context(private val batteryIntent: Intent? = null) {
    open val applicationContext: Context get() = this
    open fun <T> getSystemService(type: Class<T>): T? = null
    open fun registerReceiver(receiver: Any?, filter: IntentFilter): Intent? = batteryIntent
}

class Intent(private val extras: Map<String, Int> = emptyMap()) {
    fun getIntExtra(name: String, fallback: Int): Int = extras[name] ?: fallback
    companion object { const val ACTION_BATTERY_CHANGED = "battery" }
}

class IntentFilter(val action: String)
