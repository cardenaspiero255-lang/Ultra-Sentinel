# Puertas de aceptación para la migración

**Por cada módulo trasladado** registrar: origen SHA, destino commit SHA, fichero/revisor responsable, import graph, API pública, tests antes/después, falsos positivos/negativos, permisos y rollback.

- [ ] Inventario de paths y dependencias del origen publicado y verificado.
- [ ] Referencias `cardenaspiero255-lang/gamehub-ultra` parametrizadas donde correspondan, sin perder validación del repo real.
- [ ] Pruebas TDD/CI al HEAD del PR de destino; ninguna prueba deshabilitada sin justificación auditada.
- [ ] No hay salida `CLEAR` ante muestras parciales, callbacks no verificados o fallos de API.
- [ ] Un PR malicioso no puede ejecutar scripts ni leer secretos a través de un workflow privilegiado.
- [ ] Comparación modo sombra sobre varias clases de PR de GameHub, incluidos errores y controles benignos.
- [ ] La integración falla cerrado si un check requerido falla/está omitido/en cola.
- [ ] Revisión independiente/branch protection según riesgo y reglas de `main`.
- [ ] Los errores de audio y crashes se prueban en QA, nunca causando crashes en usuarios.
- [ ] Rollback del check nuevo al antiguo está probado antes de quitar controles viejos.
- [ ] El PR #197 sigue **sin copiar** hasta una decisión explícita y revisión futura independiente.
