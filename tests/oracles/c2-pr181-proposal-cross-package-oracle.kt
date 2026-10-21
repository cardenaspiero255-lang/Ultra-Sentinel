package com.cardenaspiero255.gamehubultra.data
import android.content.Context
import com.cardenaspiero255.gamehubultra.domain.*

fun main() {
    val store = AiProfileProposalStore(Context())
    val known = GameProfileConfig(PerformanceProfile.BALANCED, ThermalPreference.BALANCED)
    val other = GameProfileConfig(PerformanceProfile.X4, ThermalPreference.PERFORMANCE)
    store.recordApplied("game.alpha", AiProfileProposal(7, known))
    store.recordApplied("game.beta", AiProfileProposal(3, other))
    check(store.rollbackState("game.alpha")?.version == 7)
    check(store.rollbackState("game.beta")?.version == 3)
    println("C2_PR181_TWO_PACKAGES_INITIAL_CONTROL_PASS")

    store.recordApplied("game.beta", AiProfileProposal(4, known))
    check(store.rollbackState("game.beta")?.version == 4)
    store.recordApplied("game.alpha", AiProfileProposal(6, other))
    val alpha = checkNotNull(store.rollbackState("game.alpha"))
    check(alpha.version == 7 && alpha.previousKnownGoodConfig == known) {
        "C2_PR181_STALE_ALPHA_SHOULD_NOT_OVERWRITE_CURRENT_PROFILE"
    }
    println("C2_PR181_INTERLEAVED_VERSION_CONTROL_PASS")
}
