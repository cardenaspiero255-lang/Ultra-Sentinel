package kotlinx.coroutines.flow.internal
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.FlowCollector
public fun <T> unsafeFlow(block: suspend FlowCollector<T>.() -> Unit): Flow<T> = object : Flow<T> {}
