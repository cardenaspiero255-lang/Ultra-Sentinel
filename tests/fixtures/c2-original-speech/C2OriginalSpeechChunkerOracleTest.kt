package com.cardenaspiero255.gamehubultra.voice

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

/**
 * Tests the byte-identical original GameHub #206 Kotlin file copied from
 * immutable commit 53cb8955. The first test EXPECTS and exposes the defect.
 * These are public regression observations, not a blind SSS+ benchmark.
 */
class C2OriginalSpeechChunkerOracleTest {
    private fun hasBrokenSurrogate(chunks: List<String>): Boolean =
        chunks.any { chunk ->
            chunk.indices.any { i ->
                val current = chunk[i]
                (Character.isHighSurrogate(current) &&
                    (i + 1 == chunk.length || !Character.isLowSurrogate(chunk[i + 1]))) ||
                (Character.isLowSurrogate(current) &&
                    (i == 0 || !Character.isHighSurrogate(chunk[i - 1])))
            }
        }

    @Test
    fun originalEmojiAtHardBoundarySplitsSurrogatePair() {
        val source = "A".repeat(31) + "😀" + "B".repeat(36)
        val fragments = UltraSpeechChunker.chunk(source, 32)
        assertThat(fragments.size).isGreaterThan(1)
        assertThat(Character.isHighSurrogate(fragments.first().last())).isTrue()
        assertThat(Character.isLowSurrogate(fragments[1].first())).isTrue()
        assertThat(hasBrokenSurrogate(fragments)).isTrue()
    }

    @Test
    fun asciiControlHasNoSplitSurrogate() {
        val fragments = UltraSpeechChunker.chunk("A".repeat(71), 32)
        assertThat(fragments.size).isGreaterThan(1)
        assertThat(hasBrokenSurrogate(fragments)).isFalse()
    }

    @Test
    fun whitespaceBeforeEmojiAvoidsSurrogateSplit() {
        val source = "A".repeat(30) + " 😀" + "B".repeat(36)
        val fragments = UltraSpeechChunker.chunk(source, 32)
        assertThat(fragments.size).isGreaterThan(1)
        assertThat(hasBrokenSurrogate(fragments)).isFalse()
        assertThat(fragments.any { it.contains("😀") }).isTrue()
    }

    @Test
    fun smallTextControlRemainsUnchanged() {
        val source = "Hola 😀"
        assertThat(UltraSpeechChunker.chunk(source, 32)).containsExactly(source)
    }
}
