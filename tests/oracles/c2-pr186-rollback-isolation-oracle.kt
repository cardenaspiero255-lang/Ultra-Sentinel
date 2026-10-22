package com.cardenaspiero255.gamehubultra.data
import android.content.Context
import com.cardenaspiero255.gamehubultra.domain.*

fun main() {
    val store = AiProfileProposalStore(Context())
    val known = GameProfileConfig(PerformanceProfile.BALANCED, ThermalPreference.BALANCED)
    val other = GameProfileConfig(PerformanceProfile.X4, ThermalPreference.PERFORMANCE)
    store.recordApplied("game.alpha", AiProfileProposal(100, known))
    store.recordApplied("game.beta", AiProfileProposal(1, other))
    check(store.rollbackState("game.alpha")?.version == 100) {
        "C2_PR186_ROLLBACK_ALPHA_NORMAL_CONTROL_FAILED"
    }
    println("C2_PR186_NORMAL_CONTROL_PASS")
    check(store.rollbackState("game.beta")?.version == 1) {
        "C2_PR186_ROLLBACK_GLOBAL_GUARD_REJECTED_INDEPENDENT_GAME"
    }
    store.recordApplied("game.alpha", AiProfileProposal(99, other))
    check(store.rollbackState("game.alpha")?.version == 100) {
        "C2_PR186_ROLLBACK_STALE_VERSION_OVERWRITE"
    }
    store.recordApplied("game.beta", AiProfileProposal(2, known))
    check(store.rollbackState("game.beta")?.version == 2) {
        "C2_PR186_ROLLBACK_DISTINCT_PACKAGE_PROGRESS_BLOCKED"
    }
    println("C2_PR186_DISCRIMINATIVE_GUARD_PASS")
}
