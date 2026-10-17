package com.cardenaspiero255.gamehubultra.domain

enum class SessionCoachSignal { THERMAL, BATTERY, NETWORK }
enum class SessionCoachPriority { INFO, ACTION, CRITICAL }
data class SessionCoachMessage(val signal:SessionCoachSignal=SessionCoachSignal.THERMAL,
    val priority:SessionCoachPriority=SessionCoachPriority.INFO,
    val title:String="",val detail:String="",val action:String?=null)
data class SessionCoachSnapshot(val timestampMillis:Long,
    val batteryPercent:Int?=null,val thermalStatus:Int?=null,
    val thermalHeadroom:Float?=null,val refreshRateHz:Float?=null,
    val latencyMs:Long?=null)
