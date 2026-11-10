package androidx.datastore.preferences.core

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.ValueFlow
import kotlin.properties.ReadOnlyProperty
import kotlin.reflect.KProperty

data class PreferencesKey<T>(val name:String)
class Preferences {
    private val values = mutableMapOf<String,String>()
    operator fun get(key:PreferencesKey<String>): String? = values[key.name]
    operator fun set(key:PreferencesKey<String>, value:String) { values[key.name] = value }
    fun remove(key:PreferencesKey<String>) { values.remove(key.name) }
}
fun stringPreferencesKey(name:String):PreferencesKey<String> = PreferencesKey(name)
fun emptyPreferences():Preferences = Preferences()
fun preferencesDataStore(name:String, corruptionHandler:ReplaceFileCorruptionHandler<Preferences>):
        ReadOnlyProperty<Context,DataStore<Preferences>> =
    object:ReadOnlyProperty<Context,DataStore<Preferences>> {
        private val data = Preferences()
        override fun getValue(thisRef:Context, property:KProperty<*>):DataStore<Preferences> =
            object:DataStore<Preferences> { override val data:Flow<Preferences> = ValueFlow { this@object.data } }
    }

suspend fun DataStore<Preferences>.edit(transform:suspend (Preferences)->Unit):Preferences {
    val preferences=data.first()
    transform(preferences)
    return preferences
}
