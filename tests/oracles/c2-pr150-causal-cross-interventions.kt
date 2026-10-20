package com.cardenaspiero255.gamehubultra.domain

/*
 * Compiled against exact original #150 source and three disposable
 * single-guard/combined repairs. No candidate detector predictions.
 */
private fun inspectConfidence(
    history: List<String> = emptyList(),
    external: List<RecommendationExternalEvidence> = emptyList(),
    good: Map<PerformanceProfile, Int> = emptyMap(),
    accepted: Map<PerformanceProfile, Int> = emptyMap(),
    bad: Map<PerformanceProfile, Int> = emptyMap()
): RecommendationConfidenceBand {
    val answer = SmartRecommendationExplanationFactory.build(
        input = SmartPerformanceInput(
            historicalObservations = history,
            externalEvidence = external,
            runtime = C2Runtime(),
            gameVersion = "1.0"
        ),
        recommendedProfile = PerformanceProfile.X4,
        reason = "Confirmar recomendación de X4.",
        measuredGood = good,
        acceptedFeedback = accepted,
        knownBad = bad,
        thermalHot = false, lowBattery = false,
        memoryPressure = false, storagePressure = false
    )
    check(answer.unavailableData.isEmpty()) { "C2_PR150_UNAVAILABLE_DATA" }
    check(answer.contradictions.isEmpty()) { "C2_PR150_UNEXPECTED_CONTRADICTION" }
    return answer.confidence
}
private fun evidence(fresh: Boolean, authoritative: Boolean, supports: Boolean): RecommendationExternalEvidence =
    RecommendationExternalEvidence("Evaluación técnica verificada", "oracle", fresh, authoritative, supports)

fun main() {
    val results = linkedMapOf(
        "negativeOnlyHistory" to inspectConfidence(
            history = listOf("failed-X4", "reverted-X4"),
            bad = mapOf(PerformanceProfile.X4 to 2)
        ).name,
        "opposingExternalEvidence" to inspectConfidence(
            external = listOf(evidence(true,true,false))
        ).name,
        "weakExternalEvidence" to inspectConfidence(
            history = listOf("accepted-X4"),
            good = mapOf(PerformanceProfile.X4 to 1),
            accepted = mapOf(PerformanceProfile.X4 to 1),
            external = listOf(evidence(false,false,true))
        ).name,
        "affirmativeExternalEvidence" to inspectConfidence(
            external = listOf(evidence(true,true,true))
        ).name,
        "positiveHistory" to inspectConfidence(
            history = listOf("accepted-X4"),
            good = mapOf(PerformanceProfile.X4 to 1)
        ).name,
        "emptyContext" to inspectConfidence().name
    )
    check(results.values.all { it in setOf("LOW","MEDIUM","HIGH") }) { "C2_PR150_UNKNOWN_CONFIDENCE" }
    println(results.entries.joinToString(prefix="{",postfix="}",separator=",") {
        "\"" + it.key + "\":\"" + it.value + "\""
    })
}
