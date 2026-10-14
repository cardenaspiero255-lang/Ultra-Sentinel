# C4 — Auditoría adversarial: evidencia y bloqueo externo

Se añadieron pruebas propias sobre:
- `pull_request_target`, credenciales persistentes, permisos de escritura y ausencia de endpoints de mutación;
- intentos de forzar estados `VERIFIED` y ejecución automática de reparaciones;
- límites de las conclusiones de modo sombra.

**Estas pruebas NO son una auditoría independiente.** Se requieren revisores externos no autores (CodeRabbit, Qodo u otro auditor AppSec competente) que inspeccionen el diff, threat model, CI exacta y ejecuciones reales, con findings y aprobación documentados; no usar Codex.

Hallazgos abiertos antes de certificar:
1. `gamehub-ultra` PR #201 tiene un check `Trusted main Sentinel inspects Sentinel changes` fallido con bloqueos `JS_CONTEXT_INCOMPLETE`; no afirmar calidad verde.
2. La comparación entre revisores está basada en checks y nombre, sin medición de falsos negativos ni equivalencia semántica.
3. Reparaciones aún no cuentan con ejecutor, nonce persistente, aprobación independiente, ni ejercicio de rollback.
4. No se ha verificado protección efectiva de `main` de GameHub: API clásica responde 403 y no aparecen rulesets vía REST de lectura.
5. Autenticación del transporte GitHub Actions validada sobre repositorio público, pero sin pruebas de credenciales de permisos cross-repo privados.

**Resultado:** C4 externo = PENDIENTE; firma SSS = BLOQUEADA. No permitir etiquetas de certificación o merges con este documento como única evidencia.
