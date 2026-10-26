# Hunter → Fixer → Judge — ruta estricta supervisada

**Alcance:** preparación de uso privado. La cadena autenticada es **exclusivamente local**, sin acceso a repositorios remotos desde el sandbox y sin autoridad para publicar, fusionar o desplegar. El código no demuestra funcionamiento con credenciales reales ni con un host productivo autorizado.

## Ejecutor estricto

`scripts/run-owner-sandbox-repair.cjs` usa `runOwnerAuthorizedSandboxRepair` con `requireRedGreenJudge:true`. La ruta obligatoria es:

1. Comprueba identidad del propietario contra la sesión de GitHub autenticada, firma Ed25519 de un keyring fijado fuera del JSON, SHA, branch de sandbox, límites de duración, nonce y digest del plan. Deniega sin autorización.
2. Bloquea otros procesos mediante un journal duradero fuera del worktree; no hay `git remote`, y la rama es `sandbox/*`.
3. **RED:** ejecuta en Bubblewrap (namespace sin red) el **mismo comando** de prueba que se ejecutará en GREEN. Debe terminar con código **1** y prueba fallida reconocible en salida TAP (`not ok` y `# fail N`). Timeout, error de namespace, señal, código distinto o ausencia de pruebas fallidas son rechazo. Comprueba otra vez HEAD, árbol, branch, remotes y estado limpio antes de modificar un byte.
4. **Fixer:** ejecuta el parche aprobado con comparación de blobs Git, límites de archivos/bytes, nonce consumido una sola vez y commit sin remotos.
5. **GREEN:** vuelve a ejecutar exactamente el comando RED en Bubblewrap. Debe salir con código **0**.
6. **Judge local separado:** `packages/recovery/repair-judge.cjs` vuelve a leer Git para verificar parent SHA, commit HEAD, branch, worktree limpio, cero remotos, lista exacta de archivos y SHA de blobs de origen/destino de cada archivo del plan. No utiliza veredicto del Fixer como prueba.
7. **Judge de prueba separado:** comando de pruebas adicional del propietario dentro de Bubblewrap. Veta si falla. La validación posterior vuelve a comprobar que el Judge no alteró el commit, remotos ni worktree.
8. Cualquier GREEN/JUDGE fallido activa `sandbox-rollback.cjs`, que crea un `git revert` y comprueba que el **tree SHA** restaurado coincide con el baseline. Un estado ambiguo conserva el journal y exige recuperación explícita; no se etiqueta como éxito.

## Configuración mínima del operador

El operador mantiene el archivo de solicitud y la clave pública del propietario en rutas absolutas seguras, los mecanismos de autenticación y el token GitHub fuera del proceso Bubblewrap. Además:

- `ULTRA_SENTINEL_VALIDATOR_ISOLATION=bubblewrap`
- `ULTRA_SENTINEL_VALIDATOR_ARGV_JSON`: arreglo JSON con un comando de pruebas determinista y su argumento de caso de regresión; se ejecuta **dos veces** sobre los HEAD antes/después. Ejemplo: `["node","--test","tests/regression.test.js"]` dentro del checkout desechable.
- `ULTRA_SENTINEL_JUDGE_ARGV_JSON`: comando independiente para ampliar cobertura (también protegido por Bubblewrap), **distinto** del comando RED/GREEN. Ejemplo: `["node","--test","tests/integration.test.js"]`.

No se admite `sh -c` en el contrato de comandos. Bubblewrap es obligatorio. La configuración del Judge no concede privilegios: su proceso no tiene token, red, remotos ni acceso al HOME del propietario.

## Qué se ha probado y qué no

- Las pruebas unitarias y E2E con **repositorios Git temporales**, identidades GitHub simuladas, firmas Ed25519 efímeras y errores provocados prueban el contrato, el veto y rollback local.
- Los tests de autorización existentes incluyen nonce persistente y recuperación tras SIGKILL. La CI verifica el flujo de software sobre HEAD exacto.
- **Pendiente de prueba física autenticada:** propietario real, clave pública confiable instalada, runner autorizado con Bubblewrap y un caso Kotlin/Android real que falle RED, pase GREEN y obtenga veredicto separado. También falta un recibo de ejecución SHA-bound de ese host y auditoría independiente de seguridad.

**Estado final permitido hasta entonces:** integración local con **gates implementados**, no autorreparación de producción certificada. `mergeAllowed:false`, `remoteWrites:false` y ningún cambio de visibilidad pública.
