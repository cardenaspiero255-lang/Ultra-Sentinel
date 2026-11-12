package independent.prospective

import org.jetbrains.compose.resources.plural.PluralCategory
import org.jetbrains.compose.resources.plural.PluralRule

/**
 * Independent oracle for CLDR operand n: absolute magnitude must be preserved
 * for every Int, including Int.MIN_VALUE. This oracle does not invoke Hunter.
 */
fun main() {
    val r = PluralRule(PluralCategory.ONE, "n % 3 = 2")
    fun independentlyExpected(value: Int): Boolean {
        val wide = value.toLong()
        val magnitude = if (wide < 0L) -wide else wide
        return magnitude % 3L == 2L
    }

    // Benign controls are checked first so a deliberately wrong candidate is
    // vetoed before its expected handling of the boundary case is evaluated.
    for (value in intArrayOf(0, 1, 2, 3, 4, 5, -1, -2, -3, -4, -5, Int.MAX_VALUE)) {
        check(r.appliesTo(value) == independentlyExpected(value)) {
            "BENIGN_PLURAL_REGRESSION:" + value
        }
    }
    check(PluralCategory.fromString("oNe") == PluralCategory.ONE) {
        "BENIGN_PLURAL_CATEGORY_REGRESSION"
    }
    check(r.appliesTo(Int.MIN_VALUE) == independentlyExpected(Int.MIN_VALUE)) {
        "ORIGINAL_CLDR_ABSOLUTE_INT_MIN_OVERFLOW"
    }
    println("INDEPENDENT_ORIGINAL_PLURAL_JVM_GREEN")
}
