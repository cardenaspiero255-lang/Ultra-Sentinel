package independent.holdout

import com.example.android.architecture.blueprints.todoapp.data.Task
import com.example.android.architecture.blueprints.todoapp.statistics.getActiveAndCompletedStats

/** Independent negative control from the app's existing add/edit validation contract. */
fun main() {
  val full = Task(id="1", title="write", description="details")
  val noTitle = Task(id="2", title="", description="details")
  val noDescription = Task(id="3", title="write", description="")
  val empty = Task(id="4")
  check(!full.isEmpty) { "VALID_TASK_REJECTED" }
  check(noTitle.isEmpty && noDescription.isEmpty && empty.isEmpty) { "INVALID_TASK_ACCEPTED" }
  val result = getActiveAndCompletedStats(listOf(full, noTitle.copy(isCompleted=true)))
  check(result.activeTasksPercent==50f && result.completedTasksPercent==50f) { "STATS_REGRESSION" }
  println("INDEPENDENT_TASK_NEGATIVE_ORACLE_GREEN")
}
