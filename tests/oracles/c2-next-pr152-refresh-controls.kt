package com.cardenaspiero255.gamehubultra.domain
private fun demand(ok:Boolean,code:String){
    if(!ok)throw IllegalStateException("C2_NEXT_152_CONTROL_FAILED_"+code)
}
private fun samples(rate:Float,count:Int):List<SessionCoachSnapshot> =
    List(count){SessionCoachSnapshot(refreshRateHz=rate)}
private fun proposal(samples:List<SessionCoachSnapshot>, existing:Int?=null):AiProfileProposal =
    AiProfileBuilder.propose(
        currentConfig=GameProfileConfig(refreshRateTargetHz=existing),
        observations=emptyList(),sessionSamples=samples,
        capabilities=AiProfileCapabilities(supportedRefreshRatesHz=setOf(60)),version=1)
fun main(){
    // Semantic fault predicate is independent of the frozen candidate detector.
    // Incompatible plurality must not suppress independently stable supported 60 Hz.
    val poisoned=samples(120f,4)+samples(60f,3)
    val actual=proposal(poisoned).proposedConfig.refreshRateTargetHz
    demand(actual==null,"UNSUPPORTED_PLURALITY_SUPPRESSES_SUPPORTED_STABLE_RATE")
    demand(proposal(samples(60f,4)+samples(120f,2))
        .proposedConfig.refreshRateTargetHz==60,"SUPPORTED_PLURALITY_IS_SELECTED")
    demand(proposal(samples(120f,4)).proposedConfig.refreshRateTargetHz==null,
        "UNSUPPORTED_ONLY_NEVER_SELECTED")
    demand(proposal(samples(60f,2)).proposedConfig.refreshRateTargetHz==null,
        "INSUFFICIENT_SUPPORTED_EVIDENCE_NOT_SELECTED")
    demand(proposal(poisoned,existing=60).proposedConfig.refreshRateTargetHz==60,
        "EXISTING_SUPPORTED_TARGET_PRESERVED")
    println("""{"schema":"ultra-sentinel-c2-next-original-pr152-refresh-witness/v1","pr":152,"sourceGitBlob":"549e3b1d619b83e59bc37b31b4860191c25528f1","rule":"SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY","line":207,"reproducedBehavioralDefect":true,"supportedPluralitySelected":true,"unsupportedOnlyRejected":true,"insufficientSamplesRejected":true,"existingTargetPreserved":true,"executedOriginalSource":true,"candidateInspected":false,"baselineCompared":false,"positiveFindingLabelsSealed":0,"negativeFindingLabelsEstablished":0,"precision":null,"recall":null,"f1":null,"fpNonRegressionVerified":false,"tripleSPlusCertified":false}""")
}
