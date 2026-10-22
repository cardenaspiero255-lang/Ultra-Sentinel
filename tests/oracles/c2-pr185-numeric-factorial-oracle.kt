import com.cardenaspiero255.gamehubultra.ai.UltraMathEngine
import com.cardenaspiero255.gamehubultra.domain.BatteryAwareGamingEngine
import com.cardenaspiero255.gamehubultra.domain.BatteryAwareGamingPolicy
import com.cardenaspiero255.gamehubultra.domain.BatteryGamingRecommendation
import com.cardenaspiero255.gamehubultra.domain.SessionCoachSnapshot

/** Source-level 2x2 orthogonal repair matrix, never root-family certification. */
fun main(args: Array<String>) {
    check(args.size == 1 && args[0] in setOf("00", "01", "10", "11")) {
        "C2_PR185_VARIANT_UNKNOWN"
    }
    val mode = args[0]
    val expectedMathRepair = mode[0] == '1'
    val expectedBatteryRepair = mode[1] == '1'

    val standard = checkNotNull(UltraMathEngine.solve("x^2 + x - 6 = 0")) {
        "C2_PR185_MATH_ORDINARY_NULL"
    }
    check(standard.resultText.contains("-3") && standard.resultText.contains("2")) {
        "C2_PR185_MATH_ORDINARY_REGRESSION"
    }
    val samples = listOf(
        SessionCoachSnapshot(timestampMillis=0L, batteryPercent=80, batteryCharging=false),
        SessionCoachSnapshot(timestampMillis=600_000L, batteryPercent=69, batteryCharging=false)
    )
    val normalBattery = BatteryAwareGamingEngine().assess(samples)
    check(normalBattery.drainPercentPerHour != null &&
        normalBattery.drainPercentPerHour!! > 20f &&
        normalBattery.recommendation == BatteryGamingRecommendation.BALANCED
    ) { "C2_PR185_BATTERY_ORDINARY_REGRESSION" }
    println("C2_PR185_ORDINARY_CONTROLS_PASS")

    val giant = "x^2 + x - " + "9".repeat(350) + " = 0"
    val mathHandled = runCatching { UltraMathEngine.solve(giant) }.isSuccess
    val batteryRejects = runCatching {
        BatteryAwareGamingPolicy(highDrainPercentPerHour=Float.POSITIVE_INFINITY)
    }.isFailure
    check(mathHandled == expectedMathRepair) { "C2_PR185_WRONG_MATH_CAUSAL_EFFECT" }
    check(batteryRejects == expectedBatteryRepair) { "C2_PR185_WRONG_BATTERY_CAUSAL_EFFECT" }
    println("C2_PR185_VECTOR mode=$mode math=$mathHandled battery=$batteryRejects")
    println("C2_PR185_FACTORIAL_SCOPE_PASS")
}
