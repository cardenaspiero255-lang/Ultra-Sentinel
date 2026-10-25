# Evidence-backed Triple S+ Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fail-closed, signed evidence gate that can truthfully certify Ultra Sentinel only after real evidence exists.

**Architecture:** A new pure Node module canonicalizes an evidence bundle, verifies distinct Ed25519 role attestations, and delegates quality measurement to the existing SSS+ pre-screen. It never contacts a network or grants write privileges.

**Tech Stack:** Node.js 22 built-in `crypto`, `node:test`, existing CommonJS quality gates.

**Spec:** `docs/superpowers/specs/2026-10-25-evidence-certification-design.md`

## Global Constraints

- No external dependency, network call, merge permission, or repair permission.
- Existing SSS+ policy thresholds and critical-rule checks are unchanged.
- All malformed or unauthenticated evidence fails closed.
- Certification requires three cryptographically distinct roles and independent real labels.

## Review Focus

- Canonicalization differences must invalidate a signature rather than produce ambiguity.
- One signing key must not impersonate multiple evidence roles.
- A correct signature over a different engine SHA or campaign digest must block.
- Numerical success without valid evidence must remain `NOT_CERTIFIED`.
- Certified quality must not accidentally authorize merge or repair.

---

### Task 1: Signed certification verifier

**Files:**
- Create: `packages/certification/sssplus-evidence-certification.cjs`
- Test: `tests/unit/sssplus-evidence-certification.test.cjs`

**Interfaces:**
- Consumes: `assessSssPlusPreScreen(campaign)` from `packages/quality-gates/sssplus-pre-screen.cjs`
- Produces: `verifyTripleSPlusEvidenceBundle(bundle) -> CertificationResult`

- [x] **Step 1: Write the failing tests**

Test a fully signed, numerically passing campaign producing `TRIPLE_S_PLUS_CERTIFIED`, then test signer reuse, tampered campaign bytes, mismatched engine SHA, and a valid numeric campaign without authenticated evidence. Assert `mergeAllowed:false` and `autoRepair:false` in every result.

- [x] **Step 2: Run the test to verify RED**

Run: `node --test tests/unit/sssplus-evidence-certification.test.cjs`
Expected: FAIL because the verifier module does not exist.

- [x] **Step 3: Implement `verifyTripleSPlusEvidenceBundle(bundle, { trustedAttestors })`**

Use bounded closed-object validation, stable canonical JSON, SHA-256 campaign binding, Node Ed25519 signature verification, role/key distinctness, and the existing pre-screen. Return a blocked result rather than throwing for invalid evidence.

- [x] **Step 4: Run targeted and full verification**

Run: `node --test tests/unit/sssplus-evidence-certification.test.cjs && npm run check`
Expected: targeted tests and complete suite pass.

### Task 2: Document certification invocation

**Files:**
- Modify: `docs/quality/SSSPLUS-RELEASE-GATES.md`

**Interfaces:**
- Consumes: verified bundle format from Task 1
- Produces: concise instructions distinguishing a future evidence-backed certification from the current status

- [x] **Step 1: Document inputs and limits**

Specify the three roles, distinct key requirement, campaign and engine-SHA binding, and that the repository is currently not certified without an authentic bundle.

- [x] **Step 2: Run full verification**

Run: `npm run check`
Expected: 0 failures.

## Self-review

- Evidence verification is a separate boundary from metrics; no caller booleans are trusted.
- Every listed failure mode has a behavioral test in Task 1.
- The plan does not redefine quality thresholds or add write powers.
