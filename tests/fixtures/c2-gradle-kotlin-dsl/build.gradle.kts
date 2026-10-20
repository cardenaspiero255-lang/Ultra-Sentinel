import org.gradle.api.DefaultTask
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction
import org.gradle.kotlin.dsl.assign

plugins {
    base
}

/**
 * Real Gradle 8.10.2 Kotlin DSL compiler-plugin integration fixture.
 * This is NOT a claim that Detekt's UnusedImport rule can resolve imports in
 * a Gradle Kotlin DSL build.gradle.kts source without that compiler plugin.
 */
abstract class C2AssignmentTask : DefaultTask() {
    @get:Input
    abstract val witness: Property<String>

    @get:Input
    abstract val expected: Property<String>

    @TaskAction
    fun checkOriginalDslAssignment() {
        check(witness.get() == expected.get()) {
            "The Gradle Kotlin DSL property was not configured as expected"
        }
        val root = project.layout.buildDirectory.dir("c2-kotlin-semantic").get().asFile
        check(root.exists() || root.mkdirs())
        val result = when (name) {
            "c2DslAssignment" -> "C2_REAL_GRADLE_ASSIGNMENT_PLUGIN_OK\n"
            "c2SetterControl" -> "C2_GRADLE_SETTER_CONTROL_OK\n"
            else -> error("Unexpected C2 task")
        }
        root.resolve("$name.txt").writeText(result, Charsets.UTF_8)
        println(result.trim())
    }
}

tasks.register<C2AssignmentTask>("c2DslAssignment") {
    // Deliberately NOT witness.set(...). This property assignment depends on
    // the actual Gradle Kotlin DSL compiler-plugin/assignment semantics.
    witness = "assigned-by-kotlin-dsl"
    expected.set("assigned-by-kotlin-dsl")
}

tasks.register<C2AssignmentTask>("c2SetterControl") {
    // The benign traditional API setter is the negative control.
    witness.set("set-by-api")
    expected.set("set-by-api")
}
