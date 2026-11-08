import com.intellij.openapi.util.Disposer
import com.ultrasentinel.experimental.kotlin.C2OptionalKotlinSemantic
import com.ultrasentinel.experimental.kotlin.C2SymbolOrigin
import com.ultrasentinel.experimental.kotlin.C2Dispatch
import org.jetbrains.kotlin.cli.common.config.addKotlinSourceRoot
import org.jetbrains.kotlin.cli.common.messages.MessageCollector
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.cli.jvm.compiler.NoScopeRecordCliBindingTrace
import org.jetbrains.kotlin.cli.jvm.compiler.TopDownAnalyzerFacadeForJVM
import org.jetbrains.kotlin.cli.jvm.config.addJvmClasspathRoot
import org.jetbrains.kotlin.cli.jvm.config.configureJdkClasspathRoots
import org.jetbrains.kotlin.config.CommonConfigurationKeys
import org.jetbrains.kotlin.config.CompilerConfiguration
import org.jetbrains.kotlin.config.JVMConfigurationKeys
import org.jetbrains.kotlin.psi.KtCallExpression
import org.jetbrains.kotlin.psi.KtTreeVisitorVoid
import java.io.File
import java.nio.file.Files

private fun gitBlob(file: File): String {
    val process = ProcessBuilder("git", "hash-object", "--stdin").start()
    process.outputStream.use { output -> file.inputStream().use { it.copyTo(output) } }
    val result = process.inputStream.bufferedReader().use { it.readText().trim() }
    check(process.waitFor() == 0)
    return result
}

fun main(args: Array<String>) {
    val dir = Files.createTempDirectory("c2-semantic-compiler").toFile()
    val disposable = Disposer.newDisposable()
    try {
        val caller = File(dir, "caller.kt").apply { writeText("""
            package caller
            import target.work as alias
            fun test(b: target.Base) { alias(1); b.run(); missing(); println(1); choose(null) }
        """.trimIndent()) }
        val target = File(dir, "target.kt").apply { writeText("""
            package target
            fun work(n: Int) = n // π😀
            open class Base { open fun run() {} }
        """.trimIndent()) }
        val ambiguous = File(dir, "ambiguous.kt").apply { writeText("""
            package caller
            fun choose(x: CharSequence?) = Unit
            fun choose(x: java.io.Serializable?) = Unit
        """.trimIndent()) }
        val locals = File(dir, "locals.kt").apply { writeText("""
            package locals
            fun outer(flag: Boolean) {
                if (flag) {
                    fun helper() = 1
                    helper()
                } else {
                    fun helper() = 2
                    helper()
                }
            }
        """.trimIndent()) }
        val inheritance = File(dir, "inheritance.kt").apply { writeText("""
            package hierarchy
            open class Parent { fun finalRun() {} }
            class Child : Parent()
            fun use(parent: Parent, child: Child) { parent.finalRun(); child.finalRun() }
        """.trimIndent()) }
        val crlf = File(dir, "crlf.kt").apply {
            writeText("package crlf\r\nfun acceptLineEndings() {}\r\nfun use() { acceptLineEndings() }\r\n")
        }
        val config = CompilerConfiguration().apply {
            put(CommonConfigurationKeys.MODULE_NAME, "c2-integration")
            put(CommonConfigurationKeys.MESSAGE_COLLECTOR_KEY, MessageCollector.NONE)
            put(JVMConfigurationKeys.JDK_HOME, File(System.getProperty("java.home")))
            configureJdkClasspathRoots()
            addJvmClasspathRoot(File(args.single()))
            listOf(caller, target, ambiguous, locals, inheritance, crlf).forEach { addKotlinSourceRoot(it.path) }
        }
        val env = KotlinCoreEnvironment.createForProduction(disposable, config, EnvironmentConfigFiles.JVM_CONFIG_FILES)
        val result = TopDownAnalyzerFacadeForJVM.analyzeFilesWithJavaIntegration(
            env.project, env.getSourceFiles(), NoScopeRecordCliBindingTrace(env.project), config,
            env::createPackagePartProvider,
        )
        val calls = mutableMapOf<String, com.ultrasentinel.experimental.kotlin.C2ResolvedSymbol>()
        val allCalls = mutableListOf<com.ultrasentinel.experimental.kotlin.C2ResolvedSymbol>()
        env.getSourceFiles().forEach { file -> file.accept(object : KtTreeVisitorVoid() {
            override fun visitCallExpression(expression: KtCallExpression) {
                val symbol = C2OptionalKotlinSemantic.resolveCall(expression, result.bindingContext)
                calls[symbol.calledName] = symbol
                allCalls.add(symbol)
                super.visitCallExpression(expression)
            }
        }) }
        val alias = calls.getValue("alias")
        check(alias.identity?.contains("target.work") == true)
        check(alias.identity?.contains("kotlin.Int") == true)
        check(alias.callSite?.path == caller.path && alias.callSite?.line == 3)
        check(alias.declarationSite?.path == target.path && alias.declarationSite?.line == 2)
        check(alias.callSite?.gitBlobSha == gitBlob(caller))
        check(alias.declarationSite?.gitBlobSha == gitBlob(target))
        check(alias.origin == C2SymbolOrigin.SOURCE_UNAUTHENTICATED && alias.dispatch == C2Dispatch.STATIC)
        val virtual = calls.getValue("run")
        check(virtual.dispatch == C2Dispatch.OPEN && virtual.identity == null)
        check(virtual.declarationSite?.path == target.path)
        for (name in listOf("missing", "choose")) {
            val unknown = calls.getValue(name)
            check(unknown.identity == null && unknown.origin == C2SymbolOrigin.UNKNOWN && unknown.dispatch == C2Dispatch.UNKNOWN)
        }
        val external = calls.getValue("println")
        check(external.origin == C2SymbolOrigin.EXTERNAL_OR_UNAVAILABLE && external.identity == null)
        check(external.declarationSite == null)
        val localCalls = allCalls.filter { it.calledName == "helper" }
        check(localCalls.size == 2)
        check(localCalls.all { it.identity == null })
        val inheritedCalls = allCalls.filter { it.calledName == "finalRun" }
        check(inheritedCalls.size == 2)
        check(inheritedCalls.all { it.identity != null && it.declarationSite?.path == inheritance.path })
        check(inheritedCalls[0].identity == inheritedCalls[1].identity)
        // The PSI normalizes these line endings. A verifier comparing against
        // the Git blob of the original bytes must reject the mismatch.
        check(calls.getValue("acceptLineEndings").callSite?.gitBlobSha != gitBlob(crlf))
        // A later filesystem change is not silently treated as the analyzed text.
        caller.appendText("\n// modificación\n")
        check(alias.callSite?.gitBlobSha != gitBlob(caller))
        println("Kotlin compiler multi-file semantic assertions passed")
    } finally {
        Disposer.dispose(disposable)
        dir.deleteRecursively()
    }
}
