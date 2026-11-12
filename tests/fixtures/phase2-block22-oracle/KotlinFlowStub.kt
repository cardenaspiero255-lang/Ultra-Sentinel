package kotlinx.coroutines.flow

public interface Flow<out T>
public interface StateFlow<out T> : Flow<T>
private class StubFlow<T> : Flow<T>
public fun <T> flowOf(item: T): Flow<T> = StubFlow()
public suspend fun <T> Flow<T>.collect(block: suspend (T) -> Unit) = Unit
public fun <T, R> Flow<T>.transformLatest(transform: suspend FlowCollector<R>.(T) -> Unit): Flow<R> = StubFlow()
public fun <T> Flow<T>.dropWhile(predicate: suspend (T) -> Boolean): Flow<T> = this
public fun <T> Flow<T>.distinctUntilChanged(): Flow<T> = this
