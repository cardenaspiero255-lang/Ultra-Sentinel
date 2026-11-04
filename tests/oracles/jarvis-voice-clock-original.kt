import com.cardenaspiero255.jarvis.core.VoiceRecognitionRequestGate

/**
 * Isolated JVM policy contract, not a physical Android/monotonic-clock claim.
 * This deliberately tests an injected clock going backwards; observed risk
 * must never be presented as a proven real-world clock rollback incident.
 */
fun main() {
    val normal = VoiceRecognitionRequestGate()
    check(normal.begin(1000L)) { "NORMAL_BEGIN_REJECTED" }
    check(normal.isPending(1001L)) { "NORMAL_PENDING_REJECTED" }
    check(normal.consume(1002L)) { "NORMAL_CONSUME_REJECTED" }
    check(!normal.consume(1003L)) { "DUPLICATE_CALLBACK_ACCEPTED" }

    val rewind = VoiceRecognitionRequestGate()
    check(rewind.begin(2000L)) { "REWIND_BEGIN_FAILED" }
    check(!rewind.isPending(1999L)) { "PAST_TIME_ACCEPTED" }
    check(!rewind.isPending(2000L)) { "CLOCK_REWIND_REANIMATED" }
    println("VOICE_CLOCK_ORIGINAL_ORACLE_PASS")
}
