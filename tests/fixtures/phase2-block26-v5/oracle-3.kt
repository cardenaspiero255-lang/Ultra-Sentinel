// Independent source-grounded controls, never supplied to the frozen Hunter.
// Duplicate-letter scoring: Wordle: The Party Game instructions, pp. 1-2,
// https://assets-us-01.kc-usercontent.com/500e0a65-283d-00ef-33b2-7f1f20488fe2/b116896e-a5e8-4bfe-97d4-f417e63c4bed/F83481021_INST_Wordle_NYT_F22_P1_FAR.pdf
// Hard-mode multiplicity: https://doi.org/10.1287/opre.2022.0434, section 2.1.
package oracle

import java.math.BigInteger
import net.danlew.wordle.GuessResult
import net.danlew.wordle.Hint
import net.danlew.wordle.average
import net.danlew.wordle.couldMatch
import net.danlew.wordle.evaluateGuess
import net.danlew.wordle.filterValidHardModeGuesses
import net.danlew.wordle.formatHistogram
import net.danlew.wordle.runGame
import net.danlew.wordle.solved
import net.danlew.wordle.validHardModeGuess
import net.danlew.wordle.algorithm.FirstWordSolver
import net.danlew.wordle.algorithm.KnuthSolver
import net.danlew.wordle.algorithm.Solver

private val observations = mutableListOf<Map<String, Any?>>()
private val unsupported = mutableListOf<Map<String, Any?>>()
private val exceptions = mutableListOf<Map<String, Any?>>()

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

private fun recordException(owner: String, method: String, arguments: List<String>,
                            expected: Any?, contract: String, reason: String, actual: String? = null) {
    exceptions.add(linkedMapOf(
        "class" to owner, "method" to method, "arguments" to arguments,
        "outcome" to reason, "actual" to actual, "expected" to expected,
        "contract" to contract, "defectEligible" to false,
        "excludedReason" to "An exception or nonfinite return cannot be a finite numeric observation."
    ))
}

private fun control(owner: String, method: String, arguments: List<String>, expected: Any?,
                    contract: String, call: () -> Any?) {
    try {
        unsupported.add(linkedMapOf(
            "class" to owner, "method" to method, "arguments" to arguments,
            "actual" to call(), "expected" to expected, "contract" to contract,
            "defectEligible" to false,
            "excludedReason" to "The signature, result, or concrete input is outside the frozen numeric discovery join."
        ))
    } catch (failure: Exception) {
        recordException(owner, method, arguments, expected, contract, failure.javaClass.name)
    }
}

// Arithmetic uses unbounded JDK integers before the final IEEE double division.
// Index zero records failed games and is deliberately excluded from both sums.
private fun expectedMean(histogram: List<Int>): Double {
    require(histogram.all { it >= 0 })
    var weighted = BigInteger.ZERO
    var successes = BigInteger.ZERO
    for ((index, count) in histogram.withIndex()) {
        if (index == 0) continue
        val n = BigInteger.valueOf(count.toLong())
        successes = successes.add(n)
        weighted = weighted.add(BigInteger.valueOf(index.toLong()).multiply(n))
    }
    require(successes.signum() > 0)
    return weighted.toDouble() / successes.toDouble()
}

private fun meanControl(histogram: List<Int>, encodedInput: String?, discoveryEligible: Boolean = false) {
    // The sole joined case has an exactly representable integral mathematical mean.
    // Inexact rational means are never adjudicated by exact decimal equality.
    require(!discoveryEligible || (encodedInput != null && histogram == listOf(0, 1)))
    val owner = "net.danlew.wordle.ResultLogicKt"
    val method = "average(java.util.List;)double"
    val arguments = listOf(encodedInput ?: "histogram=" + histogram.joinToString(","))
    val contract = "Successful-game mean is the total successful guess count divided by the number of successes; failure bucket zero is excluded."
    val expected = expectedMean(histogram)
    try {
        val actual = average(histogram)
        if (!actual.isFinite()) {
            recordException(owner, method, arguments, expected.toString(), contract, "NONFINITE_RESULT", actual.toString())
            return
        }
        val row = linkedMapOf<String, Any?>(
            "class" to owner, "method" to method, "arguments" to arguments,
            "actual" to actual.toString(), "expected" to expected.toString(), "contract" to contract,
            "defectEligible" to discoveryEligible
        )
        if (discoveryEligible) observations.add(row) else {
            row["excludedReason"] = if (encodedInput == null)
                "This concrete histogram is not represented by the admitted collection input encoding."
            else "The mathematical mean is non-dyadic; exact-decimal floating equality cannot adjudicate it."
            unsupported.add(row)
        }
    } catch (failure: Exception) {
        recordException(owner, method, arguments, expected.toString(), contract, failure.javaClass.name)
    }
}

// Give exact-position matches priority, then allocate only the remaining
// multiplicity of each target character to non-exact positions.
private fun expectedHints(guess: String, target: String): List<Hint> {
    require(guess.length == target.length)
    val available = target.indices.filter { guess[it] != target[it] }
        .map { target[it] }.groupingBy { it }.eachCount().toMutableMap()
    return guess.indices.map { index ->
        val letter = guess[index]
        when {
            letter == target[index] -> Hint.CORRECT
            (available[letter] ?: 0) > 0 -> {
                available[letter] = available.getValue(letter) - 1
                Hint.MISPLACED
            }
            else -> Hint.UNUSED
        }
    }
}

private fun expectedHardMode(candidate: String, previous: GuessResult): Boolean {
    require(candidate.length == previous.guess.length && previous.hints.size == candidate.length)
    if (candidate.indices.any { previous.hints[it] == Hint.CORRECT && candidate[it] != previous.guess[it] })
        return false
    val needed = previous.guess.indices.filter { previous.hints[it] != Hint.UNUSED }
        .map { previous.guess[it] }.groupingBy { it }.eachCount()
    val present = candidate.groupingBy { it }.eachCount()
    return needed.all { (letter, count) -> (present[letter] ?: 0) >= count }
}

private class ScriptedSolver(private val words: List<String>) : Solver {
    private var index = 0
    override fun nextGuess(wordPool: List<String>, targets: List<String>, previousGuesses: List<GuessResult>): String =
        words[index++]
}

private fun worstBucket(guess: String, targets: List<String>): Int =
    targets.groupingBy { expectedHints(guess, it) }.eachCount().values.maxOrNull() ?: 0

fun main() {
    // Only the exactly representable example can enter the discovery join.
    meanControl(listOf(0, 1), "size=2;values=0..size-1", true)
    meanControl(listOf(0, 1, 2), "size=3;values=0..size-1")

    // Other valid histogram distributions are useful controls but cannot join
    // numeric findings through the admitted collection argument representation.
    for (histogram in listOf(
        listOf(0, 4, 0, 0), listOf(0, 0, 0, 3), listOf(7, 2, 1),
        listOf(17, 2, 1), listOf(5, 1, 3, 2), listOf(0, 800_000_000, 600_000_000)
    )) meanControl(histogram, null)
    val undefinedHistogram = listOf(5, 0, 0)
    control("net.danlew.wordle.ResultLogicKt", "average(java.util.List;)double",
        listOf("histogram=5,0,0"), "undefined",
        "No successful games exist, so their mean is undefined; this is an unscored boundary control.") {
        average(undefinedHistogram).toString()
    }

    val scoringCases = listOf(
        "cider" to "cider", "sight" to "camps", "allee" to "apple", "apple" to "allee",
        "eerie" to "level", "belle" to "eagle", "abcde" to "eabcd", "aabbb" to "bbaaa"
    )
    for ((guess, target) in scoringCases) {
        val reference = expectedHints(guess, target)
        control("net.danlew.wordle.WordleLogicKt", "evaluateGuess(java.lang.String;java.lang.String;)java.util.List",
            listOf(guess, target), reference.map { it.name },
            "Exact letters have priority; each remaining target occurrence credits at most one misplaced letter.") {
            evaluateGuess(guess, target).map { it.name }
        }
    }

    val matchingCases = listOf(
        Triple("allee", "apple", "apple"), Triple("allee", "apple", "alley"),
        Triple("aabbb", "bbaaa", "bbaaa"), Triple("aabbb", "bbaaa", "ababa"),
        Triple("cider", "apple", "apple"), Triple("cider", "apple", "caper"),
        Triple("cigar", "caper", "caper"), Triple("cigar", "caper", "cigar")
    )
    for ((guess, target, candidate) in matchingCases) {
        val hints = expectedHints(guess, target)
        val state = GuessResult(guess, hints)
        val expected = expectedHints(guess, candidate) == hints
        val flags = if (guess.toSet().size == guess.length) listOf(false, true) else listOf(false)
        for (unique in flags) {
            control("net.danlew.wordle.SolverLogicKt", "couldMatch(net.danlew.wordle.GuessResult;java.lang.String;boolean;)boolean",
                listOf(guess, hints.joinToString(",") { it.name }, candidate, unique.toString()), expected,
                "A candidate can match exactly when independent feedback for the same guess equals the recorded hints.") {
                state.couldMatch(candidate, unique)
            }
        }
    }

    val hardModeCases = listOf(
        Triple("allee", "apple", listOf("apple", "alley", "amply", "aglow", "angle")),
        Triple("aabbb", "bbaaa", listOf("abcde", "abbbc", "aaabb", "bbaaa", "cccaa")),
        Triple("cider", "cider", listOf("cider", "rider", "cigar"))
    )
    for ((guess, target, candidates) in hardModeCases) {
        val state = GuessResult(guess, expectedHints(guess, target))
        for (candidate in candidates) {
            control("net.danlew.wordle.WordleLogicKt", "validHardModeGuess(java.lang.String;net.danlew.wordle.GuessResult;)boolean",
                listOf(candidate, guess, state.hints.joinToString(",") { it.name }),
                expectedHardMode(candidate, state),
                "Keep exact positions and retain each revealed letter with its required multiplicity.") {
                validHardModeGuess(candidate, state)
            }
        }
        control("net.danlew.wordle.WordleLogicKt", "filterValidHardModeGuesses(java.util.List;net.danlew.wordle.GuessResult;)java.util.List",
            listOf(candidates.joinToString(","), guess, state.hints.joinToString(",") { it.name }),
            candidates.filter { expectedHardMode(it, state) },
            "Hard-mode filtering preserves exactly the valid candidates and their input order.") {
            filterValidHardModeGuesses(candidates, state)
        }
    }

    for (hints in listOf(listOf(Hint.CORRECT, Hint.CORRECT), listOf(Hint.CORRECT, Hint.MISPLACED))) {
        control("net.danlew.wordle.WordleLogicKt", "getSolved(java.util.List;)boolean",
            listOf(hints.joinToString(",") { it.name }), hints.all { it == Hint.CORRECT },
            "A result is solved exactly when all its hints are correct.") { hints.solved }
    }

    control("net.danlew.wordle.ResultLogicKt", "formatHistogram(java.util.List;)java.lang.String",
        listOf("histogram=2,3,1"),
        "Solved in 1 guess(es): 3\nSolved in 2 guess(es): 1\nFailed to solve: 2\nAverage # guesses: 1.25",
        "The displayed histogram separates failed games and reports the successful-game mean.") {
        formatHistogram(listOf(2, 3, 1))
    }

    val pool = listOf("cider", "cigar", "caper", "apple")
    val targets = listOf("cigar", "caper", "apple")
    control("net.danlew.wordle.algorithm.FirstWordSolver", "nextGuess(java.util.List;java.util.List;java.util.List;)java.lang.String",
        listOf("nonempty pool and target list"), true,
        "A solver with nonempty targets selects a possible target.") {
        FirstWordSolver.nextGuess(pool, targets, emptyList()) in targets
    }
    control("net.danlew.wordle.algorithm.KnuthSolver", "nextGuess(java.util.List;java.util.List;java.util.List;)java.lang.String",
        listOf("preselected first guess", "empty history"), "cider",
        "A configured first guess is used before any game history.") {
        KnuthSolver("cider").nextGuess(pool, targets, emptyList())
    }
    val bestWorstBucket = pool.minOf { worstBucket(it, targets) }
    control("net.danlew.wordle.algorithm.KnuthSolver", "nextGuess(java.util.List;java.util.List;java.util.List;)java.lang.String",
        listOf("small candidate pool", "empty history"), true,
        "Minimax selection has the smallest worst-case feedback bucket among the available guesses.") {
        val chosen = KnuthSolver(null).nextGuess(pool, targets, emptyList())
        chosen in pool && worstBucket(chosen, targets) == bestWorstBucket
    }

    for ((script, expected) in listOf(listOf("apple") to 1, listOf("cider", "apple") to 2,
                                     listOf("cider") to 0)) {
        control("net.danlew.wordle.GameRunnerKt", "runGame(net.danlew.wordle.algorithm.Solver;java.lang.String;java.util.List;java.util.List;boolean;int;)int",
            listOf("target=apple", "script=" + script.joinToString(","), "max=" + script.size), expected,
            "A game returns the one-based solving round, or zero after exhausting its guesses.") {
            ScriptedSolver(script).runGame("apple", pool, listOf("apple"), false, script.size)
        }
    }

    println(json(linkedMapOf(
        "schema" to "ultra-sentinel-kotlin-api-v2-independent/v1",
        "wholeCohortTruth" to false,
        "scopeStatus" to "SCOPED_FUNCTIONAL_CONTROLS",
        "observations" to observations,
        "orderingObservations" to emptyList<Any>(),
        "unsupportedControls" to unsupported,
        "exceptionControls" to exceptions,
        "coverageNotes" to listOf(
            "Only finite typed-list numeric observations with faithfully represented inputs and an exactly representable mathematical mean can enter the numeric evidence join.",
            "Non-numeric outputs, nonrepresentable list values, and unsupported signatures are functional controls only.",
            "No public project-defined Comparable implementation with an admitted constructor was identified.",
            "The full source cohort and standard library must compile in the isolated CI environment; no source bytecode was executed locally."
        )
    )))
}
