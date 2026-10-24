# C2: ActivityWatch/aw-android PR #315 — authentic upstream scoped Kotlin source witness

**Status: DRAFT / DEVELOPMENT_ONLY / NOT_GOLD / NOT_CERTIFIED.**

## Why this original PR

Source: https://github.com/ActivityWatch/aw-android/pull/315, opened 2 October 2026, before the prospective C2 cutoff. Known and inspected **development** source; therefore excluded from all blind evaluation, historical 9 labels, 169 frozen metadata-only PRs, and the target 111 additional GOLD labels.

- Original upstream PR base: `3cd8a388d21dcdd7bc7e686a75a7b3046d876f11`
- Fixed upstream PR HEAD: `5a44cecef81c62d1527c49fecd00f90bd18db9df`
- Actual RustInterface.kt blobs: base `410c7a2d9c6d5698c3ed623b3c0d46ee01620081`, fixed `9474712a3953c78118f0d33633afb247bae31770`
- Original upstream test file (only on fixed PR HEAD): `mobile/src/test/java/net/activitywatch/android/ServerPortProbeTest.kt` Git blob `842324ca38c8a1f3253c464eca41dcfdd05d382e`

## Source-oriented experimental boundary

The extractor checks known Git blobs, retains the **verbatim upstream production `startServerTask()` method** from both revisions and, for the fix, the original `PortProbe` enum/helper. Only an auditable trusted JVM ABI wrapper (Logger, BuildConfig, Handler, Looper, dummy native method) replaces Android/JNI build dependencies; no detector Core, baseline or speculative patch is imported.

The denial witness uses **Java 21 SecurityManager `SecurityException`** to exercise the original method's unhandled exception path and fixed method's caught path. It is distinct from a GrapheneOS device throwing `SocketException(EACCES)`. The upstream fixed `ServerPortProbeTest.kt` JUnit suite explicitly injects `SocketException`, `SecurityException`, `BindException`, a benign `Closeable` and a real bound socket. Both original and fixed source-scoped methods must also pass the independent benign bind-conflict control.

The original upstream test did not exist at the pinned base; its absence **must not** be misrepresented as a passing original JUnit upstream suite. Runtime tests are inside networkless Bubblewrap/AppArmor; compilation and project checkout occur on a trusted disposable runner **outside** the Bubblewrap JVM, so this is **not** full untrusted Gradle/Android build isolation.

The independent job authenticates GitHub Actions run/actor/head/artifact metadata, the live upstream PR identity/head/base against the pinned tuples and byte hashes of sanitized receipt logs. It cannot independently prove complete Android behavior, genuine GrapheneOS permission semantics, independent root-cause families, or ZIP-byte ownership signatures beyond GitHub artifact metadata.

No upstream source or compiled JARs are uploaded. All reports must maintain `newGoldLabels=0`, `truthSealed=false`, `holdoutFrozen=false`, `tripleSPlusCertified=false`.

## Success gate

Do not mark this PR ready or merged unless the exact HEAD has GREEN architecture tests, original/fixed/benign real source-scoped JVM execution, authentic fixed upstream 5 JUnit tests and separate receipt authentication. If the PR base pointer drifts before attestation, return inconclusive and investigate historical association rather than silently replacing original commits. No inference of C2 blind benchmark numbers is permitted.

Follow-on to obtain a valid prospective GOLD requires **distinct** post-cutoff held-out PR plus authentic upstream test original/fix/benign, verified runtime under a sealed project adapter, lineage independence, separate truth adjudication, then frozen detector/baseline scoring.
