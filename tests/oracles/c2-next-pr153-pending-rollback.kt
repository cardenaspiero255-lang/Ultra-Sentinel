package com.cardenaspiero255.gamehubultra

import com.cardenaspiero255.gamehubultra.domain.*
import com.cardenaspiero255.gamehubultra.data.*
import kotlin.coroutines.Continuation
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine

private fun demand(ok:Boolean,name:String){
 if(!ok)throw IllegalStateException("C2_NEXT_153_CONTROL_FAILED_"+name)
}
private fun <T> runSync(block:suspend()->T):T{
 var result:Result<T>?=null
 block.startCoroutine(object:Continuation<T>{
  override val context:CoroutineContext=EmptyCoroutineContext
  override fun resumeWith(outcome:Result<T>){result=outcome}
 })
 return checkNotNull(result).getOrThrow()
}
private val session=SessionCoachStoredSession(
 sessionId="session-1",packageName="com.example.game",gameVersion="1.0",
 samples=listOf(SessionCoachStoredSample())
)
private val initialProfile=PerformanceProfile("default")

private class Scenario {
 val optimizer=PerGameAdaptiveOptimizer()
 var profile=initialProfile
 var handled=false
 var events=0
 var rejectFirstPersist=false
 fun step():PerGameAdaptiveDecision?=runSync {
  processCompletedAdaptiveSession(
   completed=session,optimizer=optimizer,nowMillis=100L,
   wasSessionHandled={handled},resolveActiveProfile={profile},
   persistProfile={_,next->
    if(rejectFirstPersist){
     rejectFirstPersist=false
     throw IllegalStateException("controlled write failure")
    }
    profile=next
   },
   markSessionHandled={handled=true},
   recordPerformanceEvent={events++}
  )
 }
}
fun main(){
 val normal=Scenario()
 val success=normal.step()
 demand(success?.changed==true &&
  normal.profile==normal.optimizer.targetProfile &&
  normal.optimizer.state==normal.optimizer.targetState &&
  normal.handled && normal.optimizer.pendingDecision==null &&
  normal.events==1,"NORMAL_SUCCESS_ATOMIC_PROFILE_STATE")

 val early=Scenario()
 early.rejectFirstPersist=true
 val earlyFailed=runCatching {early.step()}.isFailure
 demand(earlyFailed && !early.handled &&
  early.profile==initialProfile &&
  early.optimizer.state==early.optimizer.baselineState &&
  early.optimizer.pendingDecision!=null,
  "PERSIST_FAILURE_BEFORE_MUTATION_RETRY_SAFE")
 val earlyRecovered=early.step()
 demand(earlyRecovered?.changed==true && early.handled &&
  early.profile==early.optimizer.targetProfile &&
  early.optimizer.pendingDecision==null,
  "PERSIST_FAILURE_BEFORE_MUTATION_RETRY_SAFE")

 // Adversarial crash boundary from the original state machine:
 // profile write and handled-marker succeed; clearing pending fails once.
 // The original catches and rolls the profile back to its old value,
 // but the handled flag is sticky and pending record remains.
 val problematic=Scenario()
 problematic.optimizer.clearFailureOnce=true
 val failed=runCatching {problematic.step()}.isFailure
 demand(failed && problematic.handled &&
  problematic.profile==initialProfile &&
  problematic.optimizer.state==problematic.optimizer.baselineState &&
  problematic.optimizer.pendingDecision!=null,
  "CLEAR_FAILURE_AFTER_HANDLED_LEAVES_PROFILE_STATE_DIVERGENCE")

 val replayed=problematic.step()
 val diverged=replayed?.changed==true &&
  problematic.optimizer.state==problematic.optimizer.targetState &&
  problematic.profile==initialProfile &&
  problematic.optimizer.pendingDecision==null &&
  problematic.handled
 demand(diverged,"RECOVERY_DOES_NOT_REPERSIST_TARGET_PROFILE")

 val idle=problematic.step()
 demand(idle==null && problematic.profile==initialProfile,
  "REPLAY_ONCE_WITHOUT_PENDING_IDEMPOTENT")

 println("""{"schema":"ultra-sentinel-c2-next-original-pr153-rollback-witness/v1","pr":153,"sourceGitBlob":"d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f","rule":"PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE","line":71,"normalSuccessControlPassed":true,"prewriteFailureControlPassed":true,"failureAfterHandledReproduced":true,"replayProfileStateDiverged":true,"idempotentHandledControlPassed":true,"reproduced":true,"candidateInspected":false,"baselineCompared":false,"negativeFindingLabelsEstablished":0,"precision":null,"recall":null,"f1":null,"tripleSPlusCertified":false}""")
}
