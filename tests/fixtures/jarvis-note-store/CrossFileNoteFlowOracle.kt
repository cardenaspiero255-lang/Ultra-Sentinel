import android.content.Context
import com.cardenaspiero255.jarvis.PrivateConversationStore
import com.cardenaspiero255.jarvis.core.LocalDialogue
import com.cardenaspiero255.jarvis.core.PrivateKnowledgePack
import java.security.Security
import testandroid.MemoryAndroidProvider

/**
 * Original-source three-module behavior experiment, not a privacy or
 * multi-file semantic-causality certification. Uses a synthetic note.
 * The caller selects the *expected* baseline or candidate observation;
 * both must preserve ordinary history, note visibility and consent.
 */
fun main(args: Array<String>) {
    val mode = args.singleOrNull()
    require(mode == "original" || mode == "candidate") { "MODE_REQUIRED" }

    Security.addProvider(MemoryAndroidProvider())
    val marker = "SENTINEL_FLOW_79231"
    val note = "Los instrumentos de laboratorio permanecen inventariados bajo " +
        "el indicador $marker y no se sincronizan."
    val source = PrivateKnowledgePack()
    check(source.importText(note) == 1) { "NOTE_PROVIDER_IMPORT_REGRESSION" }
    check(source.search("instrumentos")?.contains(marker) == true) {
        "NOTE_PROVIDER_RETRIEVAL_REGRESSION"
    }
    println("note_source_search=PASS")

    val dialogue = LocalDialogue()
    val ordinary = dialogue.reply("hola")
    check(dialogue.importLocalNote(note) == 1) { "DIALOGUE_IMPORT_REGRESSION" }
    val visible = dialogue.reply("busca en mis notas instrumentos")
    check(visible.contains(marker) && dialogue.history().any { it.contains(marker) }) {
        "NOTE_VISIBILITY_REGRESSION"
    }
    println("note_visible_in_dialogue=PASS")
    check(dialogue.reply("repite") == visible) { "VISIBLE_REPEAT_REGRESSION" }
    println("repeat_visible_in_dialogue=PASS")

    val snapshot = dialogue.snapshotForStorage()
    val snapshotHasNote = snapshot.contains(marker)
    println("note_in_snapshot=$snapshotHasNote")

    val store = PrivateConversationStore(Context())
    check(!store.save(snapshot)) { "CONSENT_BYPASS_REGRESSION" }
    check(store.load() == null) { "DISABLED_STORE_READ_REGRESSION" }
    check(store.enableByTap()) { "CONSENT_ENABLE_REGRESSION" }
    println("opt_in_gate=PASS")
    check(store.save(snapshot)) { "STORE_WRITE_REGRESSION" }
    val restored = checkNotNull(store.load()) { "STORE_READ_REGRESSION" }
    val restoredHasNote = restored.contains(marker)
    println("note_in_encrypted_readback=$restoredHasNote")
    check(restored.contains(ordinary)) { "ORDINARY_HISTORY_REGRESSION" }
    println("ordinary_history_roundtrip=PASS")

    // Intervention: remove note ingestion but keep the query, dialogue and
    // the same opt-in store behavior. The synthetic marker must not appear.
    val withoutNote = LocalDialogue()
    val answerWithoutNote = withoutNote.reply("busca en mis notas instrumentos")
    check(!answerWithoutNote.contains(marker)) { "WITHOUT_NOTE_QUERY_REGRESSION" }
    val noNoteStore = PrivateConversationStore(Context())
    check(noNoteStore.enableByTap())
    check(noNoteStore.save(withoutNote.snapshotForStorage()))
    check(checkNotNull(noNoteStore.load()).contains(marker).not()) {
        "WITHOUT_NOTE_PERSISTENCE_REGRESSION"
    }
    println("without_note_control=PASS")

    val shouldPersist = mode == "original"
    check(snapshotHasNote == shouldPersist && restoredHasNote == shouldPersist) {
        "NOTE_FLOW_COUNTERFACTUAL_MISMATCH"
    }
    println("CROSS_FILE_NOTE_FLOW_ORACLE_PASS")
}
