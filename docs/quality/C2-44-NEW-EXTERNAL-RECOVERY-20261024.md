# C2-44 · Second owner metadata-only collection after fail-closed run

**Recovery authorization applies ONLY to GitHub changed-file metadata. No source, patch, titles, bodies, predictions, external code execution, labels or oracles are authorized.**

The first protected-main scan [Actions #40152453096](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40152453096) authenticated the owner and passed offline TDD, but the four-worker 44-PR ranking aggregation exited with `C2_44_NEW_EXTERNAL_BLOCKED`. Independent metadata attestation did not run and no valid report was published. The original frozen PR manifest Git blob is unchanged: `a51c679023a792ba4fce54731d13970946a18678`; original cohort 169 + 44 separate newly frozen identities remains intact.

GitHub file metadata may contain unsupported paths or field values. The recovery adds a **per-candidate metadata gate** that validates filename grammar, 40-hex blob SHA, status enumeration, unique paths, change counters and addition/deletion arithmetic *before* passing paths to V3. Incompatibility is recorded as `INCOMPLETE`, with no raw patch saved, no rank, no source read and no automated authorization for that PR. Existing frozen rules/weights and SHA identity contracts are unchanged.

This owner-only reauthorization is introduced in a new protected-main merge with this exact document added and updated worker. A separate independent Actions job still verifies the owner actor ID 322222186, run commit and artifact digest and 44 frozen identities. Previously failed run #40152453096 must not count as a completed scan.

**Fail-closed non-goals:** never silently advance base/head, edit the initial 44 preseal, fabricate 111 GOLD, or treat incomplete paths as benign. Only a completed 4/4 success and artifact may be used to choose a next external candidate for *separate* one-PR source authorization.
