package com.cardenaspiero255.gamehubultra.domain

private fun batterySnapshot(value: Int) = SessionCoachSnapshot(
    timestampMillis = 0L,
    batteryPercent = value,
    thermalStatus = null,
    thermalHeadroom = null,
    refreshRateHz = null,
    latencyMs = null
)

fun main() {
    val actualDrop = AiSessionCoach.midSession(
        batterySnapshot(65), batterySnapshot(55)
    )
    check(actualDrop.count { it.signal == SessionCoachSignal.BATTERY } == 1) {
        "C2_SESSION_REAL_BATTERY_DROP_MISSING"
    }
    println("C2_SESSION_NORMAL_DROP_CONTROL_PASS")

    val increase = AiSessionCoach.midSession(
        batterySnapshot(55), batterySnapshot(65)
    )
    check(increase.none { it.signal == SessionCoachSignal.BATTERY }) {
        "C2_SESSION_BATTERY_INCREASE_FALSE_DROP_ALARM"
    }
    println("C2_SESSION_BATTERY_INCREASE_SAFE_PASS")
}
