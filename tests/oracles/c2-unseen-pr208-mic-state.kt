package com.cardenaspiero255.gamehubultra.voice
/**
 * Original ContinuousVoiceController from frozen PR #208, pure injected
 * gateway. No Android service is started: this proves persisted-state logic,
 * not microphone acquisition or physical audio behavior.
 */
private class FakeGateway(
    var flag:Boolean=false,
    var micAllowed:Boolean=true,
    var available:Boolean=true,
    var startFailure:RuntimeException?=null
):ContinuousVoiceGateway {
    var starts=0
    var stops=0
    override fun isEnabled():Boolean=flag
    override fun setEnabled(enabled:Boolean){flag=enabled}
    override fun hasRecordAudioPermission():Boolean=micAllowed
    override fun canRunContinuousVoice():Boolean=available
    override fun startWakeService(){starts++;startFailure?.let{throw it}}
    override fun stopWakeService(){stops++}
}
private fun demand(value:Boolean,what:String){
    if(!value)throw IllegalStateException("C2_ORACLE_CONTROL_FAILED_"+what)
}
fun main(){
    val fresh=FakeGateway(flag=false,micAllowed=false)
    val f=ContinuousVoiceController(fresh)
    demand(f.setEnabled(true)==ContinuousVoiceChange.PERMISSION_REQUIRED &&
        !fresh.flag && fresh.starts==0,"NEW_REQUEST_WITHOUT_PERMISSION_STAYS_OFF")

    val revoked=FakeGateway(flag=true,micAllowed=false)
    val resume=ContinuousVoiceController(revoked)
    demand(!resume.resumeIfEnabled()&&!revoked.flag&&revoked.stops==1,
        "RESUME_PERMISSION_REVOKED_DISALLOWS_ACTIVE")

    val deniedSystem=FakeGateway(flag=true,micAllowed=true,available=false)
    val denied=ContinuousVoiceController(deniedSystem)
    demand(denied.setEnabled(true)==ContinuousVoiceChange.SYSTEM_RESTRICTED &&
        !deniedSystem.flag&&deniedSystem.stops==1,
        "SYSTEM_RESTRICTED_DISALLOWS_ACTIVE")

    val androidDenied=FakeGateway(flag=true,micAllowed=true,
        startFailure=SecurityException("microphone revoked during service start"))
    val deniedStart=ContinuousVoiceController(androidDenied)
    demand(deniedStart.setEnabled(true)==ContinuousVoiceChange.SYSTEM_RESTRICTED &&
        !androidDenied.flag&&androidDenied.stops==1,
        "SERVICE_SECURITY_EXCEPTION_DISALLOWS_ACTIVE")

    val manualDisable=FakeGateway(flag=true,micAllowed=false)
    val manual=ContinuousVoiceController(manualDisable)
    demand(manual.setEnabled(false)==ContinuousVoiceChange.DISABLED &&
        !manualDisable.flag&&manualDisable.stops==1,
        "MANUAL_DISABLE_ALWAYS_CLEARS")

    // Adversarial state: persisted enabled before Android permission was revoked,
    // then user hits enable again (not resume). The original returns early
    // without clearing enabled or stopping service, unlike every control above.
    val stale=FakeGateway(flag=true,micAllowed=false)
    val controller=ContinuousVoiceController(stale)
    val result=controller.setEnabled(true)
    val reproduced=result==ContinuousVoiceChange.PERMISSION_REQUIRED &&
        stale.flag&&stale.stops==0&&stale.starts==0
    demand(reproduced,"PERMISSION_REVOKED_PERSISTS_ENABLED_REPRODUCED")
    println("""{"schema":"ultra-sentinel-c2-unseen-pr208-voice-permission-witness/v1","pr":208,"sourceGitBlob":"9298fe614e1ddbad27e2253c02e9415122cfa263","rule":"STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/voice/ContinuousVoiceController.kt","line":52,"reproduced":true,"staleEnabledAfterDenied":true,"stopCallMissing":true,"freshPermissionControlPassed":true,"resumeControlPassed":true,"systemRestrictionControlPassed":true,"securityExceptionControlPassed":true,"disableControlPassed":true,"candidateInspected":false,"baselineCompared":false,"physicalMicObserved":false,"negativeFindingLabelsEstablished":0,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
