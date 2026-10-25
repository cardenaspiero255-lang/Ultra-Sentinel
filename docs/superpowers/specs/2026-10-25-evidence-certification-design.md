# Evidence-backed Triple S+ certification

## Intent

Make the existing numerical pre-screen capable of producing a truthful, reproducible
`TRIPLE_S_PLUS_CERTIFIED` decision when—and only when—it is accompanied by an
independently signed, SHA-bound evidence bundle. This preserves the project policy:
synthetic fixtures, caller flags, and a green CI run cannot self-certify Ultra Sentinel.

## Goals

- Accept only a closed, versioned certification bundle with fixed repository, engine,
  evidence, and signer identities.
- Verify Ed25519 signatures over canonical bytes from three distinct trust roles:
  truth attestor, CI attestor, and release owner.
- Match every signing key to a role-specific trust anchor supplied outside the
  evidence bundle; self-signed bundle keys are not trusted.
- Require the existing SSS+ numerical pre-screen to pass without weakening its policy.
- Fail closed on malformed input, signer reuse, stale/mismatched hashes, invalid
  signatures, or any forbidden authority flag.
- Expose a machine-readable verdict that is `NOT_CERTIFIED` until all gates pass.

## Non-goals

- It does not invent labels, call GitHub, execute untrusted PR code, alter source
  code, enable auto-merge, or authorize repair.
- It does not claim current certification in the absence of a real evidence bundle.

## Approach selected

Add a small certification verifier in `packages/certification/` that composes the
existing pre-screen. The bundle keeps raw campaign data separate from signed claims:
the verifier independently hashes canonical campaign bytes, verifies role-bound
Ed25519 signatures, then evaluates the campaign. Distinct key fingerprints stop one
key from attesting all supposedly independent gates.

Alternatives considered:

1. Flip existing flags: rejected because it would create an unsupported certification.
2. Trust caller-provided booleans: rejected because existing gates correctly classify
   these as untrusted.
3. Add an evidence-bound verifier: selected because it enables eventual certification
   while keeping missing real evidence visible as a blocker.

## Constraints

- Node built-ins only; no network or new packages.
- Preserve read-only behavior: certification never grants merge or repair authority.
- Canonical serialization must be deterministic and reject unsupported values.
- The existing 0.95 quality and critical-recall thresholds remain authoritative.

## Certification contract

`verifyTripleSPlusEvidenceBundle(bundle)` returns the certification status.
It verifies three signed attestations with non-overlapping `keyId` values:

- `TRUTH_ATTESTOR` binds the campaign digest and asserts independent, frozen labels.
- `CI_ATTESTOR` binds the campaign digest and asserts SHA-specific source CI results.
- `RELEASE_OWNER` binds the campaign digest and authorizes classification only.

Every attestation includes the same repository, candidate engine SHA, campaign digest,
and an RFC3339 issuance time. The verifier returns `TRIPLE_S_PLUS_CERTIFIED` only if
all signatures and semantic claims validate and the pre-screen passes; it still returns
`mergeAllowed:false` and `autoRepair:false`.
