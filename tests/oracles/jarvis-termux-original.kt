import com.cardenaspiero255.jarvis.core.TermuxResultState
import com.cardenaspiero255.jarvis.core.TermuxResultTracker

/**
 * Trusted regression oracle for authentic JARVIS CompanionResultPolicy.kt.
 * Separate from Core/Family Hunter. Never performs device or network actions.
 */
private fun verify(stdout: String, expected: TermuxResultState, marker: String) {
    val tracker = TermuxResultTracker()
    val token = tracker.begin(1000L)
    check(tracker.receive(token, 0, -1, stdout, 1001L))
    check(tracker.status(1001L) == expected) { marker }
    check(!tracker.receive(token, 0, -1, stdout, 1002L)) { "DUPLICATE_CALLBACK_ACCEPTED" }
}
fun main() {
    verify("uid=1000(test) gid=1000(test) groups=1000(test),4(adm)",
        TermuxResultState.VERIFIED,"NORMAL_ID_FORMAT_FAILED")
    verify("uid=1000(test)", TermuxResultState.VERIFIED,"UID_ONLY_FORMAT_FAILED")
    verify("uid=1000(test) gid=1000(test) groups=1000(test) context=u:r:untrusted_app:s0",
        TermuxResultState.VERIFIED,"SELINUX_CONTEXT_FORMAT_FAILED")
    verify("uid=1000(test) arbitrary payload after UID",
        TermuxResultState.FAILED,"UNTRUSTED_SUFFIX_ACCEPTED")
    verify("uid=1000(test) gid=1000(test)\nINJECTED",
        TermuxResultState.FAILED,"MULTILINE_SUFFIX_ACCEPTED")
    verify("uid=1000(test) gid=oops",
        TermuxResultState.FAILED,"MALFORMED_GID_ACCEPTED")
    println("TERMUX_ORIGINAL_ORACLE_PASS")
}
