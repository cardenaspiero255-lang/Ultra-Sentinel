package com.cardenaspiero255.gamehubultra.data

data class SessionCoachStoredSample(
 val thermalStatus:Int=0,
 val batteryPercent:Int?=75,
 val refreshRateHz:Float?=120f,
 val memoryUsedPercent:Float?=45f,
 val latencyMs:Long?=20L
)
data class SessionCoachStoredSession(
 val sessionId:String,
 val packageName:String,
 val gameVersion:String?,
 val samples:List<SessionCoachStoredSample>
)
