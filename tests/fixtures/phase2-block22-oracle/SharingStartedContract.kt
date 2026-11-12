import kotlinx.coroutines.flow.SharingStarted
import kotlin.time.Duration
import kotlinx.coroutines.flow.WhileSubscribed

private fun expectIllegalArgument(case: String, block: () -> Unit) {
    var rejected = false
    try { block() } catch (_: IllegalArgumentException) { rejected = true }
    check(rejected) { "MISSING_BOUNDS_REJECTION:$case" }
}

fun main() {
    expectIllegalArgument("stopTimeout") { SharingStarted.WhileSubscribed(stopTimeoutMillis = -1) }
    expectIllegalArgument("replayExpiration") { SharingStarted.WhileSubscribed(replayExpirationMillis = -1) }
    val default = SharingStarted.WhileSubscribed()
    check(default.toString() == "SharingStarted.WhileSubscribed()") { "DEFAULT_BENIGN_STRING" }
    check(default == SharingStarted.WhileSubscribed(0L, Long.MAX_VALUE)) { "DEFAULT_BENIGN_EQUALITY" }
    check(default.hashCode() == SharingStarted.WhileSubscribed(0L, Long.MAX_VALUE).hashCode()) { "DEFAULT_BENIGN_HASH" }
    val explicit = SharingStarted.WhileSubscribed(5L, 0L)
    check(explicit.toString() == "SharingStarted.WhileSubscribed(stopTimeout=5ms, replayExpiration=0ms)") { "CONFIGURED_BENIGN_STRING" }
    check(explicit != default) { "CONFIGURED_BENIGN_INEQUALITY" }
    check(SharingStarted.Eagerly.toString() == "SharingStarted.Eagerly")
    check(SharingStarted.Lazily.toString() == "SharingStarted.Lazily")
    check(SharingStarted.WhileSubscribed(Duration.ZERO, Duration.INFINITE) == default) { "DURATION_MAPPING" }
    println("ORIGINAL_SHARING_STARTED_SCOPED_CONTROLS_PASS")
}
