import org.junit.Test
fun main() {
 val type = Class.forName("com.cardenaspiero255.jarvis.core.PrivateKnowledgePackTest")
 val methods = type.declaredMethods.filter { it.getAnnotation(Test::class.java) != null }
 check(methods.size == 5)
 for (method in methods) method.invoke(type.getDeclaredConstructor().newInstance())
 println("original_test_methods_passed=" + methods.size)
}
