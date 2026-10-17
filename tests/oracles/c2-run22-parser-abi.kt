package com.cardenaspiero255.gamehubultra.voice

import java.text.Normalizer
import java.util.Locale

// ABI-only implementation of the relevant unchanged parser-normalization path.
// The original parser is SHA-pinned in the trusted owner workflow.
object VoiceCommandParser {
    internal fun stripLeadingAssistantInvocation(value: String): String =
        Normalizer.normalize(value.lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace(Regex("""\p{M}+"""), "")
            .replace(Regex("""[^a-z0-9x4]+"""), " ")
            .trim()
            .replace(Regex("""\s+"""), " ")
}
