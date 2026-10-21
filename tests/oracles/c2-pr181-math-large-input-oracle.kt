package com.cardenaspiero255.gamehubultra.ai

fun main() {
    val normal = UltraMathEngine.solve("x^2 + x - 6 = 0")
        ?: error("C2_PR181_ORDINARY_QUADRATIC_UNSOLVED")
    check(normal.resultText.contains("-3") && normal.resultText.contains("2")) {
        "C2_PR181_NORMAL_QUADRATIC_REGRESSION"
    }
    println("C2_PR181_MATH_NORMAL_CONTROL_PASS")
    val giant = "x^2 + x - " + "9".repeat(350) + " = 0"
    val result = runCatching { UltraMathEngine.solve(giant) }
    check(result.isSuccess) { "C2_PR181_MATH_NONFINITE_EXCEPTION" }
    println("C2_PR181_MATH_UNHANDLED_EXCEPTION_GUARD_PASS")
}
