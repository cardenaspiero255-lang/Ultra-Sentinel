package com.cardenaspiero255.gamehubultra.domain

private fun requireSourceBehavior(ok:Boolean,id:String){
    if(!ok)throw IllegalStateException("C2_NEXT_151_SOURCE_BEHAVIOR_FAILED_"+id)
}
private fun snapshot(headroom:Float?,time:Long=1000L):SessionCoachSnapshot =
    SessionCoachSnapshot(
        timestampMillis=time,batteryPercent=null,thermalStatus=null,
        thermalHeadroom=headroom,refreshRateHz=null,latencyMs=null
    )
private fun thermalRaised(headroom:Float?):Boolean =
    AiSessionCoach.midSession(snapshot(0.1f,0),snapshot(headroom,1000))
        .any { it.signal==SessionCoachSignal.THERMAL }

fun main(){
    // The finite high reading must still create a legitimate alert.
    requireSourceBehavior(thermalRaised(0.85f),"NORMAL_FINITE_HIGH_THERMAL_ALERTED")
    // An absent or NaN sensor measurement must not be treated as high pressure.
    requireSourceBehavior(!thermalRaised(null),"MISSING_THERMAL_REJECTED")
    requireSourceBehavior(!thermalRaised(Float.NaN),"NAN_THERMAL_HEADROOM_REJECTED")
    requireSourceBehavior(!thermalRaised(0.15f),"LOW_FINITE_REJECTED")
    // Independent fault predicate: non-finite infinity is not a valid sensor reading,
    // yet the unmodified original compares Infinity >= 0.8f as true.
    requireSourceBehavior(thermalRaised(Float.POSITIVE_INFINITY),
        "FLOAT_POSITIVE_INFINITY_ALERTED")
    // Same error independently flows to pre-session UI guidance.
    val pre=AiSessionCoach.preSession(GamingReadiness(100,"Lista",emptyList()),
        snapshot(Float.POSITIVE_INFINITY))
    requireSourceBehavior(pre.detail.contains("Margen térmico reducido"),
        "INFINITE_PRE_SESSION_FALSE_THERMAL")
    val pattern=AiSessionCoach.recurringPatterns(listOf(
        snapshot(Float.POSITIVE_INFINITY,1000),
        snapshot(Float.POSITIVE_INFINITY,2000),
        snapshot(Float.POSITIVE_INFINITY,3000)))
    requireSourceBehavior(pattern.any { it.signal==SessionCoachSignal.THERMAL },
        "RECURRING_INFINITE_HEADROOM_FALSE_THERMAL")
    val nanPattern=AiSessionCoach.recurringPatterns(listOf(
        snapshot(Float.NaN,1000),snapshot(Float.NaN,2000),
        snapshot(Float.NaN,3000)))
    requireSourceBehavior(nanPattern.none { it.signal==SessionCoachSignal.THERMAL },
        "NAN_RECURRING_CONTROL")
    println("""{"schema":"ultra-sentinel-c2-next-original-pr151-nonfinite-witness/v1","pr":151,"sourceGitBlob":"adb11032b9b7f62f865228dfa1c27258ca3fa0df","rule":"NONFINITE_THERMAL_HEADROOM_ACCEPTED","line":264,"reproducedBehavioralDefect":true,"finiteHighControlPassed":true,"missingRejected":true,"nanRejected":true,"infiniteMidSessionIncorrectlyAlerted":true,"infinitePreSessionIncorrectlyAlerted":true,"infiniteRecurringIncorrectlyAlerted":true,"originalSourceExecuted":true,"candidateInspected":false,"baselineCompared":false,"positiveFindingLabelsSealed":0,"negativeFindingLabelsEstablished":0,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
