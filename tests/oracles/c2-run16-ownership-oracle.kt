package com.cardenaspiero255.gamehubultra.data
import com.cardenaspiero255.gamehubultra.domain.*
import kotlinx.coroutines.flow.*
import kotlin.coroutines.*
class FakeRepo:GameSelectionStateRepository {
    val operations=mutableListOf<String>()
    override fun selectedProfileFlow():Flow<PerformanceProfile> =SimpleFlow(PerformanceProfile.BALANCED)
    override fun selectedGameFlow():Flow<String?> =SimpleFlow("game.pkg")
    override fun profileForGameFlow(packageName:String):Flow<PerformanceProfile?> = SimpleFlow(null)
    override fun gameProfileConfigFlow(packageName:String):Flow<GameProfileConfig?> = SimpleFlow(null)
    override suspend fun saveSelectedProfile(profile:PerformanceProfile){operations+="global:$profile"}
    override suspend fun saveSelectedGame(packageName:String){operations+="selected:$packageName"}
    override suspend fun saveSelectedGameAndProfile(packageName:String,profile:PerformanceProfile){operations+="selectedProfile:$packageName:$profile"}
    override suspend fun saveProfileForGame(packageName:String,profile:PerformanceProfile){operations+="gameProfile:$packageName:$profile"}
    override suspend fun saveGameProfileConfig(packageName:String,config:GameProfileConfig){operations+="config:$packageName:${config.performanceProfile}"}
    override suspend fun saveAdaptiveProfileForGame(packageName:String,profile:PerformanceProfile){operations+="adaptive:$packageName:$profile"}
}
fun runSuspend(block:suspend ()->Unit) {
    var failure:Throwable?=null
    block.startCoroutine(object:Continuation<Unit> {
        override val context:CoroutineContext=EmptyCoroutineContext
        override fun resumeWith(result:Result<Unit>){failure=result.exceptionOrNull()}
    })
    failure?.let { throw it }
}
fun main() {
    val delegate=FakeRepo()
    val explicit=mutableListOf<String>()
    val repository=AdaptiveAwareGameSelectionStateRepository(delegate){game,profile->
        explicit+="$game:$profile"
    }
    runSuspend {
        repository.saveSelectedGameAndProfile("game.pkg",PerformanceProfile.X4)
        repository.saveProfileForGame("game.pkg",PerformanceProfile.PERFORMANCE)
        repository.saveGameProfileConfig("game.pkg",GameProfileConfig(PerformanceProfile.BALANCED))
    }
    check(explicit==listOf("game.pkg:X4","game.pkg:PERFORMANCE","game.pkg:BALANCED")){
        "C2_PR153_EXPLICIT_WRITE_CALLBACK_CONTROL_BROKEN"
    }
    println("C2_PR153_EXPLICIT_CONTROL_PASS")
    val count=explicit.size
    runSuspend { repository.saveAdaptiveProfileForGame("game.pkg",PerformanceProfile.PERFORMANCE) }
    check(delegate.operations.last()=="adaptive:game.pkg:PERFORMANCE"){
        "C2_PR153_ADAPTIVE_DELEGATION_BROKEN"
    }
    check(explicit.size==count){
        "C2_PR153_ADAPTIVE_WRITE_LEAKS_EXPLICIT_CALLBACK"
    }
    println("C2_PR153_ADAPTIVE_CALLBACK_ISOLATION_PASS")
}
