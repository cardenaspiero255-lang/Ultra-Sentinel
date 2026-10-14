# Estrategia TDD y pruebas por pirámide

- **Unit**: validadores de esquemas, family fingerprints, parser/bounds, causalidad y veredictos con fixtures deterministas.
- **Integración**: GitHub API fake con paginación, 403/429/5xx, webhook firmado, Sentry sanitizado, compatibilidad de mensajes Jarvis/GameHub.
- **E2E**: repositorio controlado, incidentes reales consentidos en QA, fallos de voz, rollback y prueba del monitor externo.
- **Seguridad**: payloads hostiles, suplantación de SHA/autoridad, replay, límite de memoria, sanitización, ejecución remota y cadena de suministro.
- **Evaluación externa**: bug real desconocido, falso positivo benigno, precision/recall/F1, detección crítica, tiempo y coste.

TDD: **prueba RED → cambio mínimo → GREEN → refactor → suite completa**, con evidencia del SHA. No inflar por 500.500 casos generados; distinguir fixtures de familias de bug únicas. Las pruebas actuales de scaffold validan estructura únicamente.

Comando actual: `npm run check`. Los tests de integración, E2E y benchmarks todavía son **carpetas de destino**, no suites ejecutables.
