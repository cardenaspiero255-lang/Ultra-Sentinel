package org.tasks.notifications

import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

// Compiled alongside unmodified Tasks.org source from Git HEAD 3936c221.
// ABI stubs are explicit, source is never copied into this repository.
fun main() {
    val caller = Thread.currentThread()
    val worker = Executors.newSingleThreadExecutor { task ->
        Thread(task, "tasks-original-worker").apply { isDaemon = true }
    }
    val started = CountDownLatch(1)
    val release = CountDownLatch(1)
    val finished = CountDownLatch(1)
    val secondFinished = CountDownLatch(1)
    val firstWorker = AtomicReference<Thread>()
    val secondWorker = AtomicReference<Thread>()
    val allComplete = AtomicBoolean(false)
    val original = Throttle(
        ratePerPeriod = 1, periodMillis = 350,
        tag = "C2-GENUINE-WORKER", executor = worker
    )
    val then = System.nanoTime()
    original.run {
        firstWorker.set(Thread.currentThread())
        started.countDown()
        check(release.await(4, TimeUnit.SECONDS))
        finished.countDown()
    }
    val returnedBefore = finished.count == 1L &&
        (System.nanoTime() - then) < 2_000_000_000L
    check(started.await(4, TimeUnit.SECONDS))
    release.countDown()
    check(finished.await(4, TimeUnit.SECONDS))

    // Second real original invocation uses its DEFAULT Thread.sleep(it)
    // within the same injected newSingleThreadExecutor worker.
    val secondStart = System.nanoTime()
    original.run {
        secondWorker.set(Thread.currentThread())
        secondFinished.countDown()
    }
    check(secondFinished.await(5, TimeUnit.SECONDS))
    val elapsed = (System.nanoTime() - secondStart) / 1_000_000L
    allComplete.set(true)
    worker.shutdownNow()

    // Controlled counterfactual, NOT a purported upstream fix: exactly the
    // same immutable original Throttle.kt is used, but callback executor
    // intentionally executes inline on the calling thread. This distinguishes
    // default background-worker behavior from the real blocking risk of
    // replacing a worker with a direct executor.
    val controlledCaller = Thread.currentThread()
    val controlledInlineExecuted = AtomicBoolean(false)
    val direct = Throttle(
        ratePerPeriod = 1, periodMillis = 350,
        tag = "C2-CONTROL-INLINE", executor = Executor { it.run() }
    )
    direct.run { controlledInlineExecuted.set(Thread.currentThread() === controlledCaller) }
    val inlineSynchronous = controlledInlineExecuted.get()
    check(inlineSynchronous)
    check(returnedBefore && firstWorker.get() !== caller &&
      secondWorker.get() !== caller && firstWorker.get() === secondWorker.get() &&
      elapsed >= 100L && elapsed <= 3000L)
    println("{\"schema\":\"c2-tasks-throttle-external-jvm/v1\"," +
      "\"productionSourceExecuted\":true," +
      "\"executorThreadIsNotCaller\":true," +
      "\"callerReturnedBeforeWorkerCompletion\":$returnedBefore," +
      "\"secondCallbackOnExecutorThread\":true," +
      "\"defaultSleeperElapsedMillis\":$elapsed," +
      "\"allTasksComplete\":${allComplete.get()}," +
      "\"abiStubsForAndroidAndCoroutine\":true," +
      "\"counterfactualSameOriginalProductionSource\":true," +
      "\"counterfactualExecutedOnCaller\":${controlledInlineExecuted.get()}," +
      "\"counterfactualCompletedSynchronously\":$inlineSynchronous," +
      "\"independentOriginalTruth\":false}")
}
