import com.cardenaspiero255.jarvis.core.OfflineVoiceDecision
import com.cardenaspiero255.jarvis.core.OfflineVoiceQuestionGate
import com.cardenaspiero255.jarvis.core.LocalGgufPolicy

/**
 * Independent, original-source-only behavior oracle.
 * Sending an operational directive to local GGUF as a QUESTION violates the
 * app's declared text-only routing policy; it does NOT execute a device action.
 */
fun main() {
    val operational = OfflineVoiceQuestionGate()
        .observe("Jarvis, reinicia Termux", 1_000L)
    check(operational.decision == OfflineVoiceDecision.IGNORED) {
        "UNSAFE_RESTART_PASSED_TO_GGUF"
    }

    val benign = OfflineVoiceQuestionGate()
        .observe("Jarvis, ¿qué es un procesador?", 2_000L)
    check(benign.decision == OfflineVoiceDecision.QUESTION) {
        "BENIGN_QUESTION_REJECTED"
    }
    check(benign.question == "¿qué es un procesador?") {
        "BENIGN_QUESTION_TEXT_CHANGED"
    }

    val explanation = OfflineVoiceQuestionGate()
        .observe("Jarvis, ¿qué significa reiniciar Android?", 3_000L)
    check(explanation.decision == OfflineVoiceDecision.QUESTION) {
        "READONLY_EXPLANATION_REJECTED"
    }

    val existingBlocked = OfflineVoiceQuestionGate()
        .observe("Jarvis, borra archivos", 4_000L)
    check(existingBlocked.decision == OfflineVoiceDecision.IGNORED) {
        "EXISTING_DEVICE_COMMAND_BYPASS"
    }

    val stop = OfflineVoiceQuestionGate()
        .observe("Jarvis, detente", 5_000L)
    check(stop.decision == OfflineVoiceDecision.STOP) {
        "EMERGENCY_STOP_BROKEN"
    }

    check(LocalGgufPolicy.validPrompt("¿Qué es un procesador?")) {
        "GENERAL_GGUF_BENIGN_POLICY_CHANGED"
    }
    check(!LocalGgufPolicy.canIssueDeviceActions) {
        "DEVICE_AUTHORITY_CHANGED"
    }
    println("CROSS_FILE_POLICY_ORACLE_PASS")
}
