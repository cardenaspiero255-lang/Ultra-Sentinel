package com.cardenaspiero255.gamehubultra.data
import android.content.Context
import com.cardenaspiero255.gamehubultra.domain.*

fun main(){
    val store=AiProfileProposalStore(Context())
    val known=GameProfileConfig(PerformanceProfile.BALANCED,ThermalPreference.BALANCED)
    val other=GameProfileConfig(PerformanceProfile.X4,ThermalPreference.PERFORMANCE)
    check(store.nextVersion("com.game")==1){"C2_PR152_INITIAL_VERSION_CONTROL"}
    store.recordApplied("com.game",AiProfileProposal(5,known))
    check(store.rollbackState("com.game")?.version==5){"C2_PR152_ROLLBACK_CONTROL"}
    check(store.nextVersion("com.game")==6){"C2_PR152_NEXT_VERSION_CONTROL"}
    println("C2_PR152_VALID_VERSION_CONTROL_PASS")
    runCatching{store.recordApplied("com.game",AiProfileProposal(4,other))}
    val state=checkNotNull(store.rollbackState("com.game"))
    check(state.version==5 && state.previousKnownGoodConfig==known){
        "C2_PR152_STALE_PROPOSAL_CAN_OVERWRITE_NEWER_ROLLBACK_STATE"
    }
    println("C2_PR152_MONOTONIC_ROLLBACK_STATE_PASS")
}
