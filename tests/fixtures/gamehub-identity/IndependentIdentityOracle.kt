import com.cardenaspiero255.gamehubultra.domain.OptimizationFingerprint
import com.cardenaspiero255.gamehubultra.platform.DeviceInfo
import kotlin.system.exitProcess

fun fingerprint(manufacturer: String, model: String): String =
    OptimizationFingerprint.from(
        DeviceInfo(manufacturer = manufacturer, model = model),
        "com.example.game", "v1", null, null
    )

fun main() {
    val normalA = fingerprint("vendor", "model-a")
    val normalB = fingerprint("vendor", "model-b")
    if (normalA == normalB || normalA != fingerprint("vendor", "model-a")) {
        System.err.println("BENIGN_FINGERPRINT_REGRESSION")
        exitProcess(3)
    }
    println("BENIGN_IDENTITY_PASS")
    val collisionA = fingerprint("ab¦c", "d")
    val collisionB = fingerprint("ab", "c¦d")
    if (collisionA == collisionB) {
        System.err.println("AMBIGUOUS_FINGERPRINT_COLLISION")
        exitProcess(2)
    }
    println("IDENTITY_DELIMITER_INDEPENDENT_ORACLE_GREEN")
}
