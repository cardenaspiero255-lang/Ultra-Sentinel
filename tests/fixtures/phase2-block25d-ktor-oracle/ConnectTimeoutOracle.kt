package io.ktor.client.engine.apache5

import java.net.ConnectException

// Independent bounded JVM control for ORIGINAL unchanged ApacheUtils.kt.
// This fixture establishes a few benign behavior contracts, not a complete
// defect label or evidence of novel cancellation discovery.
fun main() {
    val rows = listOf(
        ConnectException("Timeout connecting to example.invalid") to true,
        ConnectException("Timeout connecting") to true,
        ConnectException("Connection refused") to false,
        ConnectException("timeout connecting") to false,
        ConnectException("Connection timed out") to false,
        ConnectException() to false
    )
    for ((failure, expected) in rows) {
        check(failure.isTimeoutException() == expected) {
            "ORIGINAL_KTOR_TIMEOUT_CLASSIFICATION_MISMATCH"
        }
    }
    println("ORIGINAL_KTOR_APACHE5_CONNECT_TIMEOUT_BENIGN_CONTROL_PASS")
}
