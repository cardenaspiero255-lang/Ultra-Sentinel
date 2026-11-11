package dev.detekt.api

// ABI-only stand-in; the production configuration delegate is original.
open class Rule(val config: Config, val description: String)
