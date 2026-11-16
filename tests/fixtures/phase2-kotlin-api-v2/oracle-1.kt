package oracle

import com.marcinmoskala.math.*
import java.math.BigInteger

private val zero = BigInteger.ZERO
private val one = BigInteger.ONE
private val observations = mutableListOf<Map<String, Any?>>()
private val unsupportedControls = mutableListOf<Map<String, Any?>>()
private val exceptionControls = mutableListOf<Map<String, Any?>>()
private var excludedUnrepresentable = 0
private const val owner = "com.marcinmoskala.math.DiscreteMath"

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

private fun factorialReference(n: Int): BigInteger {
    require(n >= 0)
    var answer = one
    for (i in 2..n) answer = answer.multiply(BigInteger.valueOf(i.toLong()))
    return answer
}

private fun chooseReference(n: Int, k: Int): BigInteger {
    if (n < 0 || k < 0 || k > n) return zero
    val r = minOf(k, n - k)
    var answer = one
    for (i in 1..r) answer = answer.multiply(BigInteger.valueOf((n - r + i).toLong())).divide(BigInteger.valueOf(i.toLong()))
    return answer
}

// Coefficient of x^(n-k) in product_{j=1..k}(1-x^j)^(-1).
// This counts partitions into exactly k positive, unordered parts without
// following the source's recursive decomposition.
private fun partitionsReference(n: Int, k: Int): BigInteger {
    require(n >= 0 && k >= 0)
    if (k == 0) return if (n == 0) one else zero
    if (k > n) return zero
    val remaining = n - k
    val coefficients = Array(remaining + 1) { zero }
    coefficients[0] = one
    for (part in 1..k) for (sum in part..remaining) coefficients[sum] = coefficients[sum].add(coefficients[sum - part])
    return coefficients[remaining]
}

// Inclusion-exclusion formula for surjections, divided by the ordering of blocks.
private fun stirlingReference(n: Int, k: Int): BigInteger {
    if (k == 0) return if (n == 0) one else zero
    var surjections = zero
    for (j in 0..k) {
        val term = chooseReference(k, j).multiply(BigInteger.valueOf(j.toLong()).pow(n))
        surjections = if ((k - j) % 2 == 0) surjections.add(term) else surjections.subtract(term)
    }
    return surjections.divide(factorialReference(k))
}

private fun fitsLong(n: BigInteger) = n >= BigInteger.valueOf(Long.MIN_VALUE) && n <= BigInteger.valueOf(Long.MAX_VALUE)
private fun fitsInt(n: BigInteger) = n >= BigInteger.valueOf(Int.MIN_VALUE.toLong()) && n <= BigInteger.valueOf(Int.MAX_VALUE.toLong())

private fun record(method: String, arguments: List<String>, expected: BigInteger, contract: String,
                   admitted: Boolean = true, call: () -> Number) {
    try {
        val actual = call()
        val row = linkedMapOf<String, Any?>(
            "class" to owner, "method" to method, "arguments" to arguments,
            "actual" to actual.toString(), "expected" to expected.toString(),
            "contract" to contract, "defectEligible" to admitted
        )
        if (admitted) observations.add(row) else {
            row["excludedReason"] = "Signature or return shape is outside the frozen admitted numeric API; control only, never discovery evidence."
            unsupportedControls.add(row)
        }
    } catch (failure: Exception) {
        exceptionControls.add(linkedMapOf(
            "class" to owner, "method" to method, "arguments" to arguments,
            "exceptionClass" to failure.javaClass.name,
            "contract" to contract, "defectEligible" to false,
            "excludedReason" to "Exceptional executions do not enter the finite numeric observation join."
        ))
    }
}

fun main() {
    for (n in 0..20) record("factorial(int;)long", listOf(n.toString()), factorialReference(n),
        "n! is the BigInteger product of positive integers through n; n is nonnegative and the exact result fits Long.") { n.factorial() }

    for (base in -12..12) for (exponent in 0..10) {
        val expected = BigInteger.valueOf(base.toLong()).pow(exponent)
        if (fitsInt(expected)) record("pow(int;int;)int", listOf(base.toString(), exponent.toString()), expected,
            "Nonnegative integer power computed by BigInteger.pow, with exact result representable as Int, including the empty-product exponent zero.") { base pow exponent }
        else excludedUnrepresentable++
    }
    for (base in listOf(Int.MIN_VALUE, -46340, 46340, Int.MAX_VALUE)) for (exponent in 0..2) {
        val expected = BigInteger.valueOf(base.toLong()).pow(exponent)
        if (fitsInt(expected)) record("pow(int;int;)int", listOf(base.toString(), exponent.toString()), expected,
            "Boundary integer power has a BigInteger reference and an exactly representable Int result.") { base pow exponent }
        else excludedUnrepresentable++
    }

    for (n in 0..20) for (groups in 0..(n + 2)) {
        val expected = partitionsReference(n, groups)
        record("splitsNumber(int;int;)int", listOf(n.toString(), groups.toString()), expected,
            "Number of partitions of n identical objects into exactly k nonempty unordered groups, computed from a generating-function coefficient; the empty partition exists only at n=k=0.") { n.splitsNumber(groups) }
    }
    for (groups in listOf(0, 1, Int.MAX_VALUE)) {
        val expected = if (groups == 0) zero else one
        record("splitsNumber(int;int;)int", listOf(Int.MAX_VALUE.toString(), groups.toString()), expected,
            "For positive n, zero groups gives zero partitions, one group gives one, and n groups gives one; exact values fit Int.") { Int.MAX_VALUE.splitsNumber(groups) }
    }

    for (n in 0..3) {
        val intValues = (0 until n).toList()
        val longValues = intValues.map { it.toLong() }
        val expected = intValues.fold(one) { product, value -> product.multiply(BigInteger.valueOf(value.toLong())) }
        val shape = "size=$n;values=0..size-1"
        record("product(java.lang.Iterable;)long", listOf(shape), expected,
            "Exact product of the prescribed finite Int iterable; the empty product is one.") { intValues.product() }
        record("productLong(java.util.Collection;)long", listOf(shape), expected,
            "Exact product of the prescribed finite Long collection; the empty product is one.") { longValues.product() }
    }

    // These broader collection contracts are evaluated separately. Their inputs
    // are not representable by the frozen generic numeric argument generator.
    for (n in 0..35) for (k in 0..n) {
        val expected = chooseReference(n, k)
        if (fitsLong(expected)) record("combinationsNumber(java.util.Set;int;)long", listOf("set=0..${n - 1}", k.toString()), expected,
            "Exact binomial coefficient computed by multiplicative BigInteger cancellation; only the final Long-representable count is admitted as a mathematical control.", false) { (0 until n).toSet().combinationsNumber(k) }
        else excludedUnrepresentable++
    }
    for (n in 0..10) for (k in 0..24) {
        val expected = if (n == 0) (if (k == 0) one else zero) else chooseReference(n + k - 1, k)
        if (fitsLong(expected)) record("combinationsWithRepetitionsNumber(java.util.Set;int;)long", listOf("set=0..${n - 1}", k.toString()), expected,
            "Number of size-k multisets over n choices is C(n+k-1,k), with exactly one empty multiset and no positive-size multiset over zero choices.", false) { (0 until n).toSet().combinationsWithRepetitionsNumber(k) }
        else excludedUnrepresentable++
    }
    for (n in 0..30) for (distinct in 1..3) {
        val values = (0 until n).map { it % distinct }
        var expected = one
        var used = 0
        for (count in values.groupingBy { it }.eachCount().values) {
            expected = expected.multiply(chooseReference(used + count, count))
            used += count
        }
        if (fitsLong(expected)) record("permutationsNumber(java.util.List;)long", listOf(values.toString()), expected,
            "Multinomial count from a product of exact binomial coefficients, independent of factorial quotients.", false) { values.permutationsNumber() }
        else excludedUnrepresentable++
    }
    for (n in 0..8) for (k in 0..(n + 1)) record("splitsNumber(java.util.Set;int;)int", listOf("set=0..${n - 1}", k.toString()), stirlingReference(n, k),
        "Stirling number of the second kind computed from the inclusion-exclusion surjection formula; blocks are nonempty.", false) { (0 until n).toSet().splitsNumber(k) }

    for (n in 0..7) {
        val values = (0 until n).toList()
        record("permutations(java.util.List;)java.util.Set", listOf(values.toString()), factorialReference(n),
            "Cardinality of all arrangements of n distinct elements is n!, including one empty arrangement.", false) { values.permutations().size }
        record("powerset(java.util.Collection;)java.util.Set", listOf(values.toString()), one.shiftLeft(n),
            "A finite set of n distinct elements has 2^n subsets, from an independent binary choice for each element.", false) { values.powerset().size }
    }
    println(json(linkedMapOf(
        "schema" to "ultra-sentinel-kotlin-api-v2-independent/v1",
        "wholeCohortTruth" to false,
        "observations" to observations,
        "unsupportedControls" to unsupportedControls,
        "exceptionControls" to exceptionControls,
        "coverageNotes" to listOf(
            "Direct calls to immutable original source; reference computations use BigInteger products, multiplicative binomial coefficients, generating functions, and inclusion-exclusion.",
            "Only fixed-width finite numeric outputs with admitted input signatures enter observations. All set, opaque generic, collection-result and nonprescribed-list controls are excluded from discovery.",
            "Negative factorial arguments and negative integer exponents are outside the tested specification. Exceptional executions are recorded separately and do not establish defects.",
            "Results requiring a wider output type were excluded before calling the original: $excludedUnrepresentable cases. Intermediate arithmetic overflow is not used to excuse an otherwise representable exact result.",
            "No full-cohort correctness label or novel-family claim is made."
        )
    )))
}
