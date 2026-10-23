package com.cardenaspiero255.gamehubultra.ai
import com.cardenaspiero255.gamehubultra.domain.*
fun main(args:Array<String>){
 val mode=args.single();require(mode in listOf("00","01","10","11"))
 val jsonFix=mode[0]=='1';val confidenceFix=mode[1]=='1'
 val ordinary=UltraResearchJsonCodec.decodeResponse("""{"sourceIds":["https://one.example/a","https://two.example/b"]}""")
 check(ordinary.sourceIds.size==2)
 val scoped=UltraResearchJsonCodec.decodeResponse("""{"sourceIds":["https://one.example/a]b","https://two.example/c"],"decoy":["https://false.example/z"]}""")
 val jsonSafe=scoped.sourceIds==listOf("https://one.example/a]b","https://two.example/c")
 check(jsonSafe==jsonFix) {"C2_CROSS_JSON_WRONG_EFFECT"}
 val answer=SmartRecommendationExplanationFactory.build(
  input=SmartPerformanceInput(historicalObservations=listOf("failed-X4","reverted-X4"),runtime=C2Runtime(),gameVersion="1.0"),
  recommendedProfile=PerformanceProfile.X4,reason="Confirmar X4",
  measuredGood=emptyMap(),acceptedFeedback=emptyMap(),knownBad=mapOf(PerformanceProfile.X4 to 2),
  thermalHot=false,lowBattery=false,memoryPressure=false,storagePressure=false)
 val confidenceSafe=answer.confidence==RecommendationConfidenceBand.MEDIUM
 check(confidenceSafe==confidenceFix) {"C2_CROSS_CONFIDENCE_WRONG_EFFECT"}
 println("C2_CROSS_SUITE json-confidence")
 println("C2_CROSS_NORMAL_CONTROLS_PASS")
 println("C2_CROSS_VECTOR mode=$mode first=$jsonSafe second=$confidenceSafe")
}
