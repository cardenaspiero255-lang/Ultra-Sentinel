// Source-bound independent contracts, committed before frozen Hunter; no detector code is imported.
package oracle
import chapter_1.binarySearch
import chapter_2.findSmallest
import chapter_3.factorial
import chapter_4.sumListUsingRecursion
import chapter_4.countListUsingRecursion
import chapter_4.maxNumberInList
import java.math.BigInteger
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
 val listOwner="chapter_4.DevideAndConquerKt"
 for(size in 0..4){
  val values=(0 until size).toList()
  val encoded="size=$size;values=0..size-1"
  for(target in listOf(-1,0,1,2,3,4,100)){
   // Exhaustive linear reference, independent of the original binary-search implementation.
   val expected=values.indexOf(target).toLong()
   observe("chapter_1.BinarySearchKt","binarySearch(java.util.List;int;)int",listOf(encoded,target.toString()),
    expected,"On an ascending unique numeric list return the matching index, or -1 when absent."){binarySearch(values,target)}
  }
  observe(listOwner,"sumListUsingRecursion(java.util.List;)int",listOf(encoded),
   values.fold(BigInteger.ZERO){a,b->a.add(BigInteger.valueOf(b.toLong()))}.longValueExact(),
   "The sum of these bounded integers equals exact independent BigInteger addition."){sumListUsingRecursion(values)}
  observe(listOwner,"countListUsingRecursion(java.util.List;)int",listOf(encoded),size.toLong(),
   "Counting a finite list equals its number of elements."){countListUsingRecursion(values)}
  if(size>0){
   observe("chapter_2.SelectionSortUsingMutableListKt","findSmallest(java.util.List;)int",listOf(encoded),0L,
    "The index of the smallest element in this strictly ascending nonempty list is zero."){findSmallest(values)}
   observe(listOwner,"maxNumberInList(java.util.List;)int",listOf(encoded),(size-1).toLong(),
    "The maximum of this bounded ascending nonempty list is its final element."){maxNumberInList(values)}
  }
 }
 var reference=BigInteger.ONE
 for(n in 1..12){
  reference=reference.multiply(BigInteger.valueOf(n.toLong()))
  observe("chapter_3.RecursionKt","factorial(int;)int",listOf(n.toString()),reference.longValueExact(),
   "For 1 through 12, factorial equals the independently computed exact product and fits Int."){factorial(n)}
 }
 finish(listOf("All six ABI-admitted numeric methods have source-bound contracts.",
  "Only exact finite numeric returns may enter the evidence join; stack/exception observations are excluded.",
  "Factorial inputs outside 1..12 are outside this finite reference scope; global truth remains unknown."))
}
