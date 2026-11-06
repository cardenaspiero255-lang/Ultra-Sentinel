import com.cardenaspiero255.jarvis.core.LocalGgufPolicy
import com.cardenaspiero255.jarvis.core.OfflineVoiceDecision
import com.cardenaspiero255.jarvis.core.OfflineVoiceQuestionGate

private fun ignored(text: String) {
    val result = OfflineVoiceQuestionGate().observe(text, 1_000L)
    check(result.decision == OfflineVoiceDecision.IGNORED && result.question == null) {
        "POLITE_OPERATIONAL_REQUEST_ACCEPTED"
    }
}
private fun question(text: String) {
    val result = OfflineVoiceQuestionGate().observe(text, 1_000L)
    check(result.decision == OfflineVoiceDecision.QUESTION && result.question != null) {
        "BENIGN_EXPLANATION_REJECTED"
    }
}
fun main() {
    listOf(
        "¿puedes, por favor, reiniciar el teléfono?",
        "podrías por favor restablecer el teléfono",
        "qué es Android y puedes reiniciar el teléfono"
    ).forEach { check(!LocalGgufPolicy.validReadOnlyQuestion(it)) { "POLITE_POLICY_BYPASS" } }
    listOf(
        "Jarvis, puedes por favor abrir configuración",
        "Jarvis, ¿podrías abrir ajustes?",
        "Jarvis, qué es Android y puedes abrir configuración",
        "Jarvis, luego podrías activar bluetooth"
    ).forEach(::ignored)
    listOf(
        "Jarvis, ¿puedes explicar cómo abrir configuración?",
        "Jarvis, ¿qué significa reiniciar el teléfono?",
        "Jarvis, ¿cómo funciona una batería?"
    ).forEach(::question)
    check(LocalGgufPolicy.validPrompt("reinicia Termux")) { "TYPED_PROMPT_CHANGED" }
    check(!LocalGgufPolicy.canIssueDeviceActions) { "DEVICE_AUTHORITY_CHANGED" }
    check(OfflineVoiceQuestionGate().observe("Jarvis, detente", 2_000L).decision ==
        OfflineVoiceDecision.STOP) { "STOP_REGRESSION" }
    println("POLITE_ADVERSARIAL_CONTROLS_PASS")
}
