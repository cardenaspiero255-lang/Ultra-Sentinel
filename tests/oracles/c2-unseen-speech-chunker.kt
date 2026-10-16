package com.cardenaspiero255.gamehubultra.voice

// Independent behavior oracle for a frozen, previously untuned GameHub #206
// source. This test does not load Ultra Sentinel findings or the legacy model.
private fun validUtf16(text: String): Boolean {
    var i=0
    while(i<text.length) {
        val c=text[i]
        if(Character.isHighSurrogate(c)) {
            if(i+1>=text.length || !Character.isLowSurrogate(text[i+1])) return false
            i+=2
        } else if(Character.isLowSurrogate(c)) return false
        else i++
    }
    return true
}
private fun check(condition:Boolean, code:String) {
    if(!condition) throw IllegalStateException("C2_HOLDOUT_CONTROL_FAILED_$code")
}
fun main() {
    val normal="a".repeat(40)
    val normalChunks=UltraSpeechChunker.chunk(normal,32)
    check(normalChunks.size==2 && normalChunks.all { validUtf16(it) },"ASCII")
    check(normalChunks.joinToString("")==normal,"ASCII_PRESERVE")

    val safe="a".repeat(30)+"😀"+"b".repeat(40)
    val safeChunks=UltraSpeechChunker.chunk(safe,32)
    check(safeChunks.all(::validUtf16),"SURROGATE_NOT_ON_EDGE")
    check(safeChunks.joinToString("")==safe,"SURROGATE_OFF_EDGE_PRESERVE")

    val risky="a".repeat(31)+"😀"+"b".repeat(40)
    val riskyChunks=UltraSpeechChunker.chunk(risky,32)
    val broken=riskyChunks.any { !validUtf16(it) }
    check(broken,"EMOJI_SPLIT_32_REPRODUCED")
    check(riskyChunks.joinToString("")==risky,"EMOJI_SPLIT_32_ISOLATED")

    val defaultRisk="a".repeat(799)+"😀"+"b".repeat(40)
    val defaults=UltraSpeechChunker.chunk(defaultRisk)
    val brokenDefault=defaults.any { !validUtf16(it) }
    check(brokenDefault,"EMOJI_SPLIT_800_REPRODUCED")
    check(defaults.joinToString("")==defaultRisk,"EMOJI_SPLIT_800_ISOLATED")

    println("""{"schema":"ultra-sentinel-c2-unseen-original-behavior/v1","pr":206,"sourceGitBlob":"6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a","rule":"TTS_UTF16_SURROGATE_SPLIT","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt","line":26,"reproduced":true,"defaultChunkBroken":$brokenDefault,"smallChunkBroken":$broken,"controlsPassed":true,"labelIsVerifiedOnlyForThisBehavior":true,"baselineCompared":false,"candidateInspected":false,"globalPrecision":null,"globalRecall":null,"globalF1":null,"tripleSPlusCertified":false}""")
}
