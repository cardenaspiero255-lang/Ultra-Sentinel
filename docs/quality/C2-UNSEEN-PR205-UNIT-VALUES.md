# C2 Holdout — oráculo de unidades en el grafo de afirmaciones (GameHub #205)

La cohorte #172/#205/#206/#208 fue congelada antes de preparar este oráculo, sin consultar predicciones de Ultra Sentinel. La identidad de #205 permanece HEAD `1ecf73e789b91354ce9d8b7289d9492930ae5950`; original `app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt`, Git blob `f0461cd51e00d2d7b2bc4225aeefee400e2e9fa4`.

## Hipótesis comprobable

El código del grafo conserva mayúsculas en el `claimId` con prefijo `research-answer:`, pero en `record()` convierte `normalizedValue` con `lowercase(Locale.ROOT)` (línea 318). Los valores `8 GB` (gigabytes) y `8 Gb` (gigabits), correspondientes a magnitudes físicas diferentes, podrían convertirse ambos en `8 gb`. Bajo una misma clave de afirmación, las dos fuentes quedarían mal clasificadas como apoyo coincidente en lugar de oposición.

El arnés prueba el `UltraFrontierV2ClaimProvenanceGraph` original compilado **sin modificaciones** desde el blob fijado. Las definiciones ABI que lo acompañan solo reemplazan las clases externas `UltraFrontierLane`, `UltraFrontierSpecialist`, `UltraFrontierRequest`, `UltraFrontierTask` y `UltraVerificationMode` que no se ejercitan; no reimplementan el algoritmo.

**Controles de comportamiento:** dos números diferentes se reconocen correctamente como conflicto; valores en lenguaje natural con diferencias de mayúsculas siguen siendo equivalentes; dos claves completas de investigación distintas `GB` y `Gb` quedan aisladas como lo requiere el cambio del PR #205. El ensayo adversarial únicamente demuestra una anomalía si esos tres controles son satisfactorios y el grafo marca dos fuentes de unidades distintas como corroboración de una misma afirmación.

## Validez y restricciones

Workflow `c2-unseen-pr205-unit-values.yml`, disparo manual desde `main` o comentario `ULTRA_SENTINEL_C2_UNSEEN_PR205_UNIT_VALUES_V1` del propietario en issue #50. Primero comprueba la ejecución previa del congelamiento y su artefacto; después descarga **solo** el código original con un SHA específico, compila Kotlin y ejecuta el JAR dentro de Bubblewrap/AppArmor sin red, workspace del repositorio ni secretos.

**Hasta observar `success` en un workflow real, este caso es una HIPÓTESIS y NO una etiqueta positiva acreditada.** Si confirma el fallo, se añade al dossier de la verdad en una versión nueva; el primer manifiesto sellado conserva su digest original. La localización es `UltraFrontierV2.kt:318`, regla documental `CLAIM_VALUE_UNIT_CASE_COLLISION`. No se ha ejecutado Ultra Sentinel ni baseline sobre la nueva cohorte; este oráculo no acredita rendimiento real del detector, ni prueba que el fallo se produzca a través de todos los llamadores Android.

Ninguna etiqueta negativa se atribuye automáticamente a los controles benignos; no activar autorreparación ni declarar el 95 % con esta muestra.
