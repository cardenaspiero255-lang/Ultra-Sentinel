package com.cardenaspiero255.gamehubultra.ai

enum class UltraVerificationMode { LOCAL, OPTIONAL, REQUIRED }
enum class UltraAnswerConfidence { LOW, MEDIUM, HIGH }
data class UltraGeneralQueryRequest(val verificationMode: UltraVerificationMode)
data class UltraVerifiedResearchResult(
    val message: String,
    val abstained: Boolean = false,
    val confidence: UltraAnswerConfidence = UltraAnswerConfidence.HIGH,
    val sources: List<String> = emptyList(),
    val independentSourceCount: Int = 0,
    val fromCache: Boolean = false,
    val timedOut: Boolean = false,
    val fallbackUsed: Boolean = false,
    val reasonCode: String? = null,
    val retryable: Boolean = false,
    val stage: String? = null,
    val upstreamStatus: Int? = null
)
interface UltraResearchGateway {
    val supportsProviderPartitioning: Boolean get() = false
    val providerPartitionCapacity: Int? get() = null
    fun answer(request: UltraGeneralQueryRequest): UltraVerifiedResearchResult
}
