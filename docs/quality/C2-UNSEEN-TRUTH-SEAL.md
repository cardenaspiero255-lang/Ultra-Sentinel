# C2 holdout — primer corpus de verdad parcial sellado por SHA

Objetivo: conservar una observación verdaderamente nueva y reproducible sobre el código original, junto con controles benignos, **antes de abrir cualquier predicción de Ultra Sentinel o del baseline heredado**.

## Evidencia y orden de eventos

El congelamiento de cohorte ocurrió en [run #38838525845](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38838525845) (HEAD `6946e730d030f4772eff3ea9e704d7731f99c721`), **antes** de ambos oráculos. Los tres artefactos, en orden de obtención, son:

| Origen | Run original | Artifact ID | SHA-256 del JSON |
|---|---|---|---|
| Cohorte congelada, sin predicciones ni etiquetas | `38838525845` | `12019324481` | `c4f578c62724db0953f0b1c326a27c22c5c7b000dde25cf9491d666b9e5f1905` |
| Defecto real nuevo en #206, Kotlin original | `38839053940` | `12019719566` | `a3b2a3060451eb640ccbbaeb3c39eb96b1a3f4b5af1dace5023be866fc1faa74` |
| Controles benignos #206/#208, Kotlin original | `38840046800` | `12020522075` | `5c80df24751d477521561f115904eddeea2a8e6c507ba89b02595239f8b9813d` |

El comando `scripts/seal-c2-unseen-truth.cjs` comprueba los SHA-256 exactos, estructura, identidad de cohorte y flags de no evaluación. El workflow `c2-unseen-truth-seal.yml` verifica además por API GitHub los run, workflow, actor, SHA de `main`, artifact ID y conclusión `success`, y elimina el token antes de invocar el scoreador local.

## Dossier de verdad

**Positivo real observado (una sola identidad):** `pr=206`, regla documental `TTS_UTF16_SURROGATE_SPLIT`, ruta `app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt`, línea 26. El código Kotlin original en el HEAD congelado dividió un par surrogate UTF-16 en límites de fragmentación de 32 y de 800. Dos controles de preservación de texto no problemático pasaron.

**Controles benignos reproducidos:** #208 ASR backoff, #208 recreación de SpeechRecognizer selectiva, #206 ciclo de inicialización TTS. Cada control pasa sobre un archivo fuente original distinto, pero **no** constituye una etiqueta negativa `rule/path/line` del detector.

**Conteo estricto:** 1 positivo de comportamiento reproducido; **0 negativos puntuables**; 3 controles benignos de comportamiento. **Al menos 119 etiquetas más** para el mínimo de 120, ≥47 positivos adicionales y ≥48 negativos, además de diversidad de 4 PR, 6 reglas, 4 rutas y familia crítica. Estos son mínimos, no un sustituto de representatividad ni de auditoría de la verdad.

## Protección contra contaminación y certificación

La salida `SOURCE_BEHAVIOR_TRUTH_PARTIAL` contiene únicamente las identidades documentadas: ni predicciones ni baseline, `precision=null`, `recall=null`, `F1=null`, `tripleSPlusCertified=false`. El campo `sealedTruthDigest` fija criptográficamente el contenido conocido, **no certifica que las etiquetas sean independientes de toda persona o un estándar externo**. El propietario único puede auditar y firmar la procedencia sin involucrar un segundo humano.

No ajustar el detector con este caso hasta terminar la comparación congelada, de lo contrario la muestra dejaría de ser no vista para esa versión. Para medir 95 % se necesitan suficientes defectos nuevos y controles negativos adversariales con evidencias separadas antes de revelar las predicciones del detector.
