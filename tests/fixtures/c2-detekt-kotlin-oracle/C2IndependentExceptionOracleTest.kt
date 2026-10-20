package io.gitlab.arturbosch.detekt.rules.exceptions

import io.gitlab.arturbosch.detekt.test.TestConfig
import io.gitlab.arturbosch.detekt.test.compileAndLint
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

/**
 * Independently authored C2 behavior oracle. It runs the ACTUAL pinned upstream
 * Detekt rule at BEFORE and AFTER; it is not a Sentinel rule or a GOLD label.
 *
 * Important: the upstream rule checks call expression NAME, not resolved
 * callable symbols. The same-spelling function test proves a remaining
 * semantic false positive even in the corrected upstream rule.
 */
class C2IndependentExceptionOracleTest {
    private val isBefore: Boolean =
        when (System.getenv("C2_ORACLE_PHASE")) {
            "BEFORE" -> true
            "AFTER" -> false
            else -> error("C2_ORACLE_PHASE must be BEFORE or AFTER")
        }

    private val detector = ThrowingExceptionsWithoutMessageOrCause(
        TestConfig("exceptions" to listOf("IllegalArgumentException"))
    )

    @Test
    fun lowerCaseFunctionReportsOnlyBefore() {
        val code = """
            fun illegalArgumentException() = Unit
            fun invoke() { illegalArgumentException() }
        """.trimIndent()
        assertThat(detector.compileAndLint(code)).hasSize(if (isBefore) 1 else 0)
    }

    @Test
    fun upperCaseVariantFunctionReportsOnlyBefore() {
        val code = """
            fun ILLEGALARGUMENTEXCEPTION() = Unit
            fun invoke() { ILLEGALARGUMENTEXCEPTION() }
        """.trimIndent()
        assertThat(detector.compileAndLint(code)).hasSize(if (isBefore) 1 else 0)
    }

    @Test
    fun realNoArgExceptionConstructorReportsOnBoth() {
        val code = """
            fun invoke() { throw IllegalArgumentException() }
        """.trimIndent()
        assertThat(detector.compileAndLint(code)).hasSize(1)
    }

    @Test
    fun realExceptionConstructorWithMessageReportsOnNeither() {
        val code = """
            fun invoke() { throw IllegalArgumentException("reason") }
        """.trimIndent()
        assertThat(detector.compileAndLint(code)).isEmpty()
    }

    @Test
    fun sameSpellingFunctionStillReportsAfterBecauseRuleDoesNotResolveSymbols() {
        val code = """
            fun IllegalArgumentException() = Unit
            fun invoke() { IllegalArgumentException() }
        """.trimIndent()
        // Deliberately NOT a success criterion for a future Sentinel rule:
        // name equality is not a symbol/constructor identity check.
        assertThat(detector.compileAndLint(code)).hasSize(1)
    }

    @Test
    fun assertionHelperIsNotAnExceptionConstructor() {
        val code = """
            fun assertThatIllegalArgumentException() = Unit
            fun invoke() { assertThatIllegalArgumentException() }
        """.trimIndent()
        assertThat(detector.compileAndLint(code)).isEmpty()
    }
}
