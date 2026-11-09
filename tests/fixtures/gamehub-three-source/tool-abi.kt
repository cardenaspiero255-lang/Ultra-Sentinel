package com.cardenaspiero255.gamehubultra.tools

enum class UltraToolKind { TELEMETRY }
enum class UltraToolSideEffect { READ_ONLY }
data class UltraToolDescriptor(val id: String, val kind: UltraToolKind, val sideEffect: UltraToolSideEffect)
sealed class UltraToolResult<out T> { data class Success<T>(val value: T): UltraToolResult<T>() }
interface UltraToolContract<in I, out O> {
    val descriptor: UltraToolDescriptor
    fun execute(request: I): UltraToolResult<O>
}
object UltraToolExecution {
    fun <T> protect(descriptor: UltraToolDescriptor, block: () -> T): UltraToolResult<T> =
        UltraToolResult.Success(block())
}
