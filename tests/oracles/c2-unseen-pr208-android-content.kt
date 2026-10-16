package android.content
open class Context {
    val applicationContext: Context get() = this
    fun getSharedPreferences(name:String,mode:Int): SharedPreferences=SharedPreferences()
    fun stopService(intent:Intent): Boolean=true
    companion object { const val MODE_PRIVATE=0 }
}
class SharedPreferences {
    fun getBoolean(key:String,default:Boolean):Boolean=default
    fun edit(): Editor=Editor()
    class Editor {
        fun putBoolean(key:String,value:Boolean):Editor=this
        fun apply()=Unit
    }
}
class Intent(context:Context,target:Class<*>) {
    fun setAction(action:String):Intent=this
}
