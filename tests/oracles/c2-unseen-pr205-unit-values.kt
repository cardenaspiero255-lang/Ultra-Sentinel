package com.cardenaspiero255.gamehubultra.ai
/** Test independent from detector and baseline output; executes original graph. */
private fun demand(x:Boolean,why:String){if(!x)error("C2_ORACLE_CONTROL_FAILED_"+why)}
private fun sample(graph:UltraFrontierV2ClaimProvenanceGraph,claim:String,
    value:String,source:String,authority:Boolean=false) {
    graph.record(UltraFrontierV2ClaimEvidence(
        claimId=claim,normalizedValue=value,sourceId=source,providerId=source,
        authoritative=authority))
}
fun main(){
    val differentNumber=UltraFrontierV2ClaimProvenanceGraph()
    sample(differentNumber,"price","100","shop-1",true)
    sample(differentNumber,"price","900","shop-2",false)
    val numeric=differentNumber.snapshot("price","100")!!
    demand(numeric.supportingSources==1&&numeric.conflictingSources==1&&numeric.hasConflict,
        "NUMERIC_CONTRADICTION_RECOGNIZED")

    val prose=UltraFrontierV2ClaimProvenanceGraph()
    sample(prose,"status","Accepted","provider-A")
    sample(prose,"STATUS","accepted","provider-B")
    val p=prose.snapshot("status","ACCEPTED")!!
    demand(p.supportingSources==2&&!p.hasConflict,"PROSE_CASE_INSENSITIVE")

    val separate=UltraFrontierV2ClaimProvenanceGraph()
    sample(separate,"research-answer:capacidad valor-numerico GB","8","bytes")
    sample(separate,"research-answer:capacidad valor-numerico Gb","8","bits")
    demand(separate.snapshot("research-answer:capacidad valor-numerico GB","8")!!
      .independentSources==1,"DISTINCT_MEASUREMENT_CLAIM_IDS")

    val graph=UltraFrontierV2ClaimProvenanceGraph()
    val key="research-answer:enlace reporta medida"
    sample(graph,key,"8 GB","manufacturer",true)
    sample(graph,key,"8 Gb","reviewer",false)
    val result=graph.snapshot(key,"8 GB")!!
    val wronglyTrusted=result.supportingSources==2&&result.conflictingSources==0&&
      !result.hasConflict&&result.hasAuthoritativeSupport&&result.independentSources==2
    demand(wronglyTrusted,"UNIT_CASE_COLLISION_REPRODUCED")

    println("""{"schema":"ultra-sentinel-c2-unseen-pr205-value-witness/v1","pr":205,"sourceGitBlob":"f0461cd51e00d2d7b2bc4225aeefee400e2e9fa4","rule":"CLAIM_VALUE_UNIT_CASE_COLLISION","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt","line":318,"reproduced":true,"observedSupportingSources":${result.supportingSources},"observedConflictingSources":${result.conflictingSources},"numericConflictControlPassed":true,"ordinaryProseControlPassed":true,"distinctUnitClaimIdControlPassed":true,"candidateInspected":false,"baselineCompared":false,"negativeFindingLabelsEstablished":0,"globalPrecision":null,"globalRecall":null,"globalF1":null,"tripleSPlusCertified":false}""")
}
