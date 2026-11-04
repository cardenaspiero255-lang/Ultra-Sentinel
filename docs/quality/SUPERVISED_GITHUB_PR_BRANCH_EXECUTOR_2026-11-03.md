# Ultra Sentinel — explicitly signed GitHub PR-branch candidate executor (2026-11-03)

## Scope and verified real-world provenance

The first two owner-supervised *JARVIS* source repairs are already independently merged in GitHub:

| Original JARVIS PR | Signed-owner-comment-gated PR head | GitHub squash commit now in JARVIS main |
| --- | --- | --- |
| [#103](https://github.com/cardenaspiero255-lang/JARVIS/pull/103) | `7e9de82db5a3bdae5489f153a32f8f33938ecb30` | `4fe9ac2d31ee3414423860e4b20a76986d161ff0` |
| [#104](https://github.com/cardenaspiero255-lang/JARVIS/pull/104) | `6fed04fc13fa2b5900c449ead20d3a4dfacc982e` | `747c14b5d97750a7b2736968e2d516f02448558d` |

JARVIS `main` was independently checked at `747c14b5d97750a7b2736968e2d516f02448558d`. These were **human-owner-authorized GitHub connector operations, not executions by this new module**. The historical #103 and #104 owner comments do NOT sign or authorize any future source changes. Proof of merge does not certify a new change or any device hardware measurement.

The source-authentic original Kotlin/JVM 2×2 matrix and independent local Judge/rollback are documented in Ultra Sentinel [draft #270](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/270). The present [draft #271](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/271) is stacked upon #270 (which itself depends on #269 and #268). No automatic protected-main merge is part of this sequence.

## New *bounded* production-facing branch adapter

`packages/recovery/supervised-github-branch-commit.cjs` adds `runSupervisedGitHubBranchCommit`. It operates only on an **already-existing draft PR owned by the same authenticated GitHub owner** in `cardenaspiero255-lang/JARVIS`, on a dedicated `fix/ultra-sentinel-...` branch and exactly **two** existing, regular Kotlin source blobs under `apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/`.

The trusted runtime must provide the following, *not from issue/PR text*:

1. An owner-authenticated GitHub token, verified live using `GET /user` against login **and immutable numeric user ID**.
2. A separate Ed25519 signature (public key pinned outside caller payload) over the canonical per-operation grant. The grant includes exact repository, operation `COMMIT_TO_EXISTING_DRAFT_PR_BRANCH`, PR number, named branch, expected target and protected `main` HEADs, SHA-256 candidate plan digest, fresh nonce and expiration within 15 minutes.
3. A *trusted original Kotlin/JVM oracle runner* function which actually executes independent original-source RED, candidate GREEN and benign controls in an isolated runtime. A JSON result supplied by a PR author is **not** a trusted oracle.
4. Exact owner-signed UTF-8 Kotlin before/after bytes and their Git blob IDs. The live GitHub PR/head/base, commit tree, regular-file modes and original blob IDs are all fetched afresh, checked for no tree truncation and bound to the same plan.
5. Independent local two-source `judgeLocalRepair` and `rollbackSandbox`, both re-executed through `drillTwoSourceKotlinSandbox` on the actual candidate bytes. The local baseline tree must be restored exactly.
6. A persistent private `PersistentNonceStore` outside the checkout; on `apply=true`, its nonce is consumed **before** creating any remote Git object.

The default `apply=false` performs a read-only preflight and returns `OWNER_AUTHENTICATED_DRAFT_PR_READY`; no nonce is consumed and no remote write occurs.

On a separately approved `apply=true`, the sole writer creates **unattached** Git blobs/tree/commit through GitHub's Git API; checks the draft PR and `main` again, checks the target ref again and then uses a single **non-forced fast-forward** `PATCH /git/refs/heads/fix/ultra-sentinel-...`. A post-write ref read must confirm the new commit. The module contains no endpoints for protected-main pushes, PR creation, merge, branch deletion or permissions changes.

If an API call fails after a ref update, the actual remote state may be uncertain. It must **not** be described as safely rolled back without independent inspection. The local exact rollback is a pre-write exercise; a **real remote rollback** would need its own owner authorization and evidence.

## Security review P1/P2 regression closure — 2026-11-04

The latest supervised-executor security review identified two race conditions in the first candidate, both reproduced as failing tests before modification:

- **P1, signed nonce reference:** when a caller mutated `ownerGrant.nonce` while the asynchronous GitHub identity lookup was running, the old executor consumed the caller's replacement nonce instead of the nonce included in the Ed25519-signed plan. The revised executor validates and freezes a canonical copy of the signed grant **before its first `await`**, and independently freezes the plan and both Kotlin file records. It consumes only the verified nonce snapshot.
- **P2, stale expiration:** a grant could expire while the independently executed JVM oracle or GitHub requests were running, but the old executor checked expiry only at invocation. The revised executor checks the **real system clock**, with monotonic-per-invocation validation, before consuming a nonce, before creating every remote Git object and immediately before attempting the non-forced Git ref update. The clock is **not a caller-supplied callback**. Time simulation exists only in isolated unit tests.

The RED regression suite checks a mutated signed grant and expiration (a) during the original Kotlin/JVM callback and (b) after creating Git objects but before publishing the branch ref. The GREEN workflow must also execute the same original Kotlin JVM RED→GREEN, benign controls, independent Judge and local Git rollback. An expired grant can leave detached Git objects if the failure happens partway through GitHub requests; it must **never** be treated as a successful ref write or proof of remote rollback.

**None of these changes authorizes a real remote write, publication to protected `main`, or bypass of the owner's exact-SHA PR fusion authorization.** The owner must separately authorize the current final HEAD after security review and CI.

## Security and rollout status

- Unit tests exercise a simulated GitHub service and real disposable local Git Judge/rollback, invalid signing keys and grants, stale main/ref/tree, symlinks and truncated tree, bad oracle, nonce replay, non-fast-forward refusal, and PR/main races. **A passing mock of GitHub is not a real GitHub write.**
- There is **no GitHub Actions entrypoint with `contents:write`** associated with this adapter. No token, private Ed25519 key, auto-merge, or secret is added to source. No production invocation is attempted by this PR.
- The `verifyOriginalJVM` callback is a trusted-operator injection boundary intended for a protected main-only runner, *not* a self-attested field, user message or untrusted PR script. Before a production execution, a runner must connect an isolated original JVM harness to that callback and prove it is bound to the new plan and live source SHA.
- The signed grant above is **different** from the sandbox-only `owner-authorization.cjs` schema and different from a plain GitHub PR merge comment; neither earlier grant authorizes this operation.
- JARVIS/Android physical certification, arbitrary defect autonomy, source policies outside the narrow Kotlin allowlist, automatic release, generic self-healing and remote rollback are **not proven**. No Triple S+ completion or external certification is claimed.

The code is an independently testable, explicitly signed **remote branch commit primitive**. It is not a deployed autonomous production agent. A human-originated authorization bound to a new candidate and a trusted protected original Kotlin oracle are prerequisites to exercising any write.
