import com.cardenaspiero255.jarvis.core.LocalGgufPolicy
import com.cardenaspiero255.jarvis.core.OfflineVoiceDecision
import com.cardenaspiero255.jarvis.core.OfflineVoiceQuestionGate

/**
 * Independent behavior oracle for two specific untrusted voice transcripts.
 * QUESTION means routing text to a local LLM, not execution of a device action.
 * A failing assertion here is not itself evidence until compiled and run
 * against provenance-verified original Kotlin in an isolated JVM.
 */
private fun requireIgnored(text: String) {
    val actual = OfflineVoiceQuestionGate().observe(text, 1_000L)
    check(actual.decision == OfflineVoiceDecision.IGNORED && actual.question == null) {
        "VOICE_GATE_OPERATIONAL_REQUEST_ACCEPTED"
    }
}

private fun requireQuestion(text: String) {
    val actual = OfflineVoiceQuestionGate().observe(text, 1_000L)
    check(actual.decision == OfflineVoiceDecision.QUESTION && actual.question != null) {
        "BENIGN_READ_ONLY_QUESTION_REJECTED"
    }
}

private fun policyBarrier() {
    // This policy is also called independently by processOfflineQuestion.
    check(!LocalGgufPolicy.validReadOnlyQuestion("podrías reiniciar el teléfono")) {
        "READ_ONLY_POLICY_POLITE_RESTART_ACCEPTED"
    }
    check(!LocalGgufPolicy.validReadOnlyQuestion("por favor reinicia Termux")) {
        "EXISTING_RESTART_DENIAL_REGRESSED"
    }
    check(LocalGgufPolicy.validReadOnlyQuestion("¿qué significa reiniciar el teléfono?")) {
        "EXPLANATORY_RESTART_QUESTION_REJECTED"
    }
    // Generic typed input is a different contract: do not silently change it.
    check(LocalGgufPolicy.validPrompt("reinicia Termux")) {
        "GENERIC_TYPED_PROMPT_CONTRACT_CHANGED"
    }
    check(!LocalGgufPolicy.canIssueDeviceActions) { "DEVICE_AUTHORITY_CHANGED" }
    println("POLICY_BARRIER_PASS")
}

private fun gateBarrier() {
    // The shared policy's restart-only extra rule does not block this request;
    // therefore this exercises the gate's own operational-intent defense.
    requireIgnored("Jarvis puedes abrir configuración")
    val followup = OfflineVoiceQuestionGate()
    check(followup.observe("Jarvis", 1_000L).decision == OfflineVoiceDecision.WAITING) {
        "WAKE_SESSION_NOT_STARTED"
    }
    val result = followup.observe("puedes abrir configuración", 2_000L)
    check(result.decision == OfflineVoiceDecision.IGNORED && result.question == null) {
        "FOLLOWUP_OPERATIONAL_REQUEST_ACCEPTED"
    }
    requireIgnored("Jarvis, abre ajustes")
    requireQuestion("Jarvis, ¿puedes explicar cómo abrir configuración?")
    requireQuestion("Jarvis, ¿cómo funciona una batería?")
    check(OfflineVoiceQuestionGate().observe("Jarvis, detente", 2_000L).decision ==
        OfflineVoiceDecision.STOP) { "EMERGENCY_STOP_REGRESSED" }
    println("GATE_BARRIER_PASS")
}

private fun integration() {
    requireIgnored("Jarvis podrías reiniciar el teléfono")
    requireIgnored("Jarvis puedes abrir configuración")
    requireQuestion("Jarvis, ¿qué significa reiniciar el teléfono?")
    requireQuestion("Jarvis, ¿puedes explicar cómo abrir configuración?")
    println("TWO_BARRIER_INTEGRATION_PASS")
}

private fun controls() {
    requireIgnored("Jarvis, abre ajustes")
    requireQuestion("Jarvis, ¿qué significa reiniciar el teléfono?")
    requireQuestion("Jarvis, ¿puedes explicar cómo abrir configuración?")
    requireQuestion("Jarvis, ¿cómo funciona una batería?")
    check(OfflineVoiceQuestionGate().observe("Jarvis, detente", 2_000L).decision ==
        OfflineVoiceDecision.STOP) { "EMERGENCY_STOP_REGRESSED" }
    check(!LocalGgufPolicy.validReadOnlyQuestion("por favor reinicia Termux")) {
        "EXISTING_RESTART_DENIAL_REGRESSED"
    }
    check(LocalGgufPolicy.validPrompt("reinicia Termux")) {
        "GENERIC_TYPED_PROMPT_CONTRACT_CHANGED"
    }
    check(!LocalGgufPolicy.canIssueDeviceActions) { "DEVICE_AUTHORITY_CHANGED" }
    println("ORIGINAL_CONTROLS_PASS")
}

fun main(args: Array<String>) {
    when (args.singleOrNull()) {
        "policy" -> policyBarrier()
        "gate" -> gateBarrier()
        "integration" -> integration()
        "controls" -> controls()
        else -> error("REQUIRE_SINGLE_POLICY_GATE_INTEGRATION_OR_CONTROLS_MODE")
    }
}
