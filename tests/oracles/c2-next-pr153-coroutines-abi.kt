package kotlinx.coroutines

class CancellationException:IllegalStateException()
object NonCancellable
suspend fun <T> withContext(context:Any,action:suspend()->T):T=action()
