# Ultra Sentinel · Aprobación única registrada (v2)

## Propósito

Una frase «te autorizo» en ChatGPT permite al asistente **preparar y remitir** una autorización de reparación aislada usando la conexión GitHub cuando el propietario lo solicite. El texto del chat **no se convierte en credencial ni firma**. El permiso efectivo lo establece **un único comentario autenticado de GitHub** del propietario, sobre el issue #50, con un plan SHA-256, SHA del workflow, nonce y vencimiento.

La verificación de OIDC de GitHub comprueba criptográficamente el emisor, actor ID `322222186`, repo ID `1418338512`, SHA, run ID, primer intento y el workflow fijo de `main`. Las llaves JWKS se descargan solo del emisor legítimo. Antes de actuar, se vuelve a consultar la API de **comentarios de GitHub**, incluyendo paginación completa hasta el límite de seguridad, para bloquear nonces reutilizados, comentarios editados o que no coinciden con la identidad del evento.

## Registro de planes: cómo se generaliza

`docs/quality/owner-approved-plans.json` contiene un conjunto declarativo de políticas revisadas. Una solicitud referencia solo el **digest de los bytes exactos** de un archivo registrado, nunca un programa arbitrario del comentario. `packages/recovery/registered-owner-plans.cjs` comprueba estructura, duplicados, SHA de origen y candidato, rutas Kotlin permitidas, rol del oráculo, presupuesto de un archivo de producción, límites de ámbito y prohibiciones de `remoteWrites`, `mergeAllowed` y `productionReleaseAllowed`.

**Una reparación nueva exige registrar y revisar su plan primero**, con evidencias y commit de origen/candidato. La aprobación no da facultad para ejecutar código desconocido desde el comentario. El caso anterior `gamehub-pr151` conserva su proceso histórico, y el caso nuevo `gamehub-battery-valid-range` demuestra el segundo camino.

El workflow de un solo clic/comentario solo consume SHA y repositorio de la política confiable del `main` inmutable de Ultra Sentinel, mantiene `contents: read` e `issues: read`, y jamás obtiene permisos de push, merge o release.

## Segunda reparación real, no histórica

Se seleccionó un defecto del `main` actual de GameHub Ultra:

- Origen Git: `fa720b6f367f06c5b0998f3e50de118accaefaae`.
- Archivo: `app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt`.
- Blob de origen: `8696360219231f3f1477d5ad21c93bca2197e281`.
- PR de corrección: `cardenaspiero255-lang/gamehub-ultra#245`, candidato `4314e107593b8aff1521ce27276f918a66599a6f`.
- Blob candidato: `976e3aa53ec94d14317e8caa1e6bf71088553650`.

El bug aceptaba porcentajes físicamente imposibles (p. ej. `180 %`, `-5 %`) como nivel medido y en el historial de drenaje. Las pruebas Kotlin originales fallan específicamente por ese comportamiento; la corrección rechaza las lecturas fuera de `0..100`, mantiene mediciones válidas y confirma la solución mediante Judge independiente. La comparación se realiza sobre **dos revisiones Git inmutables**, compila JVM Kotlin real y ejecuta los oráculos con Bubblewrap/AppArmor y red aislada.

`registered-candidate-rollback.cjs` toma solo los blobs de origen y candidato para un único archivo de producción, los inserta en un **repositorio Git temporal sin remotos**, registra la corrección y hace revert. El SHA del árbol y el blob restaurados deben coincidir exactamente con el origen. Nunca escribe en los directorios de checkout de origen ni en GitHub.

## Entrega segura a PR (CAR-29)

`packages/recovery/registered-pr-handoff.cjs` solo informa `PR_REVIEW_READY_NO_AUTO_MERGE` cuando la evidencia cumple simultáneamente:

- PR abierto, no borrador, mergeable, base `main` sin desplazamiento y head SHA idéntico al plan;
- exactamente el archivo Kotlin autorizado y su test de regresión, con Git blob nuevo coincidente;
- checks requeridos `build`, `quality`, `android-test-shards`, `device-validation`, `coverage`, `quality-contracts`, `SonarCloud Code Analysis` completados y `success` sobre el mismo SHA;
- sin fallos ni cancelaciones en otros checks del mismo commit.

Ese recibo **no es una aprobación de PR**, no suplanta revisiones protegidas ni contiene un token de escritura; las reglas del repositorio y CAR-29 siguen siendo el gate decisivo. Una ejecución con fallos, evidencia parcial, desfase de SHA o cambios no autorizados permanece bloqueada.

## Límites de certificación

La generalización se limita a **planes declarativos revisados** y oráculos explícitamente compatibles. El Core congelado permanece sin cambios. La prueba del bug de batería no crea una etiqueta GOLD ciega ni demuestra tasa universal de detección. El workflow tiene autoridad solo para un experimento aislado y preparar evidencia; no puede publicar APK, fusionar cambios, desplegar aplicaciones o certificar automáticamente reparaciones en producción.

La vía previa con firma Ed25519 sigue disponible de manera independiente; la aprobación única reemplaza el doble paso solo en el recorrido aislado descrito. No solicitar claves privadas ni compartir contraseñas en el chat o comentarios públicos.
