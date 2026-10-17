package com.cardenaspiero255.gamehubultra.domain
data class SessionCoachMessage(val title:String,val detail:String,val action:String?=null)
data class SessionCoachPostSessionReport(val summary:String,val nextSteps:List<String> =emptyList())
data class SessionCoachSnapshot(val timestampMillis:Long=0)
