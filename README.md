# Ultra Sentinel

**Estado actual: motor independiente de análisis y revisión en modo lectura, con migración funcional parcial. NO Triple SSS certificado.**

El repositorio contiene código real de **Core 2.0**, **Family Hunter**, memoria curada/ledger y observadores autenticados de GameHub en modo de solo lectura. Esto **no** demuestra equivalencia semántica con los revisores heredados, despliegue Sentry/JARVIS, monitoreo 24/7 o permiso de reparación remota.

## Capacidad instalada vs. pendiente

| Capa | Código ya disponible | Límite de seguridad |
|---|---|---|
| Core 2.0 y detección de hallazgos | `packages/core/ultra_sentinel_core.cjs` | Motor heurístico: requiere evaluación externa |
| Family Hunter y modos | `packages/family-hunter/` | Modo de commits no confiere escritura |
| Memoria y reportes | `packages/memory/`, `packages/reports/` | Sin fixes históricos acreditados externamente |
| Lector, proveedores y sombra GameHub | `packages/orchestrator/`, `scripts/gamehub-provider-observer.cjs` | Observación de PR, no equivalencia ni aprobación |
| Preflight de reparación GameHub | `adapters/gamehub/ultra_sentinel_repair_authorization.cjs` (PR #37) | Callback no equivale a una autorización firmada real |
| Autenticación firmada y rollback transaccional | [PR #34](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/34) en borrador | No fusionado ni certificado para uso operativo |
| Sentry, JARVIS, watchdog y alertas | Interfaces/planes, no despliegue verificado | Integración y E2E pendientes |

La **única matriz de capacidades** US-001…US-035 es [docs/US-CAPABILITY-INVENTORY.md](docs/US-CAPABILITY-INVENTORY.md). Distingue `implementado`, `parcial` y `pendiente` con archivo responsable y brecha. El [issue histórico #5](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/5) es un catálogo de ideas, **no** estado operativo de `main`.

## Flujo de trabajo

1. Inventariar y reutilizar las implementaciones fusionadas; no crear un segundo Core o Family Hunter.
2. Terminar PR #34 **integrándolo con el preflight #37**, actualizar contra `main` y acreditar identidad real, firma, nonce y recuperación aislada antes de fusionar.
3. Observar PR **vigentes** de GameHub con los workflows de solo lectura y contrastar hallazgos sobre un corpus etiquetado. **Los checks verdes no equivalen a precisión ni a certificación.**
4. Evaluar Quality Gate, benchmarks ciegos, seguridad y regresiones por SHA y artefactos reproducibles.
5. Integrar Sentry/JARVIS y monitorización externa únicamente tras definir scopes, límites, privacidad, despliegue y alertas verificadas; retirar workflows antiguos solo con cutover reversible.

## Estructura

```text
apps/             # procesos optativos, aún no desplegados como monitor 24/7
adapters/         # interfaces GitHub, GameHub, Sentry y JARVIS
packages/core/    # analizador heurístico portable
packages/family-hunter/
packages/memory/
packages/recovery/
packages/quality-gates/
packages/orchestrator/
packages/reports/
packages/contracts/
scripts/          # runners y verificadores explícitos
tests/            # unitarias, regresiones, adversariales
.github/workflows/
docs/            # inventario, arquitectura, runbooks y evaluación
```

## Verificación

Requiere Node.js >=22:

```sh
npm run check
```

Esta comprobación cubre el verificador de estructura y las pruebas configuradas en `package.json`, **no** certifica por sí misma permisos GitHub, equivalencia con GameHub ni fallos de producción.

## Límites de autorización y fusión

- Modo por defecto: `REVIEW_WITH_SOLUTIONS`. No auto-commit, auto-merge ni despliegue sin consentimiento específico.
- Los datos de PR, outputs de bots y plugins son **no confiables**; no se ejecuta código del PR dentro de un workflow privilegiado.
- Tokens, claves privadas y credenciales no se incorporan a Git ni a logs.
- Codex queda fuera de las revisiones del repositorio según la política del propietario; esto no desinstala una GitHub App.
- La UI y el runtime Android pertenecen a GameHub. Mantener compatibilidad hasta pruebas cruzadas y rollback reales.

Más información: [Roadmap](docs/ROADMAP.md) · [Plan migración](docs/migration/PLAN.md) · [Gates](docs/quality/GATES.md) · [Límites M8](docs/migration/M8-RELEASE-GATES.md).
