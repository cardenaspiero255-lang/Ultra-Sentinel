package com.cardenaspiero255.gamehubultra.ai

fun main() {
    var researchCalls = 0
    val gateway = object : UltraResearchGateway {
        override fun answer(request: UltraGeneralQueryRequest): UltraVerifiedResearchResult {
            researchCalls++
            return UltraVerifiedResearchResult(message="UNTRUSTED_ONLINE_REPLY")
        }
    }
    val executor = UltraQueryExecutionCoordinator(gateway)
    val local = executor.answer(UltraGeneralQueryRequest(UltraVerificationMode.LOCAL)) {
        "  CPU significa unidad central de procesamiento  "
    }
    check(researchCalls==0) { "C2_LOCAL_MUST_NOT_CALL_REMOTE_RESEARCH" }
    check(local.message == "CPU significa unidad central de procesamiento") {
        "C2_LOCAL_RESPONSE_CONTROL"
    }
    check(!local.verified && !local.abstained) {
        "C2_LOCAL_MUST_NOT_CLAIM_VERIFIED"
    }
    println("C2_LOCAL_RESPONSE_CONTROL_PASS")
    println("C2_LOCAL_NO_REMOTE_GATEWAY_PASS")
    val required = executor.answer(UltraGeneralQueryRequest(UltraVerificationMode.REQUIRED)) {
        "LOCAL_UNVERIFIED"
    }
    check(researchCalls==1 && required.message=="UNTRUSTED_ONLINE_REPLY") {
        "C2_REQUIRED_NETWORK_CONTROL"
    }
    println("C2_REQUIRED_BOUNDARY_PASS")
}
