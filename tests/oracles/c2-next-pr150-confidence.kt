package com.cardenaspiero255.gamehubultra.domain

private fun requireOriginal(predicate: Boolean, name: String) {
    if (!predicate) throw IllegalStateException("C2_NEXT_PR150_CONTROL_FAILED_" + name)
}

private fun explanationFor(source: RecommendationExternalEvidence, history: List<String> = emptyList()): SmartRecommendationExplanation =
    SmartRecommendationExplanationFactory.build(
        input = SmartPerformanceInput(
            externalEvidence = listOf(source), historicalObservations = history
        ),
        recommendedProfile = PerformanceProfile.X4,
        reason = "X4 es la opción recomendada.",
        measuredGood = emptyMap(),
        acceptedFeedback = emptyMap(),
        knownBad = emptyMap(),
        thermalHot = false,
        lowBattery = false,
        memoryPressure = false,
        storagePressure = false
    )

fun main() {
    // Distinct candidate positive: trusted, fresh data explicitly OPPOSES the
    // current recommendation, but original Kotlin still asserts HIGH confidence
    // solely because such evidence is fresh and authoritative.
    val opposing = explanationFor(
        RecommendationExternalEvidence(
            text = "Prueba independiente: esta opción no se recomienda.",
            sourceLabel = "independent-test",
            fresh = true,
            authoritative = true,
            supportsRecommendation = false
        )
    )
    requireOriginal(
        opposing.evidence.any { it.provenance == RecommendationEvidenceProvenance.EXTERNALLY_RESEARCHED &&
            it.supportsRecommendation == false && it.fresh && it.authoritative },
        "ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION_EVIDENCE"
    )
    requireOriginal(opposing.unavailableData.isEmpty(),
        "ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION_COMPLETE_CONTEXT")
    requireOriginal(opposing.contradictions.isEmpty(),
        "ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION_NOT_FLAGGED")
    requireOriginal(opposing.confidence == RecommendationConfidenceBand.HIGH,
        "ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION")

    // Independent bounded negative: weak/untrusted/stale evidence cannot by
    // itself grant HIGH confidence, regardless of endorsement direction.
    val weak = explanationFor(
        RecommendationExternalEvidence(
            text = "Anecdotario desactualizado: opción probablemente buena.",
            sourceLabel = "stale-test",
            fresh = false,
            authoritative = false,
            supportsRecommendation = true
        ), history = listOf("accepted-session")
    )
    requireOriginal(weak.unavailableData.isEmpty(),
        "WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE_COMPLETE_CONTEXT")
    requireOriginal(weak.confidence == RecommendationConfidenceBand.MEDIUM,
        "WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE")
    // Ordinary trusted control: a sole fresh affirmative source may rate HIGH.
    val supportive = explanationFor(
        RecommendationExternalEvidence(
            text = "Fuente válida recomienda el perfil.",
            sourceLabel = "supportive-control",
            fresh = true, authoritative = true, supportsRecommendation = true
        )
    )
    requireOriginal(supportive.confidence == RecommendationConfidenceBand.HIGH,
        "FRESH_AFFIRMATIVE_EXTERNAL_CONTROL")
    println("""{"schema":"ultra-sentinel-c2-next-pr150-confidence-original-oracle/v1","pr":150,"headSha":"4c6912d7ca17df0669f8a0d9667f34d2f2b205a9","sourceGitBlob":"37866fd3dbfcd19d9daaf29a5e1e426391c723d4","executedOriginalSource":true,"allAuthoritativeSourcesOpposeButConfidenceHigh":true,"weakExternalEvidenceDowngradesConfidence":true,"affirmativeControlHigh":true,"candidateInspected":false,"baselineCompared":false,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
