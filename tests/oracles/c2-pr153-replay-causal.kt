package com.cardenaspiero255.gamehubultra

import com.cardenaspiero255.gamehubultra.domain.*
import com.cardenaspiero255.gamehubultra.data.*
import kotlin.coroutines.Continuation
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine

/*
 * Executes identical conditions on exact upstream source and a disposable
 * one-line replay correction. Does not read the detector or assign labels.
 */
private fun <T> sync(block:suspend ()->T):T {
    var result:Result<T>?=null
    block.startCoroutine(object:Continuation<T> {
        override val context:CoroutineContext=EmptyCoroutineContext
        override fun resumeWith(outcome:Result<T>) {result=outcome}
    })
    return checkNotNull(result).getOrThrow()
}
private val session=SessionCoachStoredSession(
    sessionId="session-1",packageName="com.example.game",gameVersion="1.0",
    samples=listOf(SessionCoachStoredSample())
)
private val initial=PerformanceProfile("default")
private class Scenario {
    val optimizer=PerGameAdaptiveOptimizer()
    var profile=initial
    var handled=false
    var events=0
    var firstPersistThrows=false
    fun step():PerGameAdaptiveDecision?=sync {
        processCompletedAdaptiveSession(
            completed=session,optimizer=optimizer,nowMillis=100L,
            wasSessionHandled={handled},resolveActiveProfile={profile},
            persistProfile={_,value->
                if(firstPersistThrows){
                    firstPersistThrows=false
                    throw IllegalStateException("controlled write failure")
                }
                profile=value
            },
            markSessionHandled={handled=true},
            recordPerformanceEvent={events++}
        )
    }
}
fun main() {
    val normal=Scenario()
    val normalDecision=normal.step()
    val normalConsistent=normalDecision?.changed==true &&
        normal.profile==normal.optimizer.targetProfile &&
        normal.optimizer.state==normal.optimizer.targetState &&
        normal.optimizer.pendingDecision==null && normal.handled &&
        normal.events==1
    check(normalConsistent) { "NORMAL_CONTROL_FAILED" }

    val beforeWrite=Scenario()
    beforeWrite.firstPersistThrows=true
    val earlyFailed=runCatching {beforeWrite.step()}.isFailure
    val earlyStillSafe=earlyFailed && beforeWrite.profile==initial &&
        !beforeWrite.handled &&
        beforeWrite.optimizer.state==beforeWrite.optimizer.baselineState &&
        beforeWrite.optimizer.pendingDecision!=null
    val beforeWriteRecovered=beforeWrite.step()
    val preWriteRecovered=earlyStillSafe && beforeWriteRecovered?.changed==true &&
        beforeWrite.profile==beforeWrite.optimizer.targetProfile &&
        beforeWrite.optimizer.state==beforeWrite.optimizer.targetState &&
        beforeWrite.optimizer.pendingDecision==null &&
        beforeWrite.handled && beforeWrite.events==1
    check(preWriteRecovered) { "PRE_WRITE_CONTROL_FAILED" }

    val problematic=Scenario()
    problematic.optimizer.clearFailureOnce=true
    val afterHandledError=runCatching{problematic.step()}.isFailure
    val clearFailureShowsDivergence=afterHandledError &&
        problematic.handled && problematic.profile==initial &&
        problematic.optimizer.state==problematic.optimizer.baselineState &&
        problematic.optimizer.pendingDecision!=null && problematic.events==1
    check(clearFailureShowsDivergence) { "POST_HANDLED_FAILURE_NOT_REPRODUCED" }

    val replay=problematic.step()
    val replayProfileDiverged=replay?.changed==true &&
        problematic.optimizer.state==problematic.optimizer.targetState &&
        problematic.profile==initial && problematic.optimizer.pendingDecision==null
    val replayStateConsistent=replay?.changed==true &&
        problematic.optimizer.state==problematic.optimizer.targetState &&
        problematic.profile==problematic.optimizer.targetProfile &&
        problematic.optimizer.pendingDecision==null && problematic.handled
    val noDuplicateEvents=problematic.events==1
    val profileAfterReplay=problematic.profile
    val idle=problematic.step()
    val idempotent=idle==null && problematic.profile==profileAfterReplay &&
        problematic.optimizer.pendingDecision==null && problematic.events==1 &&
        problematic.handled

    val flags=linkedMapOf(
        "normalConsistent" to normalConsistent,
        "preWriteRecovered" to preWriteRecovered,
        "clearFailureShowsDivergence" to clearFailureShowsDivergence,
        "replayProfileDiverged" to replayProfileDiverged,
        "replayStateConsistent" to replayStateConsistent,
        "noDuplicateEvents" to noDuplicateEvents,
        "idempotent" to idempotent
    )
    println(flags.entries.joinToString(prefix="{",postfix="}",separator=","){
        "\"" + it.key + "\":" + it.value
    })
}
