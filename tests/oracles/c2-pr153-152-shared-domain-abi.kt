package com.cardenaspiero255.gamehubultra.domain

// The only shared test ABI for compiling BOTH original Kotlin modules in one JVM.
// It is not an Android integration and cannot establish production call-graph identity.
enum class PerformanceProfile { BALANCED, PERFORMANCE, X4 }
enum class ThermalPreference { BALANCED, PERFORMANCE }
enum class OrientationPreference { AUTO, PORTRAIT, LANDSCAPE }
data class ResolutionTarget(val width:Int,val height:Int)
data class GameProfileConfig(
    val performanceProfile:PerformanceProfile,
    val thermalPreference:ThermalPreference,
    val refreshRateTargetHz:Int?=null,
    val resolutionTarget:ResolutionTarget?=null,
    val orientationPreference:OrientationPreference=OrientationPreference.AUTO
)
data class AiProfileProposal(val version:Int,val previousKnownGoodConfig:GameProfileConfig)
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
    val sessionId:String,
    val key:AdaptiveGameKey,
    val previousProfile:PerformanceProfile,
    val targetProfile:PerformanceProfile,
    val targetState:AdaptiveState,
    val eventTimestampMillis:Long,
    val reason:String
)
enum class PerformanceEventType { POLICY_CHANGED }
data class PerformanceEvent(
    val timestampMillis:Long,
    val type:PerformanceEventType,
    val sessionId:String,
    val profile:PerformanceProfile,
    val detail:String
)
// A deterministic optimizer replaces Android-only dependencies, not the original
// PR153 production function under test.
class PerGameAdaptiveOptimizer {
    val baselineState=AdaptiveState("baseline")
    val targetState=AdaptiveState("target")
    val targetProfile=PerformanceProfile.PERFORMANCE
    var state:AdaptiveState?=baselineState
    var pendingDecision:PerGameAdaptivePendingDecision?=null
    var clearFailureOnce:Boolean=false
    var evaluatedCount=0
    fun snapshotState(key:AdaptiveGameKey):AdaptiveState?=state
    fun restoreState(key:AdaptiveGameKey,restore:AdaptiveState?){state=restore}
    fun readPendingDecision(sessionId:String):PerGameAdaptivePendingDecision?=
        pendingDecision?.takeIf{it.sessionId==sessionId}
    fun writePendingDecision(pending:PerGameAdaptivePendingDecision){pendingDecision=pending}
    fun clearPendingDecision(sessionId:String){
        if(clearFailureOnce){
            clearFailureOnce=false
            throw IllegalStateException("C2_INJECTED_CLEAR_FAILURE")
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
        return PerGameAdaptiveDecision(targetProfile,true,"shared-boundary-target-transition")
    }
}
