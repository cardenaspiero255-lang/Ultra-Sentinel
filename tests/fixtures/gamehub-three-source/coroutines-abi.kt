package kotlinx.coroutines

object Dispatchers { val IO: Any = Any() }
suspend fun <T> withContext(context: Any, block: suspend () -> T): T = block()
