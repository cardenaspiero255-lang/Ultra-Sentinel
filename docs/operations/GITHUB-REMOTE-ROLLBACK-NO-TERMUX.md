# JARVIS #105: rollback remoto con aprobación GitHub sin Termux

Este flujo es **independiente** de la aprobación para reparar. Requiere un comentario NUEVO, una comprobación OIDC GitHub con una audiencia diferente, un nonce NUEVO y el commit remoto de reparación ya existente. No necesita que el propietario genere manualmente una firma Ed25519. La vía Ed25519 original sigue disponible.

## Condiciones previas

1. La reparación remota de JARVIS #105 debe haberse ejecutado con autorización específica y verificación RED → GREEN/Judge; todavía no hay evidencia de que haya ocurrido.
2. JARVIS #105 debe seguir abierto **en borrador**, con `main` en `747c14b5d97750a7b2736968e2d516f02448558d`; la rama ha de apuntar a un único commit reparador descendiente directo de `a88a29ba4119d3f68b2268367f594a0ac1168f9e`.
3. Las únicas diferencias respecto del árbol original deben ser los dos blobs Kotlin exactos de `OfflineVoiceQuestionGate.kt` y `LocalGgufPolicy.kt`. El verificador carga los árboles y rechaza cualquier diferencia adicional.
4. El SHA real del commit reparador, su SHA de árbol y el digest de `digestRollbackPlan` deben calcularse desde GitHub y desde el código revisado. **No copiar valores de ejemplos ni inventarlos antes del commit.**

## Autorización móvil GitHub/OIDC

Usar el issue de control [Ultra Sentinel #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50) desde la cuenta real del propietario. El texto exacto debe ser:

```text
ULTRA_SENTINEL_REMOTE_ROLLBACK_V1|ROLLBACK_EXISTING_DRAFT_PR_BRANCH|<SHA_ACTUAL_DE_MAIN_ULTRA_SENTINEL>|<DIGEST_SHA256_DEL_PLAN_DE_ROLLBACK>|<SHA_REAL_DEL_COMMIT_REPARADOR>|<NONCE_ALEATORIO_NUEVO>|<VENCIMIENTO_UNIX_MS>
```

El nonce debe ser criptográficamente aleatorio (base64url de 32 bytes, por ejemplo) y distinto de cualquier nonce usado anteriormente en aprobaciones sandbox, reparación o rollback. La autorización caduca como máximo a los 15 minutos. No compartir un token o clave en el comentario. La frase «te autorizo» en ChatGPT no sustituye este comentario autenticado.

El workflow `.github/workflows/owner-remote-jarvis-rollback.yml` comprueba el comentario, propietario/IDs inmutables, OIDC RS256 y JWKS de GitHub, workflow SHA, nonce global, SHA original/reparador y todos los blobs de los dos árboles. Primero genera **solo un recibo sin escritura**.

## Activación por fases y barreras

Las escrituras están **deshabilitadas por defecto**. El workflow usa `permissions: contents: read`; nunca concede permisos de escritura al `GITHUB_TOKEN` de Ultra Sentinel. El propietario controla estas opciones en Settings → Secrets and variables → Actions de Ultra Sentinel:

- Secreto `ULTRA_SENTINEL_JARVIS_OWNER_TOKEN`: credencial GitHub de duración limitada del propietario, restringida a JARVIS con solo los permisos necesarios para leer refs/PR y escribir contenido en la rama de ensayo. Nunca publicar el secreto ni guardarlo en artefactos, PR o chat.
- Variable `ULTRA_SENTINEL_GITHUB_REMOTE_ROLLBACK_ENABLED=true`: habilita el preflight adicional con el ejecutor supervisado y sin cambios remotos.
- Variable `ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY=false`: **mantener así** hasta validar un preflight real, verificar las protecciones y aprobar expresamente el experimento de recuperación.
- Variable `ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY_CONFIRMED=true` SOLO cuando el propietario quiera la ejecución concreta. El nonce y el comentario ya deben ser válidos, y el PR no debe haber cambiado.

El ejecutor vuelve a emitir y validar un JWT OIDC en el mismo workflow, reconsulta el comentario al menos antes del primer cambio remoto y justo antes de publicarlo. Consume el nonce en un ledger local y utiliza un commit atómico GitHub GraphQL con `expectedHeadOid`, sin force-push, sin tocar `main` y sin fusionar el PR. Comprueba después que el nuevo commit tenga como padre el commit reparador y que su SHA de árbol sea exactamente el original.

**Una ejecución CI simulada no demuestra recuperación real.** Solo se considerará terminado `HOST_ROLLBACK_E2E` cuando se observe una reparación realmente autorizada y un commit de restauración independiente en JARVIS, con CI de los SHA correspondientes y el `main` intacto.

## Seguridad y fallos

- PR cerrado o ya listo para merge, Git tree truncado, referencias movidas, blob alterado, otra modificación o firma OIDC inválida: **bloqueo**.
- Comentario editado/eliminado o nonce repetido: **bloqueo**.
- Timeout, resultado GraphQL ambiguo o respuesta perdida: **estado incierto**, nunca afirmar rollback logrado sin releer refs y commit.
- No exponer la clave privada Ed25519 por esta vía. La vía clásica de rollback firmada permanece protegida.
- Las aprobaciones de reparación y de rollback son **dos decisiones humanas distintas**.
