package com.cardenaspiero255.gamehubultra.ai

fun main() {
    val ordinary = UltraResearchJsonCodec.decodeResponse(
        """{"sourceIds":["https://one.example/a","https://two.example/b"]}"""
    )
    check(ordinary.sourceIds.size == 2) { "C2_PR186_JSON_NORMAL_CONTROL_FAILED" }
    println("C2_PR186_NORMAL_CONTROL_PASS")
    val scoped = UltraResearchJsonCodec.decodeResponse(
        """{"sourceIds":["https://one.example/a]b","https://two.example/c"],"decoy":["https://false.example/should-not-be-a-source"]}"""
    )
    check(scoped.sourceIds == listOf("https://one.example/a]b","https://two.example/c")) {
        "C2_PR186_JSON_UNBOUNDED_OR_PREMATURE_ARRAY_SPAN"
    }
    println("C2_PR186_DISCRIMINATIVE_GUARD_PASS")
}
