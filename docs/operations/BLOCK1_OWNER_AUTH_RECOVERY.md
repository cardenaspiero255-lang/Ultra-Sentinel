# Bloque 1 — autorización real del propietario y recuperación segura

## Qué funciona

- Autenticación real de cuenta GitHub mediante `GET https://api.github.com/user`, fijada al nombre y al **ID inmutable 322222186**.
- Consentimiento sobre el plan concreto mediante **Ed25519** firmado fuera del runner, con separación de dominio `Ultra-Sentinel:owner-authorization:v1\n`.
- Digest SHA-256 del plan y los cambios, con rama `sandbox/*`, commit base, nonce y expiración máxima de 15 minutos.
- Registro persistente de nonces (sin reutilización), directorio privado, lock exclusivo y transacción duradera fuera del repositorio.
- Reparación ejecutable, rollback y recuperación tras `SIGKILL` **únicamente** en checkout Git desechable, aislado, sin remoto.
- Comandos explícitos con salida controlada; nunca registran tokens o claves privadas.

## Requisitos operativos (sin atajos)

El código **no convierte un PR en autorización**. El propietario debe configurar el entorno confiable antes de ejecutar reparaciones. El repositorio **no contiene** ni genera credenciales reales.

1. Crear en el dispositivo confiable del propietario un par Ed25519. Proteger la clave privada (archivo normal de permisos 0600, ruta absoluta, fuera de Git); distribuir solo la clave pública al entorno controlado que verificará firmas.
2. Inyectar temporalmente `ULTRA_SENTINEL_OWNER_GITHUB_TOKEN` desde un almacén de secretos, con el menor alcance posible para consultar la identidad GitHub. **No** guardar tokens en el repo, argumentos CLI, artefactos, logs ni archivos de PR.
3. Ejecutar `node scripts/verify-github-owner.cjs` para validar la identidad real y el ID. Ejecutar después `node scripts/verify-gamehub-readonly.cjs` para comprobar mediante GET autenticado que el repositorio GameHub es el esperado (ID de repositorio 1375408706). Esto no concede escritura.
4. Preparar un checkout **desechable**, en `os.tmpdir()`, rama `sandbox/...`, limpio, con **cero remotos**, y ejecutar los validadores en un sandbox del sistema operativo (contenedor/máquina virtual) **sin acceso a red** ni secretos.
5. Crear un directorio privado (0700) **fuera del árbol Git** sobre un volumen persistente y fijar ahí `nonceStorePath`. No poner el ledger dentro del checkout.
6. Preparar un plan `REVIEW_READY_NO_EXECUTOR` con cambios permitidos, hashes blob exactos y `planDigest=digestPlan(plan, changes)` de `packages/recovery/owner-sandbox-flow.cjs`.
7. Generar un objeto `authorization` con `ownerLogin`, `repo`, `branch`, `headSha`, `nonce`, `expiresAt` y `planDigest`. La expiración debe ser futura y no superar 900000 ms.
8. Firmar el objeto **localmente** con el propietario: `ULTRA_SENTINEL_OWNER_SIGNING_KEY_FILE=/ruta/absoluta/clave-privada.pem node scripts/sign-owner-authorization.cjs /ruta/absoluta/authorization.json`. La salida es `authorizationSignature` base64. **Nunca** ejecutar el firmador en un runner de PR.
9. Preparar un archivo JSON local cuyo contenido sea `{directory,nonceStorePath,expectedHeadSha,plan,changes,authorization,authorizationSignature}`.
10. Inyectar desde **configuración confiable del operador**:
    - `ULTRA_SENTINEL_REPAIR_REQUEST_FILE`: ruta absoluta al JSON anterior.
    - `ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE`: ruta absoluta al PEM de la clave pública registrada.
    - `ULTRA_SENTINEL_VALIDATOR_ARGV_JSON`: argv JSON de las pruebas reales, p. ej. `["npm","test"]` para un proyecto Node; el comando lo elige el operador, **nunca el PR**.
    - `ULTRA_SENTINEL_OWNER_GITHUB_TOKEN`: token efímero del propietario, inyectado como secreto (el verificador no lo recibe).
11. Ejecutar en el entorno aislado `node scripts/run-owner-sandbox-repair.cjs`. La operación fracasa de forma conservadora si falla la identidad, la firma, la validación, el estado Git o cualquier política. No realiza push ni merge.

## Recuperación tras caída

Si se interrumpe una transacción, **no** borrar a mano `.txn`, `.lock` ni el ledger. Tras confirmar que el proceso anterior está muerto:

- Configurar `ULTRA_SENTINEL_SANDBOX_DIR` y `ULTRA_SENTINEL_NONCE_LEDGER` con rutas absolutas.
- Ejecutar `node scripts/recover-owner-sandbox.cjs`.
- Se requiere la misma ruta y rama, cero remotos, un journal válido y un HEAD conocido. Si el commit o el estado no coinciden, el proceso se detiene para investigación manual.
- Un nonce consumido sigue consumido, incluso tras rollback. Una autorización nueva requiere nonce y firma nuevos.

## Límites para la certificación de producción

- Los tests automatizados comprueban adversarios, firmas, concurrencia y `SIGKILL`, pero **no** sustituyen una validación con credenciales reales autorizadas, permisos mínimos y aislamiento verificable del ejecutor.
- La API de GitHub se consulta **solo para identidad y conectividad de lectura a GameHub**. La reparación actual opera sobre un sandbox local; **no** concede poderes de escritura en GameHub Ultra ni JARVIS.
- Antes de declarar el bloque certificado, ejecutar un smoke test con token real del propietario, demostrar el aislamiento del validador con una máquina desechable y publicar evidencias de éxito/fracaso, SHA exacto y verificación independiente de los controles.
- CI verde es necesaria pero no suficiente. Mantener el PR en borrador si cualquier gate operativo sigue pendiente.

## Puente GameHub ↔ autorización firmada (#37 + #34)

`packages/recovery/gamehub-signed-preflight.cjs` reutiliza el **preflight existente** de `adapters/gamehub/ultra_sentinel_repair_authorization.cjs`; **no** crea un segundo motor de reparación ni un escritor GitHub.

Para emitir el resultado `ELIGIBLE_FOR_HUMAN_COMMIT` hacen falta **todas** estas evidencias, ligadas al mismo PR, SHA, conjunto de archivos y checks requeridos:

1. Contexto PR realmente obtenido de GitHub por un **lector confiable**, con `checkInventoryComplete` acreditado, HEAD estable, checks requeridos completos y aprobados. No aceptar un JSON inventado por el PR como evidencia.
2. `ownerApproval` firmado en el dispositivo del propietario con Ed25519 bajo el dominio `Ultra-Sentinel:gamehub-owner-consent:v1`. Su firma cubre identidad numérica GitHub, repositorio, número PR, SHA, ámbito `repair:commit-to-pr-branch`, nonce, emisión, expiración y `contextDigest` SHA-256.
3. `auditReceipt` `CLEAR` firmado con **otra clave pública confiable** bajo el dominio `Ultra-Sentinel:gamehub-audit-evidence:v1`. Esta evidencia representa una auditoría del HEAD exacto y no impone un ruleset ni una aprobación adicional en GitHub. No fabricar ni firmar `CLEAR` desde datos del PR.
4. Identidad del propietario comprobada online por API GitHub (`GET /user`), nonce único persistido y caducidad máxima de 15 minutos, con reloj del entorno confiable.
5. Se devuelve solo una **elegibilidad para commit manual**, nunca un permiso de `git push`, aprobación GitHub ni `merge`. Debe repetirse el chequeo de HEAD/checks al momento de ejecutar cualquier operación futura.

**Límites actuales:** la CI automatizada ha probado el puente con claves efímeras y respuestas API simuladas. Todavía faltan conexión real del lector confiable de checks y la infraestructura que emita el recibo de auditoría. Este documento no declara esa evidencia operativa obtenida, por lo que **PR #34 sigue en borrador**.
