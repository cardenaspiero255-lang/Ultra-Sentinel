package com.cardenaspiero255.jarvis.core

/**
 * Original JARVIS policy classes are compiled from pinned GitHub source.
 * These counterfactual mutants test detector sensitivity, NOT an existing bug
 * in original JARVIS. Neither policy can authorize a device action.
 */
fun main(args: Array<String>) {
    check(args.size == 1 && args[0] in setOf("00", "10", "01", "11")) {
        "JARVIS_VOICE_INVALID_VARIANT"
    }
    val mode = args[0]
    val bargeUnsafe = mode[0] == '1'
    val wakeUnsafe = mode[1] == '1'

    val signal = PartialWakeSignalPolicy()
    check(signal.shouldReport("Jarvis")) { "JARVIS_VOICE_BENIGN_WAKE_NOT_RECOGNIZED" }
    check(!signal.shouldReport("Jarvis")) { "JARVIS_VOICE_BENIGN_WAKE_REPEAT" }
    signal.onUtteranceCompleted()
    check(!signal.shouldReport("hola")) { "JARVIS_VOICE_BENIGN_OTHER_TEXT" }
    val prematureWake = signal.shouldReport("no jarvis")
    check(prematureWake == wakeUnsafe) { "JARVIS_VOICE_WAKE_WRONG_MUTATION_EFFECT" }

    val stop = BargeInStopPolicy()
    fun decide(spoken: String?, aec: Boolean, finished: Boolean) =
        stop.decide("jarvis para", spoken, playbackActive=true,
            echoCancellationActive=aec, finalUtterance=finished)
    check(decide("estoy calculando",true,true) == BargeInStopDecision.STOP_TTS) {
        "JARVIS_VOICE_BENIGN_BARGE_STOP_REGRESSION"
    }
    check(decide("estoy calculando",false,true) == BargeInStopDecision.IGNORE) {
        "JARVIS_VOICE_BENIGN_AEC_BYPASS"
    }
    check(decide("estoy calculando",true,false) == BargeInStopDecision.IGNORE) {
        "JARVIS_VOICE_BENIGN_PARTIAL_STOP"
    }
    val unsafeEchoStop = decide("Jarvis para",true,true) == BargeInStopDecision.STOP_TTS
    check(unsafeEchoStop == bargeUnsafe) { "JARVIS_VOICE_BARGE_WRONG_MUTATION_EFFECT" }

    println("JARVIS_VOICE_NORMAL_CONTROLS_PASS")
    println("JARVIS_VOICE_VECTOR mode=$mode barge=$unsafeEchoStop wake=$prematureWake")
    println("JARVIS_VOICE_MATRIX_PROBED")
}
