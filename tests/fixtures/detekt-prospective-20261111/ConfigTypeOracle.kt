package dev.detekt.eval

import dev.detekt.api.Rule
import dev.detekt.api.config
import dev.detekt.test.TestConfig

private class Example(config: TestConfig) : Rule(config, "test") {
    val items: List<String> by config(listOf("fallback"))
}

fun main() {
    check(Example(TestConfig()).items == listOf("fallback"))
    check(Example(TestConfig("items" to listOf("alpha", "beta"))).items == listOf("alpha", "beta"))
    println("BENIGN_CONFIG_PASS")
    val invalid = listOf(listOf("alpha", 7), listOf(7, 9))
    val rejected = invalid.map { values ->
        try {
            Example(TestConfig("items" to values)).items
            false
        } catch (e: IllegalStateException) {
            e.message?.contains("Only lists of strings are supported") == true
        }
    }
    if (!rejected.all { it }) {
        System.err.println("INVALID_LIST_ACCEPTED")
        kotlin.system.exitProcess(2)
    }
    println("CONFIG_TYPE_ORACLE_PASS")
}
