package com.cardenaspiero255.gamehubultra.voice

fun main() {
  check(UltraWakeBargeInPolicy.decide(false,"hola") == UltraWakeRecognitionDisposition.ACCEPT) {
    "C2_VOICE_IDLE_ACCEPT_CONTROL"
  }
  check(UltraWakeBargeInPolicy.decide(true,"ultra busca noticias",playbackEcho=true) ==
    UltraWakeRecognitionDisposition.SUPPRESS) { "C2_VOICE_ECHO_CONTROL" }
  check(UltraWakeBargeInPolicy.decide(true,"ultra busca noticias") ==
    UltraWakeRecognitionDisposition.INTERRUPT_TTS) { "C2_VOICE_WAKE_CONTROL" }
  println("C2_VOICE_NORMAL_CONTROLS_PASS")
  check(UltraWakeBargeInPolicy.decide(true,"ultra para") ==
    UltraWakeRecognitionDisposition.STOP_TTS) { "C2_VOICE_STOP_PRECEDENCE_CONTRACT_FAILED" }
  println("C2_VOICE_STOP_PRIORITY_PASS")
}
