# ADR-0003 — Contratos versionados y migración sin ruptura
**Estado:** diseño; contratos v1 de ejemplo, sin consumidores productivos.

- JSON Schema Draft 2020-12 para `incident`, `review-result` y `repair-authorization`, versión **v1** explícita.
- Publicar cambios compatibles de campos opcionales solo tras tests; cambios semánticos que afecten validación, severidad o autoridad requieren **v2** y adaptador dual durante transición.
- `evidenceState: VERIFIED` en JSON es **una afirmación de un emisor**, no una atestación. El consumidor confiable prueba SHA, origen, identidad, evidencia y firma/permiso fuera de JSON Schema.
- Sin rutas absolutas dependientes de GameHub y sin leer credenciales desde el contrato.
- `adapters/gamehub` y `adapters/jarvis` normalizan eventos, manejan versionado y prueban rechazo de versiones incompatibles.
- Cambios de contratos con privilegios requieren revisión independiente; despliegues por fases, con rollback y métricas.
