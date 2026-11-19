// Independent contracts for the two ABI-admitted original methods; committed before Hunter.
package oracle
import br.com.luislabs.algorithms.recursion.fibonacci
import br.com.luislabs.algorithms.search.binarySearch
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


private val observations=mutableListOf<Map<String,Any?>>()
private val exceptions=mutableListOf<Map<String,Any?>>()
private fun observe(owner:String,method:String,args:List<String>,expected:Long,contract:String,call:()->Int){
 try{
  observations.add(linkedMapOf("class" to owner,"method" to method,"arguments" to args,
   "actual" to call().toString(),"expected" to expected.toString(),"contract" to contract,"defectEligible" to true))
 }catch(failure:StackOverflowError){
  exceptions.add(linkedMapOf("class" to owner,"method" to method,"arguments" to args,
   "outcome" to "NONFINITE_STACK_DOMAIN","defectEligible" to false))
 }catch(failure:Exception){
  exceptions.add(linkedMapOf("class" to owner,"method" to method,"arguments" to args,
   "outcome" to failure.javaClass.name,"defectEligible" to false))
 }
}
private fun finish(notes:List<String>){
 println(json(linkedMapOf("schema" to "ultra-sentinel-kotlin-api-v2-independent/v1",
  "wholeCohortTruth" to false,"observations" to observations,"exceptionControls" to exceptions,
  "coverageNotes" to notes)))
}


fun main(){
 // Silence the original Fibonacci diagnostic println; no output is a contract answer.
 val output=System.out
 System.setOut(java.io.PrintStream(java.io.OutputStream.nullOutputStream()))
 try{
  var previous=0L
  var current=1L
  for(n in 0..12){
   val expected=previous
   observe("br.com.luislabs.algorithms.recursion.RecursionAlgorithmKt","fibonacci(int;)int",listOf(n.toString()),expected,
    "For nonnegative bounded n, Fibonacci is defined independently by F(0)=0, F(1)=1 and iterative addition."){fibonacci(n)}
   val next=previous+current;previous=current;current=next
  }
  for(size in 2..4)for(target in 0..1){
   val values=(0 until size).toList()
   observe("br.com.luislabs.algorithms.search.SearchAlgorithmKt","binarySearch(java.util.List;int;)int",
    listOf("size=$size;values=0..size-1",target.toString()),target.toLong(),
    "The repository's original Client.kt documents returning the found value; present bounded targets equal that value."){binarySearch(values,target)}
  }
 }finally{System.setOut(output)}
 finish(listOf("Both ABI-admitted methods have bounded independent contracts.",
  "Absent binary-search targets have no documented result contract and are not executed by this oracle.",
  "Negative or exponential Fibonacci domains are excluded; no global correctness or false-negative claim."))
}
