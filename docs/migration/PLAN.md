# Plan de migración controlada

## Regla inicial
**PR #197 fusionado en GameHub Ultra:** el propietario autorizó su migración posterior. Inventariar ahora; importar lector y pruebas de memoria en el bloque 4 tras auditoría.

Repositorio origen: `cardenaspiero255-lang/gamehub-ultra`. Destino: `cardenaspiero255-lang/Ultra-Sentinel`.

## Fases con criterio de salida
### M0 — Bootstrap [estructura solamente]
- Crear estructura, repositorio independiente, controles documentales, esquemas y una CI de arquitectura de solo lectura.
- No migrar módulos de Sentinel ni desactivar la CI del repositorio origen.
- **Salir cuando:** CI estructural en verde y revisión del PR de bootstrap; proteger `main` en Settings.

### M1 — Inventario forense de `main` estable
- Listar `.github/scripts/ultra_sentinel_*.cjs`, `.github/workflows/ultra-sentinel-*.yml`, contratos, fixtures, binarios, dependencias NPM, triggers GitHub y referencias concretas a rutas de GameHub.
- Separar piezas **reutilizables**, adaptadores de CI de GameHub y Android/voz/UI que deben permanecer.
- Etiquetar SHA y estado de fusión de cada origen; crear matriz: propietario, dependencias, pruebas, riesgo, criterio de extracción.
- **No incluir #197** y no confundir los PR abiertos y apilados posteriores con código de `main`.

### M2 — Core portátil y contratos
- Portar primero Core, reglas, parsers y suites de tests relevantes, con rutas relativas y sin privilegios.
- Conservar hashes/fixtures de regresión, distinguir matríz sintética de evaluaciones independientes.
- Reconfigurar locks NPM, módulos CommonJS, rutas de reporter y CI sin dependencias accidentales de Android.
- **Salir cuando:** TDD y tests de seguridad equivalentes pasan en el nuevo repo.

### M3 — Quality Gates y lector GitHub de solo lectura
- Implementar GitHub App de **lectura**, validador de HEAD/base, checks, scopes, historial de intentos, privacidad y fallos por API.
- Validar comportamiento `BLOCKED`/`INCOMPLETE` con fixtures negativas y E2E sobre repositorios de ensayo.
- No activar autofusión ni commits de reparación.

### M4 — Family Hunter + memoria desacoplada
- Portar interfaz de tres modos y clasificación multiarchivo desde **bases estables**. La memoria requiere diseño, evaluación de procedencia y tests propios antes de integrarse.
- **La exclusión de #197 continúa hasta una decisión explícita posterior** sobre una implementación revisada y fusionada; no incorporar su trabajo indirectamente mediante cherry-picks de ramas apiladas.
- Aislar escritor de propuestas y lógica de autorización.

### M5 — Modo sombra entre repositorios
- Ejecutar Sentinel nuevo sobre PR seleccionados de GameHub sin conceder autoridad de merge.
- Comparar findings, falsos positivos, coverage y categorías de `INCOMPLETE` contra el motor previo.
- Revisar todas las diferencias antes de conectar checks bloqueantes.

### M6 — Integración con GameHub y Jarvis
- Eventos versionados, autenticados, telemetría sanitizada, Sentry y health checks; pruebas E2E con consentimiento.
- Monitor 24/7 solo cuando exista despliegue real, alertas, presupuesto, supervisor externo y gestión segura de secretos.
- El nombre/ruta del repositorio Jarvis se descubre antes de configurar cualquier permiso.

### M7 — Cutover reversible
- Promover checks confiables del nuevo motor conforme a rulesets reales.
- Conservar adapter/shim de compatibilidad en GameHub y posibilidad de rollback.
- **Solo retirar scripts/workflows viejos al comprobar paridad, seguridad, estado de rama y observabilidad**; no borrar historial ni registros de incidencias.

## Prohibiciones
No incluir código del PR excluido, no activar auto-merge, no usar `pull_request_target` para ejecutar PRs, no instalar tokens amplios, no marcar SSS por conteo de tests. Cada etapa exige revisión independiente y CI al último SHA.
