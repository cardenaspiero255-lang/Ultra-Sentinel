package com.cardenaspiero255.gamehubultra.ai

private fun checkBehavior(ok:Boolean,label:String) {
    if(!ok)throw IllegalStateException("C2_NEXT_158_FAILED_"+label)
}
fun main(){
    var clock=1000L
    val audit=UltraFrontierAuditTrail(capacity=2,nowMillis={clock++})
    audit.record("alpha",UltraFrontierLane.LOCAL,UltraFrontierAuditEvent.PLAN_CREATED)
    audit.record("beta",UltraFrontierLane.RESEARCH,UltraFrontierAuditEvent.RESEARCH_ATTEMPT)
    audit.record("gamma",UltraFrontierLane.LOCAL,UltraFrontierAuditEvent.ACCEPT)
    val bounded=audit.snapshot()
    checkBehavior(bounded.size==2 &&
        bounded.map{it.correlationId}==listOf("beta","gamma"),
        "BOUNDED_CAPACITY_EVICTS_OLDEST")
    audit.record("   ",UltraFrontierLane.LOCAL,UltraFrontierAuditEvent.ABSTAIN)
    checkBehavior(audit.snapshot().size==2,"EMPTY_CORRELATION_IGNORED")
    audit.record("x".repeat(150),UltraFrontierLane.LOCAL,UltraFrontierAuditEvent.RETRY,
        attempt=-3,reasonCode="r".repeat(130))
    val last=audit.snapshot().last()
    checkBehavior(last.correlationId.length==96,
        "CORRELATION_TRUNCATION_VERIFIED")
    checkBehavior(last.reasonCode?.length==80,
        "REASON_TRUNCATION_VERIFIED")
    checkBehavior(last.attempt==null,"INVALID_ATTEMPT_IGNORED")
    audit.clear()
    checkBehavior(audit.snapshot().isEmpty(),"CLEAR_REMOVES_RECORDS")
    println("""{"schema":"ultra-sentinel-c2-next-original-pr158-audit-controls/v1","pr":158,"sourceGitBlob":"d1af5d8c6574c325fdacadec54748cb730c3aacd","boundedEvictionPassed":true,"emptyCorrelationIgnored":true,"correlationTruncated":true,"reasonTruncated":true,"invalidAttemptIgnored":true,"clearPassed":true,"executedOriginalSource":true,"candidateInspected":false,"baselineCompared":false,"negativeFindingLabelsEstablished":0,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
