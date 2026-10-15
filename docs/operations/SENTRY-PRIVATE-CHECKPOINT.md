# Estado privado Sentry — cifrado preparado, no desplegado

El monitor **público** de GitHub Actions jamás debe llevar IDs de errores privados, correo, stacktraces, tokens, mensajes de usuarios ni breadcrumbs al artefacto público `ultra-sentinel-github-only-state-v1`.

Este bloque incorpora `packages/operations/sentry-sealed-checkpoint.cjs` como primitiva **offline** reutilizable para un futuro monitor privado de Sentry:

- Cifrado autenticado **AES-256-GCM**, nonce aleatorio de 96 bits por escritura y tag de 128 bits.
- Clave simétrica externa de **32 bytes**, suministrada en base64url canónico por un secret manager; nunca en Git, JSON ni outputs de CI.
- AAD fijo con identidad del repositorio Ultra Sentinel (`1418338512`) y rama `main`, para no reutilizar accidentalmente un artefacto en otro contexto.
- Validación estricta del schema antes de cifrar: solo fingerprints Sentry de 24 hex, números de PR, SHAs y eventos minimizados. Rechaza campos extra, emails, stacktraces, mensajes y texto fuente **aunque vayan cifrados**.
- `openSentryCheckpoint` rechaza cambios de ciphertext, tag, nonce, algoritmo, clave u origen, sin revelar el plaintext.
- Sin filesystem, red, claves generadas automáticamente ni escritura GitHub dentro de la librería; pruebas tamper/replay, clave débil y privacidad.

**Estado real:** la API Sentry read-only ya está implementada en `adapters/sentry/sentry-readonly.cjs`. Este formato criptográfico está probado solo con datos sintéticos; **no se ha creado ni activado un workflow Sentry privado** y no se conocen token, proyecto, consentimiento ni clave real. Configurar secretos de Actions y elegir retención/consentimiento debe preceder a cualquier ejecución privada. No copiar credenciales en issues, comentarios, PR, chats ni logs.

La recuperación depende de conservar la clave fuera de GitHub y planificar rotación. No permite auto-reparación, push ni autofusión.


## Smoke E2E opt-in de Sentry (sin publicar datos privados)

Workflow `.github/workflows/sentry-optin-private-smoke.yml`: **solo** `workflow_dispatch` en `main`, autorizado por el ID numérico GitHub del propietario `322222186` y una casilla de confirmación de conectividad. No acepta PR, issue comments, cron ni comandos externos. Usa checkout confiable sin credenciales persistentes y `permissions: contents: read`.

Configurar **fuera del repositorio** en GitHub → Settings → Secrets and variables → Actions:

- **Variables:** `ULTRA_SENTINEL_SENTRY_ORG` (slug de organización Sentry) y `ULTRA_SENTINEL_SENTRY_PROJECT_ID` (ID numérico).
- **Secrets:** `ULTRA_SENTINEL_SENTRY_READ_TOKEN` (token Sentry con scope solo lectura `event:read` o `project:read` según autorización efectiva de API) y `ULTRA_SENTINEL_SENTRY_CHECKPOINT_KEY` (clave aleatoria de 32 bytes en base64url sin relleno, generada por el propietario en entorno privado).

Desde la pestaña Actions, elegir el workflow privado y marcar `approve_private_probe=true`. Hace un único GET a la API Sentry existente, valida metadatos minimizados y cifra/descifra un checkpoint derivado en memoria mediante la librería AES-256-GCM. **No imprime** IDs de incidencias, mensajes, usuarios, stacktraces ni tokens, ni genera artefactos. Si el servidor rechaza el token, no filtra el cuerpo de la respuesta.

El éxito solo acreditará **lectura API y roundtrip criptográfico para esa ejecución**. No significa que se hayan instalado las claves aquí, tampoco que exista monitoreo Sentry 24/7, retención privada, entrega de alertas, recuperación de un estado cifrado entre runners o consentimiento automático. Esas etapas continúan bloqueadas hasta pruebas reales con configuración del propietario. No subir credenciales a issues, PRs ni mensajes.
