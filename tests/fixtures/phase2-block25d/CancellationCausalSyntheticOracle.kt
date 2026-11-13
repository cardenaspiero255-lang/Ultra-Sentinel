package phase25d

import kotlin.coroutines.cancellation.CancellationException

// Synthetic causal test only. Never present this hand-constructed example as
// a discovered original defect or a novel held-out Kotlin family.
fun swallowedCancellation(failure: Exception): String {
    try {
        throw failure
    } catch (cause: Exception) {
        if (cause is CancellationException) {
            return "SWALLOWED"
        }
        throw cause
    }
}
fun fixedCancellation(failure: Exception): String {
    try {
        throw failure
    } catch (cause: Exception) {
        if (cause is CancellationException) {
            throw cause
        }
        throw cause
    }
}

fun main() {
    val cancel = CancellationException("synthetic cancellation")
    check(swallowedCancellation(cancel) == "SWALLOWED") { "RED_REPRODUCIBLE_FAILURE_MISSING" }
    var propagated = false
    try {
        fixedCancellation(cancel)
    } catch (caught: CancellationException) {
        propagated = caught === cancel
    }
    check(propagated) { "GREEN_ORIGINAL_CANCEL_NOT_PROPAGATED" }

    // The same independent propagation oracle MUST reject a reintroduced fault.
    fun preservesCancellation(operation: (Exception) -> String): Boolean =
        try {
            operation(cancel)
            false
        } catch (caught: CancellationException) {
            caught === cancel
        }
    check(preservesCancellation(::fixedCancellation)) { "GREEN_FUNCTIONAL_PROPAGATION_FAILED" }
    check(!preservesCancellation(::swallowedCancellation)) { "VETO_DID_NOT_REJECT_REGRESSION" }
    println("SYNTHETIC_CANCELLATION_CAUSAL_RED_GREEN_VETO_PASS")
}
