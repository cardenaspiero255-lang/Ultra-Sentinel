package com.cardenaspiero255.gamehubultra.voice

import java.text.Normalizer
import java.util.Locale

// Contractually equivalent subset of the original frozen VoiceCommandParser.
// Owner CI must also SHA-pin the real parser and inspect this ABI boundary.
internal object VoiceCommandParser {
    private val ASSISTANT_INVOCATION_PREFIX =
        Regex("""^(?:gamehub\s+ultra|gamehub|ultra)\s+""")

    internal fun normalize(value: String): String =
        Normalizer.normalize(value.lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace(Regex("""\p{M}+"""), "")
            .replace(Regex("""[^a-z0-9x4]+"""), " ")
            .trim()
            .replace(Regex("""\s+"""), " ")

    internal fun stripLeadingAssistantInvocation(value: String): String =
        normalize(value)
            .replace(ASSISTANT_INVOCATION_PREFIX, "")
            .trim()
}
