# Aprobar pruebas de Ultra Sentinel desde Android, sin Termux

**Disponible solo después de fusionar el workflow a `main`.**

## Iniciar un ensayo aislado con un clic

1. Abre GitHub desde el navegador de tu teléfono e inicia sesión en la cuenta propietaria `cardenaspiero255-lang`.
2. Entra a `https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/workflows/owner-one-click-sandbox.yml`.
3. Selecciona **Run workflow** y deja la rama **main**. Confirma con el segundo **Run workflow**.
4. Abre la nueva ejecución. Debe terminar verde; el artefacto `owner-one-click-sandbox-evidence` incluye el SHA y el ID exacto de esa ejecución. La retención es de 14 días.
5. Si no aparece el botón desde la app Android, usa el navegador web en modo escritorio; no requieres Termux, comandos, tokens manuales ni claves Ed25519 para este *ensayo*.

## Permisos y controles implementados

El único desencadenante es `workflow_dispatch`; no acepta PR, comentarios o entrada de terceros como autorización. El workflow se limita al **ID de repositorio 1418338512**, al actor GitHub **322222186** y a la rama `main`, sin reejecuciones del mismo run. Recupera de la API autenticada de GitHub el run actual y exige misma identidad, repositorio, workflow, SHA, ID de ejecución, primer intento y una antigüedad máxima de 15 minutos. La comprobación nunca obtiene ni almacena la contraseña del propietario.

Las pruebas ejecutan el **código confiable de un SHA inmutable de Ultra Sentinel**; usan repositorios Git temporales y un ensayo Bubblewrap con AppArmor para verificar aislamiento de red, archivos ajenos y credenciales. El workflow tiene únicamente `contents: read` y `actions: read`, deshabilita las credenciales persistidas, y no incluye comandos para fusionar, desplegar o escribir en los repositorios.

Cada ejecución nueva constituye una autorización distinta para la **operación fija** `READ_ONLY_ISOLATION_AND_ROLLBACK_FIXTURE`. El aprobador no proporciona parches arbitrarios ni puede ampliar permisos desde GitHub Actions.

## Límite de seguridad importante

**Esta aprobación GitHub NO equivale a firmar un plan de reparación de producción con Ed25519.** No sustituye `scripts/sign-owner-authorization.cjs` ni elimina firma, nonce, validación de Hunter, RED/GREEN, Judge y rollback de `scripts/run-owner-sandbox-repair.cjs`. El recibo exige `productionOwnerSignatureVerified:false`, `realProductionRepairVerified:false`, `automaticRepairEnabled:false`, `remoteWrites:false`, `mergeAllowed:false` y `privateEditionCertified:false`.

Para habilitar *futuras reparaciones supervisadas* exclusivamente desde GitHub, la infraestructura deberá incorporar una **segunda autorización de identidad fuerte** —por ejemplo, un entorno de GitHub protegido y un servicio de firma ligado al SHA y digest que nunca exponga la clave privada—, auditada de forma independiente antes de sustituir el firmante local. Esa capacidad **no** se activa en este workflow.

Si cualquiera de las comprobaciones falla, el job falla sin dar por certificada la prueba. La aprobación caduca: inicia una ejecución nueva en lugar de repetir una caducada.
