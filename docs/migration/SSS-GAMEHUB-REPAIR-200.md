# Migración de GameHub #200 — Preflight de reparación

Este módulo está en `adapters/gamehub`, **no** en Core ni en la autoridad propietaria. Conserva la allowlist estricta de archivos Android del GameHub real (`cardenaspiero255-lang/gamehub-ultra`) y una verificación externa de identidad/nonce/revisión independiente. El preflight es una comprobación **advisory** y no concede permisos de escritura, fusión ni ejecución.

Origen: `gamehub-ultra#200`, SHA `3533a3005311833b47162f37f96bd0586c356eaf`. Migrado sin importar dependencias de GitHub Actions, tokens, Supabase o ejecución.

**Pendiente para modo de reparación real:** revisión e integración con el PR independiente de identidad y nonces (#34), autenticación real de identidad GitHub, antireplay duradero bajo concurrencia, compare-and-swap de HEAD, revisión humana al momento de escribir, análisis de diff y rollback. El callback `verifyAuthorization` pasado por un llamador **no** es por sí mismo una prueba de autenticidad y nunca debe usarse como autorización definitiva de un writer.

TDD: `tests/unit/gamehub-repair-preflight.test.cjs`. Codex excluido. Ningún workflow privilegiado o escritor se crea aquí.
