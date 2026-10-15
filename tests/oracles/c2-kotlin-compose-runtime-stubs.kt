package androidx.compose.runtime
@Target(AnnotationTarget.FUNCTION)
annotation class Composable
class MutableState<T>(var value: T)
fun <T> mutableStateOf(value: T): MutableState<T> = MutableState(value)
