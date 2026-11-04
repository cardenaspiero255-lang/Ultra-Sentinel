import com.cardenaspiero255.jarvis.core.TermuxResultState
import com.cardenaspiero255.jarvis.core.TermuxResultTracker
import com.cardenaspiero255.jarvis.core.VoiceRecognitionRequestGate

/**
 * Separate original-JVM factorial oracle, with two independent policy checks.
 * This is a negative control for invented cross-file causality:
 * an AND of passing tests can look like a joint fix although the underlying
 * defects do not depend on each other.
 */
private fun verifyTermux(): Boolean {
    val normal = TermuxResultTracker()
    val normalToken = normal.begin(1000L)
    if (!normal.receive(normalToken, 0, -1,
            "uid=1000(test) gid=1000(test) groups=1000(test),4(adm)",1001L)) return false
    if (normal.status(1001L) != TermuxResultState.VERIFIED) return false
    val hostile = TermuxResultTracker()
    val hostileToken = hostile.begin(2000L)
    if (!hostile.receive(hostileToken,0,-1,
            "uid=1000(test) arbitrary payload after UID",2001L)) return false
    return hostile.status(2001L) == TermuxResultState.FAILED
}
private fun verifyVoice(): Boolean {
    val normal = VoiceRecognitionRequestGate()
    if (!normal.begin(1000L) || !normal.isPending(1001L) ||
        !normal.consume(1002L) || normal.consume(1003L)) return false
    val rollback = VoiceRecognitionRequestGate()
    if (!rollback.begin(2000L) || rollback.isPending(1999L)) return false
    return !rollback.isPending(2000L)
}
fun main() {
    println("TERMUX_RESULT=" + if (verifyTermux()) "PASS" else "FAIL")
    println("VOICE_RESULT=" + if (verifyVoice()) "PASS" else "FAIL")
}
