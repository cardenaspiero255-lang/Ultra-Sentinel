# C2 — Kotlin original verificado en GameHub #132, #159 y #161

Esta campaña se ejecuta exclusivamente bajo autorización de la única cuenta propietaria. No requiere evaluador humano externo.

## Pruebas reales de comportamiento

Se descargan mediante GitHub REST los **siete archivos originales** de los tres PR, fijados por HEAD SHA y Git blob SHA-1. El validador `packages/quality-gates/c2-pinned-kotlin-sources.cjs` detiene la ejecución si cambia siquiera un byte. Los Kotlin originales (engine, policy y models) se compilan sin modificaciones; únicamente se crean stubs de los tipos Android/Compose y de dominio necesarios para enlazarlos. La lógica medida NO se reimplementa.

- **#132, HomeUiState.kt:** control benigno para carga de juegos, petición de escuchar y consumo de la petición. Este control no es una etiqueta negativa de detección del Core.
- **#159, FramePacingIntelligenceEngine.kt:129:** hipótesis `STALE_FRAME_TIMING_ACCEPTED`. Ventana lenta termina en 205000 ms; veinte muestras de frame timing de 1000–1950 ms siguen apareciendo disponibles, pese a ser anteriores por más de 200 segundos. Controles: veinte muestras rápidas recientes se aceptan; lista vacía se rechaza. Para acreditarlo se debe inspeccionar artefacto real del workflow; la compilación de prueba no da por sí sola un defecto real verificado.
- **#161, NetworkGamingDiagnosticsEngine.kt:43:** hipótesis `CROSS_TRANSPORT_LATENCY_MIX`. Una red con el mismo handle 77 cambia de Wi-Fi (3 mediciones de 400 ms) a celular (3 de 30 ms); el motor detecta el cambio de transporte pero podría reportar media de 215 ms y `POOR`, en lugar de aislar las muestras del transporte nuevo. Controles: sin transición debe conservar las seis muestras; con handle diferente debe aislar las tres últimas (30 ms). El comportamiento requiere validación de contrato antes de elevarse a defecto real definitivo.

El runner Ubuntu 24.04 incluye Kotlin CLI. La invocación no da `GITHUB_TOKEN`, Sentry ni claves a la JVM. Se instala Bubblewrap bajo la política AppArmor restringida de Ubuntu, sin bajar el sysctl, y se ejecuta el JAR en namespace sin red ni acceso al workspace de GitHub, con solo JDK y bundle de prueba montados en modo lectura. Si faltan permisos, no se substituye silenciosamente por ejecución no aislada.

## Ejecutar sin secretos

En GitHub Actions, workflow `Ultra Sentinel — C2 original Kotlin source behavioral oracles`, seleccionar manualmente `main`; alternativa del propietario: comentar exactamente `ULTRA_SENTINEL_C2_KOTLIN_ORACLES_V1` en el [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50). Sólo se aceptan actor ID 322222186, repositorio ID 1418338512 y rama main.

El resultado queda en `ultra-sentinel-c2-kotlin-original-witness`. El JSON distingue casos positivos de **un control**. Un ensayo con respuesta fabricada o una unidad de prueba NO equivale a etiquetas independientes, 120 casos, baseline equivalente ni cobertura estadística.

Toda hipótesis sin artefacto `success` permanece `UNVERIFIED`. **Triple S+ sigue NOT_CERTIFIED** hasta un corpus suficiente con pruebas negativas reales, baseline y verificaciones operativas. No se activa autorreparación ni autofusión.
