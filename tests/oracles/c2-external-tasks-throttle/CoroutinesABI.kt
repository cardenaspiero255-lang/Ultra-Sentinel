package kotlinx.coroutines
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine

// Test-only stand-in: no suspension occurs in the exercised original callback.
fun <T> runBlocking(block: suspend () -> T): T {
    var received: Result<T>? = null
    block.startCoroutine(object : Continuation<T> {
        override val context = EmptyCoroutineContext
        override fun resumeWith(result: Result<T>) { received = result }
    })
    return requireNotNull(received).getOrThrow()
}
