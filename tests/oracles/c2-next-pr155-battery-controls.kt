package com.cardenaspiero255.gamehubultra.domain
private fun demand(ok:Boolean,name:String){
    if(!ok)throw IllegalStateException("C2_NEXT_155_CONTROL_FAILED_"+name)
}
private fun s(t:Long,p:Int?,charging:Boolean=false,saver:Boolean=false)=
    SessionCoachSnapshot(t,p,charging,saver)
fun main(){
    val engine=BatteryAwareGamingEngine()
    val none=engine.assess(emptyList())
    demand(none.recommendation==BatteryGamingRecommendation.NORMAL &&
        none.currentPercent==null,"EMPTY_INPUT_NORMAL")

    val critical=engine.assess(listOf(s(0,15)))
    demand(critical.recommendation==BatteryGamingRecommendation.CONSERVE &&
        critical.preventAggressiveProfiles,"CRITICAL_BATTERY_CONSERVE")

    val charging=engine.assess(listOf(s(0,100),s(600000,75),
        s(900000,74,charging=true)))
    demand(charging.recommendation==BatteryGamingRecommendation.CHARGING &&
        charging.drainPercentPerHour==null&&!charging.preventAggressiveProfiles,
        "CHARGING_DISCARDS_PRIOR_DRAIN")

    val high=engine.assess(listOf(s(0,90),s(600000,86)))
    demand(high.recommendation==BatteryGamingRecommendation.BALANCED &&
        high.drainPercentPerHour!=null && high.drainPercentPerHour!!>=20f,
        "MEASURED_HIGH_DRAIN_BALANCED")

    val low=engine.assess(listOf(s(0,90),s(600000,89)))
    demand(low.recommendation==BatteryGamingRecommendation.NORMAL &&
        low.drainPercentPerHour!=null&&low.drainPercentPerHour!!<20f,
        "LOW_DRAIN_NORMAL")

    val short=engine.assess(listOf(s(0,90),s(60000,70)))
    demand(short.drainPercentPerHour==null &&
        short.recommendation==BatteryGamingRecommendation.NORMAL,
        "SHORT_WINDOW_NOT_EXTRAPOLATED")

    val save=engine.assess(listOf(s(0,95,saver=true)))
    demand(save.recommendation==BatteryGamingRecommendation.CONSERVE &&
        save.preventAggressiveProfiles,"POWER_SAVER_CONSERVE")

    val ordered=listOf(s(0,90),s(300000,87),s(600000,84))
    val inOrder=engine.assess(ordered)
    val reversed=engine.assess(ordered.reversed())
    demand(inOrder.drainPercentPerHour==reversed.drainPercentPerHour&&
        inOrder.recommendation==reversed.recommendation,
        "SORTED_TIMESTAMPS_EQUIVALENT")

    val resumed=engine.assess(listOf(
        s(0,100),s(600000,94,charging=true),
        s(1200000,90),s(1800000,86)))
    demand(resumed.observedDropPercent==4 &&
        resumed.observedDurationMillis==600000L &&
        resumed.drainPercentPerHour!=null &&
        resumed.recommendation==BatteryGamingRecommendation.BALANCED,
        "CHARGE_BOUNDARY_RESTARTS_DRAIN_WINDOW")

    println("""{"schema":"ultra-sentinel-c2-next-original-pr155-battery-controls/v1","pr":155,"sourceGitBlob":"8696360219231f3f1477d5ad21c93bca2197e281","emptyNormal":true,"criticalConserve":true,"chargingPreventsDrain":true,"highDrainBalanced":true,"lowDrainNormal":true,"shortWindowNotExtrapolated":true,"powerSaverConserve":true,"orderingStable":true,"chargingBoundaryResets":true,"executedOriginalSource":true,"candidateInspected":false,"baselineCompared":false,"negativeFindingLabelsEstablished":0,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
