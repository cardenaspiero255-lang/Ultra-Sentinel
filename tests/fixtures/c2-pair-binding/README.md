# Original source fixtures for the evidence-binding regression

Public owner repository: cardenaspiero255-lang/gamehub-ultra.
Exact Git blobs (including final LF):
- refresh-original.kt: 549e3b1d619b83e59bc37b31b4860191c25528f1
- battery-original.kt: 8696360219231f3f1477d5ad21c93bca2197e281

These fixtures exercise the actual pinned-source consumer and disposable Git
rollback. Tests deliberately use synthetic compiler/JAR/log bytes; only the
existing isolated Kotlin CI workflow supplies real JVM execution evidence.
