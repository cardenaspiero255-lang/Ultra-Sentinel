# Gates de calidad — definidos por fase

## Bootstrap (aplica ahora)
1. Sintaxis Node 22 y `npm run check` en GitHub Actions sin secretos.
2. Los archivos exigidos por `config/layout.json` existen, son regulares y sus rutas son internas.
3. Política de ejemplo es fail-closed y los contratos JSON Schema son cerrados.
4. Revisión profunda independiente de Codex: auditoría humana/asistente con evidencia reproducible, pruebas adversariales y CI exitosa del HEAD vigente. Ultra Sentinel puede aportar hallazgos **solo si su motor se ha implementado, ejecutado y registrado evidencias verificables**; su estructura actual no constituye una revisión ejecutada.

## Al migrar motores (gates adicionales; NO implementados)
- Unit TDD RED/GREEN, suite de regresión y contratos equivalentes de origen.
- Pruebas adversariales y Mutation Lab de las familias modificadas; ninguna suite omitida arbitrariamente.
- Integración GitHub de solo lectura con revisión independiente y fallos `INCOMPLETE` por permisos/cuota/paginación.
- Tests E2E sobre proyecto aislado antes de habilitar checks bloqueantes.
- Android Build / Coverage solo en GameHub o cuando el cambio altere explícitamente su API/contratos, preservando required checks configurados.

## Política de fusión
Verificar última cabeza SHA, todos los checks requeridos, protecciones y conversaciones críticas. Si falla alguna prueba, análisis independiente o autorización → **no fusionar**. Un check skipped no es PASS. El nombre “Triple SSS” no certifica calidad sin comparaciones externas.

## Política de revisores — exclusión indefinida de Codex (2026-10-14)
- Codex queda **excluido** del flujo de revisión, las solicitudes `@codex review`, los gates y las decisiones de fusión de Ultra-Sentinel hasta que el propietario revierta expresamente esta política.
- Eliminar/desactivar la integración de Codex en la configuración de GitHub requiere permisos administrativos y se realiza fuera de este PR. Esta política documental **no desinstala** una GitHub App ni detiene por sí sola revisiones automáticas del servicio.
- Revisión alternativa: análisis estático de diff completo, trazabilidad de cambios, TDD RED→GREEN, pruebas unitarias y adversariales, inspección de secretos/permisos, verificación de workflows y logs, HEAD SHA exacto, estado de conversaciones y protección de `main`.
- No confundir la auditoría del asistente con un revisor humano independiente, ni declarar una revisión de Ultra Sentinel sin un motor ejecutable y evidencias.
- Si no se puede acreditar una comprobación requerida, informar el bloqueo; no declarar un PR limpio por ausencia de comentarios.
