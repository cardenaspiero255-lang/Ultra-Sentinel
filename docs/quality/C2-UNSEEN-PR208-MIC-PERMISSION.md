# C2 Holdout — persistencia de voz tras revocación del micrófono en GameHub #208

Cohorte congelada previamente [run #38838525845](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38838525845). HEAD original del PR #208: `df2bd33416d652480e51994784e511fbcb7ede12`; archivo `app/src/main/java/com/cardenaspiero255/gamehubultra/voice/ContinuousVoiceController.kt`, Git blob `9298fe614e1ddbad27e2253c02e9415122cfa263`.

**Hipótesis a reproducir sin consultar el detector:** cuando el estado persistido indica `enabled=true` pero Android revoca `RECORD_AUDIO`, la ruta `setEnabled(true)` de la línea 52 retorna `PERMISSION_REQUIRED` sin limpiar el indicador ni intentar detener el servicio. La ruta `resumeIfEnabled()` sí desactiva el estado bajo la misma condición. Esto constituye una inconsistencia en el estado persistido de la aplicación, no prueba de que el micrófono continúe grabando pese a Android.

El oráculo compila el archivo original completo con stubs mínimos de clases externas Android. Un `ContinuousVoiceGateway` inyectado permite comprobar cambios de estado y llamadas de parada sin usar micrófono físico ni simular el algoritmo del controller.

**Controles independientes de comportamiento:** activación nueva sin permiso no marca la opción como habilitada; reanudación sin permiso la desactiva; sistema no disponible la desactiva; fallo `SecurityException` al iniciar servicio la desactiva; desactivación manual limpia el estado.

Workflow `.github/workflows/c2-unseen-pr208-mic-state.yml`, con evento manual de la única cuenta propietaria o comentario exacto `ULTRA_SENTINEL_C2_UNSEEN_PR208_MIC_STATE_V1` en issue #50. Verifica SHA de commit GitHub, SHA de blob y antecedente de congelamiento, compila Kotlin en runner y ejecuta el JAR bajo Bubblewrap/AppArmor, sin red, tokens ni acceso al workspace. Si la fuente, los controles o el aislamiento fallan, NO se acredita el resultado.

El defecto, si se reproduce en Actions, será una nueva evidencia de comportamiento **acotado**, no una certificación independiente de la aplicación Android completa. `physicalMicObserved=false`, `candidateInspected=false`, `baselineCompared=false`. No contar los cinco controles como cinco etiquetas negativas: `negativeFindingLabelsEstablished=0`.

Prioridad de Triple S+: reunir corpus suficiente con negativos por ubicación/regla, cerrar la verdad y luego puntuar candidate y baseline sobre los mismos SHA. No entrenar con este caso mientras forme parte de la evaluación nueva.
