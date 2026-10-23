package com.cardenaspiero255.gamehubultra.ai
import com.cardenaspiero255.gamehubultra.domain.*
fun main(args:Array<String>){
 val mode=args.single();require(mode in listOf("00","01","10","11"))
 val ttlFix=mode[0]=='1';val thermalFix=mode[1]=='1'
 val base=1_000_000L
 UltraFrontierWorldStateRegistry.clear()
 val running=GameHubAiContext(selectedGamePackage="game.alpha",sessionActive=true)
 UltraFrontierWorldStateRegistry.update(
  UltraFrontierWorldState.from(running,nowMillis=base).copy(
   thermalRisk=ThermalRisk.CRITICAL,thermalTrend=ThermalTrend.RISING,preventAggressiveProfiles=true))
 val inactive=running.copy(sessionActive=false)
 UltraFrontierWorldStateRegistry.update(inactive,nowMillis=base+90_000L)
 check(UltraFrontierWorldStateRegistry.snapshotForPlanning(base+90_001L)?.thermalRisk==ThermalRisk.CRITICAL)
 UltraFrontierWorldStateRegistry.update(inactive,nowMillis=base+150_000L)
 val ttlSafe=UltraFrontierWorldStateRegistry.snapshotForPlanning(base+150_001L)?.thermalRisk==null
 check(ttlSafe==ttlFix) {"C2_CROSS_TTL_WRONG_EFFECT"}
 val original=SessionCoachSnapshot(0L,null,null,0.1f,null,null)
 fun alert(headroom:Float?):Boolean=AiSessionCoach.midSession(original,SessionCoachSnapshot(1000L,null,null,headroom,null,null)).any { it.signal==SessionCoachSignal.THERMAL }
 val thermalSafe=!alert(Float.POSITIVE_INFINITY)
 check(thermalSafe==thermalFix) {"C2_CROSS_THERMAL_WRONG_EFFECT"}
 check(alert(0.85f) && !alert(Float.NaN)) {"C2_CROSS_THERMAL_BENIGN_BROKEN"}
 UltraFrontierWorldStateRegistry.clear()
 println("C2_CROSS_SUITE ttl-thermal")
 println("C2_CROSS_NORMAL_CONTROLS_PASS")
 println("C2_CROSS_VECTOR mode=$mode first=$ttlSafe second=$thermalSafe")
}
