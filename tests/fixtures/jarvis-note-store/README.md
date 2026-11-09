# JARVIS note persistence: original-source JVM experiment

The pinned JARVIS original source retrieves a user-selected note and can pass
its excerpt to the opt-in encrypted conversation store. The UI describes notes
as memory-only. The test checks this narrower observable condition; whether the
wording permits retaining excerpts is a product-contract question.

The experiment executes the original Kotlin `PrivateKnowledgePack`,
`LocalDialogue` and `PrivateConversationStore`, with an in-memory Android API
and keystore test double and the JVM's AES/GCM implementation. It does not run
`MainActivity`, an Android emulator or a real Android keystore. The oracle uses
only a fake canary; it does not read real user notes.

The original must fail the note-persistence check. A hand-written local
candidate keeps the result visible while excluding it from the persistence
snapshot; a deliberately incorrect candidate erases the entire chat history
and must fail a benign control. Five original JARVIS test methods are run
through a small JUnit API shim, not through the official JUnit runner.

The existing Git policy Judge and exact tree rollback are then exercised in a
new disposable local clone. The functional oracle is not wired into that Judge;
Hunter did not discover this case and Fixer did not create the candidate.
The candidate and this test do not authorize any remote or production repair.
The reproduction must run only on trusted original source in an appropriately
isolated environment.
