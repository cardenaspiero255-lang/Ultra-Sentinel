# Holdout C2 — controles benignos independientes de #206 y #208

Este conjunto se obtiene **después** de congelar el conjunto #172/#205/#206/#208, y **antes** de comparar las predicciones del Core. No fue utilizado para diseñar las reglas semánticas anteriores.

**Git sources fijadas y verificadas:** #206 `UltraTtsInitializationGate.kt` (blob `84314310e5aee094b558e0f59d33e2779b258be7`); #208 `UltraWakeRecoveryPolicy.kt` (blob `739cabd415d931fb7a2816a881df300a07c81559`) y `UltraWakeRecognitionHealth.kt` (blob `e7c30a22bd66d8c01752281b53bc5ab61e431beb`). HEADs congelados: `53cb89551d6e750d263bc0e25dde9f4d3069144f` y `df2bd33416d652480e51994784e511fbcb7ede12`. Kotlin original, nunca reemplazado por una versión simulada del algoritmo. La dependencia de constantes Android usa un stub solo de ABI.

**Comportamientos de protección a comprobar:**
- El retardo de reintento ASR crece de 500 ms hasta 30 s, satura sin desbordar y no reinicia por eventos vacíos.
- La recuperación vuelve a 500 ms tras una transcripción no vacía; errores de reconocimiento Busy/Client fuerzan recreación, error de red no.
- La puerta de inicialización TTS conserva la última respuesta mientras inicia, entrega la respuesta tras inicialización, y queda terminal al cerrar o fallar.

El workflow `.github/workflows/c2-unseen-benign-voice-oracles.yml` comprueba la existencia del congelamiento de origen, descarga archivos de commits fijos vía GitHub API y confirma sus Git blobs; ejecuta el JAR en Bubblewrap bajo AppArmor con red y credenciales aisladas. Fallará cerrado si algo cambia o falla la protección.

**Restricción metodológica:** Estos controles exitosos son evidencia real de **comportamiento benigno**, no etiquetas verdaderas negativas de un hallazgo `rule/path/line` del detector; el contador `negativeFindingLabelsEstablished` queda en cero. Los casos de prueba dentro de un mismo archivo no se multiplican como si fueran ubicaciones independientes. El resultado no permite calcular FP, precisión, recall ni F1 reales, no habilita reparaciones y mantiene `tripleSPlusCertified=false`.

Para obtener controles negativos puntuables se necesitan identidades concretas `rule/path/line` relevantes, pruebas de ausencia del defecto con contratos adversariales, y revisión de que se comparan exactamente con las predicciones del baseline y del detector congelado. No abrir predicciones hasta cerrar verdad técnica.
