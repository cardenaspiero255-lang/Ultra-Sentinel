# Triple S+ / C2 — sello v3 de tres comportamientos originales nuevos

La secuencia de evaluación permanece separada del detector: congelamiento #172/#205/#206/#208, oráculos de código fuente fijados, sellos v1/v2 y ahora extensión v3. **No hay segundo evaluador humano obligatorio.**

## Origen verificable

- Truth v2: [Actions #38841966994](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38841966994), artifact `12021274341`, SHA256 JSON `6aa98b59650c76e2bf4da7641975c2830b2a7d6a4ed5dc65cf020e894105592c`, digest de verdad `4c47368b09d33dbb7a8d4580dfb43d63f56e25b00a3f324d7128d4042472ea3a`.
- Nuevo GameHub #208: [Actions #38842384635](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38842384635), artifact `12021074190`, SHA256 JSON `7e49616a3e8aa156b1708d84667b1d67ef937cc32c271fab15896da41e41f8f8`. Original `ContinuousVoiceController.kt:52`, Git blob `9298fe614e1ddbad27e2253c02e9415122cfa263`.
- Todos los HEAD de PR provienen de la cohorte congelada previamente y no deben sustituirse por HEAD actuales.

El defecto nuevo #208: `setEnabled(true)` encuentra permiso RECORD_AUDIO ausente pero, si el estado ya era `enabled=true`, devuelve `PERMISSION_REQUIRED` sin limpiar el estado o llamar la parada de servicio. Se validaron cinco controles donde otras rutas sí bloquean/deshabilitan. **No se midió grabación física del micrófono**: la conclusión se limita al estado de la aplicación, no a una violación de permisos Android.

## Estado del corpus

Sello v3 con **tres positivos** sobre #205 (unidad case), #206 (corte UTF-16) y #208 (estado de micrófono revocado), todos probados ejecutando clases Kotlin de código original; **cero negativos etiquetados a nivel de hallazgo** y tres controles benignos previos. Los controles dentro de los oráculos no se suman como negativos adicionales.

Faltan **117 etiquetas reales** para 120, con >=45 positivos y >=48 negativos, >=4 PR (todavía faltan observaciones en #172), >=6 reglas, >=4 rutas y estratos críticos. En particular, no se sabe si algún detector los encontró: el holdout no ha leído aún salida Core ni baseline heredado.

`precision=null`, `recall=null`, `f1=null`, `baselineComparable=false`, `noFalsePositiveIncreaseCertified=false`, `tripleSPlusCertified=false`. No afirmar 95 %, ni que los errores de original son necesariamente errores críticos.

El workflow owner-only `c2-unseen-truth-v3.yml` verifica IDs de run, repo, actor, workflow, commit y artifacts de los dos recibos previos; la herramienta sin token los contrasta byte a byte con SHA-256 y emite digest v3. Los sellos anteriores no se reescriben.

Después de pasar un **benchmark auténtico** sobre un universo suficiente sin contaminar, continuar con autorización/rollback E2E, Sentry privado, continuidad de monitor y auditoría final; todavía no están certificados.
