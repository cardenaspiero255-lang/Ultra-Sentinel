package independent.holdout

import com.squareup.kotlinpoet.NameAllocator

/** Independent behavioral contract: a rejected allocation must not consume a future name. */
fun main() {
  val allocator = NameAllocator(preallocateKeywords = false)
  check(allocator.newName("first", "tag-1") == "first")
  var rejected = false
  try {
    allocator.newName("reserved", "tag-1")
  } catch (expected: IllegalArgumentException) {
    rejected = true
  }
  check(rejected) { "DUPLICATE_TAG_NOT_REJECTED" }
  check(allocator["tag-1"] == "first") { "ORIGINAL_TAG_CHANGED" }
  check(allocator.newName("reserved", "tag-2") == "reserved") {
    "FAILURE_ATOMICITY_VIOLATED"
  }
  check(allocator.newName("reserved", "tag-3") == "reserved_") { "BENIGN_COLLISION_REGRESSION" }
  val independent = allocator.copy()
  check(independent.newName("new", "tag-4") == "new") { "BENIGN_COPY_REGRESSION" }
  check("tag-4" !in allocator) { "BENIGN_COPY_ISOLATION_REGRESSION" }
  println("INDEPENDENT_NAME_ALLOCATOR_ORACLE_GREEN")
}
