package android.content

open class Context {
    companion object { const val MODE_PRIVATE = 0 }
    private val stores=mutableMapOf<String,SharedPreferences>()
    open val applicationContext:Context get()=this
    open fun getSharedPreferences(name:String,mode:Int):SharedPreferences=stores.getOrPut(name){SharedPreferences()}
}
class SharedPreferences {
    private val values=mutableMapOf<String,Any?>()
    fun getInt(key:String,default:Int):Int=values[key] as? Int?:default
    fun getLong(key:String,default:Long):Long=values[key] as? Long?:default
    fun getString(key:String,default:String?):String?=values[key] as? String?:default
    fun contains(key:String):Boolean=values.containsKey(key)
    fun edit():Editor=Editor(values)
    class Editor(private val values:MutableMap<String,Any?>) {
        fun putInt(key:String,v:Int):Editor{values[key]=v;return this}
        fun putLong(key:String,v:Long):Editor{values[key]=v;return this}
        fun putString(key:String,v:String?):Editor{values[key]=v;return this}
        fun remove(key:String):Editor{values.remove(key);return this}
        fun apply(){}
        fun commit():Boolean=true
    }
}
