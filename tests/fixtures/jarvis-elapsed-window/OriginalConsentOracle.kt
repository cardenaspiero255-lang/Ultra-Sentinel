package com.cardenaspiero255.jarvis.core

/** Independent JVM executable contract. This file knows nothing about Hunter,
 * source paths, candidate construction, regexes, or Git/Judge verdicts. */
fun main() {
    var now = 1000L
    val performed = mutableListOf<SafeAutomationStep>()
    val gateway = object : SafeAutomationGateway {
        override fun perform(step: SafeAutomationStep): Boolean {
            performed.add(step)
            return true
        }
    }
    val ordinary = SafeAutomationEngine(gateway) { now }
    ordinary.prepare(SafeRoutine.OPEN_SETTINGS)
    now = 2000L
    val authorized = ordinary.confirmAndRun(SafeRoutine.OPEN_SETTINGS, explicitTap = true)
    if (authorized.outcome != SafeAutomationOutcome.COMPLETED ||
        performed != listOf(SafeAutomationStep.OPEN_ANDROID_SETTINGS)) {
        System.err.println("BENIGN_PREVIEW_REGRESSION")
        kotlin.system.exitProcess(1)
    }
    println("benign_preview_accepted=PASS")

    performed.clear()
    now = 5000L
    ordinary.prepare(SafeRoutine.OPEN_SETTINGS)
    now = 35_000L
    val expired = ordinary.confirmAndRun(SafeRoutine.OPEN_SETTINGS, explicitTap = true)
    if (expired.outcome != SafeAutomationOutcome.DENIED || performed.isNotEmpty()) {
        System.err.println("EXPIRED_PREVIEW_REGRESSION")
        kotlin.system.exitProcess(1)
    }
    println("ordinary_expiry=PASS")

    var pathological = Long.MIN_VALUE
    val unsafe = SafeAutomationEngine(gateway) { pathological }
    unsafe.prepare(SafeRoutine.OPEN_SETTINGS)
    pathological = Long.MAX_VALUE
    val overflow = unsafe.confirmAndRun(SafeRoutine.OPEN_SETTINGS, explicitTap = true)
    if (overflow.outcome != SafeAutomationOutcome.DENIED || performed.isNotEmpty()) {
        System.err.println("STALE_PREVIEW_AUTHORIZED")
        kotlin.system.exitProcess(1)
    }
    println("signed_overflow_expiry=PASS")

    val cancelled = SafeAutomationEngine(gateway) { 1234L }
    cancelled.prepare(SafeRoutine.OPEN_SETTINGS)
    cancelled.stop()
    val stopped = cancelled.confirmAndRun(SafeRoutine.OPEN_SETTINGS, explicitTap = true)
    if (stopped.outcome != SafeAutomationOutcome.DENIED || performed.isNotEmpty()) {
        System.err.println("STOP_REVOCATION_REGRESSION")
        kotlin.system.exitProcess(1)
    }
    println("stop_revokes_consent=PASS")
    println("INDEPENDENT_CONSENT_ORACLE_PASS")
}
