package com.cardenaspiero255.gamehubultra.domain

private fun requireTruth(v: Boolean, case: String) {
    if (!v) throw IllegalStateException("C2_PR150_BAD_HISTORY_ORACLE_FAILED_" + case)
}
private fun evaluateBadOnly(history: List<String>): SmartRecommendationExplanation =
    SmartRecommendationExplanationFactory.build(
        input = SmartPerformanceInput(
            historicalObservations = history,
            externalEvidence = emptyList(),
            gameVersion = "1.0",
            runtime = C2Runtime()
        ),
        recommendedProfile = PerformanceProfile.X4,
        reason = "Se recomienda X4 en este juego.",
        measuredGood = emptyMap(),
        acceptedFeedback = emptyMap(),
        knownBad = mapOf(PerformanceProfile.X4 to 2),
        thermalHot = false,
        lowBattery = false,
        memoryPressure = false,
        storagePressure = false
    )
fun main() {
    val failedOnly = evaluateBadOnly(listOf("failed-X4", "reverted-X4"))
    requireTruth(failedOnly.unavailableData.isEmpty(),
        "NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE_ALL_DATA")
    requireTruth(failedOnly.contradictions.isEmpty(),
        "NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE_NO_CONTRADICTION_FLAG")
    requireTruth(failedOnly.evidence.any {
        it.provenance == RecommendationEvidenceProvenance.REMEMBERED },
        "NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE_NEGATIVE_MEMORY_PRESENT")
    requireTruth(failedOnly.confidence == RecommendationConfidenceBand.HIGH,
        "NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE")
    val emptyHistory = evaluateBadOnly(emptyList())
    requireTruth(emptyHistory.confidence == RecommendationConfidenceBand.MEDIUM,
        "NO_HISTORY_BASELINE_MEDIUM")
    // This only reproduces original-branch behavior, not genuine hardware impact.
    println("""{"schema":"ultra-sentinel-c2-pr150-negative-history-source-oracle/v1","pr":150,"headSha":"4c6912d7ca17df0669f8a0d9667f34d2f2b205a9","sourceGitBlob":"37866fd3dbfcd19d9daaf29a5e1e426391c723d4","rule":"NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE","line":251,"originalBadHistoryHigh":true,"emptyHistoryMedium":true,"executedOriginalSource":true,"mutantKilled":false,"newTruthLabelsSealed":0,"candidateInspected":false,"baselineCompared":false,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
