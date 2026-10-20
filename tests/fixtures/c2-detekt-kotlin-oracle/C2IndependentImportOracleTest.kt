package io.gitlab.arturbosch.detekt.rules.style

import io.gitlab.arturbosch.detekt.api.Config
import io.gitlab.arturbosch.detekt.rules.KotlinCoreEnvironmentTest
import io.gitlab.arturbosch.detekt.test.TestConfig
import io.gitlab.arturbosch.detekt.test.lintWithContext
import org.assertj.core.api.Assertions.assertThat
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.junit.jupiter.api.Test

/**
 * C2 independently authored Detekt #7888 oracle.
 * It runs actual upstream UnusedImport with KotlinCoreEnvironment binding
 * context. This does not emulate a Gradle Kotlin DSL assignment compiler
 * plugin and cannot prove that the plugin's implicit import is semantically
 * needed. Such proof requires the matching Gradle DSL classpath/plugin.
 */
@KotlinCoreEnvironmentTest
class C2IndependentImportOracleTest(val env: KotlinCoreEnvironment) {
    private val isBefore: Boolean =
        when (System.getenv("C2_ORACLE_PHASE")) {
            "BEFORE" -> true
            "AFTER" -> false
            else -> error("C2_ORACLE_PHASE must be BEFORE or AFTER")
        }

    // The exact import name addressed in the upstream PR's additional
    // operators config. Under no configuration the BEFORE version hardcodes
    // "assign"; the AFTER version classifies it as unused.
    private val implicitDslImport = """
        import org.gradle.kotlin.dsl.assign
        fun configureUnrelatedProperty() { println("ok") }
    """.trimIndent()

    @Test
    fun unconfiguredImplicitAssignImportChangesBetweenRevisions() {
        val findings = UnusedImport(Config.empty).lintWithContext(env, implicitDslImport)
        assertThat(findings).hasSize(if (isBefore) 0 else 1)
        if (!isBefore) {
            assertThat(findings.single().entity.signature).contains("import org.gradle.kotlin.dsl.assign")
        }
    }

    @Test
    fun explicitlyConfiguredAssignIsExemptInBothRevisions() {
        val configured = UnusedImport(
            TestConfig("additionalOperatorSet" to listOf("assign"))
        )
        assertThat(configured.lintWithContext(env, implicitDslImport)).isEmpty()
    }

    @Test
    fun unrelatedUnusedImportStillProducesAReport() {
        val main = """
            package c2.example
            import c2.operators.UnusedHelper
            fun sample() { println("ok") }
        """.trimIndent()
        val additional = """
            package c2.operators
            class UnusedHelper
        """.trimIndent()
        assertThat(UnusedImport(Config.empty).lintWithContext(env, main, additional)).hasSize(1)
    }

    @Test
    fun resolvedInfixFunctionImportIsUsedNotDiscarded() {
        val main = """
            package c2.example
            import c2.operators.success
            fun sample(): Int = 1 success 2
        """.trimIndent()
        val additional = """
            package c2.operators
            infix fun Int.success(other: Int): Int = this + other
        """.trimIndent()
        assertThat(UnusedImport(Config.empty).lintWithContext(env, main, additional)).isEmpty()
    }

    @Test
    fun builtinOperatorImportIsExemptEvenIfUnusedAndIsNotATypeAwareOracle() {
        val main = """
            package c2.example
            import c2.operators.plus
            fun sample() = 1
        """.trimIndent()
        val additional = """
            package c2.operators
            class Quantity
            operator fun Quantity.plus(other: Quantity) = Quantity()
        """.trimIndent()
        // Known legacy behavior: operatorSet excludes names such as plus
        // regardless of whether import resolution shows actual use.
        assertThat(UnusedImport(Config.empty).lintWithContext(env, main, additional)).isEmpty()
    }
}
