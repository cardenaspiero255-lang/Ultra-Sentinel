# Signed, durable revocation checkpoint (development)

The `ultra_sentinel_memory_quarantine` module accepts only quarantined historical claims, **never** promotes fixes. `memory-signed-checkpoint.cjs` verifies an **Ed25519** signature over the domain-separated repository identity, anchor SHA, complete local chain head and event count, and checks each revocation ID against the exact digest of the inspected ledger. `PersistentSignedRevocationStore` writes atomically to an explicitly provided, private (0700) local directory, fsyncs its file and directory, and rejects modification, nonmonotonic update, replay, missing or corrupt data.

Only a **trusted host** may provide the signer public key from separately reviewed configuration. Passing a key in the same untrusted request as the checkpoint **does not establish owner identity**. This change does not install the real owner's public key, produce an owner signature, verify a live GitHub source run, or grant writes. Tests use disposable generated Ed25519 keys.

**Remaining security limits:** a complete rollback of the host's entire local store cannot be detected without an independent, externally durable checkpoint or hardware monotonic counter. The checkpoint must be replicated to a protected append-only external authority before claiming operational anti-rollback across hosts. Neither trust-root installation nor external writes should occur on PR events. Failure to validate a checkpoint must stop the signed inspection path; it must never silently fall back to accepting unknown fixes.

This is a persistent and cryptographically *verifiable primitive*, **not** an operationally owner-authenticated memory or the completed Triple S+ MEMORY_REVOCATION release gate.
