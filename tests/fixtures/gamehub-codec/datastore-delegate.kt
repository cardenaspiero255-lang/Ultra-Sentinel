package androidx.datastore.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.preferences.core.Preferences
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.ValueFlow
import kotlin.properties.ReadOnlyProperty
import kotlin.reflect.KProperty

fun preferencesDataStore(
    name:String,
    corruptionHandler:ReplaceFileCorruptionHandler<Preferences>
):ReadOnlyProperty<Context,DataStore<Preferences>> =
    object:ReadOnlyProperty<Context,DataStore<Preferences>> {
        private val backing=Preferences()
        private val store=object:DataStore<Preferences> {
            override val data:Flow<Preferences> = ValueFlow { backing }
        }
        override fun getValue(thisRef:Context,property:KProperty<*>):DataStore<Preferences> = store
    }
