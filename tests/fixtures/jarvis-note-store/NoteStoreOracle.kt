import android.content.Context
import com.cardenaspiero255.jarvis.PrivateConversationStore
import com.cardenaspiero255.jarvis.core.LocalDialogue
import java.security.Security
import testandroid.MemoryAndroidProvider

fun main() {
    Security.addProvider(MemoryAndroidProvider())
    val store = PrivateConversationStore(Context())
    check(!store.save("disabled")) { "CONSENT_GATE_REGRESSION" }
    check(store.enableByTap())
    val dialogue = LocalDialogue()
    val marker = "RUBI_CANARIO_314159"
    val ordinaryAnswer = dialogue.reply("hola")
    check(dialogue.importLocalNote("Los instrumentos de laboratorio permanecen inventariados bajo el indicador $marker y no se sincronizan.") == 1)
    val noteAnswer = dialogue.reply("busca en mis notas instrumentos")
    check(noteAnswer.contains(marker)) { "NOTE_POSITIVE_CONTROL_FAILED" }
    check(dialogue.history().any { it.contains(marker) }) { "VISIBLE_NOTE_REGRESSION" }
    check(dialogue.reply("repite") == noteAnswer) { "REPEAT_REGRESSION" }
    check(store.save(dialogue.snapshotForStorage())) { "SAVE_FAILED" }
    dialogue.forgetLocalNote()
    check(dialogue.reply("busca en mis notas instrumentos").contains("No encontré")) { "INDEX_REVOKE_FAILED" }
    store.stop()
    check(store.load() == null) { "CONSENT_STOP_REGRESSION" }
    check(store.enableByTap())
    val restoredText = checkNotNull(store.load())
    check(restoredText.contains(ordinaryAnswer)) { "BENIGN_HISTORY_REGRESSION" }
    println("consent_and_aes_gcm_controls=PASS")
    println("visible_note_and_repeat=PASS")
    println("index_revoked=PASS")
    println("note_excerpt_in_restored_encrypted_history=" + restoredText.contains(marker))
    check(!restoredText.contains(marker)) { "TEMPORARY_NOTE_EXCERPT_PERSISTED" }
    println("NOTE_STORE_ORACLE_PASS")
}
