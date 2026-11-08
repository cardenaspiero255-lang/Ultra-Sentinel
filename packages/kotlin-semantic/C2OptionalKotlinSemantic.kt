package com.ultrasentinel.experimental.kotlin

import org.jetbrains.kotlin.descriptors.ConstructorDescriptor
import org.jetbrains.kotlin.descriptors.FunctionDescriptor
import org.jetbrains.kotlin.descriptors.Modality
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtCallExpression
import org.jetbrains.kotlin.renderer.DescriptorRenderer
import org.jetbrains.kotlin.resolve.BindingContext
import org.jetbrains.kotlin.resolve.DescriptorToSourceUtils
import org.jetbrains.kotlin.resolve.DescriptorUtils
import org.jetbrains.kotlin.resolve.calls.util.getResolvedCall
import org.jetbrains.kotlin.resolve.calls.model.isReallySuccess

/**
 * Optional symbol-resolution-only JVM Kotlin bridge, compiled against the
 * pinned Kotlin 2.0.21 K1 BindingContext exposed by Detekt.
 *
 * This adapter is deliberately not a vulnerability rule. It MUST only be
 * invoked in a compiler-backed Kotlin analysis session. An unresolved or
 * unrecognized call is UNKNOWN, never "constructor" by textual similarity.
 * K2 Analysis API and Gradle Kotlin DSL script resolution are separate gates.
 */
enum class C2SymbolKind {
    CONSTRUCTOR,
    FUNCTION,
    UNKNOWN,
}

enum class C2SymbolOrigin { SOURCE_UNAUTHENTICATED, EXTERNAL_OR_UNAVAILABLE, UNKNOWN }
enum class C2Dispatch { STATIC, OPEN, UNKNOWN }

/** A compiler PSI location; line and column are one-based. Paths are compiler inputs. */
data class C2SourceLocation(val path: String, val line: Int, val column: Int)

data class C2ResolvedSymbol(
    val calledName: String,
    val kind: C2SymbolKind,
    val identity: String? = null,
    val callSite: C2SourceLocation? = null,
    val declarationSite: C2SourceLocation? = null,
    val origin: C2SymbolOrigin = C2SymbolOrigin.UNKNOWN,
    val dispatch: C2Dispatch = C2Dispatch.UNKNOWN,
)

object C2OptionalKotlinSemantic {
    fun resolveCall(
        expression: KtCallExpression,
        context: BindingContext,
    ): C2ResolvedSymbol {
        val name = expression.calleeExpression?.text ?: return C2ResolvedSymbol("", C2SymbolKind.UNKNOWN)
        // An unsuccessful/ambiguous call may retain a tentative descriptor.
        // Only an actually successful compiler resolution identifies a symbol.
        val resolvedCall = expression.getResolvedCall(context)
        val descriptor = resolvedCall?.takeIf { it.isReallySuccess() }?.resultingDescriptor
        val kind = when (descriptor) {
            is ConstructorDescriptor -> C2SymbolKind.CONSTRUCTOR
            is FunctionDescriptor -> C2SymbolKind.FUNCTION
            else -> C2SymbolKind.UNKNOWN
        }
        val callSite = location(expression)
        if (kind == C2SymbolKind.UNKNOWN || descriptor !is FunctionDescriptor) {
            return C2ResolvedSymbol(name, kind, callSite = callSite)
        }
        val original = descriptor.original
        val fqName = DescriptorUtils.getFqName(original)
        // Local/anonymous descriptors have no stable fully qualified identity.
        val declaration = DescriptorToSourceUtils.descriptorToDeclaration(original)
        val declarationSite = declaration?.let(::location)
        val dispatch = when {
            original is ConstructorDescriptor || original.dispatchReceiverParameter == null -> C2Dispatch.STATIC
            original.modality == Modality.FINAL -> C2Dispatch.STATIC
            else -> C2Dispatch.OPEN
        }
        // A virtual call does not identify its runtime implementation, and a
        // missing source cannot establish a source-file binding.
        val identity = if (fqName.isSafe && declarationSite != null && dispatch == C2Dispatch.STATIC) {
            fqName.asString() + " " + DescriptorRenderer.FQ_NAMES_IN_TYPES.render(original)
        } else null
        return C2ResolvedSymbol(
            name, kind, identity, callSite, declarationSite,
            if (declarationSite == null) C2SymbolOrigin.EXTERNAL_OR_UNAVAILABLE else C2SymbolOrigin.SOURCE_UNAUTHENTICATED,
            dispatch,
        )
    }

    private fun location(element: com.intellij.psi.PsiElement): C2SourceLocation? {
        val file = element.containingFile as? KtFile ?: return null
        val path = file.virtualFile?.path ?: return null
        val text = file.text
        val offset = element.textOffset.coerceIn(0, text.length)
        val lineStart = if (offset == 0) 0 else text.lastIndexOf('\n', offset - 1) + 1
        return C2SourceLocation(path, text.substring(0, offset).count { it == '\n' } + 1, offset - lineStart + 1)
    }
}
