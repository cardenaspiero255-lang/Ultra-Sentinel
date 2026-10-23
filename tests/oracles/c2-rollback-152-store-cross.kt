package com.cardenaspiero255.gamehubultra.data

import android.content.Context
import com.cardenaspiero255.gamehubultra.domain.*

/** Original and one-change repaired source compile against this SAME oracle. */
fun main() {
    val store=AiProfileProposalStore(Context())
    val profileA=GameProfileConfig(PerformanceProfile.BALANCED,ThermalPreference.BALANCED)
    val profileB=GameProfileConfig(PerformanceProfile.X4,ThermalPreference.PERFORMANCE)
    store.recordApplied("game.alpha",AiProfileProposal(7,profileA))
    store.recordApplied("game.beta",AiProfileProposal(3,profileB))
    val normalPassed=store.rollbackState("game.alpha")?.version==7
    val otherPackagePassed=store.rollbackState("game.beta")?.version==3
    check(normalPassed&&otherPackagePassed) {"C2_ROLLBACK_NORMAL_CONTROL_FAILED"}
    store.recordApplied("game.alpha",AiProfileProposal(6,profileB))
    val staleRejected=store.rollbackState("game.alpha")?.version==7
    store.recordApplied("game.beta",AiProfileProposal(4,profileA))
    val forwardProgressPassed=store.rollbackState("game.beta")?.version==4
    check(forwardProgressPassed) {"C2_ROLLBACK_BETA_PROGRESS_REGRESSION"}
    println("""{"normalPassed":$normalPassed,"otherPackagePassed":$otherPackagePassed,"staleRejected":$staleRejected,"forwardProgressPassed":$forwardProgressPassed}""")
}
