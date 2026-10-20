package com.cardenaspiero255.gamehubultra.domain

// Raw observations, not a self-declared PASS receipt. Same test on original
// immutable SHA and on exactly one patched line.
private fun raised(x: Float?): Boolean =
    AiSessionCoach.midSession(
        SessionCoachSnapshot(timestampMillis=0,batteryPercent=null,thermalStatus=null,thermalHeadroom=0.1f,refreshRateHz=null,latencyMs=null),
        SessionCoachSnapshot(timestampMillis=1000,batteryPercent=null,thermalStatus=null,thermalHeadroom=x,refreshRateHz=null,latencyMs=null)
    ).any { it.signal==SessionCoachSignal.THERMAL }

fun main() {
    val infinity=raised(Float.POSITIVE_INFINITY)
    val finite=raised(0.85f)
    val nan=raised(Float.NaN)
    println("""{"infinityAlert":$infinity,"finiteAlert":$finite,"nanAlert":$nan}""")
}
