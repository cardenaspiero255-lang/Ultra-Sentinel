package com.cardenaspiero255.gamehubultra.ai

enum class UltraQueryKind { GENERAL }
enum class UltraVerificationMode { REQUIRED }
data class UltraGeneralQueryRequest(
    val originalText: String,
    val kind: UltraQueryKind = UltraQueryKind.GENERAL,
    val verificationMode: UltraVerificationMode = UltraVerificationMode.REQUIRED,
    val requiresFreshData: Boolean = false,
    val correlationId: String = "c2-run14"
)
object UltraResearchProtocol { const val ENGINE_VERSION = "c2-run14" }
