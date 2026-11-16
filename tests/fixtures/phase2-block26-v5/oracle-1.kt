package oracle

import com.github.penemue.keap.PriorityQueue as KeapQueue
import com.github.penemue.keap.copyOf
import com.github.penemue.keap.keapSort
import com.github.penemue.keap.keapSorted
import java.util.Comparator

private val controls = mutableListOf<Map<String, Any?>>()
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

private fun control(name: String, input: Any?, expected: Any?, contract: String, call: () -> Any?) {
    try {
        controls.add(linkedMapOf("scenario" to name, "input" to input, "actual" to call(),
            "expected" to expected, "contract" to contract, "defectEligible" to false,
            "excludedReason" to "Generic collection, comparator, or structured-return control is outside the frozen numeric/Comparable evidence join."))
    } catch (failure: Throwable) {
        if (failure is VirtualMachineError || failure is ThreadDeath || failure is LinkageError) throw failure
        exceptions.add(linkedMapOf("scenario" to name, "input" to input,
            "exceptionClass" to failure.javaClass.name, "contract" to contract, "defectEligible" to false,
            "excludedReason" to "Exceptional execution is recorded separately and cannot enter a discovery verdict."))
    }
}

// The reference is JDK priority-queue behavior, not another copy of the keap algorithm.
private fun trace(queue: java.util.Queue<Int>, values: List<Int>): List<String> {
    val result = mutableListOf<String>()
    for (value in values) {
        val accepted = queue.offer(value)
        result.add("offer:$accepted:peek=${queue.peek()}:size=${queue.size}")
    }
    for (value in listOf(-1, 0, 1)) {
        val present = queue.contains(value)
        val removed = queue.remove(value)
        result.add("remove:$value:present=$present:removed=$removed:size=${queue.size}")
    }
    while (queue.isNotEmpty()) {
        val head = queue.peek()
        val removed = queue.poll()
        result.add("poll:peek=$head:value=$removed:size=${queue.size}")
    }
    result.add("empty:peek=${queue.peek()}:poll=${queue.poll()}:size=${queue.size}")
    return result
}

private fun drain(queue: KeapQueue<Int>): List<Int> {
    val result = mutableListOf<Int>()
    while (queue.isNotEmpty()) result.add(queue.poll() ?: error("Nonempty queue returned null"))
    return result
}

private data class Tagged(val priority: Int, val sequence: Int)

fun main() {
    val examples = mutableListOf<List<Int>>(emptyList(), listOf(0), listOf(2, 1),
        listOf(3, -1, 3, 0, -1, 2), listOf(Int.MIN_VALUE, 0, Int.MAX_VALUE),
        listOf(5, 5, 5, 5), listOf(7, -3, 4, -3, 7, 0, 1, 2))
    for (a in -2..2) for (b in -2..2) examples.add(listOf(a, b))
    for (a in -1..1) for (b in -1..1) for (c in -1..1) examples.add(listOf(a, b, c))
    val reverse = Comparator<Int> { a, b -> b.compareTo(a) }
    for (values in examples.distinct()) {
        val sorted = values.sorted()
        val descending = values.sortedWith(reverse)
        control("incremental natural queue trace", values,
            trace(java.util.PriorityQueue<Int>(), values),
            "Offer, head, size, containment, removal and polling follow java.util.Queue natural-order semantics.") {
            trace(KeapQueue<Int>(), values)
        }
        control("incremental reverse queue trace", values,
            trace(java.util.PriorityQueue<Int>(reverse), values),
            "A supplied reverse comparator determines the queue head and poll order.") {
            trace(KeapQueue<Int>(reverse), values)
        }
        control("collection queue and poll", values, sorted,
            "The collection constructor followed by polling produces natural sorted order.") {
            drain(KeapQueue(values))
        }
        control("copied queue preserves contents", values, listOf(sorted, sorted),
            "A queue copy and its source each retain their elements in priority order.") {
            val original = KeapQueue<Int>()
            values.forEach { original.offer(it) }
            val copy = original.copyOf()
            listOf(drain(original), drain(copy))
        }
        control("collection sort natural", values, sorted,
            "Sorting a collection returns every input element in natural order.") {
            values.keapSort().toList()
        }
        control("array sort reverse", values, descending,
            "Sorting an array with a comparator returns its elements in comparator order.") {
            values.toTypedArray().keapSort(reverse).toList()
        }
        control("iterable sort reverse", values, descending,
            "A sorted iterable uses the supplied comparator regardless of iterable representation.") {
            val iterable = Iterable { values.iterator() }
            iterable.keapSorted(reverse).toList()
        }
    }
    // Equal priorities carry distinct sequence IDs so stability is observable.
    val order = Comparator<Tagged> { a, b -> a.priority.compareTo(b.priority) }
    val priorityCases = listOf(listOf(1, 0, 1, 0, 1), listOf(2, 2, 2, 2),
        listOf(2, 0, 1, 2, 0, 1), listOf(3, -1, 3, -1, 3, 0, 0, 3))
    for (priorities in priorityCases) {
        val values = priorities.mapIndexed { index, priority -> Tagged(priority, index) }
        val expected = values.sortedWith(order).map { it.sequence }
        control("stable sort for equal priorities", priorities, expected,
            "Equal-comparator elements retain input order; Kotlin sortedWith is a stable independent reference.") {
            values.keapSort(order).map { it.sequence }
        }
        control("stable queue for equal priorities", priorities, expected,
            "The documented stable queue returns equal-priority elements in insertion order.") {
            val queue = KeapQueue<Tagged>(order)
            values.forEach { queue.offer(it) }
            val sequence = mutableListOf<Int>()
            while (queue.isNotEmpty()) sequence.add(queue.poll()?.sequence ?: error("Nonempty queue returned null"))
            sequence
        }
    }
    println(json(linkedMapOf(
        "schema" to "ultra-sentinel-kotlin-api-v2-independent/v1", "wholeCohortTruth" to false,
        "scopeStatus" to "NO_ORACLE_SCOPE", "observations" to emptyList<Any>(),
        "orderingObservations" to emptyList<Any>(), "unsupportedControls" to controls,
        "exceptionControls" to exceptions,
        "coverageNotes" to listOf(
            "No public source class implements Comparable with an admitted constructor; no ordering-law observations are asserted.",
            "Generic collection, comparator and structured-output controls are separate and defect-ineligible.",
            "Reference specifications: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html and https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/sorted-with.html .",
            "No full-cohort correctness or novelty conclusion is supplied."
        )
    )))
}
