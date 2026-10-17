package com.cardenaspiero255.gamehubultra.ai

import com.cardenaspiero255.gamehubultra.domain.ThermalRisk
import com.cardenaspiero255.gamehubultra.domain.ThermalTrend

fun main() {
    val t0 = 1_000L
    UltraFrontierWorldStateRegistry.clear()
    val running = GameHubAiContext(selectedGamePackage="game.example",sessionActive=true)
    val originalObservation = UltraFrontierWorldState.from(running,nowMillis=t0).copy(
        thermalRisk=ThermalRisk.CRITICAL,
        thermalTrend=ThermalTrend.RISING,
        preventAggressiveProfiles=true
    )
    UltraFrontierWorldStateRegistry.update(originalObservation)
    check(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0 + 1)?.thermalRisk == ThermalRisk.CRITICAL) {
        "C2_PR158_CONTROL_MEASUREMENT_NOT_SEEDED"
    }
    UltraFrontierWorldStateRegistry.update(running,nowMillis=t0 + 60_000L)
    check(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0 + 60_001L)?.thermalRisk == ThermalRisk.CRITICAL) {
        "C2_PR158_CONTROL_WITHIN_ORIGINAL_TTL_BROKEN"
    }
    println("C2_PR158_FRESH_CONTROL_PASS")
    // A UI update can report no active gaming session without changing selected game.
    val inactive = running.copy(sessionActive=false)
    UltraFrontierWorldStateRegistry.update(inactive,nowMillis=t0 + 90_000L)
    UltraFrontierWorldStateRegistry.update(inactive,nowMillis=t0 + 150_000L)
    val state = checkNotNull(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0 + 150_001L))
    check(state.sessionActive==false) { "C2_PR158_CONTROL_IDLE_REFRESH_NOT_OBSERVED" }
    check(state.thermalRisk==null && !state.preventAggressiveProfiles) {
        "C2_PR158_ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION"
    }
    println("C2_PR158_EXPIRED_ADVANCED_TTL_PASS")
    UltraFrontierWorldStateRegistry.clear()
    UltraFrontierWorldStateRegistry.update(originalObservation)
    UltraFrontierWorldStateRegistry.update(running.copy(selectedGamePackage="other"),nowMillis=t0 + 100L)
    check(UltraFrontierWorldStateRegistry.snapshot()?.thermalRisk==null) {
        "C2_PR158_CONTROL_GAME_BOUNDARY_BROKEN"
    }
    println("C2_PR158_CROSS_GAME_CONTROL_PASS")
    UltraFrontierWorldStateRegistry.clear()
}
