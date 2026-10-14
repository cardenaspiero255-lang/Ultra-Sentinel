# Gates de calidad — definidos por fase

## Bootstrap (aplica ahora)
1. Sintaxis Node 22 y `npm run check` en GitHub Actions sin secretos.
2. Los archivos exigidos por `config/layout.json` existen, son regulares y sus rutas son internas.
3. Política de ejemplo es fail-closed y los contratos JSON Schema son cerrados.
4. Revisión del PR por el propietario/autoridad apropiada; CI exitosa del HEAD vigente.

## Al migrar motores (gates adicionales; NO implementados)
- Unit TDD RED/GREEN, suite de regresión y contratos equivalentes de origen.
- Pruebas adversariales y Mutation Lab de las familias modificadas; ninguna suite omitida arbitrariamente.
- Integración GitHub de solo lectura con revisión independiente y fallos `INCOMPLETE` por permisos/cuota/paginación.
- Tests E2E sobre proyecto aislado antes de habilitar checks bloqueantes.
- Android Build / Coverage solo en GameHub o cuando el cambio altere explícitamente su API/contratos, preservando required checks configurados.

## Política de fusión
Verificar última cabeza SHA, todos los checks requeridos, protecciones y conversaciones críticas. Si falla alguna prueba, análisis independiente o autorización → **no fusionar**. Un check skipped no es PASS. El nombre “Triple SSS” no certifica calidad sin comparaciones externas.
