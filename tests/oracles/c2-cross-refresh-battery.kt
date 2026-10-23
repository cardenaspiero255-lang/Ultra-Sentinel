package com.cardenaspiero255.gamehubultra.domain
fun main(args:Array<String>){
 val mode=args.single();require(mode in listOf("00","01","10","11"))
 val refreshFix=mode[0]=='1';val batteryFix=mode[1]=='1'
 fun rate(samples:List<SessionCoachSnapshot>)=AiProfileBuilder.propose(
  currentConfig=GameProfileConfig(),observations=emptyList(),sessionSamples=samples,
  capabilities=AiProfileCapabilities(supportedRefreshRatesHz=setOf(60)),version=1).proposedConfig.refreshRateTargetHz
 val starved=rate(List(4){SessionCoachSnapshot(refreshRateHz=120f)}+List(3){SessionCoachSnapshot(refreshRateHz=60f)})
 val refreshSafe=starved==60
 check(refreshSafe==refreshFix) {"C2_CROSS_REFRESH_WRONG_EFFECT"}
 check(rate(List(4){SessionCoachSnapshot(refreshRateHz=60f)}+List(2){SessionCoachSnapshot(refreshRateHz=120f)})==60)
 val samples=listOf(SessionCoachSnapshot(timestampMillis=0L,batteryPercent=80,batteryCharging=false),
  SessionCoachSnapshot(timestampMillis=600_000L,batteryPercent=69,batteryCharging=false))
 val normal=BatteryAwareGamingEngine().assess(samples)
 check((normal.drainPercentPerHour?:0f)>20f && normal.recommendation==BatteryGamingRecommendation.BALANCED)
 val batterySafe=runCatching{BatteryAwareGamingPolicy(highDrainPercentPerHour=Float.POSITIVE_INFINITY)}.isFailure
 check(batterySafe==batteryFix) {"C2_CROSS_BATTERY_WRONG_EFFECT"}
 println("C2_CROSS_NORMAL_CONTROLS_PASS")
 println("C2_CROSS_VECTOR mode=$mode first=$refreshSafe second=$batterySafe")
}
