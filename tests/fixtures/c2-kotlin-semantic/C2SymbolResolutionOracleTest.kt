package io.gitlab.arturbosch.detekt.rules.exceptions

import io.gitlab.arturbosch.detekt.api.Config
import io.gitlab.arturbosch.detekt.api.Rule
import io.gitlab.arturbosch.detekt.rules.KotlinCoreEnvironmentTest
import io.gitlab.arturbosch.detekt.test.lintWithContext
import org.assertj.core.api.Assertions.assertThat
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import com.ultrasentinel.experimental.kotlin.C2OptionalKotlinSemantic
import com.ultrasentinel.experimental.kotlin.C2ResolvedSymbol
import org.jetbrains.kotlin.psi.KtCallExpression
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
        val symbols = mutableListOf<C2ResolvedSymbol>()

        override fun visitCallExpression(expression: KtCallExpression) {
            super.visitCallExpression(expression)
            val result = C2OptionalKotlinSemantic.resolveCall(expression, bindingContext)
            symbols.add(result)
            seen.add(result.calledName to result.kind.name)
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
        val probe = SymbolProbe()
        probe.lintWithContext(env, "package caller\nimport target.work as alias\nfun run() { alias(1) }", "package target\nfun work(n: Int) = n")
        val symbol = probe.symbols.single { it.calledName == "alias" }
        assertThat(symbol.identity).contains("target.work").contains("Int")
        assertThat(symbol.callSite?.line).isEqualTo(3)
        assertThat(symbol.declarationSite?.path).isNotEqualTo(symbol.callSite?.path)
        assertThat(symbol.origin.name).isEqualTo("SOURCE_UNAUTHENTICATED")
        assertThat(symbol.dispatch.name).isEqualTo("STATIC")
    }

    @Test
    fun constructorWithMessage() {
        assertThat(resolve(
            """
            fun test() { throw IllegalArgumentException("reason") }
            """, "IllegalArgumentException"
        )).isEqualTo("CONSTRUCTOR")
        val probe = SymbolProbe()
        probe.lintWithContext(env, "fun run() { println(1) }")
        val symbol = probe.symbols.single { it.calledName == "println" }
        assertThat(symbol.identity).isNull()
        assertThat(symbol.origin.name).isEqualTo("EXTERNAL_OR_UNAVAILABLE")
        assertThat(symbol.declarationSite).isNull()
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
        val probe = SymbolProbe()
        probe.lintWithContext(env, "fun run() { noSuchCall() }")
        val symbol = probe.symbols.single { it.calledName == "noSuchCall" }
        assertThat(symbol.identity).isNull()
        assertThat(symbol.origin.name).isEqualTo("UNKNOWN")
        assertThat(symbol.dispatch.name).isEqualTo("UNKNOWN")
    }


    @Test
    fun ambiguousFunctionCallFailsClosed() {
        assertThat(resolve(
            """
            fun pick(value: CharSequence?) = Unit
            fun pick(value: java.io.Serializable?) = Unit
            fun test() { pick(null) }
            """, "pick"
        )).isEqualTo("UNKNOWN")
    }

    @Test
    fun ambiguousConstructorCallFailsClosed() {
        assertThat(resolve(
            """
            class AmbiguousTarget {
                constructor(value: CharSequence?)
                constructor(value: java.io.Serializable?)
            }
            fun test() { AmbiguousTarget(null) }
            """, "AmbiguousTarget"
        )).isEqualTo("UNKNOWN")
    }

    @Test
    fun wrongArgumentTypeFailsClosed() {
        assertThat(resolve(
            """
            fun typed(value: Int) = Unit
            fun test() { typed("not an integer") }
            """, "typed"
        )).isEqualTo("UNKNOWN")
        val probe = SymbolProbe()
        probe.lintWithContext(env, "open class Base { open fun run() {} }; fun test(b: Base) { b.run() }")
        val symbol = probe.symbols.single { it.calledName == "run" }
        assertThat(symbol.dispatch.name).isEqualTo("OPEN")
        assertThat(symbol.identity).isNull()
        assertThat(symbol.origin.name).isEqualTo("SOURCE_UNAUTHENTICATED")

        // Distinct local functions with the same safe-looking FQ name must
        // never receive an identical authoritative declaration identity.
        val localProbe = SymbolProbe()
        localProbe.lintWithContext(env, """
            fun outer(flag: Boolean) {
                if (flag) {
                    fun helper() = 1
                    helper()
                } else {
                    fun helper() = 2
                    helper()
                }
            }
        """.trimIndent())
        val localSymbols = localProbe.symbols.filter { it.calledName == "helper" }
        assertThat(localSymbols).hasSize(2)
        assertThat(localSymbols.map { it.identity }).containsOnlyNulls()

        // A fake override of an inherited final member is the same source
        // declaration regardless of the receiver's static type.
        val inheritanceProbe = SymbolProbe()
        inheritanceProbe.lintWithContext(env, """
            open class Parent { fun finalRun() {} }
            class Child : Parent()
            fun test(parent: Parent, child: Child) {
                parent.finalRun()
                child.finalRun()
            }
        """.trimIndent())
        val inherited = inheritanceProbe.symbols.filter { it.calledName == "finalRun" }
        assertThat(inherited).hasSize(2)
        assertThat(inherited[0].identity).isNotNull()
        assertThat(inherited[0].identity).isEqualTo(inherited[1].identity)
        assertThat(inherited[0].declarationSite?.path).isEqualTo(inherited[1].declarationSite?.path)
    }
}
