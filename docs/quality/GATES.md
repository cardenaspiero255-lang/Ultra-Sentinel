> **Perfil Private Edition (25-10-2026):** el criterio de 120 etiquetas descrito en el pre-screen SSS+ es histórico/opcional; **no bloquea** la edición privada. Las protecciones de pruebas adversariales, evidencia real, autorización, rollback y CI **sí** siguen siendo obligatorias. Véase [Private Edition](PRIVATE-EDITION-RELEASE-GATES.md).

# Gates de calidad — definidos por fase

## Bootstrap (aplica ahora)
1. Sintaxis Node 22 y `npm run check` en GitHub Actions sin secretos.
2. Los archivos exigidos por `config/layout.json` existen, son regulares y sus rutas son internas.
3. Política de ejemplo es fail-closed y los contratos JSON Schema son cerrados.
4. Revisión independiente del cambio **sin Codex**: auditoría técnica con evidencia reproducible, pruebas adversariales y CI exitosa del HEAD vigente; distinguir siempre revisión automatizada de validación humana externa. Un motor implementado no sustituye una campaña real de paridad.

## Motores y migración (gates en progreso, no todos acreditados)
- Unit TDD RED/GREEN, suite de regresión y contratos equivalentes de origen.
- Pruebas adversariales y Mutation Lab de las familias modificadas; ninguna suite omitida arbitrariamente.
- Integración GitHub de solo lectura con revisión independiente y fallos `INCOMPLETE` por permisos/cuota/paginación.
- Tests E2E sobre proyecto aislado antes de habilitar checks bloqueantes.
- Android Build / Coverage solo en GameHub o cuando el cambio altere explícitamente su API/contratos, preservando required checks configurados.


## Controles cuantitativos internos incorporados

El módulo `packages/quality-gates/sssplus-pre-screen.cjs` impone límites mínimos de cohortes, clases, reglas, precisión/recall/F1 y ausencia de omisiones críticas sobre los ejemplos etiquetados entregados. `packages/quality-gates/mutation-lab.cjs` ejercita ocho familias de patrones y controles benignos con el **Core real**. Ambos tienen pruebas unitarias en CI. Ver [SSSPLUS-RELEASE-GATES](SSSPLUS-RELEASE-GATES.md).

Estos controles **no** obtienen etiquetas independientes ni autentican la CI de GameHub. Su resultado no certifica SSS+ ni autoriza merges. La evidencia externa, las pruebas reales y la revisión independiente siguen pendientes.

## Política de fusión
Verificar última cabeza SHA, todos los checks requeridos, protecciones y conversaciones críticas. Si falla alguna prueba, análisis independiente o autorización → **no fusionar**. Un check skipped no es PASS. El nombre “Triple SSS” no certifica calidad sin comparaciones externas.

## Política de revisores — exclusión indefinida de Codex (2026-10-14)
- Codex queda **excluido** del flujo de revisión, las solicitudes `@codex review`, los gates y las decisiones de fusión de Ultra-Sentinel hasta que el propietario revierta expresamente esta política.
- Eliminar/desactivar la integración de Codex en la configuración de GitHub requiere permisos administrativos y se realiza fuera de este PR. Esta política documental **no desinstala** una GitHub App ni detiene por sí sola revisiones automáticas del servicio.
- Revisión alternativa: análisis estático de diff completo, trazabilidad de cambios, TDD RED→GREEN, pruebas unitarias y adversariales, inspección de secretos/permisos, verificación de workflows y logs, HEAD SHA exacto, estado de conversaciones y protección de `main`.
- No confundir la auditoría del asistente con un revisor humano independiente, ni declarar una revisión de Ultra Sentinel sin un motor ejecutable y evidencias.
- Si no se puede acreditar una comprobación requerida, informar el bloqueo; no declarar un PR limpio por ausencia de comentarios.
