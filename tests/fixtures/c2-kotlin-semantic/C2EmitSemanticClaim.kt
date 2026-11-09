import com.intellij.openapi.util.Disposer
import com.ultrasentinel.experimental.kotlin.C2OptionalKotlinSemantic
import com.ultrasentinel.experimental.kotlin.C2SourceLocation
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

// Trusted synthetic integration fixture, not an attestation of a compiler run.
private fun json(value: String): String = buildString {
    append('"')
    for (c in value) when (c) {
        '"' -> append("\\\"")
        '\\' -> append("\\\\")
        in '\u0000'..'\u001f' -> append("\\u%04x".format(c.code))
        else -> append(c)
    }
    append('"')
}
private fun location(value: C2SourceLocation): String =
    "{\"path\":${json(value.path)},\"line\":${value.line},\"column\":${value.column},\"gitBlobSha\":${json(value.gitBlobSha)}}"

fun main(args: Array<String>) {
    val multiple = args.size >= 4 && args[1].startsWith("--name=")
    require(args.size == 3 || multiple)
    val targetName = if (multiple) args[1].removePrefix("--name=") else "work"
    require(targetName.matches(Regex("[A-Za-z_][A-Za-z0-9_]*")))
    val sourceRoots = if (multiple) args.drop(2) else args.drop(1)
    require(sourceRoots.isNotEmpty() && sourceRoots.size <= 64 && sourceRoots.toSet().size == sourceRoots.size)
    val disposable = Disposer.newDisposable()
    try {
        val config = CompilerConfiguration().apply {
            put(CommonConfigurationKeys.MODULE_NAME, "c2-binding-integration")
            put(CommonConfigurationKeys.MESSAGE_COLLECTOR_KEY, MessageCollector.NONE)
            put(JVMConfigurationKeys.JDK_HOME, File(System.getProperty("java.home")))
            configureJdkClasspathRoots()
            addJvmClasspathRoot(File(args[0]))
            sourceRoots.forEach { addKotlinSourceRoot(it) }
        }
        val env = KotlinCoreEnvironment.createForProduction(disposable, config, EnvironmentConfigFiles.JVM_CONFIG_FILES)
        val analysis = TopDownAnalyzerFacadeForJVM.analyzeFilesWithJavaIntegration(
            env.project, env.getSourceFiles(), NoScopeRecordCliBindingTrace(env.project), config,
            env::createPackagePartProvider,
        )
        val claims = mutableListOf<String>()
        env.getSourceFiles().forEach { file -> file.accept(object : KtTreeVisitorVoid() {
            override fun visitCallExpression(expression: KtCallExpression) {
                val s = C2OptionalKotlinSemantic.resolveCall(expression, analysis.bindingContext)
                if (s.calledName == targetName) {
                    val identity = requireNotNull(s.identity)
                    val caller = requireNotNull(s.callSite)
                    val declaration = requireNotNull(s.declarationSite)
                    claims.add("{\"calledName\":${json(s.calledName)},\"kind\":${json(s.kind.name)}," +
                        "\"identity\":${json(identity)},\"callSite\":${location(caller)}," +
                        "\"declarationSite\":${location(declaration)},\"origin\":${json(s.origin.name)}," +
                        "\"dispatch\":${json(s.dispatch.name)}}")
                    check(claims.size <= 256)
                }
                super.visitCallExpression(expression)
            }
        }) }
        check(claims.isNotEmpty())
        if (multiple) println(claims.joinToString(prefix = "[", postfix = "]"))
        else {
            check(claims.size == 1)
            println(claims.single())
        }
    } finally {
        Disposer.dispose(disposable)
    }
}
