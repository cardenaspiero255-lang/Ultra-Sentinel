# C2 / Nextcloud Talk Android #6945 — permiso de lectura individual

**Estado anterior a inspeccionar fuente:** NO GOLD, no predicciones, no oráculo ejecutado.

Resultado del ranking V2 (run `40143252243`): #6945 ocupa el siguiente lugar (8 puntos), por el nombre del archivo `LoggingHttpInterceptor.kt` y una **hipótesis** `POTENTIAL_PRIVATE_LOG`. El nombre no acredita una fuga.

La identidad de GitHub coincide con la preregistración histórica, incluso tras la fusión upstream del 23 de octubre: repositorio `nextcloud/talk-android`, PR #6945, creado `2026-10-23T13:08:43Z`, base `591f033cd87f44d90c430d7fa477285eb22186e0`, HEAD `705887c6795b2f7746bef47e08a5c8c2aba9c3ff`. Un solo archivo modificado: `app/src/main/java/com/nextcloud/talk/api/LoggingHttpInterceptor.kt`, blob `89901a06d04e78206ca470532e4d4ccbd8908d1f`, +4/-1. Congelado en `docs/quality/C2-NEXTCLOUD6945-SOURCE-REQUEST-20261024.json`. Antes se habían expuesto 13 PR; quedan 156 intactos.

La concesión de lectura **solo** debe originarse en una fusión de este documento por el único propietario (actor `322222186`) sobre `main`. Gate con CI completa y SHA del Core histórico `db29f94be1e0afb791a241d26f449695df0eafd0`, validación exacta de PR/archivo y atestador independiente que verifica el árbol Git upstream no truncado, artefacto de la ejecución, ambos commits y la identidad del propietario. No se descarga para ejecutar código de terceros.

Después de **4/4 jobs SUCCESS** de la ejecución protegida se permite inspeccionar el diff y ambos archivos originales/corregidos. El predicado congelado `POTENTIAL_PRIVATE_LOG` requiere que una **línea ejecutable añadida** de Kotlin Android contenga una llamada `Log.d/i/e/v/w` o `Timber.d/i/e/v/w` con una de las palabras `transcript`, `password`, `authToken` o `accessToken` en la misma sentencia según regex del Core. Hallar `Logger`, `HttpLoggingInterceptor` o un arreglo que reduzca logging no implica un positivo del detector.

Solo si hay `ruleId/path/line` auténtico se examinarán pruebas originales y, bajo aislamiento, se intentará original falla, fix pasa y benigno pasa; el oráculo independiente verifica el mismo SHA y procedencia Git antes de sellar cualquier verdad. Si no hay regla exacta o pruebas auténticas, `INCONCLUSIVE`, cero GOLD y exclusión de la reserva futura. SSS+ continúa `NOT_CERTIFIED`.
