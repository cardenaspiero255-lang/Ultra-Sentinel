package com.cardenaspiero255.gamehubultra.domain

// Acceptance oracle for the actual frozen GameHub #151 source, not a synthetic replacement.
private fun requireSafe(ok:Boolean, id:String) {
    if (!ok) throw IllegalStateException("GAMEHUB_PR151_RED_" + id)
}
private fun state(headroom:Float?, time:Long=1000L)=SessionCoachSnapshot(
    timestampMillis=time,batteryPercent=null,thermalStatus=null,
    thermalHeadroom=headroom,refreshRateHz=null,latencyMs=null
)
private fun raised(headroom:Float?)=AiSessionCoach.midSession(state(0.1f,0),state(headroom,1000))
    .any { it.signal==SessionCoachSignal.THERMAL }
fun main(){
    requireSafe(raised(0.85f),"FINITE_HIGH_STILL_ALERTS")
    requireSafe(!raised(0.15f),"FINITE_LOW_STILL_QUIET")
    requireSafe(!raised(null),"NULL_STILL_QUIET")
    requireSafe(!raised(Float.NaN),"NAN_STILL_QUIET")
    // The frozen original fails here. Only a corrected original source passes.
    requireSafe(!raised(Float.POSITIVE_INFINITY),"INFINITY_MUST_BE_REJECTED")
    val readiness=GamingReadiness(100,"Lista",emptyList())
    requireSafe(!AiSessionCoach.preSession(readiness,state(Float.POSITIVE_INFINITY))
        .detail.contains("Margen térmico reducido"),"PRE_SESSION_INFINITY")
    val recurrent=AiSessionCoach.recurringPatterns(listOf(
        state(Float.POSITIVE_INFINITY,1000),state(Float.POSITIVE_INFINITY,2000),
        state(Float.POSITIVE_INFINITY,3000)))
    requireSafe(recurrent.none { it.signal==SessionCoachSignal.THERMAL },"RECURRING_INFINITY")
    println("GAMEHUB_PR151_ACCEPTANCE_GREEN")
}
