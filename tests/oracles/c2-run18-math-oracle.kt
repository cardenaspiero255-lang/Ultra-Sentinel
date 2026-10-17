package com.cardenaspiero255.gamehubultra.ai

fun main() {
  val normal = UltraMathEngine.solve("x^2 + x - 6 = 0")
    ?: error("C2_MATH_NORMAL_QUADRATIC_NOT_SOLVED")
  check(normal.resultText.contains("-3") && normal.resultText.contains("2")) {
    "C2_MATH_NORMAL_QUADRATIC_CONTROL_FAILED"
  }
  println("C2_MATH_NORMAL_CONTROL_PASS")
  val hugeConstant = "9".repeat(350)
  val giantInput = "x^2 + x - $hugeConstant = 0"
  val giantResult = runCatching { UltraMathEngine.solve(giantInput) }
  check(giantResult.isSuccess) {
    "C2_MATH_UNHANDLED_LARGE_DISCRIMINANT_EXCEPTION"
  }
  println("C2_MATH_BOUNDED_OVERFLOW_PASS")
}
