package com.cardenaspiero255.gamehubultra.ai

fun main() {
    val stable = UltraGeneralQueryRouter.classify(
        "compara redmagic 11s pro vs redmagic 12 pro"
    )
    check(stable.kind == UltraGeneralQueryKind.COMPARISON_RESEARCH &&
        stable.verificationMode == UltraVerificationMode.REQUIRED &&
        !stable.requiresFreshData) {
        "C2_CURRENT_COMPARISON_STABLE_CONTROL_FAILED"
    }
    println("C2_CURRENT_COMPARISON_STABLE_CONTROL_PASS")

    val live = UltraGeneralQueryRouter.classify(
        "compara redmagic 11s pro vs redmagic 12 pro ahora"
    )
    check(live.kind == UltraGeneralQueryKind.COMPARISON_RESEARCH &&
        live.verificationMode == UltraVerificationMode.REQUIRED &&
        live.requiresFreshData) {
        "C2_CURRENT_COMPARISON_QUALIFIER_LOST"
    }
    println("C2_CURRENT_COMPARISON_QUALIFIER_VERIFIED_PASS")
}
