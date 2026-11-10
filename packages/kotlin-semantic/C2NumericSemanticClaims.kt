import com.intellij.openapi.util.Disposer
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
import org.jetbrains.kotlin.lexer.KtTokens
import org.jetbrains.kotlin.psi.KtBinaryExpression
import org.jetbrains.kotlin.psi.KtCallExpression
import org.jetbrains.kotlin.psi.KtDotQualifiedExpression
import org.jetbrains.kotlin.psi.KtExpression
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtParenthesizedExpression
import org.jetbrains.kotlin.psi.KtTreeVisitorVoid
import org.jetbrains.kotlin.resolve.BindingContext
import org.jetbrains.kotlin.resolve.DescriptorToSourceUtils
import org.jetbrains.kotlin.resolve.DescriptorUtils
import org.jetbrains.kotlin.resolve.calls.model.isReallySuccess
import org.jetbrains.kotlin.resolve.calls.util.getResolvedCall
import java.io.File
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

// Kotlin K1 BindingContext claims, deliberately not a functional oracle or
// a trusted compiler attestation. Must run under pinned, isolated CI.
private fun quoted(value: String): String = buildString {
    append('"')
    for (ch in value) when (ch) {
        '"' -> append("\\\"")
        '\\' -> append("\\\\")
        in '\u0000'..'\u001f' -> append("\\u%04x".format(ch.code))
        else -> append(ch)
    }
    append('"')
}
private fun blobSha(source: String): String {
    val bytes = source.toByteArray(StandardCharsets.UTF_8)
    val md = MessageDigest.getInstance("SHA-1")
    md.update("blob ${bytes.size}\u0000".toByteArray(StandardCharsets.US_ASCII))
    return md.digest(bytes).joinToString("") { "%02x".format(it.toInt() and 0xff) }
}
private data class Claim(val path: String, val line: Int, val rule: String, val blobSha: String) {
    fun json(): String = "{\"path\":${quoted(path)},\"line\":$line,\"rule\":${quoted(rule)},\"blobSha\":${quoted(blobSha)}}"
}
private fun resolved(call: KtCallExpression, context: BindingContext, qualifiedName: String): Boolean {
    val descriptor = call.getResolvedCall(context)?.takeIf { it.isReallySuccess() }?.resultingDescriptor?.original
        ?: return false
    return DescriptorUtils.getFqName(descriptor).asString() == qualifiedName &&
        DescriptorToSourceUtils.descriptorToDeclaration(descriptor) == null
}

private fun expressionType(expr: KtExpression, context: BindingContext): String? =
    context[BindingContext.EXPRESSION_TYPE_INFO, expr]?.type?.toString()

private fun scan(file: KtFile, context: BindingContext): List<Claim> {
    val path = requireNotNull(file.virtualFile?.path)
    val hash = blobSha(file.text)
    val result = mutableListOf<Claim>()
    file.accept(object : KtTreeVisitorVoid() {
        override fun visitDotQualifiedExpression(expression: KtDotQualifiedExpression) {
            val outer = expression.selectorExpression as? KtCallExpression
            if (outer != null && resolved(outer, context, "kotlin.ranges.coerceIn")) {
                val narrow = expression.receiverExpression as? KtDotQualifiedExpression
                val narrowCall = narrow?.selectorExpression as? KtCallExpression
                if (narrow != null && narrowCall != null && resolved(narrowCall, context, "kotlin.Long.toInt") &&
                    expressionType(narrow.receiverExpression, context) == "Long" &&
                    expressionType(narrow, context) == "Int") {
                    result.add(Claim(path, file.text.substring(0, expression.textOffset).count { it == '\n' } + 1,
                        "WIDE_NUMERIC_NARROWED_BEFORE_CLAMP", hash))
                }
            }
            if (outer != null && resolved(outer, context, "kotlin.Int.toLong") &&
                expressionType(expression.receiverExpression, context) == "Int") {
                val receiver = expression.receiverExpression
                val mul = (receiver as? KtParenthesizedExpression)?.expression as? KtBinaryExpression
                if (mul != null && mul.operationToken == KtTokens.MUL &&
                    expressionType(mul, context) == "Int") {
                    result.add(Claim(path, file.text.substring(0, expression.textOffset).count { it == '\n' } + 1,
                        "INT_MULTIPLICATION_BEFORE_WIDENING", hash))
                }
            }
            super.visitDotQualifiedExpression(expression)
        }
    })
    return result
}
fun main(args: Array<String>) {
    require(args.size in 2..65)
    val target = args.getOrNull(1)?.takeIf { it.startsWith("--target=") }?.removePrefix("--target=")
    val roots = if (target == null) args.drop(1) else args.drop(2)
    require(roots.isNotEmpty() && roots.size <= 64 && roots.toSet().size == roots.size)
    if (target != null) require(target in roots)
    val disposable = Disposer.newDisposable()
    try {
        val config = CompilerConfiguration().apply {
            put(CommonConfigurationKeys.MODULE_NAME, "numeric-semantic-c2")
            put(CommonConfigurationKeys.MESSAGE_COLLECTOR_KEY, MessageCollector.NONE)
            put(JVMConfigurationKeys.JDK_HOME, File(System.getProperty("java.home")))
            configureJdkClasspathRoots()
            addJvmClasspathRoot(File(args[0]))
            roots.forEach { addKotlinSourceRoot(it) }
        }
        val environment = KotlinCoreEnvironment.createForProduction(disposable, config, EnvironmentConfigFiles.JVM_CONFIG_FILES)
        val files = environment.getSourceFiles()
        require(files.isNotEmpty())
        val analysis = TopDownAnalyzerFacadeForJVM.analyzeFilesWithJavaIntegration(
            environment.project, files, NoScopeRecordCliBindingTrace(environment.project), config,
            environment::createPackagePartProvider,
        )
        val claims = files.filter { target == null || it.virtualFile?.path == target }
            .flatMap { scan(it, analysis.bindingContext) }
            .sortedWith(compareBy(Claim::path, Claim::line, Claim::rule))
        require(claims.size <= 256)
        println("{\"schema\":\"ultra-sentinel-numeric-semantic-claims/v1\",\"claims\":${claims.joinToString(prefix="[",postfix="]") { it.json() }},\"compilerAuthenticated\":false,\"originalOracleVerified\":false}")
    } finally {
        Disposer.dispose(disposable)
    }
}
