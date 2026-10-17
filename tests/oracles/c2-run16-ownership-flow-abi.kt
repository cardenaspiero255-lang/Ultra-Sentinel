package kotlinx.coroutines.flow
interface Flow<T>{val value:T}
class SimpleFlow<T>(override val value:T):Flow<T>
suspend fun <T> Flow<T>.first():T=value
