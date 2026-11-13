# Ultra Sentinel — Fase 2, Bloque 2.5b: tercera cohorte y oráculos sellados

**Objetivo:** precomprometer los oráculos independientes del conjunto original reservado en el PR #388, sin ejecutar todavía Hunter ni los oráculos. Esta entrega finaliza la *preparación* del Bloque 2.5; no demuestra descubrimiento de un defecto nuevo.

La versión v3 de Hunter permanece congelada en `49235f854c61c29d55a0307ce4a0348553b2ee1f` (árbol `411a9f24a07a57d21e918c022d1ec8442456537a`), mientras que las versiones previas conservan sus commits originales. La cohorte externa procede de `Kotlin/kotlinx-datetime@77c95cc8125015f83ea8fd900404c295fba7276e`, con árbol raíz `110430b9981a688a703a7b8026a4f33bc5fee8ce`. El alcance `core/common/src/internal` tiene seis blobs Kotlin directos, elegidos **solo con metadatos Git** y comprometidos primero en el PR #388. Los 8 archivos de `kotlinx.coroutines` y los 6 de `kotlinx-io` ya fueron revelados y están excluidos de esta reserva.

## Controles independientes comprometidos antes de cualquier predicción

El archivo `tests/fixtures/phase2-block25b-oracle/oracle-seal.json` fija el SHA-1 Git y SHA-256 de dos fuentes de oráculo. Se verifican las fuentes Kotlin originales, no fragmentos copiados ni una implementación alternativa:

- **BinaryReaderOracle.kt:** compila `BinaryDataReader.kt` intacto y contrasta lectura big-endian con `java.nio.ByteBuffer`, UTF-8, campos terminados por NUL y límites.
- **CalendarOracle.kt:** compila `dateCalculations.kt` y `util.kt` intactos y contrasta años bisiestos y longitudes de mes con `java.time.Year` y `java.time.LocalDate`, más límites ASCII.

La CI instala JDK 21 y un compilador Kotlin 2.0.21 cuyo SHA-256 está fijado, autentica los seis objetos Git del repositorio original, verifica el sello SHA-256 y **compila los dos oráculos en Bubblewrap/AppArmor sin red**. **No ejecuta ninguno de sus `main()`**, no revela resultados funcionales a Hunter y no escanea la cohorte con el detector nuevo. El paso que ejecute Hunter deberá pertenecer a un PR posterior, consumir exclusivamente su commit congelado y publicar un sello inmutable de las predicciones antes de que un job distinto abra los oráculos.

## Límites de evidencia

Tres archivos originales cuentan con controles parciales; los otros tres carecen de ellos. **Ninguno de los seis cuenta con etiquetado funcional completo**, por lo que precisión, recall, F1 y recuentos de falsos positivos y negativos no son calculables. Algunas funciones del código original están explícitamente documentadas como limitadas/inseguras, pero eso no significa que Hunter las haya descubierto ciegamente ni que exista una reparación verificada. Tampoco se demuestra la nueva familia de cancelación; habrá que aceptar un resultado negativo si las predicciones congeladas no identifican nada.

Sin permisos de escritura/remediación, sin modificación de Judge/Fixer, sin integración con JARVIS/GameHub, sin bypass de autorizaciones y sin certificación Triple S+.

**No iniciar la ejecución ciega del Bloque 2.5c desde este PR.**
