package io.gitlab.arturbosch.detekt.rules.exceptions

import io.gitlab.arturbosch.detekt.api.Config
import io.gitlab.arturbosch.detekt.api.Rule
import io.gitlab.arturbosch.detekt.rules.KotlinCoreEnvironmentTest
import io.gitlab.arturbosch.detekt.test.lintWithContext
import org.assertj.core.api.Assertions.assertThat
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.descriptors.ConstructorDescriptor
import org.jetbrains.kotlin.descriptors.FunctionDescriptor
import org.jetbrains.kotlin.psi.KtCallExpression
import org.jetbrains.kotlin.resolve.calls.util.getResolvedCall
import org.junit.jupiter.api.Test

/**
 * Optional experimental C2 JVM semantic probe, running against the real Kotlin
 * compiler BindingContext. Distinguishes declarations by resolved descriptor,
 * NOT callee source spelling. Evidence for a future Sentinel bridge only;
 * no detector rule, labels, precision/recall or blind holdout are emitted.
 */
@KotlinCoreEnvironmentTest
class C2SymbolResolutionOracleTest(val env: KotlinCoreEnvironment) {
    private class SymbolProbe : Rule(Config.empty, "C2 optional Kotlin symbol identity probe") {
        val seen = mutableListOf<Pair<String, String>>()

        override fun visitCallExpression(expression: KtCallExpression) {
            super.visitCallExpression(expression)
            val text = expression.calleeExpression?.text ?: return
            val descriptor = expression.getResolvedCall(bindingContext)?.resultingDescriptor
            val category = when (descriptor) {
                is ConstructorDescriptor -> "CONSTRUCTOR"
                is FunctionDescriptor -> "FUNCTION"
                else -> "UNKNOWN"
            }
            seen.add(text to category)
        }
    }

    private fun resolve(source: String, called: String): String {
        val probe = SymbolProbe()
        // Actual Kotlin compiler context and resolved descriptors, not regex.
        probe.lintWithContext(env, source.trimIndent())
        return probe.seen.filter { it.first == called }.single().second
    }

    @Test
    fun constructorNoArg() {
        assertThat(resolve(
            """
            fun test() { throw IllegalArgumentException() }
            """, "IllegalArgumentException"
        )).isEqualTo("CONSTRUCTOR")
    }

    @Test
    fun constructorWithMessage() {
        assertThat(resolve(
            """
            fun test() { throw IllegalArgumentException("reason") }
            """, "IllegalArgumentException"
        )).isEqualTo("CONSTRUCTOR")
    }

    @Test
    fun lowercaseHomonym() {
        assertThat(resolve(
            """
            fun illegalArgumentException() = Unit
            fun test() { illegalArgumentException() }
            """, "illegalArgumentException"
        )).isEqualTo("FUNCTION")
    }

    @Test
    fun uppercaseHomonym() {
        assertThat(resolve(
            """
            fun ILLEGALARGUMENTEXCEPTION() = Unit
            fun test() { ILLEGALARGUMENTEXCEPTION() }
            """, "ILLEGALARGUMENTEXCEPTION"
        )).isEqualTo("FUNCTION")
    }

    @Test
    fun sameNameCallable() {
        assertThat(resolve(
            """
            fun IllegalArgumentException() = Unit
            fun test() { IllegalArgumentException() }
            """, "IllegalArgumentException"
        )).isEqualTo("FUNCTION")
    }

    @Test
    fun importedAliasConstructor() {
        assertThat(resolve(
            """
            import java.lang.IllegalArgumentException as DomainException
            fun test() { throw DomainException() }
            """, "DomainException"
        )).isEqualTo("CONSTRUCTOR")
    }

    @Test
    fun unresolvedCallFailsClosed() {
        assertThat(resolve(
            """
            fun test() { definitelyUnresolvedC2Call() }
            """, "definitelyUnresolvedC2Call"
        )).isEqualTo("UNKNOWN")
    }
}
