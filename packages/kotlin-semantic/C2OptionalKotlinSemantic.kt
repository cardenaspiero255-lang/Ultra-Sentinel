package com.ultrasentinel.experimental.kotlin

import org.jetbrains.kotlin.descriptors.ConstructorDescriptor
import org.jetbrains.kotlin.descriptors.FunctionDescriptor
import org.jetbrains.kotlin.psi.KtCallExpression
import org.jetbrains.kotlin.resolve.BindingContext
import org.jetbrains.kotlin.resolve.calls.util.getResolvedCall

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

data class C2ResolvedSymbol(
    val calledName: String,
    val kind: C2SymbolKind,
)

object C2OptionalKotlinSemantic {
    fun resolveCall(
        expression: KtCallExpression,
        context: BindingContext,
    ): C2ResolvedSymbol {
        val name = expression.calleeExpression?.text ?: return C2ResolvedSymbol("", C2SymbolKind.UNKNOWN)
        val descriptor = expression.getResolvedCall(context)?.resultingDescriptor
        val kind = when (descriptor) {
            is ConstructorDescriptor -> C2SymbolKind.CONSTRUCTOR
            is FunctionDescriptor -> C2SymbolKind.FUNCTION
            else -> C2SymbolKind.UNKNOWN
        }
        return C2ResolvedSymbol(name, kind)
    }
}
