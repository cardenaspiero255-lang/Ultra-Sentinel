package androidx.compose.runtime.saveable
class Saver<Original, Saveable>(
    val save: (Original) -> Saveable,
    val restore: (Saveable) -> Original
)
fun <Original, Saveable> rememberSaveable(
    saver: Saver<Original, Saveable>, init: () -> Original
): Original = init()
