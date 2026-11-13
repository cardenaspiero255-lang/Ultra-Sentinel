# Ultra Sentinel — Fase 2 · Bloque 2.5d-1: Hunter v4 con análisis de guardas tipadas

Este PR prepara una versión nueva **sin modificar el motor congelado en el PR #390** (Hunter v3 `49235f854c61c29d55a0307ce4a0348553b2ee1f`).

## Mejora funcional

Se añade `phase2-cancellation-controlflow-v4.cjs`, un análisis **de flujo de control e importaciones Kotlin limitado**, diferente de la simple búsqueda de `catch (CancellationException)` de v3:

- Reconoce `catch (e: Exception/Throwable)` y una guarda `if (e is CancellationException) { ... return }` que estrecha el **mismo identificador capturado**.
- Comprueba la importación exacta `kotlin.coroutines.cancellation.CancellationException`, alias explícitos, o un nombre completamente cualificado. Descarta nombres locales o importaciones competidoras ambiguas; no confunde guardas sobre otras variables.
- En la rama protegida exige una salida `return` y ausencia de `throw`; descarta lambdas/funciones anidadas de resolución de retorno incierta. Un `throw` después de la salida no corrige la pérdida de cancelación en la ruta concreta.
- Reutiliza **obligatoriamente** la verificación byte a byte, rutas consultivas y presupuestos del motor v3; no amplía la autoridad de Judge/Fixer ni de reparación.
- Conserva compatibilidad con las hipótesis antiguas, con salida marcada como **no verificada**.

El nuevo código **no resuelve todavía símbolos mediante el compilador Kotlin**. Ni los nombres importados ni la guarda son una prueba causal o de origen; es una mejor inferencia sintáctico-semántica acotada, con `compilerTypeResolutionVerified=false` hasta una prueba de símbolo real.

## Pruebas y CI

Se incorporan pruebas TDD RED→GREEN, un worker autónomo v4 y un launcher Bubblewrap/AppArmor sin red ni oráculos montados. Un fixture **sintético** Kotlin/JVM muestra que una cancelación absorbida no conserva su propagación, que el manejo corregido sí la conserva y que una regresión introducida debe quedar vetada por el mismo oráculo funcional independiente. El compilador Kotlin 2.0.21 se valida criptográficamente antes de usarlo.

**El fixture sintético es únicamente un control de regresión:** no es un defecto de una fuente externa desconocida, no permite declarar una familia descubierta, causalidad original, reparación automática ni Triple S+.

## Próximo hito prospectivo, separado de este PR

Tras CI y fusión seguras, congelar el SHA y árbol de **Hunter v4** antes de seleccionar una cuarta cohorte de **otro repositorio original Kotlin**, mediante metadatos Git solamente. Excluir definitivamente los ocho archivos `kotlinx.coroutines`, los seis `kotlinx-io` y los seis `kotlinx-datetime` ya utilizados. Preparar oráculos independientes comprometidos antes de ejecutar el motor nuevo, publicar predicciones aisladas antes del veredicto funcional y medir abstenciones y falsos hallazgos únicamente cuando exista verdad independiente suficiente.

**La Fase 2 sigue abierta.** No volver a ajustar Hunter v4 sobre resultados revelados de esa cuarta cohorte.
