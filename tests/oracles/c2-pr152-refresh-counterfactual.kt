package com.cardenaspiero255.gamehubultra.domain

private fun samples(rate:Float,n:Int)=List(n) { SessionCoachSnapshot(refreshRateHz=rate) }
private fun chosen(inputs:List<SessionCoachSnapshot>):Int? =
 AiProfileBuilder.propose(
   currentConfig=GameProfileConfig(),observations=emptyList(),
   sessionSamples=inputs,
   capabilities=AiProfileCapabilities(supportedRefreshRatesHz=setOf(60)),version=1
 ).proposedConfig.refreshRateTargetHz

fun main() {
 val starved=chosen(samples(120f,4)+samples(60f,3))==null
 val supported=chosen(samples(60f,4)+samples(120f,2))==60
 val onlyBad=chosen(samples(120f,4))==60
 val insufficient=chosen(samples(60f,2))==60
 println("""{"supportedStarved":$starved,"supportedControl":$supported,"unsupportedOnly":$onlyBad,"insufficient":$insufficient}""")
}
