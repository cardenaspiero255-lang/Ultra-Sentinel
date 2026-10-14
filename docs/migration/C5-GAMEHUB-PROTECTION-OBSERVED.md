# C5 — Evidencia actualizada de protección de GameHub Ultra/main

Lectura de GitHub REST `GET /repos/cardenaspiero255-lang/gamehub-ultra/branches/main` del 14 de octubre de 2026:

- `protected: true`; `protection.enabled: true`.
- `protection.required_status_checks.enforcement_level: everyone`.
- Checks obligatorios declarados: **`build`**, **`coverage`**, **`Ultra Sentinel Core — own reviewer`**, **`read-only-review`**.
- HEAD de `main`: `1060ce8b9f35d191ce8639337e4cff50085cbd7e`.

Esta evidencia **sustituye y corrige parcialmente** la nota anterior de C5 que calificó la protección de GameHub como desconocida. El endpoint más detallado `GET /branches/main/protection` todavía devuelve 403 con el conector conectado; por tanto no se ha comprobado el número de revisores independientes ni todo el reglamento clásico. La falta de rulesets REST de repositorio no implica ausencia de protección: coexisten protecciones clásicas.

El módulo `gamehub-branch-evidence.cjs` examina esa clase de metadatos sin otorgar autorización de fusión ni certificación. Sigue faltando auditoría externa de C4, ensayo real de rollback supervisado y medición semántica independiente de C2. No retirar controles originales ni automezclar.

La protección de `Ultra-Sentinel/main` se rige por ruleset activo `25100401` que exige PR, `structure-and-contracts` y bloqueo a non-fast-forward, pero actualmente no exige **ninguna aprobación** (`required_approving_review_count:0`): issue [#30](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/30) para intervención del propietario.
