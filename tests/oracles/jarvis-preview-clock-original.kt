import com.cardenaspiero255.jarvis.core.PreviewTimeGate

/**
 * Trusted original Kotlin preview-deadline policy oracle.
 * Injected clock regressions are defensive protocol tests, NOT a claim that
 * Android elapsedRealtime() runs backward on physical hardware.
 */
fun main() {
    val active = PreviewTimeGate(10_000L)
    check(active.begin(1_000L)) { "PREVIEW_BEGIN_FAILED" }
    check(!active.isActiveAt(999L)) { "PAST_CLOCK_ACCEPTED" }
    check(!active.isActiveAt(1_000L)) { "PREVIEW_ACTIVE_CLOCK_REVIVAL" }

    val remaining = PreviewTimeGate(10_000L)
    check(remaining.begin(2_000L)) { "REMAINING_BEGIN_FAILED" }
    check(remaining.remainingMillis(1_999L) == 0L) { "REVERSED_REMAINING_NOT_ZERO" }
    check(!remaining.isActiveAt(2_000L)) { "PREVIEW_REMAINING_CLOCK_REVIVAL" }

    val benign = PreviewTimeGate(10_000L)
    check(benign.begin(5_000L)) { "BENIGN_BEGIN_FAILED" }
    check(benign.isActiveAt(5_001L)) { "BENIGN_ACTIVE_REJECTED" }
    check(benign.remainingMillis(5_001L) == 9_999L) { "BENIGN_REMAINING_WRONG" }
    benign.stop()
    check(!benign.isActiveAt(5_002L)) { "STOP_SESSION_NOT_REVOKED" }
    check(benign.remainingMillis(5_002L) == 0L) { "STOP_REMAINING_NOT_ZERO" }

    println("PREVIEW_CLOCK_ORIGINAL_ORACLE_PASS")
}
