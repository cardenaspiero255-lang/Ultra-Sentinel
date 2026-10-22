package com.cardenaspiero255.gamehubultra.voice

/*
 * Independent JVM behavior witness for immutable #206's original Kotlin
 * object and an explicit source-derived counterfactual. Tests operate on
 * *real production Kotlin*, not a JavaScript emulation of chunking.
 * Input controls are NOT independent negative detector labels.
 */
private fun hasBrokenSurrogate(chunks: List<String>): Boolean =
    chunks.any { chunk ->
        chunk.indices.any { i ->
            val here = chunk[i]
            (Character.isHighSurrogate(here) &&
                (i + 1 == chunk.length || !Character.isLowSurrogate(chunk[i + 1]))) ||
                (Character.isLowSurrogate(here) &&
                    (i == 0 || !Character.isHighSurrogate(chunk[i - 1])))
        }
    }

fun main(args: Array<String>) {
    require(args.size == 1 && args[0] in setOf("original", "counterfactual"))
    val variant = args[0]

    fun broken(source: String, limit: Int): Boolean {
        val chunks = UltraSpeechChunker.chunk(source, limit)
        require(chunks.size > 1)
        return hasBrokenSurrogate(chunks)
    }

    val split32 = broken("A".repeat(31) + "😀" + "B".repeat(36), 32)
    val split800 = broken("A".repeat(799) + "😀" + "B".repeat(36), 800)
    val asciiChunks = UltraSpeechChunker.chunk("A".repeat(71), 32)
    val ascii = asciiChunks.size > 1 && !hasBrokenSurrogate(asciiChunks) &&
        asciiChunks.joinToString("") == "A".repeat(71)
    val words = "A".repeat(30) + " 😀" + "B".repeat(36)
    val whiteChunks = UltraSpeechChunker.chunk(words, 32)
    val whitespace = whiteChunks.size > 1 && !hasBrokenSurrogate(whiteChunks) &&
        whiteChunks.any { it.contains("😀") } &&
        whiteChunks.joinToString(" ") == words
    val short = UltraSpeechChunker.chunk("Hola 😀", 32) == listOf("Hola 😀")

    // Treat original observed failure as the expected defect, not JVM test
    // failure; the corrected counterfactual must eliminate both boundary bugs.
    check(split32 == (variant == "original"))
    check(split800 == (variant == "original"))
    check(ascii && whitespace && short)
    println(
        "{" +
        "\"schema\":\"c2-pr206-utf16-real-kotlin-runtime/v1\"," +
        "\"variant\":\"$variant\"," +
        "\"boundary32Broken\":$split32," +
        "\"boundary800Broken\":$split800," +
        "\"asciiBenign\":$ascii," +
        "\"whitespaceBenign\":$whitespace," +
        "\"shortBenign\":$short," +
        "\"executedOriginalKotlinSource\":true," +
        "\"countIndependentBenignLabels\":0" +
        "}"
    )
}
