package kotlinx.coroutines.flow

interface Flow<out T> { suspend fun first(): T }

class ValueFlow<T>(private val factory: () -> T): Flow<T> {
    override suspend fun first(): T = factory()
}

fun <T,R> Flow<T>.map(transform: suspend (T) -> R): Flow<R> {
    val upstream = this
    return object : Flow<R> {
        override suspend fun first(): R = transform(upstream.first())
    }
}
