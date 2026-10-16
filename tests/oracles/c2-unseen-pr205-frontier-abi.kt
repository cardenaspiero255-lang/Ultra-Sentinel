package com.cardenaspiero255.gamehubultra.ai
/** Test-only definitions of external ABI types. All measured logic is Git-original. */
enum class UltraFrontierLane {
    DEEP_RESEARCH, VERIFIED_RESEARCH, TOOL_ACTION, BLOCKED, LOCAL_DELIBERATE, LOCAL_FAST
}
enum class UltraFrontierSpecialist {
    ROUTER, MEMORY, TELEMETRY, MULTIMODAL, RESEARCH, LOCAL_REASONER,
    SYNTHESIZER, VERIFIER, TOOL_GATEWAY, SAFETY_GATE, CRITIC
}
enum class UltraVerificationMode { REQUIRED, OPTIONAL }
data class C2Query(val verificationMode: UltraVerificationMode = UltraVerificationMode.OPTIONAL,
    val requiresFreshData: Boolean = false)
data class UltraFrontierRequest(val query: C2Query)
data class UltraFrontierTask(
    val id: String,
    val specialist: UltraFrontierSpecialist,
    val dependsOn: Set<String> = emptySet()
)
