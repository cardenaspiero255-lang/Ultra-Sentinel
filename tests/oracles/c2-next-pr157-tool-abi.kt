package com.cardenaspiero255.gamehubultra.tools

// ABI-only substitutes for dependencies outside this sealed source file.
// Never supply or replace the original UltraFrontierToolGateway.
enum class UltraToolSideEffect { READ_ONLY, MIXED, MUTATES_STATE }
data class UltraToolDescriptor(val id:String,val sideEffect:UltraToolSideEffect)
data class UltraToolResult<O>(val accepted:Boolean,val value:O?=null,val message:String?=null)
interface UltraToolContract<I,O> {
    val descriptor:UltraToolDescriptor
    fun execute(request:I):UltraToolResult<O>
}
object UltraToolExecution {
    fun <O> invalidInput(descriptor:UltraToolDescriptor,message:String):UltraToolResult<O> =
        UltraToolResult(false,null,message)
}
