import kotlinx.coroutines.flow.FlowCollector
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine

private fun synchronously(block: suspend () -> Unit) {
    var result: Result<Unit>? = null
    block.startCoroutine(object : Continuation<Unit> {
        override val context = EmptyCoroutineContext
        override fun resumeWith(value: Result<Unit>) { result = value }
    })
    check(result != null) { "UNEXPECTED_SUSPENSION" }
    result!!.getOrThrow()
}

fun main() {
    val events = mutableListOf<Int>()
    val collector = FlowCollector<Int> { value -> events.add(value) }
    synchronously {
        collector.emit(7)
        collector.emit(-2)
        collector.emit(Int.MAX_VALUE)
    }
    check(events == listOf(7, -2, Int.MAX_VALUE)) { "BENIGN_COLLECTOR_SEQUENCE" }
    val err = FlowCollector<Int> { value -> if (value == -1) throw IllegalStateException("expected-collector-error") }
    var rejected = false
    try { synchronously { err.emit(-1) } }
    catch (e: IllegalStateException) { rejected = e.message == "expected-collector-error" }
    check(rejected) { "BENIGN_COLLECTOR_PROPAGATION" }
    println("ORIGINAL_FLOW_COLLECTOR_BENIGN_CONTROLS_PASS")
}
