package com.cardenaspiero255.gamehubultra.data

import kotlinx.coroutines.flow.Flow
interface GameSessionStateRepository {
    fun sessionsFlow():Flow<List<GameSessionRecord>>
    suspend fun startSession(record:GameSessionRecord)
    suspend fun finishSession(sessionId:String,endedAtMillis:Long,endBatteryPercent:Int?,endThermalStatus:Int?,endRamUsedPercent:Int?):Boolean
    suspend fun finishActiveSessions(endedAtMillis:Long):Int
    suspend fun clearSessions()
}
