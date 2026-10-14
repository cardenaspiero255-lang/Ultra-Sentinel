# Mapa de extracción: origen → destino

| Origen actual (GameHub) | Destino propuesto | Nota |
|---|---|---|
| `.github/scripts/ultra_sentinel_core.cjs` y pruebas | `packages/core/` | Motor puro + compatibilidad CommonJS inicial |
| `ultra_sentinel_remediation.cjs`, `ultra_sentinel_orchestrator.cjs` | `packages/orchestrator/`, `packages/recovery/` | Separar propuesta de ejecución |
| `ultra_sentinel_family_hunter_modes.cjs` | `packages/family-hunter/` | Mantener 3 modos; reparación no implementada por el adapter de #194 |
| `ultra_sentinel_memory.cjs` del **main estable** | `packages/memory/` | **No** arrastrar cambios, pruebas, ni esquema del PR #197 |
| `ultra_sentinel_policy.cjs`, `ultra_sentinel_selfreview.cjs` | `packages/quality-gates/` | No portar supuestas autorizaciones de PR como autoridades |
| `ultra_sentinel_github_collector.cjs` y lectores API | `adapters/github/` | App de solo lectura, confianza separada |
| `ultra_sentinel_sentry_ingest.cjs` | `adapters/sentry/` | Manejar secretos solo en entorno seguro |
| `ultra_sentinel_report.cjs` | `packages/reports/` | Informes sanitizados y versionados |
| `.github/workflows/ultra-sentinel-*.yml` | `.github/workflows/` + adapters | **Auditar triggers y permisos uno por uno**, NO copiar automáticamente |
| `ultra_sentinel_mutation.cjs` y fixtures | `tests/` + módulo propietario | Mantener categorías y oráculos |
| `app/src/main/.../voice/**`, Compose/UI, APK | **Se quedan en GameHub** | Sentinel solo publica contratos y pruebas externas |
| `supabase/**`, handlers CAR específicos y Mergify GameHub | **Se quedan en GameHub** | Sentinel puede auditar, no apropiarse del workflow CAR |

Este mapa es un **plan, no una garantía de equivalencia**. Los nombres históricos deben confirmarse contra un commit SHA estable antes de ejecutar cada traslado. Los tests/fixtures hardcodeados de `gamehub-ultra` requieren evaluación y no se deben cambiar silenciosamente.
