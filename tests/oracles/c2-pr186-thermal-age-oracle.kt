package com.cardenaspiero255.gamehubultra.ai
import com.cardenaspiero255.gamehubultra.domain.ThermalRisk
import com.cardenaspiero255.gamehubultra.domain.ThermalTrend

fun main() {
    val t0=1_000_000L
    UltraFrontierWorldStateRegistry.clear()
    val playing=GameHubAiContext(selectedGamePackage="game.alpha",sessionActive=true)
    val seen=UltraFrontierWorldState.from(playing,nowMillis=t0).copy(
        thermalRisk=ThermalRisk.CRITICAL,
        thermalTrend=ThermalTrend.RISING,
        preventAggressiveProfiles=true
    )
    UltraFrontierWorldStateRegistry.update(seen)
    val idle=playing.copy(sessionActive=false)
    val immediate=checkNotNull(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0+1))
    check(immediate.thermalRisk==ThermalRisk.CRITICAL) { "C2_PR186_THERMAL_INITIAL_CONTROL_FAILED" }
    println("C2_PR186_NORMAL_CONTROL_PASS")
    UltraFrontierWorldStateRegistry.update(idle,nowMillis=t0+119_000L)
    val stillFresh=checkNotNull(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0+119_001L))
    check(stillFresh.thermalRisk==ThermalRisk.CRITICAL && stillFresh.preventAggressiveProfiles) {
        "C2_PR186_THERMAL_BLANKET_CLEAR_DISCARDED_FRESH_SIGNAL"
    }
    UltraFrontierWorldStateRegistry.update(idle,nowMillis=t0+120_001L)
    val nowStale=checkNotNull(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0+120_002L))
    check(nowStale.thermalRisk==null && !nowStale.preventAggressiveProfiles) {
        "C2_PR186_THERMAL_TTL_RESET_EXTENDED_STALE_SIGNAL"
    }
    UltraFrontierWorldStateRegistry.clear()
    println("C2_PR186_DISCRIMINATIVE_GUARD_PASS")
}
