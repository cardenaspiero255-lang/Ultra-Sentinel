package com.cardenaspiero255.gamehubultra.ai

import android.content.Context
import com.cardenaspiero255.gamehubultra.data.AiProfileProposalStore
import com.cardenaspiero255.gamehubultra.domain.*

fun main(args:Array<String>) {
    check(args.size==1 && args[0] in setOf("00","01","10","11"))
    val mode=args[0]
    val rollbackCorrected=mode[0]=='1'
    val ttlCorrected=mode[1]=='1'
    val store=AiProfileProposalStore(Context())
    val normal=GameProfileConfig(PerformanceProfile.BALANCED,ThermalPreference.BALANCED)
    val other=GameProfileConfig(PerformanceProfile.X4,ThermalPreference.PERFORMANCE)
    store.recordApplied("game.alpha",AiProfileProposal(7,normal))
    store.recordApplied("game.beta",AiProfileProposal(3,other))
    check(store.rollbackState("game.alpha")?.version==7 && store.rollbackState("game.beta")?.version==3) {
        "C2_PR186_ROLLBACK_ORDINARY_REGRESSION"
    }
    store.recordApplied("game.beta",AiProfileProposal(4,normal))
    check(store.rollbackState("game.beta")?.version==4) {
        "C2_PR186_ROLLBACK_CROSS_PACKAGE_FAILED"
    }
    store.recordApplied("game.alpha",AiProfileProposal(6,other))
    val version=checkNotNull(store.rollbackState("game.alpha"))
    val rollbackSafe=version.version==7 && version.previousKnownGoodConfig==normal
    check(rollbackSafe==rollbackCorrected) { "C2_PR186_ROLLBACK_INTERVENTION_CROSSED" }

    UltraFrontierWorldStateRegistry.clear()
    val t0=1000L
    val running=GameHubAiContext(selectedGamePackage="game.alpha",sessionActive=true)
    val seeded=UltraFrontierWorldState.from(running,nowMillis=t0).copy(
        thermalRisk=ThermalRisk.CRITICAL,
        thermalTrend=ThermalTrend.RISING,
        preventAggressiveProfiles=true)
    UltraFrontierWorldStateRegistry.update(seeded)
    val idle=running.copy(sessionActive=false)
    UltraFrontierWorldStateRegistry.update(idle,nowMillis=t0+90000L)
    val fresh=checkNotNull(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0+90001L))
    check(fresh.thermalRisk==ThermalRisk.CRITICAL && fresh.preventAggressiveProfiles){
        "C2_PR186_TTL_FRESH_IDLE_WRONGLY_CLEARED"
    }
    UltraFrontierWorldStateRegistry.update(idle,nowMillis=t0+150000L)
    val stale=checkNotNull(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0+150001L))
    val ttlSafe=stale.thermalRisk==null && !stale.preventAggressiveProfiles
    check(ttlSafe==ttlCorrected) { "C2_PR186_TTL_INTERVENTION_CROSSED" }
    UltraFrontierWorldStateRegistry.clear()
    println("C2_PR186_ROLLBACK_TTL_ORDINARY_PASS")
    println("C2_PR186_VECTOR mode=$mode rollback=$rollbackSafe ttl=$ttlSafe")
}
