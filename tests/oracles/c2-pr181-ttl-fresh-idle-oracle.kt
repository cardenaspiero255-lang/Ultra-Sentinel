package com.cardenaspiero255.gamehubultra.ai
import com.cardenaspiero255.gamehubultra.domain.ThermalRisk
import com.cardenaspiero255.gamehubultra.domain.ThermalTrend

fun main() {
    val t0 = 1000L
    UltraFrontierWorldStateRegistry.clear()
    val game = GameHubAiContext(selectedGamePackage = "game.alpha", sessionActive = true)
    val seen = UltraFrontierWorldState.from(game, nowMillis = t0).copy(
        thermalRisk = ThermalRisk.CRITICAL,
        thermalTrend = ThermalTrend.RISING,
        preventAggressiveProfiles = true
    )
    UltraFrontierWorldStateRegistry.update(seen)
    val idle = game.copy(sessionActive = false)
    UltraFrontierWorldStateRegistry.update(idle, nowMillis = t0 + 90000L)
    val recent = checkNotNull(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0 + 90001L))
    check(recent.thermalRisk == ThermalRisk.CRITICAL && recent.preventAggressiveProfiles) {
        "C2_PR181_WRONG_BLANKET_CLEAR_DISCARDS_STILL_FRESH_SIGNAL"
    }
    println("C2_PR181_FRESH_IDLE_RETAINED_PASS")
    UltraFrontierWorldStateRegistry.update(idle, nowMillis = t0 + 150000L)
    val stale = checkNotNull(UltraFrontierWorldStateRegistry.snapshotForPlanning(t0 + 150001L))
    check(stale.thermalRisk == null && !stale.preventAggressiveProfiles) {
        "C2_PR181_TTL_SHOULD_USE_ORIGINAL_OBSERVATION_AGE"
    }
    println("C2_PR181_EXPIRED_SIGNAL_REJECTED_PASS")
    UltraFrontierWorldStateRegistry.clear()
}
