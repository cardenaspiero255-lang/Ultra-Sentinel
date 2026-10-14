# Contribuir a Ultra Sentinel

Mantener PRs pequeños por límite arquitectónico (core, contratos, adaptadores, operaciones). No extraer código Android de GameHub que deba seguir en su producto.

1. Abrir issue o vincular uno existente (#1–#5).
2. Escribir prueba RED antes de modificar comportamiento; corregir y demostrar GREEN.
3. Ejecutar `npm run check` y las suites propias del módulo afectado.
4. Revisar SHA vigente, impacto entre repositorios, seguridad y comentarios abiertos.
5. Nunca fusionar con errores confirmados, fallos de CI, resultados ambiguos o hallazgos bloqueantes.
6. Si hace falta privilegio, proponer la capacidad y autorización como trabajo independiente.

Las carpetas README son **contratos de ubicación**, no implementaciones. Reemplazarlas con código solo cuando existan pruebas y documentación de los límites.
