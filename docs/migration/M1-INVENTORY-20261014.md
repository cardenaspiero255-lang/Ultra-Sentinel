# M1 — Inventario de migración verificable (2026-10-14)

**Origen:** `cardenaspiero255-lang/gamehub-ultra@1060ce8b9f35d191ce8639337e4cff50085cbd7e` (main; incluye PR #197 fusionado).
**Destino:** `cardenaspiero255-lang/Ultra-Sentinel` (main; contratos v1 y estructura, sin auditor productivo).
**Alcance:** inventario de extracción, no ejecución ni traslado de motores. Árbol Git del origen consultado sin truncamiento; 178 rutas bajo `.github/scripts/ultra_sentinel_*` o `.github/workflows/ultra-sentinel-*` en la instantánea. Esta cifra cuenta archivos, no capacidades ni tests.

| Componente de origen | Destino previsto | Dependencias / límites | Riesgo y criterio de aceptación |
|---|---|---|---|
| `ultra_sentinel_core.cjs` + `core.test.cjs` | `packages/core/` | Importa `ultra_sentinel_remediation.cjs` y `ultra_sentinel_memory.cjs`; entradas de diff GitHub no confiables | **Alto**: conservar API, límites de parches y fail-closed; probar regresiones antes de conectar GitHub |
| `ultra_sentinel_remediation.cjs` | `packages/core/` (propuestas puras) | No confundir sugerencias con autorización para ejecutar | **Alto**: no ejecutar ni escribir cambios |
| `ultra_sentinel_memory.cjs` | `packages/memory/` | Fuente de playbooks curados y búsqueda; Core la requiere | **Alto**: conservar procedencia; no promover registros de PR a evidencia |
| `ultra_sentinel_memory_ledger.cjs` (PR #197) | `packages/memory/` en bloque 4 | Verificador trusted-main externo; lector acotado sin escritor ni API | **Muy alto**: no habilitar promoción sin verificador real; importar tests adversariales |
| `ultra_sentinel_family_hunter_modes.cjs` | `packages/family-hunter/` en bloque 3 | Depende de playbooks y referencias del origen | **Alto**: separar clasificación de reparación |
| `ultra_sentinel_capabilities.cjs` | Core o calidad, según grafo | Requiere `eslint-scope` y AST; no es stdlib | **Alto**: resolver dependencias y bloqueo de versiones antes de importar |
| `ultra_sentinel_core_shards.cjs` | `tests/` tras adaptación | Ejecuta procesos de pruebas y contiene nombres/rutas de GameHub | **Medio/alto**: no copiar como runtime ni afirmar paridad de matrices sintéticas |
| `ultra_sentinel_github_collector.cjs` | `adapters/github/` en bloque 7 | GitHub API, paginación, permisos, cuotas | **Muy alto**: solo lectura y resultados INCOMPLETE al faltar evidencia |
| `ultra_sentinel_orchestrator.cjs` y reparación | `packages/orchestrator/`, `packages/recovery/` en bloque 6 | Separar análisis, propuestas y acciones autorizadas | **Muy alto**: nunca autofusión ni permisos implícitos |
| Workflows y tests de matrices masivas | CI/QA selectiva | Triggers, secretos, dependencias, rutas y conteos propios de GameHub | **Muy alto**: auditoría individual, sin copiar workflows privilegiados |

## Decisiones de extracción
1. **Bloque 1:** publicar esta matriz y congelar SHA de origen. GameHub permanece sin cambios.
2. **Bloque 2:** portar **Core + dependencias puras mínimas** a `packages/core/` y `packages/memory/`; conservar API observable y tests de seguridad; no incluir adaptadores GitHub ni permisos.
3. **Bloques 3 y 4:** Family Hunter y PR #197, respectivamente, con pruebas de procedencia y verificador independiente antes de confiar en registros.
4. **Bloques 5–8:** recomendaciones, modos supervisados, adaptadores y validación sombra/E2E.

## Reglas de salida
- Cada PR incluye SHA de origen, diff auditable, pruebas unitarias/adversariales y CI del HEAD exacto.
- Revisión profunda sin Codex; no declarar motor SSS operativo antes de demostrarlo.
- No borrar ni apagar nada en GameHub hasta comparar comportamiento en modo sombra y verificar rollback.
- PR #197 **ya está fusionado y autorizado expresamente por el propietario para la futura migración**, reemplazando la restricción provisional documentada durante su desarrollo. La importación efectiva queda reservada al bloque 4.
