# C2 Run 22 — positive de comparación actual sin comprobación de vigencia

**Este documento no es certificación SSS+, ni etiqueta ciega de evaluación.**

## Defecto reproducible de fuente histórica

- GitHub GameHub Ultra PR **#158**, HEAD inmutable `9d8572afedc634ac07dae58a0da326ea62bdc1da`.
- `app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraGeneralQueryRouter.kt:144`, blob `0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f`.
- Identidad de defectos: `CURRENT_COMPARISON_FRESHNESS_QUALIFIER_NOT_RESPECTED`.
- Original: una comparación estática debe ir al modo `COMPARISON_RESEARCH` sin vigencia obligatoria. La misma comparación con el término **«ahora»** debe requerir evidencia reciente. Sin embargo, la rama histórica de comparación solo consultaba `currentDataPattern`, que no contenía «ahora», ignorando la expresión temporal reconocida por `currentQualifierPattern` en otras ramas.
- Contrafactual temporal: añadir la condición `|| currentQualifierPattern.containsMatchIn(clean)` únicamente en una copia. No se modifica la fuente histórica. El original debe fallar **solo** el control actual y el contrafactual debe superar ambos controles.
- Llamador real de producción: `UltraUnifiedAgent.kt` en HEAD de #158, blob `5d271a02aa4227e07a5c352b572f6c14621e80fc`; parser de voz original en el mismo HEAD, blob `febd1687ceb26a9f195413021fb0257392c0592b`. El stub ABI replica normalización pertinente de entradas sin asistente explícito; no prueba toda la cadena ASR/dispositivo.

## Procedencia y sello

El workflow owner-only `.github/workflows/c2-run22-original-comparison-freshness.yml` revalida run **#39075155081**, artefacto **#12116887077**, digest **163caab401c119a4f907034bcc973064ad1b4c3b207fe92f616b560474e26001** (20 etiquetas reales de código original: 9 positivas y 11 controles negativos). Obtiene código original por Git SHA, compila en JVM y ejecuta dentro de Bubblewrap/AppArmor, sin token ni red durante los oráculos.

La propuesta de incremento a **21 etiquetas** solo se acredita si la ejecución real del propietario termina correctamente y guarda el recibo. Contadores entonces: **10 positivas, 11 negativas; faltan 99** para el mínimo de 120, incluyendo al menos 38 positivas, 37 negativas y 24 casos de diversidad justificada. Las clases y reglas deben ser pertinentes al detector para poder puntuarse después.

Después de fusionar el PR y verificar CI, disparar el workflow desde `main` o comentar exactamente `ULTRA_SENTINEL_C2_RUN22_ORIGINAL_FRESH_COMPARISON_V1` en el [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50).

**Prohibiciones:** no convertir el PR #158 ya estudiado en holdout ciego, no contar la variante temporal como defecto original, no atribuir mérito de 95 % ni no-regresión de FP, no autofusión de reparaciones ni desbloqueo de escritura.
