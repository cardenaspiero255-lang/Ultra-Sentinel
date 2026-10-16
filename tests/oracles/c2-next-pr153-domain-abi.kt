package com.cardenaspiero255.gamehubultra.domain

// ABI-only collaborators. The under-test processCompletedAdaptiveSession
// is compiled byte-for-byte from the original PR HEAD, NOT implemented here.
data class PerformanceProfile(val id:String)
data class AdaptiveState(val generation:String)
data class AdaptiveGameKey(val packageName:String,val gameVersion:String)
data class AdaptiveTrendSample(
 val thermalStatus:Int,
 val batteryPercent:Int?,
 val refreshRateHz:Float?,
 val memoryUsedPercent:Float?,
 val latencyMs:Int?
)
data class PerGameAdaptiveDecision(
 val profile:PerformanceProfile,val changed:Boolean,val reason:String
)
data class PerGameAdaptivePendingDecision(
 val sessionId:String,val key:AdaptiveGameKey,
 val previousProfile:PerformanceProfile,
 val targetProfile:PerformanceProfile,
 val targetState:AdaptiveState,
 val eventTimestampMillis:Long,val reason:String
)
enum class PerformanceEventType { POLICY_CHANGED }
data class PerformanceEvent(
 val timestampMillis:Long,
 val type:PerformanceEventType,
 val sessionId:String,
 val profile:PerformanceProfile,
 val detail:String
)

// Deterministic persistence collaborator: the failure is injected exactly
// at the clearPendingDecision boundary after markSessionHandled, not inside
// the runtime function being evaluated.
class PerGameAdaptiveOptimizer {
 val baselineState=AdaptiveState("baseline")
 val targetState=AdaptiveState("target")
 val targetProfile=PerformanceProfile("performance")
 var state:AdaptiveState?=baselineState
 var pendingDecision:PerGameAdaptivePendingDecision?=null
 var clearFailureOnce:Boolean=false
 var evaluatedCount=0
 fun snapshotState(key:AdaptiveGameKey):AdaptiveState?=state
 fun restoreState(key:AdaptiveGameKey,restore:AdaptiveState?){state=restore}
 fun readPendingDecision(sessionId:String):PerGameAdaptivePendingDecision?=
   pendingDecision?.takeIf{it.sessionId==sessionId}
 fun writePendingDecision(pending:PerGameAdaptivePendingDecision){
   pendingDecision=pending
 }
 fun clearPendingDecision(sessionId:String){
   if(clearFailureOnce){
     clearFailureOnce=false
     throw IllegalStateException("controlled pending persistence failure")
   }
   if(pendingDecision?.sessionId==sessionId)pendingDecision=null
 }
 fun commitState(key:AdaptiveGameKey){}
 fun evaluate(
  key:AdaptiveGameKey,activeProfile:PerformanceProfile,
  samples:List<AdaptiveTrendSample>,nowMillis:Long
 ):PerGameAdaptiveDecision=evaluateUncommitted(key,activeProfile,samples,nowMillis)
 fun evaluateUncommitted(
  key:AdaptiveGameKey,activeProfile:PerformanceProfile,
  samples:List<AdaptiveTrendSample>,nowMillis:Long
 ):PerGameAdaptiveDecision{
  evaluatedCount++
  state=targetState
  return PerGameAdaptiveDecision(targetProfile,true,"consistent target transition")
 }
}
