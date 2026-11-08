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
            fun work(n: Int) = n
            open class Base { open fun run() {} }
        """.trimIndent()) }
        val ambiguous = File(dir, "ambiguous.kt").apply { writeText("""
            package caller
            fun choose(x: CharSequence?) = Unit
            fun choose(x: java.io.Serializable?) = Unit
        """.trimIndent()) }
        val config = CompilerConfiguration().apply {
            put(CommonConfigurationKeys.MODULE_NAME, "c2-integration")
            put(CommonConfigurationKeys.MESSAGE_COLLECTOR_KEY, MessageCollector.NONE)
            put(JVMConfigurationKeys.JDK_HOME, File(System.getProperty("java.home")))
            configureJdkClasspathRoots()
            addJvmClasspathRoot(File(args.single()))
            listOf(caller, target, ambiguous).forEach { addKotlinSourceRoot(it.path) }
        }
        val env = KotlinCoreEnvironment.createForProduction(disposable, config, EnvironmentConfigFiles.JVM_CONFIG_FILES)
        val result = TopDownAnalyzerFacadeForJVM.analyzeFilesWithJavaIntegration(
            env.project, env.getSourceFiles(), NoScopeRecordCliBindingTrace(env.project), config,
            env::createPackagePartProvider,
        )
        val calls = mutableMapOf<String, com.ultrasentinel.experimental.kotlin.C2ResolvedSymbol>()
        env.getSourceFiles().forEach { file -> file.accept(object : KtTreeVisitorVoid() {
            override fun visitCallExpression(expression: KtCallExpression) {
                val symbol = C2OptionalKotlinSemantic.resolveCall(expression, result.bindingContext)
                calls[symbol.calledName] = symbol
                super.visitCallExpression(expression)
            }
        }) }
        val alias = calls.getValue("alias")
        check(alias.identity?.contains("target.work") == true)
        check(alias.identity?.contains("kotlin.Int") == true)
        check(alias.callSite?.path == caller.path && alias.callSite?.line == 3)
        check(alias.declarationSite?.path == target.path && alias.declarationSite?.line == 2)
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
        println("Kotlin compiler multi-file semantic assertions passed")
    } finally {
        Disposer.dispose(disposable)
        dir.deleteRecursively()
    }
}
