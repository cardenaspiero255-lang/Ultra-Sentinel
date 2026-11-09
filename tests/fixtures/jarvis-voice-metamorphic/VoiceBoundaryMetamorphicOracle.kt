package com.cardenaspiero255.jarvis.core

import java.nio.file.Files
import java.nio.file.Path

/**
 * Independent black-box oracle for original Kotlin voice-gate behavior.
 * The generated corpus comes from the original policy's Kotlin guard words.
 * It never imports a JS Fixer module or reads the candidate's source code.
 * A separator added to a polite DIRECT operational request must not make
 * that request become an accepted read-only question.
 */
fun main(args: Array<String>) {
    require(args.size == 2 && args[1] in listOf("original", "candidate", "unsafe")) {
        "MODE_OR_CORPUS_MISSING"
    }
    val mode = args[1]
    val source = Files.readAllLines(Path.of(args[0]), Charsets.UTF_8)
    require(source.size in 2..48) { "INVALID_PROBE_CORPUS" }
    var acceptedVariants = 0
    val seen = HashSet<String>()
    for (row in source) {
        val pair = row.split('\t')
        require(pair.size == 2) { "INVALID_PROBE_ROW" }
        val verb = pair[0]
        val punctuation = pair[1]
        require(verb.matches(Regex("[a-z]{3,30}")) && punctuation in setOf(",", ".", ";")) {
            "INVALID_PROBE_TOKEN"
        }
        require(seen.add("$verb-$punctuation")) { "DUPLICATE_PROBE_ROW" }

        val baseline = "Jarvis, por favor $verb sistema"
        val mutated = "Jarvis, por favor$punctuation $verb sistema"
        val benign = "Jarvis, ¿qué significa $verb sistema?"
        val direct = OfflineVoiceQuestionGate().observe(baseline, 1000L)
        val variant = OfflineVoiceQuestionGate().observe(mutated, 1000L)
        val ordinary = OfflineVoiceQuestionGate().observe(benign, 1000L)

        if (direct.decision != OfflineVoiceDecision.IGNORED) {
            error("BASELINE_DIRECT_COMMAND_REGRESSION")
        }
        if (ordinary.decision != OfflineVoiceDecision.QUESTION) {
            error("BENIGN_READ_ONLY_REGRESSION")
        }
        if (variant.decision == OfflineVoiceDecision.QUESTION) acceptedVariants++
        else if (variant.decision != OfflineVoiceDecision.IGNORED) {
            error("UNEXPECTED_VOICE_BOUNDARY_DECISION")
        }
    }
    println("voice_original_baseline_blocked=PASS")
    println("voice_benign_question_allowed=PASS")
    println("voice_probe_count=${source.size}")
    println("voice_mutant_accepted_count=$acceptedVariants")
    when (mode) {
        "original" -> {
            check(acceptedVariants > 0) { "NO_NOVEL_BOUNDARY_VARIANT_REPRODUCED" }
            println("VOICE_METAMORPHIC_ORIGINAL_RED=PASS")
        }
        "candidate" -> {
            check(acceptedVariants == 0) { "VOICE_MUTATION_STILL_ACCEPTED" }
            println("VOICE_METAMORPHIC_CANDIDATE_GREEN=PASS")
        }
        "unsafe" -> error("UNSAFE_VARIANT_MUST_NOT_PASS_ORACLE")
    }
}
