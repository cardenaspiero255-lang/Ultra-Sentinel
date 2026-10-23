package com.cardenaspiero255.gamehubultra

import android.content.Context
import com.cardenaspiero255.gamehubultra.data.*
import com.cardenaspiero255.gamehubultra.domain.*
import kotlin.coroutines.Continuation
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine

/**
 * Actual #153 processCompletedAdaptiveSession and #152 AiProfileProposalStore
 * are compiled into the SAME jar and invoked on the SAME object graph.
 * The bridge is deliberately explicit: Android production wiring is NOT asserted.
 */
private fun <T> sync(block:suspend()->T):T {
    var answer:Result<T>?=null
    block.startCoroutine(object:Continuation<T> {
        override val context:CoroutineContext=EmptyCoroutineContext
        override fun resumeWith(result:Result<T>){answer=result}
    })
    return checkNotNull(answer).getOrThrow()
}
private const val PACKAGE="game.alpha"
private val balanced=GameProfileConfig(PerformanceProfile.BALANCED,ThermalPreference.BALANCED)
private val turbo=GameProfileConfig(PerformanceProfile.PERFORMANCE,ThermalPreference.PERFORMANCE)
private fun config(p:PerformanceProfile)=if(p==PerformanceProfile.PERFORMANCE)turbo else balanced

private class IntegratedScenario(
    private val injectAfterHandledFailure:Boolean,
    private val requireMonotonicVersionOnReplay:Boolean=true
) {
    val sharedContext=Context()
    val store=AiProfileProposalStore(sharedContext)
    val optimizer=PerGameAdaptiveOptimizer()
    var visibleProfile=PerformanceProfile.BALANCED
    var handled=false
    var recordedEvents=0
    var persistenceWrites=0
    val completed=SessionCoachStoredSession(
        sessionId="original-pr153-session",
        packageName=PACKAGE,
        gameVersion="1.0",
        samples=listOf(SessionCoachStoredSample())
    )
    init {
        store.recordApplied(PACKAGE,AiProfileProposal(7,balanced))
        store.recordApplied("foreign.game",AiProfileProposal(3,balanced))
        optimizer.clearFailureOnce=injectAfterHandledFailure
    }
    fun step():PerGameAdaptiveDecision?=sync {
        processCompletedAdaptiveSession(
            completed=completed,
            optimizer=optimizer,
            nowMillis=100L,
            wasSessionHandled={handled},
            resolveActiveProfile={visibleProfile},
            persistProfile={pkg,value->
                // This is the shared integration adapter between both actual modules.
                // A replay target must not consume an obsolete rollback state.
                val rollback=store.rollbackState(pkg)
                if(requireMonotonicVersionOnReplay &&
                   value==PerformanceProfile.PERFORMANCE &&
                   rollback?.version!=7) {
                    throw IllegalStateException(
                        "C2_STALE_STORE_VERSION_BLOCKED_ADAPTIVE_PROFILE_REPLAY"
                    )
                }
                visibleProfile=value
                persistenceWrites++
                // The same store remains authoritative for the entire lifecycle.
                check(store.rollbackState(pkg)?.previousKnownGoodConfig?.performanceProfile!=null)
            },
            markSessionHandled={handled=true},
            recordPerformanceEvent={recordedEvents++}
        )
    }
    fun injectStaleProposal() {
        store.recordApplied(PACKAGE,AiProfileProposal(6,turbo))
    }
    fun staleRejected():Boolean=store.rollbackState(PACKAGE)?.version==7
    fun foreignUnaffected():Boolean=store.rollbackState("foreign.game")?.version==3
    fun recovered():Boolean=visibleProfile==PerformanceProfile.PERFORMANCE &&
        optimizer.state==optimizer.targetState &&
        optimizer.pendingDecision==null && handled && recordedEvents==1
    fun replayPending():Boolean=optimizer.pendingDecision!=null
}
fun main(args:Array<String>) {
    require(args.size==1 && args[0] in setOf("00","01","10","11"))
    val mode=args[0]
    // Benign NORMAL behavior using the same real original #152 backing store.
    val normal=IntegratedScenario(false)
    val normalDecision=normal.step()
    val ordinary=normalDecision?.changed==true && normal.recovered() &&
        normal.foreignUnaffected() && normal.store.rollbackState(PACKAGE)?.version==7 &&
        normal.persistenceWrites==1
    check(ordinary) {"C2_SHARED_NORMAL_CONTROL_FAILED"}
    // Separate local correction: with no stale rollback, #153 must recover if patched.
    val local=IntegratedScenario(true)
    val injected=runCatching{local.step()}.exceptionOrNull()
    check(injected?.message=="C2_INJECTED_CLEAR_FAILURE") {"C2_CLEAR_FAILURE_NOT_INJECTED"}
    check(local.handled && !local.recovered() && local.replayPending())
    val localReplay=runCatching{local.step()}
    check(localReplay.isSuccess) {"C2_LOCAL_REPLAY_UNEXPECTED_EXCEPTION"}
    val localConsistent=local.recovered()
    val expectedLocal=mode[0]=='1'
    check(localConsistent==expectedLocal) {"C2_LOCAL_ADAPTIVE_EFFECT_DRIFT"}

    // Shared callback->store lifecycle: version 6 injected AFTER handled failure.
    val shared=IntegratedScenario(true)
    check(runCatching{shared.step()}.exceptionOrNull()?.message=="C2_INJECTED_CLEAR_FAILURE")
    check(shared.handled && shared.replayPending() && shared.foreignUnaffected())
    shared.injectStaleProposal()
    val staleRejected=shared.staleRejected()
    check(staleRejected==(mode[1]=='1')) {"C2_SHARED_STORE_GUARD_DRIFT"}
    check(shared.foreignUnaffected()) {"C2_FOREIGN_PACKAGE_CONTAMINATED"}
    val replay=runCatching{shared.step()}
    val staleBlockedReplay=replay.exceptionOrNull()?.message==
        "C2_STALE_STORE_VERSION_BLOCKED_ADAPTIVE_PROFILE_REPLAY"
    val sharedRecovered=replay.isSuccess && shared.recovered()
    check(sharedRecovered==(mode=="11")) {"C2_SHARED_REPLAY_MATRIX_UNEXPECTED"}
    check(staleBlockedReplay==(mode=="10")) {"C2_INTERFERENCE_ORACLE_NOT_DISCRIMINATIVE"}
    check(shared.recordedEvents==1) {"C2_DUPLICATE_EVENTS"}
    val blockedPending=(mode=="10" && shared.replayPending())
    check(blockedPending==(mode=="10")) {"C2_BLOCKED_PENDING_LOST"}
    if(replay.isSuccess) {
        val idle=shared.step()
        check(idle==null && shared.recordedEvents==1 && !shared.replayPending())
    }
    println("C2_SHARED_JVM_ORIGINAL_SOURCE_CONTROLS_PASS")
    println("C2_SHARED_JVM mode=$mode localReplayCorrect=$localConsistent staleRejected=$staleRejected coupledReplayCorrect=$sharedRecovered staleGuardBlockedReplay=$staleBlockedReplay")
}
