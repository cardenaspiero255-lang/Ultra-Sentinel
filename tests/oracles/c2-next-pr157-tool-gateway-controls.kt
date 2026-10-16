package com.cardenaspiero255.gamehubultra.ai

import com.cardenaspiero255.gamehubultra.tools.UltraToolContract
import com.cardenaspiero255.gamehubultra.tools.UltraToolDescriptor
import com.cardenaspiero255.gamehubultra.tools.UltraToolResult
import com.cardenaspiero255.gamehubultra.tools.UltraToolSideEffect

private class ControlledTool(
    override val descriptor:UltraToolDescriptor
):UltraToolContract<String,String> {
    var invocations=0
    override fun execute(request:String):UltraToolResult<String> {
        invocations++
        return UltraToolResult(true,request)
    }
}
private fun checkBehavior(ok:Boolean,label:String) {
    if(!ok)throw IllegalStateException("C2_NEXT_157_FAILED_"+label)
}
fun main() {
    val gate=UltraFrontierToolGateway()
    val read=ControlledTool(UltraToolDescriptor("read-status",UltraToolSideEffect.READ_ONLY))
    checkBehavior(gate.execute(read,"ping").accepted && read.invocations==1,
        "READ_ONLY_WITHOUT_APPROVAL_ACCEPTED")

    val mutate=ControlledTool(UltraToolDescriptor("change-profile",UltraToolSideEffect.MUTATES_STATE))
    val denied=gate.execute(mutate,"enable")
    checkBehavior(!denied.accepted && mutate.invocations==0,
        "MUTATION_WITHOUT_APPROVAL_BLOCKED")
    val wrong=gate.execute(mutate,"enable",
        UltraFrontierToolAuthorization(true,"read-status"))
    checkBehavior(!wrong.accepted&&mutate.invocations==0,
        "MUTATION_WRONG_TOOL_BLOCKED")
    val allowed=gate.execute(mutate,"enable",
        UltraFrontierToolAuthorization(true,"change-profile"))
    checkBehavior(allowed.accepted&&mutate.invocations==1,
        "MUTATION_CONFIRMED_EXECUTES")

    val mixed=ControlledTool(UltraToolDescriptor("mixed-operation",UltraToolSideEffect.MIXED))
    val mixedBlocked=gate.execute(mixed,"update")
    checkBehavior(!mixedBlocked.accepted&&mixed.invocations==0,
        "MIXED_WITHOUT_APPROVAL_BLOCKED")
    val mixedAllowed=gate.execute(mixed,"update",
        UltraFrontierToolAuthorization(true,"mixed-operation"))
    checkBehavior(mixedAllowed.accepted&&mixed.invocations==1,
        "MIXED_CONFIRMED_EXECUTES")
    val another=ControlledTool(UltraToolDescriptor("other-tool",UltraToolSideEffect.MUTATES_STATE))
    val cross=gate.execute(another,"update",
        UltraFrontierToolAuthorization(true,"change-profile"))
    checkBehavior(!cross.accepted&&another.invocations==0,
        "TOOL_BOUND_CONFIRMATION_NON_TRANSFERABLE")

    println("""{"schema":"ultra-sentinel-c2-next-original-pr157-tool-controls/v1","pr":157,"sourceGitBlob":"a4361860bc51d5473766b6fb82f10bdca2b154ce","readOnlyWithoutApprovalPassed":true,"unapprovedMutationBlocked":true,"wrongToolBlocked":true,"correctToolConfirmed":true,"mixedWithoutApprovalBlocked":true,"mixedWithApprovalAccepted":true,"crossToolConfirmationBlocked":true,"executedOriginalSource":true,"candidateInspected":false,"baselineCompared":false,"negativeFindingLabelsEstablished":0,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
