package oracle

import com.github.keelar.exprk.Expressions
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode

private val controls = mutableListOf<Map<String, Any?>>()
private val exceptions = mutableListOf<Map<String, Any?>>()
private val context = MathContext.DECIMAL64

private fun json(value: Any?): String = when (value) {
    null -> "null"
    is String -> "\"" + buildString {
        for (c in value) append(when (c) {
            '\\' -> "\\\\"
            '"' -> "\\\""
            '\n' -> "\\n"
            '\r' -> "\\r"
            '\t' -> "\\t"
            else -> if (c.code < 32) "\\u" + c.code.toString(16).padStart(4, '0') else c.toString()
        })
    } + "\""
    is Boolean, is Number -> value.toString()
    is Map<*, *> -> value.entries.joinToString(",", "{", "}") { json(it.key.toString()) + ":" + json(it.value) }
    is Iterable<*> -> value.joinToString(",", "[", "]") { json(it) }
    else -> error("Unsupported JSON value")
}

private fun decimal(value: BigDecimal) = value.stripTrailingZeros().toPlainString()
private fun bool(value: Boolean) = if (value) BigDecimal.ONE else BigDecimal.ZERO

private fun check(expression: String, expected: BigDecimal, specification: String) {
    try {
        val actual = Expressions().eval(expression)
        controls.add(linkedMapOf(
            "class" to "com.github.keelar.exprk.Expressions",
            "method" to "eval(java.lang.String;)java.math.BigDecimal",
            "arguments" to listOf(expression), "constructor" to emptyList<String>(),
            "constructorArguments" to emptyList<String>(), "actual" to decimal(actual),
            "expected" to decimal(expected), "contract" to specification,
            "defectEligible" to false,
            "excludedReason" to "BigDecimal return and general expression String inputs are outside the frozen numeric admission scope; functional control only."
        ))
    } catch (failure: Exception) {
        exceptions.add(linkedMapOf("expression" to expression,
            "exceptionClass" to failure.javaClass.name, "defectEligible" to false,
            "excludedReason" to "Exceptional controls do not enter numeric discovery joins."))
    }
}

fun main() {
    val texts = listOf("0", "0.0", "0.00", "1", "1.0", "-1", "-1.0", "2.50", "-3.75", "0.125")
    for (leftText in texts) for (rightText in texts) {
        val a = BigDecimal(leftText)
        val b = BigDecimal(rightText)
        val left = "($leftText)"
        val right = "($rightText)"
        check("$left+$right", a.add(b), "Exact decimal addition computed by JDK BigDecimal.add.")
        check("$left-$right", a.subtract(b), "Exact decimal subtraction computed by JDK BigDecimal.subtract.")
        check("$left*$right", a.multiply(b), "Exact decimal multiplication computed by JDK BigDecimal.multiply.")
        if (b.signum() != 0) {
            check("$left/$right", a.divide(b, context), "Decimal division rounded with the standard DECIMAL64 MathContext.")
            check("$left%$right", a.remainder(b, context), "Decimal remainder computed with the standard DECIMAL64 MathContext.")
        }
        check("$left==$right", bool(a.compareTo(b) == 0), "Numeric equality is independent of decimal presentation scale.")
        check("$left!=$right", bool(a.compareTo(b) != 0), "Numeric inequality is the complement of numeric equality, independent of scale.")
        check("$left>$right", bool(a.compareTo(b) > 0), "Decimal ordered comparison is determined by BigDecimal.compareTo.")
        check("$left<=$right", bool(a.compareTo(b) <= 0), "Decimal ordered comparison is determined by BigDecimal.compareTo.")
        check("$left&&$right", bool(a.signum() != 0 && b.signum() != 0), "Logical conjunction treats every numeric zero as false and every nonzero numeric value as true.")
        check("$left||$right", bool(a.signum() != 0 || b.signum() != 0), "Logical disjunction treats every numeric zero as false and every nonzero numeric value as true.")
        check("min($left,$right)", a.min(b), "Minimum according to numeric ordering.")
        check("max($left,$right)", a.max(b), "Maximum according to numeric ordering.")
        check("sum($left,$right)", a.add(b), "Finite decimal sum is exact.")
    }
    for (text in texts) {
        val a = BigDecimal(text)
        check("abs(($text))", a.abs(), "Absolute value is computed by JDK BigDecimal.abs.")
        check("floor(($text))", a.setScale(0, RoundingMode.FLOOR), "Floor is rounding toward negative infinity.")
        check("ceil(($text))", a.setScale(0, RoundingMode.CEILING), "Ceiling is rounding toward positive infinity.")
        check("round(($text))", a.setScale(0, RoundingMode.HALF_EVEN), "Default DECIMAL64 rounding mode is HALF_EVEN.")
        check("if(($text),7,11)", if (a.signum() != 0) BigDecimal(7) else BigDecimal(11), "A numeric conditional selects its first branch iff the condition has nonzero numeric value.")
    }
    for (base in -5..5) for (exponent in 0..8) {
        val expected = BigDecimal(base).pow(exponent, context)
        check("($base)^$exponent", expected, "Nonnegative integral exponentiation computed directly by JDK BigDecimal.pow.")
    }
    println(json(linkedMapOf(
        "schema" to "ultra-sentinel-kotlin-api-v2-independent/v1",
        "wholeCohortTruth" to false,
        "scopeStatus" to "NO_ORACLE_SCOPE",
        "observations" to emptyList<Any>(),
        "unsupportedControls" to controls,
        "exceptionControls" to exceptions,
        "coverageNotes" to listOf(
            "The project exposes decimal expression evaluation, whose return and input domain are outside the frozen admitted primitive numeric API.",
            "Direct-call controls independently compute exact decimal operations with standard JDK BigDecimal references; they cannot enter discovered, false-positive, or novelty counts.",
            "The no-argument precision getter is configuration metadata and was not invented into a mathematical discovery target.",
            "Each control uses a fresh publicly constructed receiver. No full-cohort truth label is supplied."
        )
    )))
}
