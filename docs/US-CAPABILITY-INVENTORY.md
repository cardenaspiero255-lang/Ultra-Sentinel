# Inventario único US-001—US-035 (código del repositorio independiente)

**Corte de código:** `main@a251653f58641a90658ae2940266f11cec03ca7d`, 2026-10-15 (incluye #34, #42, #44, #46 y #47 después de #39–#41). Los gates operativos siguen pendientes.  
**Origen conceptual:** [issue #5](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/5); **estado operativo** actualizado aquí. El issue es histórico, **no una fuente de implementaciones confirmadas**.

## Criterio de estado

- **implementado:** hay código ejecutable en `main` para el alcance indicado y tests relevantes. **No** equivale a despliegue, auditoría independiente o certificación Triple SSS.
- **parcial:** hay una pieza verificable, pero no el comportamiento completo con el alcance y evidencia requeridos.
- **pendiente:** no se ha acreditado implementación de esta capacidad en `main`; un archivo de README o un contrato inerte no acredita un adaptador funcional.
- El propietario del código Android/UI permanece en **GameHub**. No trasladar por duplicación.
- **PR #34 fusionado:** firma Ed25519, nonce y recuperación en el código principal, **sin credenciales ni despliegue real**. El [preflight #37](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/37) se reutiliza; la autoridad externa y el aislamiento operativo siguen pendientes.
- Los historiales de PR no se cuentan como pruebas operativas del nuevo repositorio; para certificar se exige SHA, regresiones, evidencia adversarial y E2E real.

| ID | Capacidad | Estado en main | Responsable actual / prueba de código | Brecha para DONE |
|---|---|---|---|---|
| US-001 | Analizador offline de diffs | **implementado** | `packages/core/ultra_sentinel_core.cjs`; `tests/unit/ultra-sentinel-core-port.test.cjs` | Ampliar semántica y benchmark |
| US-002 | Severidad/confianza/evidencia | **implementado** | `packages/core/ultra_sentinel_core.cjs`; `packages/orchestrator/gamehub-github-evidence.cjs` | Calibración externa |
| US-003 | Benchmark etiquetado de reglas | **parcial** | `shadow-parity-metrics.cjs` y `sssplus-pre-screen.cjs` (#40/#47); corpus externo pendiente | Métricas ejecutables, falta corpus etiquetado independiente y evaluación ciega |
| US-004 | Hook pre-commit opcional | **pendiente** | Futuro adaptador local; no reutilizar los hooks de GameHub sin auditoría | Instalación y tests aislados |
| US-005 | Grafo causal verificable | **parcial** | `packages/family-hunter/ultra_sentinel_family_fingerprints.cjs` | Causas raíz contrastadas con repros multiarchivo |
| US-006 | Memoria de playbooks | **parcial** | `packages/memory/ultra_sentinel_memory.cjs`, `ultra_sentinel_memory_ledger.cjs` | Procedencia acreditada; cero fixes externos certificados |
| US-007 | Frontier offline HTML/JSON | **pendiente** | Futuro `packages/reports/`; no atribuirlo al Core | Historial Git y exportador verificable |
| US-008 | Regression Investigator / bisect | **pendiente** | Futuro `packages/quality-gates/` | Bisect reproducible supervisado |
| US-009 | Hunter→Fixer→Judge | **parcial** | `packages/family-hunter/ultra_sentinel_family_hunter_modes.cjs`, `packages/recovery/repair-draft.cjs` | Juez independiente con veto real, E2E |
| US-010 | Propuesta de parche acotado | **implementado** | `packages/recovery/repair-draft.cjs`; `tests/unit/supervised-repair.test.cjs` | Solo propuestas; ejecución es otra capacidad |
| US-011 | Reproducción CI ligada a SHA | **parcial** | `packages/orchestrator/gamehub-live-reader.cjs`, `check-pr-provenance.cjs` | Manifiesto reproducible de falla CI |
| US-012 | Feedback humano ligado a SHA | **parcial** | `gamehub-signed-preflight.cjs` y `gamehub-live-preflight.cjs` (#34) | Firma del propietario y recibo independiente reales aún sin probar |
| US-013 | Mutation Lab JavaScript | **parcial** | `packages/quality-gates/mutation-lab.cjs` (#47), 8 mutaciones sintéticas con Core real | Ejecutar una campaña de mutación sobre código real, con ground truth externo |
| US-014 | Mutation Lab Kotlin opt-in | **pendiente** | Runner Android permanece en GameHub | Contrato explícito y opt-in probado |
| US-015 | OMEGA de voz/trazas | **pendiente** | `packages/contracts/` general, pero sin OMEGA integrado | Contratos Android reales y trazas de QA |
| US-016 | Autorrevisión desde fuente confiable | **parcial** | `packages/core/ultra_sentinel_core.cjs`, `docs/quality/GATES.md` | Gate autónomo comprobado, independiente del autor |
| US-017 | Informes trazables schema/SHA | **implementado** | `packages/reports/evidence-recommendations.cjs`, `packages/orchestrator/gamehub-shadow.cjs` | Sanidad/uso de reportes en producción pendiente |
| US-018 | Evidencia de revisores externos | **parcial** | `adapters/github/ultra_sentinel_review_integrations.cjs`, `scripts/gamehub-provider-observer.cjs` | No equivale a consenso ni aprobación independientes |
| US-019 | Cierre terminal de voz | **pendiente (Sentinel)** | Código Android pertenece a **GameHub** | Probar contrato, no migrar voz |
| US-020 | release() STT/TTS idempotente | **pendiente (Sentinel)** | Código Android pertenece a **GameHub** | Tests de regresión en dispositivo |
| US-021 | Ingesta Sentry autorizada | **parcial** | `adapters/sentry/sentry-readonly.cjs`; `tests/unit/sentry-readonly.test.cjs` (PR #41) | Muestra mínima de issues implementada; faltan token real, proyecto, ingesta de incidentes y E2E |
| US-022 | Correlación crash→APK/SHA | **pendiente** | Futuro `adapters/sentry/` + release GameHub | IDs de release verificables, E2E |
| US-023 | Breadcrumbs privados y consentimiento | **pendiente** | Instrumentación pertenece a producto (GameHub/JARVIS) | Política de consentimiento y retención |
| US-024 | Reproducción instrumentada Android | **pendiente** | Runner pertenece a **GameHub** | Dispositivo/emulador QA, trazas reales |
| US-025 | Diagnóstico causal con TDD RED | **parcial** | `packages/core/ultra_sentinel_remediation.cjs`; `tests/unit/family-hunter-adversarial.test.cjs` | Repro RED/GREEN por causa verificada |
| US-026 | Reparación TDD Android/Kotlin | **parcial** | `packages/recovery/repair-draft.cjs`; PR #34 para sandbox | Reparador Kotlin probado y autorizado |
| US-027 | Gate detectar→autorizar | **parcial** | `gamehub-signed-preflight.cjs` y preflight #37 integrados (#34) | Falta E2E del propietario real, firma de auditoría y claves instaladas |
| US-028 | Chaos/fuzz concurrencia/voz | **parcial** | `tests/unit/owner-sandbox-flow.test.cjs` con SIGKILL (#34) | Fuzz Android y proceso Bubblewrap en host real |
| US-029 | OMEGA permisos/red/estado | **pendiente** | Pendiente de contrato GameHub | Pruebas cross-product |
| US-030 | Predicción calibrada de regresiones | **pendiente** | No se evidencia modelo calibrado en Core | Medir precision/recall/confianza |
| US-031 | Memoria dinámica revocable | **parcial** | `packages/memory/ultra_sentinel_memory_ledger.cjs` | Acreditar fixes y revocación antes de utilizar |
| US-032 | Benchmark ciego independiente | **parcial** | `packages/quality-gates/shadow-parity-metrics.cjs`; `docs/migration/C2-PARITY-CAMPAIGN.md` | Calculador TP/FP/FN/F1 fusionado, pero no hay ground truth independiente ni benchmark ciego |
| US-033 | Panel Sentinel en GameHub | **pendiente (Sentinel)** | UI pertenece a **GameHub**, `apps/control-plane/README.md` | API de estado / panel verificado, sin copiar UI |
| US-034 | Canary releases / rollback | **pendiente** | `docs/operations/RUNBOOK.md` (plan) | Pipeline/release reales y reversión supervisada |
| US-035 | Red Team supply chain/injection | **parcial** | `certification-adversarial.test.cjs` y `mutation-lab.test.cjs` (#47) | Campaña externa con fixtures inéditos, ataques en runner real |

## Regla de reutilización y dependencias

1. **Reutilizar, no duplicar:** Core, Family Hunter, memoria, `gamehub-live-reader`, observador de proveedores y preflight GameHub de #37.
2. **Bloque 1 / PR #34 fusionado:** la firma y el preflight conectado están presentes en `main`; **no hay** despliegue autorizado de claves, token real ni test de aislamiento Bubblewrap. No dar por activada la autorreparación.
3. **Modo sombra:** los workflows de #39 sustituyeron el default stale #201 por selección dinámica con `IDLE_NO_OPEN_PR`; no equiparar lectura de checks a paridad semántica.
4. **Paridad semántica:** los dos checks con nombre coincidente no demuestran igualdad; comparar findings con etiquetas de verdad por SHA, cobertura, FP/FN, regresiones y tiempo, sin declarar victoria por checks verdes.
5. **Interfaces y despliegue:** monitor GitHub Actions gratuito #42/#44/#46 **activado** con checkpoint y dos restauraciones reales (run IDs 38661847051, 38662164071 y 38662228134). Solo GitHub/JARVIS/GameHub de lectura; Sentry privado no conectado, cron sin SLA 24/7. No mover archivos Android.
6. **Cutover reversible:** mantener workflows y scripts de GameHub mientras no exista una equivalencia verificada. No fusionar/retirar componentes por simple recuento de tests.

**Criterio de certificación:** 0 hallazgos P0/P1/P2 confirmados, CI exacta sin gates saltados, pruebas hostiles nuevas, autorización verificable, auditoría independiente registrada y pruebas E2E operativas. **Estado de Triple SSS: NO CERTIFICADO**.
