# Live registered PR handoff — GitHub read-only integration

Scope: only `cardenaspiero255-lang/gamehub-ultra`, a trusted-main registered
`BatteryAwareGamingEngine.kt` repair plan, and **review-only** handoff.
No GitHub mutation, repair execution, merge, release, or rollout.

## Input and trust boundary

The caller MUST load its plan using `loadRegisteredPlan(root, digest)` from the
reviewed registry in the trusted `main` checkout; never construct the plan
from PR content, a comment, workflow_dispatch text, or an external URL.
The user of this adapter supplies a read-only GitHub token and an integer
PR number to `assessLiveRegisteredRepairPr({plan,prNumber,token})`.
It uses only bounded fixed-origin `GET` requests:

1. Read the PR and pin exact origin/candidate commit SHA, repository and base.
2. Read exactly the two expected modified PR files and their Git blob hashes.
3. Enumerate **all** latest current-head check runs via bounded pagination,
   reject incomplete pages, inconsistent totals, duplicates or unknown data.
4. Re-read the PR and reject a changed HEAD/base, mergeability, or update time.
5. Invoke the existing `assessRegisteredRepairPr` gate; handoff only if all
   required checks succeed, no blocking checks remain, and CAR-29 is preserved.

The adapter catches network or validation errors and returns only
`LIVE_HANDOFF_EVIDENCE_BLOCKED` on failure. It never exposes token contents.

## What the evidence does NOT demonstrate

- A mock GitHub API in the local tests validates network contracts but **not**
  a live successful PR handoff.
- GitHub's public PR #245 used for the registered battery plan is already
  **closed**. The correct live decision is a block, not review-ready.
- This is a read-only review handoff, not a recovery E2E in an authorized
  physical host and not a substitute for reviews or branch protection.
- The token requires GitHub permission to read PRs and checks on the target
  repository; if GitHub denies permissions, this flow must block.
- Additional legacy commit-status contexts, changed post-read checks, upstream
  review/ruleset requirements and actual patch approval remain separate
  terminal release decisions. Never wire this result directly to auto-merge.

## Reproducible CI evidence

- RED: run `40428753701` on `7da008fdf0b764013e1486fb83ccca0f436aae8c`
  failed because the live adapter did not yet exist.
- GREEN: run `40428882874` on `0e0d3f3b99aa336cea5803e19658933148d1bc7a`
  completed `npm run check` with 1127 passing tests, 0 failures, no omitted
  tests in the Node test runner.

Production authorization is **not** implied by a successful mocked integration
or green CI. Preserve `remoteWrites:false` and `autoMergeAllowed:false`.
