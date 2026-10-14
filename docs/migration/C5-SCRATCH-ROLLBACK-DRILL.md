# C5 — Rehearsal de rollback en Git desechable

La suite `tests/unit/rollback-scratch-drill.test.cjs` crea en `os.tmpdir()` un **repositorio Git local efímero**, sin remotos, tokens, permisos de GitHub ni contacto con GameHub.

Simula una propuesta de reparación en una rama aislada, exige que una actualización con `compare-and-swap` (SHA antiguo) sea rechazada, y ejecuta `git revert`. Verifica que el árbol final sea idéntico al del commit original y que nunca se modificó `main`.

**Resultado de una prueba verde:** demuestra únicamente la integridad de este ejemplo sintético de Git local. NO demuestra un ejecutor de GitHub autorizado, separación de permisos de una GitHub App, restauración del estado de un PR real, reversión de bases de datos ni respuesta a fallos externos.

**Antes de declarar la recuperación operativa:** configurar aprobación independiente en reglas de rama, revisar el ejecutor de escritura en repositorio de pruebas, comprobar nonce de un solo uso y HEAD inmutable antes de cada write, revocar tokens con scope excesivo, ensayar recuperación ante fallos de CI y capturar evidencia de un rollback real aprobado, sin bypass administrativo.

JARVIS fuera de alcance y Codex no utilizado.
