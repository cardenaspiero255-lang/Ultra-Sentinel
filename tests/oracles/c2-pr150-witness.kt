package com.cardenaspiero255.gamehubultra.domain

private fun demand(value:Boolean,name:String) {
    if (!value) throw IllegalStateException("C2_PR150_CONTROL_FAILED_" + name)
}
private fun explain(vararg external:RecommendationExternalEvidence,
                    runtime:C2Runtime?=C2Runtime()):SmartRecommendationExplanation =
    SmartRecommendationExplanationFactory.build(
        input=SmartPerformanceInput(runtime=runtime,externalEvidence=external.toList()),
        recommendedProfile=PerformanceProfile.X4,reason="Se recomienda X4",
        measuredGood=emptyMap(),acceptedFeedback=emptyMap(),knownBad=emptyMap(),
        thermalHot=false,lowBattery=false,memoryPressure=false,storagePressure=false
    )
fun main() {
    val supportive=explain(RecommendationExternalEvidence("A favor","fuente-A",true,true,true))
    demand(supportive.confidence==RecommendationConfidenceBand.HIGH,"FRESH_SUPPORTIVE_HIGH")
    val weak=explain(RecommendationExternalEvidence("Documento antiguo","fuente-A",false,false,true))
    demand(weak.confidence==RecommendationConfidenceBand.MEDIUM,"STALE_UNTRUSTED_MEDIUM")
    val conflict=explain(RecommendationExternalEvidence("A favor","fuente-A",true,true,true),
                         RecommendationExternalEvidence("En contra","fuente-B",true,true,false))
    demand(conflict.confidence==RecommendationConfidenceBand.LOW &&
        conflict.contradictions.isNotEmpty(),"EXPLICIT_CONFLICT_LOW")
    val noRuntime=explain(RecommendationExternalEvidence("A favor","fuente-A",true,true,true),runtime=null)
    demand(noRuntime.confidence==RecommendationConfidenceBand.LOW,"NO_RUNTIME_LOW")
    val opposing=explain(RecommendationExternalEvidence("No respalda X4","fuente-A",true,true,false))
    val observedHigh=opposing.confidence==RecommendationConfidenceBand.HIGH
    val contradiction=opposing.contradictions.isNotEmpty()
    // A reproducible behavioral witness is NOT an independently sealed truth label.
    println("""{"schema":"c2-pr150-original-source-witness/v1","pr":150,"blob":"37866fd3dbfcd19d9daaf29a5e1e426391c723d4","supportiveControlPassed":true,"weakControlPassed":true,"conflictControlPassed":true,"missingRuntimeControlPassed":true,"soleOpposingSourceHigh":$observedHigh,"soleOpposingSourceContradictionRecorded":$contradiction,"sealedPositiveLabels":0,"sealedNegativeLabels":0,"precision":null,"recall":null,"f1":null,"certified":false}""")
    demand(observedHigh && !contradiction,"OPPOSITION_BEHAVIOR_HYPOTHESIS")
}
