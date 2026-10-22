package com.cardenaspiero255.gamehubultra.ai

fun main() {
    val stable=UltraGeneralQueryRouter.classify("compara procesador alpha vs procesador beta")
    check(stable.kind==UltraGeneralQueryKind.COMPARISON_RESEARCH &&
          stable.verificationMode==UltraVerificationMode.REQUIRED &&
          !stable.requiresFreshData) { "C2_PR186_QUERY_STATIC_COMPARISON_BROKEN" }
    println("C2_PR186_NORMAL_CONTROL_PASS")
    val spanish=UltraGeneralQueryRouter.classify("compara procesador alpha vs procesador beta ahora")
    check(spanish.requiresFreshData && spanish.verificationMode==UltraVerificationMode.REQUIRED) {
        "C2_PR186_QUERY_CURRENT_QUALIFIER_LOST"
    }
    val english=UltraGeneralQueryRouter.classify("compare processor alpha vs processor beta today")
    check(english.requiresFreshData && english.verificationMode==UltraVerificationMode.REQUIRED) {
        "C2_PR186_QUERY_ENGLISH_CURRENT_QUALIFIER_LOST"
    }
    val ordinary=UltraGeneralQueryRouter.classify("que es kotlin")
    check(!ordinary.requiresFreshData && ordinary.kind==UltraGeneralQueryKind.GENERAL_KNOWLEDGE) {
        "C2_PR186_QUERY_GENERAL_KNOWLEDGE_REGRESSION"
    }
    println("C2_PR186_DISCRIMINATIVE_GUARD_PASS")
}
