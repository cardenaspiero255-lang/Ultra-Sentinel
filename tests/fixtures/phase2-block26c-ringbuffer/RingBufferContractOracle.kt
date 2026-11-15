package oracle

import algorithms.RingBuffer
import java.util.ArrayDeque

// Independent FIFO reference model: run ONLY after the Hunter prediction seal.
fun main() {
    var passed = 0
    for (size in 1..4) {
        val original = RingBuffer.RingBuffer<Int>(size)
        val reference = ArrayDeque<Int>()
        for (value in 1..size) {
            original.enqueue(value)
            reference.addLast(value)
        }
        if (original.capacity != size || original.contents() != reference.toList()) {
            error("ORIGINAL_FIFO_ENQUEUE_CONTROL_FAILED")
        }
        passed += 2
        for (i in 0 until size) {
            val actual = original.dequeue()
            val expected = reference.removeFirst()
            if (actual != expected) error("ORIGINAL_FIFO_DEQUEUE_CONTROL_FAILED")
            passed++
        }
        if (original.capacity != 0) error("ORIGINAL_FIFO_CAPACITY_CONTROL_FAILED")
        passed++
        val underflow = runCatching { original.dequeue() }.exceptionOrNull()
        if (underflow !is RingBuffer.UnderflowException) {
            error("ORIGINAL_FIFO_EMPTY_CONTROL_FAILED")
        }
        passed++
    }

    val original = RingBuffer.RingBuffer<Int>(3)
    original.enqueue(10)
    original.enqueue(20)
    original.enqueue(30)
    original.clear()
    val afterClear = original.capacity
    val afterClearEnqueueFailure = runCatching { original.enqueue(40) }.exceptionOrNull()
    if (afterClear != 3 || afterClearEnqueueFailure !is RingBuffer.OverflowException) {
        error("ORIGINAL_CLEAR_COUNTEREXAMPLE_CHANGED")
    }

    // No Hunter prediction is available to this independent source contract.
    println("{\"schema\":\"ultra-sentinel-phase2-block26c-original-jvm-observations/v1\"," +
        "\"originalBenignControlsPassed\":" + passed + "," +
        "\"clearExpectedEmpty\":true,\"capacityAfterClear\":" + afterClear + "," +
        "\"enqueueAfterClearRejected\":true,\"originalCounterexampleObserved\":true," +
        "\"hunterConfirmedFindings\":null,\"precision\":null,\"recall\":null,\"block26Closed\":false}")
}
