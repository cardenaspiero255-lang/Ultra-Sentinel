package com.cardenaspiero255.gamehubultra.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.ValueFlow
import java.util.Base64
import java.nio.charset.StandardCharsets
import kotlin.coroutines.Continuation
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import kotlin.system.exitProcess

private fun <T> immediate(block:suspend ()->T):T {
    var completed:Result<T>? = null
    block.startCoroutine(object:Continuation<T>{
        override val context:CoroutineContext = EmptyCoroutineContext
        override fun resumeWith(result:Result<T>) { completed=result }
    })
    return checkNotNull(completed).getOrThrow()
}
private fun load(record:String):List<GameSessionRecord> {
    val prefs=Preferences()
    prefs[stringPreferencesKey("sessions_v1")]=record
    val store=object:DataStore<Preferences> { override val data:Flow<Preferences> = ValueFlow { prefs } }
    return immediate { GameSessionStore(store).sessionsFlow().first() }
}
private fun encode(s:String):String = Base64.getEncoder().encodeToString(s.toByteArray(StandardCharsets.UTF_8))
private fun persisted(idField:String):String = listOf(
    idField,encode("com.demo"),encode("balanced"),encode("100"),
    encode(""),encode(""),encode(""),encode(""),encode("")
).joinToString("|")

fun main() {
    val valid=load(persisted(encode("valid-id")))
    if(valid.size!=1||valid[0].id!="valid-id"||valid[0].packageName!="com.demo") {
        System.err.println("BENIGN_SESSION_LOST")
        exitProcess(3)
    }
    println("BENIGN_CODEC_PASS")
    // 0xC3 0x28 is invalid UTF-8. Java's String(bytes, UTF_8) silently
    // substitutes U+FFFD, silently changing persisted identity fields.
    val malformed=Base64.getEncoder().encodeToString(byteArrayOf(0xC3.toByte(),0x28))
    if(load(persisted(malformed)).isNotEmpty()) {
        System.err.println("LOSSY_UTF8_RECORD_ACCEPTED")
        exitProcess(2)
    }
    println("CODEC_INTEGRITY_ORACLE_PASS")
}
