@file:JvmName("NamedFacade")
package sample.admission
// Development-only ABI controls. Neither body is needed by metadata admission.
fun scalar(n: Int): Int = n
fun listCount(items: List<Int>): Int = items.size
fun boxedCount(items: Array<Double>): Int = items.size
object Singleton { fun value(n: Double): Double = n }
class DefaultOwner { companion object { fun value(n: Int): Int = n } }
class NamedOwner { companion object Factory { fun value(n: Int): Int = n } }
