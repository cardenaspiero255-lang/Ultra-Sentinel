package com.squareup.kotlinpoet

/* Test-only JVM helpers for the ORIGINAL NameAllocator.kt, not a replacement of that source. */
@JvmInline
internal value class CodePoint(val code: Int)
internal fun String.codePointAt(index: Int): CodePoint = CodePoint(Character.codePointAt(this, index))
internal fun CodePoint.isJavaIdentifierStart() = Character.isJavaIdentifierStart(code)
internal fun CodePoint.isJavaIdentifierPart() = Character.isJavaIdentifierPart(code)
internal fun CodePoint.charCount() = Character.charCount(code)
internal fun StringBuilder.appendCodePoint(value: CodePoint): StringBuilder = appendCodePoint(value.code)
internal val KEYWORDS = setOf("class", "when", "if", "else", "fun", "val", "var")
