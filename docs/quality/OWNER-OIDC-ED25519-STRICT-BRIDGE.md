# Puente estricto GitHub OIDC + firma personal Ed25519

**Estado del componente:** implementado en `packages/recovery/owner-oidc-ed25519-bridge.cjs`; adaptador de operador `scripts/run-owner-oidc-ed25519-sandbox.cjs`. Esto **no constituye certificación de uso productivo** sin ejecutar el puente con una firma REAL de la persona propietaria y su host autorizado.

## Qué significa el doble control

1. En un workflow fijo `workflow_dispatch` de la rama `main`, el operador obtiene un JWT OIDC efímero del emisor autenticado de GitHub (audiencia `urn:ultra-sentinel:gamehub-pr151:sandbox`). La clave pública del emisor se recupera en vivo de `https://token.actions.githubusercontent.com/.well-known/jwks`, con TLS y sin aceptar un `jku` introducido por el JWT. Los reclamos verifican actor (ID 322222186), repo (ID 1418338512), SHA, run ID, workflow y primer intento.
2. **Además**, exige la identidad del propietario comprobada por una sesión `/user` de GitHub, la **firma Ed25519 personal de un plan exacto** `{repo,branch,headSha,nonce,expiresAt,planDigest}` y la clave pública **fijada por el operador** desde una ruta segura externa al checkout. La clave privada **no se genera ni se lee en GitHub Actions**.
3. El motor ya existente `runOwnerAuthorizedSandboxRepair` repite autentificación personal, cálculo de digest del plan, autorización Ed25519, origen Hunter recomputado, nonce persistido, orden `RED→Fixer→GREEN→Judge`, validación del commit y rollback ante veto. El puente impone `requireRedGreenJudge:true` y `requireHunterEvidence:true` incluso cuando un solicitante intenta apagarlos.
4. No se concede `git push`, `merge`, escritura remota, bypass de una regla congelada o invocación sobre la rama `main` de GameHub Ultra/JARVIS. El directorio de reparación debe ser temporal, sin remotos, en `sandbox/*`. RED/GREEN y Judge ejecutan procesos sin red en Bubblewrap.

## Bloqueos deliberados

- **OIDC no es la firma personal del usuario.** GitHub firma *la identidad del workflow*, no el contenido de un plan de reparación aprobado en el celular. No debe sustituir el Ed25519 del propietario.
- **No se permite fabricar una llave Ed25519 en CI y llamarla firma del propietario.** Las pruebas con pares efímeros demuestran solo el contrato del software.
- El workflow `gamehub-pr151-owner-e2e.yml` permite el ensayo aislado y el adaptador de doble factor exige exclusivamente `workflow_dispatch` (los comentarios GitHub no autorizan reparaciones firmadas). No se ha añadido ningún paso que intente ejecutar una reparación de producción sin la clave, el plan y la identidad del propietario.
- El defecto térmico histórico `AiSessionCoach.kt` de PR #151 tiene un detector *experimental* aislado, no forma parte de las reglas congeladas del Core. No debe afirmarse que ya cruzó el Hunter original firmado y ejecutor estricto en una transacción única.
- La cuenta GitHub conectada de la automatización NO reemplaza un token de sesión personal válido para el endpoint `/user` del motor original. Un token efímero `GITHUB_TOKEN` de workflow puede no representar al usuario en dicho endpoint.
- No se publican claves privadas, JWT, credenciales, JSON de autorización ni secretos en artifacts ni en el repositorio público.

## Qué falta para certificado final

- [ ] Establecer una **clave pública Ed25519 personal** en la configuración de confianza del host, sin subir la privada al repositorio ni entregarla a un agente.
- [ ] Obtener la **firma personal** de un plan concreto, con su SHA Git y nonce **en una operación real**; la firma debe verificarse contra esa clave pública, no contra un par generado por tests.
- [ ] Ejecución OIDC real + sesión real del propietario + plan firmado real en el **mismo host Bubblewrap**, con recibo que correlacione todos los pasos y su rollback, no simples resultados de dos workflows independientes.
- [ ] Validación de una prueba RED y Judge independientes sobre una fuente real compatible con una regla Hunter congelada, o autorización de revisión del conjunto de reglas. No ampliar el conjunto congelado a escondidas.
- [ ] Auditoría de seguridad final; ninguna promesa de autocorrección y despliegue autónomos.

**Para uso privado del propietario, las 111 etiquetas GOLD adicionales NO son un requisito de estas comprobaciones de integridad técnica.** No se deben fabricar métricas de precisión sin referencia independiente.

## Uso del adaptador

`scripts/run-owner-oidc-ed25519-sandbox.cjs` es una opción **para el operador** y actualmente no puede completarse sin el material firmado. Solo acepta una ejecución autenticada de `workflow_dispatch` del workflow de prueba de GameHub de la rama `main`; requiere `ULTRA_SENTINEL_OWNER_GITHUB_TOKEN` de una sesión personal autenticable, `ULTRA_SENTINEL_REPAIR_REQUEST_FILE` con solicitud firmada, `ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE` confiable, `ULTRA_SENTINEL_VALIDATOR_ISOLATION=bubblewrap`, comandos `ULTRA_SENTINEL_VALIDATOR_ARGV_JSON` y `ULTRA_SENTINEL_JUDGE_ARGV_JSON` diferentes, y el host Linux controlado. El archivo de solicitud y el ancla de confianza se leen solo desde rutas absolutas seguras, sin seguir symlinks.

**En ausencia de estos requisitos debe bloquearse**: `DUAL_OWNER_SIGNED_SANDBOX_BLOCKED`. No instalar Termux es compatible con el ensayo OIDC previo, pero no elimina la necesidad de una ceremonia personal de firma para la *certificación de producción* bajo el contrato actual.
