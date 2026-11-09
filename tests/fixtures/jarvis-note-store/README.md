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

The original must fail the note-persistence check. A narrow pinned-source
candidate generator now transforms the exact original Kotlin blob and keeps the
result visible while excluding it from the persistence snapshot. It replaces
the hand-applied patch during the JVM experiment, but **does not** demonstrate
an autonomously discovered defect or a generalized Fixer. The prior manual
patch remains as a research reference. A deliberately incorrect candidate
erases the entire chat history and must fail a benign control. Five original JARVIS test methods are run
through a small JUnit API shim, not through the official JUnit runner.

The isolated runner now performs a **bounded advisory Hunter scan** across
all eligible original Kotlin core files (not only a named suspect file). It
recognizes a lexical note-result-to-history-snapshot path. This is a
low-confidence source-to-sink hypothesis, not a compiler-resolved path,
independent causal discovery, or confirmation of the privacy contract.

The same local runner invokes the original, generated candidate and deliberately
incorrect candidate JVM oracles itself; a fail-closed three-outcome decision is
combined with the existing Git policy Judge and exact tree rollback before
emitting a joint local verdict. Unlike earlier versions, the functional oracle
is now integrated at the **runner level**, not as an authenticated general Judge
API. The independent historical evidence, any production authorization and
application deployment remain entirely outside this local result.
The candidate and this test do not authorize any remote or production repair.
The reproduction must run only on trusted original source in an appropriately
isolated environment.
