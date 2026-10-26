package com.cardenaspiero255.gamehubultra.domain

private fun requireJudge(ok:Boolean,id:String) {
    if (!ok) throw IllegalStateException("GAMEHUB_PR151_JUDGE_VETO_"+id)
}
private fun sample(headroom:Float?,time:Long=1000L)=SessionCoachSnapshot(
    timestampMillis=time,batteryPercent=null,thermalStatus=null,
    thermalHeadroom=headroom,refreshRateHz=null,latencyMs=null
)
fun main(){
    val healthy=AiSessionCoach.midSession(sample(0.1f,0),sample(0.95f,1000))
    requireJudge(healthy.any { it.signal==SessionCoachSignal.THERMAL },"FINITE_HIGH_REGRESSION")
    val negatives=listOf(Float.NEGATIVE_INFINITY,Float.POSITIVE_INFINITY,Float.NaN,0.0f,0.2f)
    for(value in negatives) {
        val result=AiSessionCoach.midSession(sample(0.1f,0),sample(value,1000))
        requireJudge(result.none { it.signal==SessionCoachSignal.THERMAL },"INVALID_OR_LOW_"+value)
    }
    val infiniteList=(1L..4L).map {sample(Float.POSITIVE_INFINITY,it*1000L)}
    requireJudge(AiSessionCoach.recurringPatterns(infiniteList)
        .none { it.signal==SessionCoachSignal.THERMAL },"RECURRENT_NONFINITE")
    val finiteList=(1L..4L).map {sample(0.95f,it*1000L)}
    requireJudge(AiSessionCoach.recurringPatterns(finiteList)
        .any { it.signal==SessionCoachSignal.THERMAL },"FINITE_RECURRENT_MUST_ALERT")
    println("GAMEHUB_PR151_JUDGE_APPROVED")
}
