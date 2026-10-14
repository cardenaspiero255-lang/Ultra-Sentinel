# C5 — Estado operacional y rollback: 2026-10-14

## Evidencia leída desde GitHub

- **Ultra-Sentinel/main**: ruleset `25100401` (`Ultra-Sentinel Main Protection`) activo, apunta al default branch, prohíbe borrado y non-fast-forward, exige PR y check `structure-and-contracts` con sincronización estricta.
- **Problema**: el ruleset declara `required_approving_review_count: 0`. No fuerza una segunda revisión humana/independiente. Antes de certificación se necesita configurar y verificar una aprobación independiente.
- **GameHub Ultra/main**: consulta REST de rulesets devolvió lista vacía; endpoint de protección clásica devolvió 403 al token disponible. El estado real de protección clásica se marca **DESCONOCIDO**, no desprotegido.
- **GameHub PR #201**, HEAD `3533a3005311833b47162f37f96bd0586c356eaf`: el modo sombra encontró 54 checks correctos, 4 omitidos y 1 fallido (`Trusted main Sentinel inspects Sentinel changes`). Bloquea aprobación.
- **C3**: existe staging no ejecutable, no un escritor autorizado; por tanto no se ha podido ejecutar rollback real, ni se debe simular que fue ensayado.
- **C4**: auditoría independiente todavía pendiente en issue #25.

## Reglas de liberación

No declarar Triple SSS, no apagar Sentinel original de GameHub ni conceder permisos de escritura hasta: resolver/justificar todos los bloqueos de PR #201, verificar protección de GameHub, exigir una aprobación independiente de Ultra, disponer de revisión externa auditada, validar un ejecutor mínimo con autorización real y realizar un ensayo de rollback recuperable.

`operational-gates.cjs` es un evaluador de evidencia **no autoritativo** que, sin sistema de firmas de auditores y rollback probados, siempre da `NOT_CERTIFIED`. Los checks CI verdes demuestran que pasan los tests actuales, no que todos esos requisitos estén resueltos.
