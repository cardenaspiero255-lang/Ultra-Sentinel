# Ultra Sentinel — JARVIS original Kotlin inter-file policy case (2026-11-03)

**Status:** experimental bounded evidence only; NOT_CERTIFIED. The PR is stacked on #269 → #268. This document does **not** grant release, production repair or merge authority.

## Confirmed original source boundary

The independently retrieved **original JARVIS commit** is `f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868`. The build workflow checks both Git metadata and exact original blob SHAs:

| Kotlin source | Original Git blob |
|---|---|
| `OfflineVoiceQuestionGate.kt` | `6e7c1a644a6f4d6657f6884712f403edef825628` |
| `LocalGgufPolicy.kt` | `54b4c2fe561bf151c6ca7c7daa6c1c7c561569fb` |
| `HandsFreePreviewPolicy.kt` | `61836b0adc6f617d732c98fefb26a684b58c5f28` |

The real implementation calls `LocalGgufPolicy.validPrompt(question)` from `OfflineVoiceQuestionGate`. For `Jarvis, reinicia Termux`, the current policies permit a **text question** to pass to local GGUF despite the existing documented rule that operational device requests must not be presented as answerable device operations. This **does not execute Termux**, acquire new privileges, or prove any external action.

## Novel detector families, outside frozen Core

1. `GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP` — inter-file semantic handoff where a voice entry point uses generic `validPrompt` rather than a voice-specific read-only operation gate. Medium-confidence hypothesis only.
2. `PREVIEW_TIME_REVIVAL_AFTER_CLOCK_ROLLBACK` — `PreviewTimeGate` appears to reject one reversed-clock observation without revoking its stored start time. Low-confidence hypothesis only. No original JVM oracle for this second finding is claimed by this PR.

The detector uses bounded source bytes and exact local Git blob consistency, no execution, no changes to frozen Core/C2 and no provenance self-attestation. Semantic conclusions require original Kotlin oracles, not static matching alone.

## Original Kotlin functional oracle and controlled two-file intervention

`tests/oracles/jarvis-gguf-readonly-original.kt` independently asserts the operational input is blocked while safe explanatory queries, existing blocked operations and STOP remain correct.

The trusted CI job derives two **case-specific** candidate changes from exact original bytes:

- Gate: call the new `LocalGgufPolicy.validReadOnlyQuestion(question)` instead of its generic `validPrompt(question)`.
- Policy: add a bounded voice-specific read-only guard for imperative `reinicia` / `restablece` and chained variants; keep the existing typed-input `validPrompt` API unchanged.

It executes 2² Kotlin compiler / isolated original-JVM combinations:

| Gate patch | Policy patch | Expected outcome | Meaning |
|---|---|---|---|
| No | No | JVM RED, unsafe query admitted | Reproduces original behavior |
| Yes | No | Compile RED: absent read-only API | The selected patch depends on the second source file |
| No | Yes | JVM RED, caller still uses generic API | New policy alone is not wired into entry point |
| Yes | Yes | JVM GREEN, benign + STOP controls pass | **Both selected patches function together** |

This demonstrates a **real two-file API/behavior integration for the selected repair strategy**. It does **not** prove no alternative one-file repair exists, that the issue is exploitable, or that a general causal analyzer can solve unseen defects automatically. A compiler failure is not a functional oracle result; these results must remain distinguished.

## Supervised local application drill

`two-source-kotlin-sandbox.cjs` accepts two blob-pinned UTF-8 Kotlin changes as inert source data, creates a temporary Git repository with **no remotes**, uses the independent `repair-judge` on an exact two-file candidate commit, and runs `sandbox-rollback` to reconstruct the original Git tree. The whole temporary repository is deleted. The original JVM oracle is executed separately, before this local drill, on trusted pinned sources.

No production repository changes, source pushes, permission changes, OAuth/Ed25519 approvals, Sentry publication or Android physical test are performed.

## Explicit remaining gates

- Generalize to genuine previously unknown Kotlin defects and trusted independent runtime oracles; keep static hypotheses distinct from findings proven by execution.
- Prove multiple **semantic** modules with a true shared causal root, not simply a newly coordinated two-file API boundary.
- Authenticate repair sources and authorized execution for the **current** JARVIS/GameHub HEAD, not only a historical source commit.
- Obtain an explicit owner-authenticated GitHub approval on [JARVIS #103](https://github.com/cardenaspiero255-lang/JARVIS/pull/103), reconfirm the exact HEAD and checks, then consider a protected merge.
- Exercise production-grade interruption and rollback, monitoring and Sentry end-to-end, and final 35-capability readiness audit.

**Verdict:** bounded verified implementation evidence when the exact PR SHA has green Node and original Kotlin jobs; otherwise incomplete. No Triple S+ conclusion.
