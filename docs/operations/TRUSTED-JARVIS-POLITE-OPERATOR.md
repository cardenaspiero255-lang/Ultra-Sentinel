# Trusted JARVIS #105 owner-host operator

**Status: experimental; no remote repair or rollback has been executed.** Run only a reviewed, CI-verified version of this code from protected `main` on an owner-controlled, hardened Linux workstation. NEVER run privileged code from an unreviewed PR checkout.

## Scope and evidence

The entrypoint `scripts/run-owner-jarvis-polite-repair.cjs` binds draft [JARVIS #105](https://github.com/cardenaspiero255-lang/JARVIS/pull/105), exact main/head/tree SHA, two original Kotlin blobs, two candidate blobs, a pinned independent Kotlin oracle and an adversarial oracle. It recompiles the actual source and candidate for all four 2×2 intervention variants in Bubblewrap, then delegates to the existing signed GitHub executor, which also runs the local Judge and exact rollback drill. It never creates PRs, merges, deploys, or directly modifies protected main.

## Prerequisites

- Trusted Linux host, Node >=22, Bash, Git, JDK, Kotlin compiler, `bwrap`; `kernel.apparmor_restrict_unprivileged_userns=1`.
- User-owned private directories; request JSON, Ed25519 public-key PEM and nonce ledger with mode 0600 where applicable. The private signing key stays on the owner signing device.
- Short-lived, owner-authenticated GitHub token with least privilege over JARVIS. Never store it in GitHub, CI, logs or PR comments.
- Operator code checked out at a reviewed SHA, and independently revalidated JARVIS refs. A changed branch/HEAD invalidates this fixed trial.

Use the offline owner signer `scripts/sign-supervised-github-repair.cjs` to sign an exact plan with a unique nonce and expiry within 15 minutes. Make a compact UTF-8 JSON without trailing newline containing exactly `plan`, `files`, `ownerGrant` and `ownerSignature`. The signed grant is valid only for `COMMIT_TO_EXISTING_DRAFT_PR_BRANCH`, not for rollback.

## Runtime environment

Set `ULTRA_SENTINEL_REPAIR_REQUEST_FILE` (absolute signed JSON), `ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE` (absolute pinned PEM), `ULTRA_SENTINEL_REPAIR_NONCE_LEDGER` (absolute private ledger), `ULTRA_SENTINEL_OWNER_GITHUB_TOKEN` (secret) and `JARVIS_KOTLIN_HOME` (absolute trusted compiler root).

Default: `node scripts/run-owner-jarvis-polite-repair.cjs` performs **read-only signed preflight**, fresh original Kotlin/JVM RED→GREEN, benign/adversarial controls, Judge, PR/main SHA checks; it reports `OWNER_POLITE_SIGNED_PREFLIGHT_READY_NO_REMOTE_WRITE` only on full success. It does not consume the nonce and the verdict can become stale.

**Separately approved publication:** supply a new local protected output path `ULTRA_SENTINEL_REPAIR_RESULT_FILE`, set `ULTRA_SENTINEL_REMOTE_REPAIR_APPLY=true`, and run again while the exact signed grant is still valid. Only if every gate passes does the existing executor perform an atomic expected-HEAD branch commit and save the exact rollback plan. If transport or disk I/O fails after a write, investigate the live GitHub HEAD; do not assume failure means no commit.

The resulting remote rollback requires a **different** fresh Ed25519 grant and nonce with `scripts/run-supervised-github-rollback.cjs`, according to [OWNER-REMOTE-ROLLBACK.md](OWNER-REMOTE-ROLLBACK.md). Never force-push or merge the rehearsal. A successful local or CI mock is **not** proof of a real remote recovery.

This operator does not run on Android Termux alone: a compatible isolated Linux execution host is required. It deliberately refuses invocation inside GitHub Actions and cannot sign on the operator host by itself.
