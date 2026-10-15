# C2 — oráculo reproducible del propietario (sin humanos externos)

Este primer ensayo comprueba un comportamiento del código original e inmutable de GameHub Ultra #73. No se requiere otro revisor humano. No se modifica GameHub ni su PR.

## Identidad del caso

- GameHub #73, HEAD: 194908b7dfa9d882afbc4d7eeaa3781b3e84e9e8
- Archivo: supabase/functions/ultra-research/research.ts
- Git blob SHA-1: b54e76f263b818597186530f31e44e1060d7f49d
- Regla experimental: REFERENCE_TOPIC_MISMATCH (línea 779).
- Pregunta: «Ultra, ¿por qué el cielo es azul?».
- Control pertinente: artículo que explica la dispersión de Rayleigh, aceptado.
- Control de descarte: artículo sobre alfarería, sin relación, rechazado.
- Caso adversarial: álbum musical «Cielo azul» comparte ambas palabras, pero no explica la dispersión; debe rechazarse. Si es marcado trustedReference, se reproduce la aceptación de una fuente temáticamente equivocada.

La ejecución obtiene el archivo original por GitHub API, verifica el Git blob SHA1 y ejecuta ese TypeScript con Node 22, sin permisos de red, escritura ni procesos secundarios y sin token de GitHub en el entorno de ejecución. La respuesta Wikipedia se simula con un fetcher determinista; el artefacto solamente incluye resultados mínimos, no fuente, credenciales ni respuestas.

## Cómo ejecutar

Workflow: Ultra Sentinel — C2 owner-only pinned source oracle, disparo manual en main por propietario. Alternativamente, comentario exacto ULTRA_SENTINEL_C2_ORACLE_V1 en el issue #50 de Ultra Sentinel, desde la cuenta propietaria.

Inspeccionar los logs y el artefacto ultra-sentinel-c2-owner-pinned-witness. Una ejecución roja no constituye evidencia positiva.

## Alcance de la prueba

Si se reproduce, es **un único defecto de comportamiento del código original en entorno controlado**, sin supuesto de humano externo. Este caso conocido de antemano no debe convertirse en muestra desconocida ni usarse como verdad ciega sobre el desempeño universal del revisor.

No demuestra precisión, recall o F1 de Ultra Sentinel: faltan un corpus real representativo con negativos y positivos, el baseline al mismo SHA, y la evaluación de los otros tres PR. Tampoco valida autorización/rollback de producción, Sentry con credenciales privadas o continuidad temporal del cron.

Triple S+ permanece NOT_CERTIFIED hasta que cada requisito tenga prueba técnica real. 
