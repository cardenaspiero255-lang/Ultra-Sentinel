package com.cardenaspiero255.gamehubultra.ui.components
import com.cardenaspiero255.gamehubultra.domain.*
fun main() {
    val obs=(1..5).map { SessionCoachMessage(title="T$it",detail="D$it") }
    val active=SessionCoachPresentation.lines(
        preSession=SessionCoachMessage("PRE","pre-session never in active"),
        liveSamples=emptyList(),observations=obs,
        postSession=null,sessionActive=true,
        activeSessionText="IN_GAME",stableText="STABLE")
    check(active.first()=="IN_GAME"){ "C2_PR151_HEADER_CONTROL_FAILED" }
    check(active.none { it.contains("PRE") }){ "C2_PR151_PRESESSION_ISOLATION_FAILED" }
    check(active.drop(1)==listOf("• T3: D3","• T4: D4","• T5: D5")){
        "C2_PR151_ACTIVE_OBSERVATION_TAIL_BOUNDS"
    }
    println("C2_PR151_ACTIVE_TAIL_PASS")
    val idle=SessionCoachPresentation.lines(
        preSession=SessionCoachMessage("PRE","pre-detail"),
        liveSamples=emptyList(),observations=obs,
        postSession=null,sessionActive=false,activeSessionText="IN_GAME",stableText="STABLE")
    check(idle==listOf("PRE","pre-detail","• T5: D5")){
        "C2_PR151_IDLE_LATEST_CONTROL_FAILED"
    }
    println("C2_PR151_IDLE_ISOLATION_PASS")
}
