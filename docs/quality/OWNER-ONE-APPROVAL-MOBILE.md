# Ultra Sentinel: UNA autorización por reparación aislada desde el celular

**Requisito de confianza:** la autorización no consiste en el texto del chat sino en UN comentario autenticado del propietario en GitHub, que ChatGPT puede registrar desde la conexión GitHub **si esta publica realmente con la identidad del propietario**. Si esa conexión falla o publica como un bot, el workflow se bloquea y la persona puede hacer la aprobación en GitHub. No instalar Termux; no enviar contraseñas, claves ni tokens.

## Cómo funcionará

1. El usuario describe una reparación concreta y dice «**te autorizo**» en ChatGPT. Ese mensaje autoriza al asistente a preparar el plan y utilizar la conexión GitHub según permisos.
2. El asistente prepara en `main` de Ultra Sentinel un **plan permitido** de operación aislada, con origen Git verificable, alcance exacto y política `remoteWrites:false`. El comentario de aprobación incluye SHA de workflow, SHA-256 de ese plan, nonce único y vencimiento de hasta 15 minutos.
3. La conexión GitHub registra **un único comentario** en issue #50, con la identidad real del propietario. GitHub dispara el workflow `owner-single-approval.yml`; no hay que pulsar otro botón ni crear una clave Ed25519 **para esta vía aislada**.
4. El workflow comprueba ID de usuario, ID del repositorio, primer intento, evento original, comentario no editado, marca de tiempo y coincidencia exacta con el digest del plan confiable de `main`. Obtiene un JWT OIDC firmado por GitHub y valida la firma RSA con JWKS del emisor por TLS, sin usar claves proporcionadas por PR/issue.
5. Solo después ejecuta RED/GREEN/Judge en Bubblewrap sobre Kotlin original histórico de GameHub y su parche TEMPORAL. Hace revert de la copia Git desechable y comprueba identidad byte a byte del árbol restaurado, sin remotos. Publica un recibo ligado al SHA, run ID y comment ID.

## Lo que está habilitado ahora

El plan registrado `docs/quality/owner-single-approval-gamehub-policy.json` solo permite revalidar la fuente **histórica** `AiSessionCoach.kt` del commit `9ad983576c16c6c34d59283979d83c69ede50dce`. Este es un **ensayo de una reparación real de código en entorno aislado**; no cambia GameHub instalado, sus repositorios ni su rama `main`.

El motor `runOwnerAuthorizedSandboxRepair` admite ahora la ruta alternativa `githubSingleApproval` y mantiene sin cambios las pruebas Hunter, nonce, RED, Fixer, GREEN, Judge y rollback. Su ruta anterior con firma personal Ed25519 sigue disponible. Las pruebas unitarias acreditan la equivalencia de las rutas en un repositorio temporal; no se debe atribuir al ejercicio histórico una prueba integral de la ruta estricta sobre un defecto real detectado por el Core congelado.

## Qué NO permite «te autorizo»

- El chat por sí solo no puede hacerse pasar por una firma o identidad GitHub. Debe existir el comentario autenticado de una cuenta propietaria real.
- No es una autorización perpetua ni de todos los cambios: un SHA o digest distinto exige una autorización nueva.
- No es una llave para desplegar, escribir en producción, desactivar CI/CAR-29, saltarse revisiones o fusionar PR automáticamente.
- **En la vía aislada, Ed25519 no es requerido**. Para operaciones productivas autónomas con alcance mayor, sigue pendiente auditar y habilitar un mecanismo separado de permisos de escritura. La ruta anterior de producción con Ed25519 no se desactiva silenciosamente.

## Una sola operación con el conector GitHub

Cuando el asistente conoce el SHA definitivo de `main` y el digest del plan, puede construir un comentario como:

`ULTRA_SENTINEL_OWNER_APPROVAL_V1|SANDBOX_HUNTER_FIXER_JUDGE|<SHA workflow de 40 caracteres>|<SHA256 del plan de 64 caracteres>|<nonce aleatorio>|<vencimiento Unix ms>`

No reutilizar comentarios, no copiar tokens, no introducir un SHA inventado. El comentario es público en el repositorio; contiene solo identificadores no secretos, sin código privado ni credenciales. Antes de informar éxito, revisar la ejecución y el recibo final.
