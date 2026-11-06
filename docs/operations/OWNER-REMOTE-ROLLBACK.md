# Ultra Sentinel — rollback remoto firmado de PR JARVIS

**Alcance:** restaurar un único commit de reparación supervisada de dos archivos Kotlin en una rama PR existente. No autoriza despliegue ni merge.

## Contrato inmutable

El ejecutor de reparación devuelve rollbackPlan y rollbackPlanDigest únicamente tras confirmar su commit remoto. El plan vincula repositorio JARVIS, PR existente en borrador, rama permitida, SHA de main, HEAD y árbol original, HEAD y árbol reparado, exactamente dos rutas Kotlin y sus blob SHA inicial y final.

El ejecutor de rollback obtiene desde GitHub el PR, main, HEAD, parentesco de commits y los dos árboles Git recursivos completos (no truncados). Deniega modificaciones fuera de esos dos archivos, modos alterados, firmas inválidas y árboles o SHA divergentes. Los SHA de carpetas ancestras pueden cambiar legítimamente por las dos modificaciones aprobadas.

Para restaurar, recupera los dos blobs originales y verifica sus hashes Git y tamaños. `createCommitOnBranch` recibe sus contenidos y `expectedHeadOid` igual al SHA reparado; GitHub compara el HEAD al crear el nuevo commit hijo. Volver directamente al SHA anterior mediante reset remoto está prohibido. Verifica después el HEAD remoto, el árbol original y el padre del nuevo commit antes de anunciar éxito. El mismo mecanismo de comparación se usa al publicar la reparación.

La comparación atómica solo cubre el HEAD de la rama. Las lecturas del PR y de `main` antes y después de la mutación no son una transacción conjunta: si cambian durante la operación, esta puede haber escrito y se informa un resultado incierto; no se afirma que se haya impedido la escritura. La API no protege frente a una secuencia ABA en la que el HEAD cambia y vuelve al mismo SHA antes de la mutación.

## Autorización única del propietario

La firma original de reparación NO sirve para rollback. Se necesita una firma Ed25519 distinta, bajo el dominio Ultra-Sentinel:github-pr-branch-rollback:v1 (con salto de línea final). El permiso debe contener ownerLogin, ownerId=322222186, repo, prNumber, branch, headSha=repairHeadSha, baseSha=expectedMainSha, planDigest calculado sobre rollbackPlan, nonce nuevo aleatorio base64url de 20-96 caracteres, expiresAt en los próximos 15 minutos y operation=ROLLBACK_EXISTING_DRAFT_PR_BRANCH.

El orden de rutas usa comparación ordinal ASCII y las propiedades del plan se serializan en orden fijo. Una firma anterior calculada con la ordenación dependiente del locale o con otro orden de propiedades puede no verificarse: preparar y firmar nuevamente el plan exacto; nunca reutilizar el nonce anterior.

Mantener la clave privada en el dispositivo confiable del propietario, nunca en GitHub ni en CI. La clave pública se configura separadamente. Los nonces se guardan en un ledger privado persistente fuera del repositorio; un nonce consumido nunca se reutiliza.

## Ejecución en host confiable

1. Revisar el resultado del ejecutor de reparación y crear un JSON local con dos propiedades: plan (rollbackPlan) y ownerGrant (el nuevo permiso exacto). Confirmar las dos rutas Kotlin, los SHA y el digest.
2. Firmar offline en el equipo del propietario: configurar ULTRA_SENTINEL_OWNER_SIGNING_KEY_FILE con la ruta absoluta de la clave Ed25519 privada; ejecutar node scripts/sign-supervised-github-rollback.cjs /ruta/absoluta/rollback-intent.json. Guardar la firma base64 devuelta como ownerSignature en un JSON local que contenga plan, ownerGrant y ownerSignature.
3. En el equipo operador confiable, establecer ULTRA_SENTINEL_ROLLBACK_REQUEST_FILE (JSON firmado), ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE (clave pública Ed25519), ULTRA_SENTINEL_ROLLBACK_NONCE_LEDGER (ledger privado y persistente): todas como rutas absolutas. La carpeta que contiene el JSON y la clave pública no puede ser modificable por grupo ni otros.
4. Entregar temporalmente ULTRA_SENTINEL_OWNER_GITHUB_TOKEN mediante un gestor de secretos, con permisos mínimos necesarios de lectura de PR/metadatos y escritura de contenidos únicamente en JARVIS. Nunca subir token, firma privada, stacktraces o claves a PR, artifacts ni logs.
5. Ejecutar node scripts/run-supervised-github-rollback.cjs sin definir ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY. Esto verifica el plan y los blobs originales, no consume ni consulta el ledger de nonces y no realiza escrituras. El resultado READY es parcial: el ledger, la autorización y el estado remoto se comprueban nuevamente al aplicar.
6. Con nueva confirmación del propietario, establecer ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY=true y repetir el comando. La operación debe informar OWNER_APPROVED_REMOTE_ROLLBACK_VERIFIED y SHA de restauración, sin modificar main ni hacer merge.

Las herramientas de ejecución deniegan GITHUB_ACTIONS=true: un PR o workflow no obtiene permiso de escritura por el mero hecho de estar verde.

## Incertidumbre y recuperación

- Si cambian el PR, main, SHA, árbol, firma o expiración, abortar. No hacer force push ni auto-merge.
- Si GitHub pierde la respuesta de la mutación o devuelve un error, el resultado es INCIERTO. Inspeccionar de manera independiente la referencia remota, padre y árbol del commit antes de atribuir éxito; no reintentar ciegamente ni reutilizar un nonce.
- Ante corrupción del ledger, detener nuevas escrituras y preservar los registros para recuperación supervisada.
- La restauración añade un nuevo commit, por lo que el commit defectuoso seguirá en el historial, deliberadamente. Las pruebas de CI y los controles de fusión del nuevo SHA siguen siendo obligatorios.

## Evidencia

La suite Node utiliza respuestas simuladas de la API GitHub para comprobar firmas, replay, expiración, carreras, árboles completos, modos, reversión por commit y fallos de red. Esto NO demuestra aún un rollback remoto real con firma propia en un PR de ensayo. Hasta completar ese E2E debe declararse LIVE_REMOTE_ROLLBACK_NOT_VERIFIED. Ninguna aprobación anterior de PR o conversación sustituye esa firma.
