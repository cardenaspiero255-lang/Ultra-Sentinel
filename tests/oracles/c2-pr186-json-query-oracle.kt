package com.cardenaspiero255.gamehubultra.ai

fun main(args: Array<String>) {
    check(args.size == 1 && args[0] in setOf("00", "01", "10", "11"))
    val mode=args[0]
    val jsonCorrected=mode[0]=='1'
    val queryCorrected=mode[1]=='1'
    val ordinary=UltraResearchJsonCodec.decodeResponse(
        """{"sourceIds":["https://a.example/1","https://b.example/2"]}"""
    )
    check(ordinary.sourceIds == listOf("https://a.example/1","https://b.example/2")) {
        "C2_PR186_JSON_ORDINARY_REGRESSION"
    }
    val escaped=UltraResearchJsonCodec.decodeResponse(
        """{"sourceIds":["https://a.example/a]b","https://b.example/c"],"independentSourceCount":2}"""
    )
    val parsedCorrectly=escaped.sourceIds==listOf("https://a.example/a]b","https://b.example/c")
    val stable=UltraGeneralQueryRouter.classify("compara redmagic 11s pro vs redmagic 12 pro")
    check(stable.kind==UltraGeneralQueryKind.COMPARISON_RESEARCH &&
          stable.verificationMode==UltraVerificationMode.REQUIRED &&
          !stable.requiresFreshData) { "C2_PR186_QUERY_STABLE_REGRESSION" }
    val live=UltraGeneralQueryRouter.classify("compara redmagic 11s pro vs redmagic 12 pro ahora")
    val freshCorrect=live.kind==UltraGeneralQueryKind.COMPARISON_RESEARCH &&
        live.verificationMode==UltraVerificationMode.REQUIRED && live.requiresFreshData
    check(parsedCorrectly==jsonCorrected) { "C2_PR186_JSON_INTERVENTION_CROSSED" }
    check(freshCorrect==queryCorrected) { "C2_PR186_QUERY_INTERVENTION_CROSSED" }
    println("C2_PR186_NORMAL_JSON_QUERY_PASS")
    println("C2_PR186_VECTOR mode=$mode json=$parsedCorrectly query=$freshCorrect")
}
