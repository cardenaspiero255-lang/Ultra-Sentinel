package timber.log
object Timber {
    fun v(message: String) { require(message.isNotEmpty()) }
    fun e(error: Exception) { require(error.message != "TEST_FAILED") }
}
