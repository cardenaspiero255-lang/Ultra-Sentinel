// Source-only precommitted independent oracle: never provided to frozen Hunter.
// Uses an elementary index scan on distinct sorted inputs, not the target implementation.
import algos.arrays.BinarySearch

private fun record(method: String, target: Int, actual: Int, expected: Int): String =
    """{"class":"algos.arrays.BinarySearch","method":"${method}([Ljava.lang.Integer;;int;)int","arguments":["10,20,30,40,50","$target"],"actual":"$actual","expected":"$expected","contract":"unique sorted-array search must return the matching index or -1","defectEligible":true}"""

fun main() {
    val values = arrayOf(10, 20, 30, 40, 50)
    val samples = listOf(10, 20, 40, 50, 5, 35)
    val records = mutableListOf<String>()
    val subject = BinarySearch()
    for (target in samples) {
        val expected = values.indexOf(target)
        records.add(record("search", target, subject.search(values.copyOf(), target), expected))
        records.add(record("searchIterative", target, subject.searchIterative(values.copyOf(), target), expected))
    }
    println("""{"schema":"ultra-sentinel-kotlin-api-v2-independent/v1","wholeCohortTruth":false,"observations":[${records.joinToString(",")}] }""")
}
