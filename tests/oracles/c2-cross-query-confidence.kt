package com.cardenaspiero255.gamehubultra.ai
import com.cardenaspiero255.gamehubultra.domain.*
fun main(args:Array<String>){
 val mode=args.single();require(mode in listOf("00","01","10","11"))
 val queryFix=mode[0]=='1';val confidenceFix=mode[1]=='1'
 val static=UltraGeneralQueryRouter.classify("compara procesador alpha vs procesador beta")
 check(static.kind==UltraGeneralQueryKind.COMPARISON_RESEARCH && !static.requiresFreshData)
 val current=UltraGeneralQueryRouter.classify("compara procesador alpha vs procesador beta ahora")
 val querySafe=current.requiresFreshData
 check(querySafe==queryFix) {"C2_CROSS_QUERY_WRONG_EFFECT"}
 val answer=SmartRecommendationExplanationFactory.build(
  input=SmartPerformanceInput(historicalObservations=listOf("failed-X4","reverted-X4"),runtime=C2Runtime(),gameVersion="1.0"),
  recommendedProfile=PerformanceProfile.X4,reason="Confirmar X4",
  measuredGood=emptyMap(),acceptedFeedback=emptyMap(),
  knownBad=mapOf(PerformanceProfile.X4 to 2),thermalHot=false,
  lowBattery=false,memoryPressure=false,storagePressure=false)
 val confidenceSafe=answer.confidence==RecommendationConfidenceBand.MEDIUM
 check(confidenceSafe==confidenceFix) {"C2_CROSS_CONFIDENCE_WRONG_EFFECT"}
 check(UltraGeneralQueryRouter.classify("que es kotlin").kind==UltraGeneralQueryKind.GENERAL_KNOWLEDGE)
 val positive=SmartRecommendationExplanationFactory.build(
  input=SmartPerformanceInput(runtime=C2Runtime(),externalEvidence=listOf(RecommendationExternalEvidence("Prueba","oracle",true,true,true))),
  recommendedProfile=PerformanceProfile.X4,reason="Confirmar X4",
  measuredGood=emptyMap(),acceptedFeedback=emptyMap(),knownBad=emptyMap(),
  thermalHot=false,lowBattery=false,memoryPressure=false,storagePressure=false)
 check(positive.confidence==RecommendationConfidenceBand.HIGH)
 println("C2_CROSS_NORMAL_CONTROLS_PASS")
 println("C2_CROSS_VECTOR mode=$mode first=$querySafe second=$confidenceSafe")
}
