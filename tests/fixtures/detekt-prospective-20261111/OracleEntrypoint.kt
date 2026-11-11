package dev.detekt.eval.runner

import dev.detekt.eval.main as runOracle

// Give the existing JVM Judge a separate marker for a deliberately wrong
// candidate that breaks the benign controls. The committed oracle is unchanged.
fun main() {
    try {
        runOracle()
    } catch (e: IllegalStateException) {
        System.err.println("BENIGN_CONFIG_REGRESSION")
        kotlin.system.exitProcess(3)
    }
}
