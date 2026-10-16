# Holdout C2 — primer defecto nuevo en el PR #206, previo a la predicción

El [congelamiento de cohorte #38838525845](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38838525845) se produjo **antes** de consultar hallazgos del Core o baseline sobre estos cuatro PR. Packet digest: `b2a60512a647579b1af857fb0f3dc45c9d756ba076309a04e0acf3f0a3bdc48e`. No se requiere otro evaluador humano.

## Prueba del comportamiento original

- GameHub PR: **#206** (fuera del antiguo C2 #73/#132/#159/#161).
- HEAD: `53cb89551d6e750d263bc0e25dde9f4d3069144f`.
- Archivo: `app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt`.
- Git blob SHA-1: `6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a`.
- Lugar: línea 26 `substring(0, boundary)` cuando `boundary` corta una pareja sustitutiva UTF-16.
- Regla para seguimiento: `TTS_UTF16_SURROGATE_SPLIT`.

Entrada reproducible: un emoji `😀` comienza en posición UTF-16 31 con límite 32, o en posición 799 con límite de producción 800. El código original crea fragmentos con una mitad de la pareja sustitutiva; cada fragmento tiene caracteres UTF-16 malformados para el motor de voz. El texto total concatenado conserva los mismos caracteres, pero Android TTS recibe fragmentos distintos, por lo que puede pronunciar un carácter de reemplazo o perder el emoji.

**Controles negativos del comportamiento:** texto ASCII de 40 caracteres a límite 32 se conserva; emoji cuando el límite cae **después** de la pareja permanece válido. No se cuenta cada control como etiqueta negativa independiente de defecto para inflar la muestra.

La prueba Kotlin fue ejecutada localmente con el **archivo original** verificado a ese Git blob. El workflow `.github/workflows/c2-unseen-pr206-utf16-oracle.yml` reproduce el escenario en GitHub Actions, verificando antes por API que existió el congelamiento #38838525845. Descarga **solo** este archivo desde su HEAD, comprueba el Git blob original, lo compila con un harness independiente y ejecuta en Bubblewrap/AppArmor sin red ni credenciales. Un fallo de sandbox, SHA o control aborta sin registrar un caso positivo.

## Valoración

Si el workflow real termina `success`, constituye **una observación reproducible positiva en un PR nuevo**. No significa que sea representativa del universo de PR, ni que el detector actual la detecte, ni que TTS Android haya sido probado en hardware físico; estos puntos permanecen pendientes.

La comparación con el detector anterior y Ultra Sentinel debe efectuarse **después** de congelar el conjunto de verdad y con los mismos SHA. No ajustar una regla para este caso antes de medirla, o se convertiría en entrenamiento.

**No se certifica Triple S+:** `precision=null`, `recall=null`, `F1=null`, quedan sin verificar suficientes negativos distintos, 120 etiquetas y una baseline a la misma revisión. Ni fuente, ni token, ni texto privado de voz se publica en el artefacto.
