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
