package com.cardenaspiero255.gamehubultra.ai

fun main() {
    val ordinary = UltraResearchJsonCodec.decodeResponse(
        """{"sourceIds":["https://one.example/a","https://two.example/b"]}"""
    )
    check(ordinary.sourceIds == listOf("https://one.example/a","https://two.example/b")) {
        "CONTROL_BROKEN_NORMAL_JSON_ARRAY"
    }
    println("C2_ORIGINAL_CONTROL_PASS")
    val escapedBracket = UltraResearchJsonCodec.decodeResponse(
        """{"sourceIds":["https://one.example/a]b","https://two.example/c"],"independentSourceCount":2}"""
    )
    check(escapedBracket.sourceIds == listOf("https://one.example/a]b","https://two.example/c")) {
        "C2_PR152_ORIGINAL_SOURCE_ARRAY_TRUNCATION"
    }
    println("C2_PR152_CONTRACT_PASS")
}
