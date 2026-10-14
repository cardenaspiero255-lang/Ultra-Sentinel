# Inventario único US-001—US-035 (código del repositorio independiente)

**Corte auditado:** `Ultra-Sentinel/main@056015fff8003e3cee996c295daab41497b0f40e`, 2026-10-14.  
**Origen conceptual:** [issue #5](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/5); **estado operativo** actualizado aquí. El issue es histórico, **no una fuente de implementaciones confirmadas**.

## Criterio de estado

- **implementado:** hay código ejecutable en `main` para el alcance indicado y tests relevantes. **No** equivale a despliegue, auditoría independiente o certificación Triple SSS.
- **parcial:** hay una pieza verificable, pero no el comportamiento completo con el alcance y evidencia requeridos.
- **pendiente:** no se ha acreditado implementación de esta capacidad en `main`; un archivo de README o un contrato inerte no acredita un adaptador funcional.
- El propietario del código Android/UI permanece en **GameHub**. No trasladar por duplicación.
- **PR #34 está abierto**: firma, nonce y recuperación solo se contabilizan como **rama candidata**, no como capacidad fusionada en `main`. El [preflight #37](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/37) ya existe en `main` y debe reutilizarse.
- Los historiales de PR no se cuentan como pruebas operativas del nuevo repositorio; para certificar se exige SHA, regresiones, evidencia adversarial y E2E real.

| ID | Capacidad | Estado en main | Responsable actual / prueba de código | Brecha para DONE |
|---|---|---|---|---|
| US-001 | Analizador offline de diffs | **implementado** | `packages/core/ultra_sentinel_core.cjs`; `tests/unit/ultra-sentinel-core-port.test.cjs` | Ampliar semántica y benchmark |
| US-002 | Severidad/confianza/evidencia | **implementado** | `packages/core/ultra_sentinel_core.cjs`; `packages/orchestrator/gamehub-github-evidence.cjs` | Calibración externa |
| US-003 | Benchmark etiquetado de reglas | **parcial** | `tests/unit/ultra-sentinel-core-origin.test.cjs`; `docs/migration/M8-RELEASE-GATES.md` | Dataset etiquetado, métricas y evaluación ciega |
| US-004 | Hook pre-commit opcional | **pendiente** | Futuro adaptador local; no reutilizar los hooks de GameHub sin auditoría | Instalación y tests aislados |
| US-005 | Grafo causal verificable | **parcial** | `packages/family-hunter/ultra_sentinel_family_fingerprints.cjs` | Causas raíz contrastadas con repros multiarchivo |
| US-006 | Memoria de playbooks | **parcial** | `packages/memory/ultra_sentinel_memory.cjs`, `ultra_sentinel_memory_ledger.cjs` | Procedencia acreditada; cero fixes externos certificados |
| US-007 | Frontier offline HTML/JSON | **pendiente** | Futuro `packages/reports/`; no atribuirlo al Core | Historial Git y exportador verificable |
| US-008 | Regression Investigator / bisect | **pendiente** | Futuro `packages/quality-gates/` | Bisect reproducible supervisado |
| US-009 | Hunter→Fixer→Judge | **parcial** | `packages/family-hunter/ultra_sentinel_family_hunter_modes.cjs`, `packages/recovery/repair-draft.cjs` | Juez independiente con veto real, E2E |
| US-010 | Propuesta de parche acotado | **implementado** | `packages/recovery/repair-draft.cjs`; `tests/unit/supervised-repair.test.cjs` | Solo propuestas; ejecución es otra capacidad |
| US-011 | Reproducción CI ligada a SHA | **parcial** | `packages/orchestrator/gamehub-live-reader.cjs`, `check-pr-provenance.cjs` | Manifiesto reproducible de falla CI |
| US-012 | Feedback humano ligado a SHA | **parcial** | `adapters/gamehub/ultra_sentinel_repair_authorization.cjs` | Firma real y recibo revocable, no confiar en callback |
| US-013 | Mutation Lab JavaScript | **pendiente** | No acreditado en `main` independiente; puede existir en GameHub | Portar solo fixtures/evaluador seguros y auditar |
| US-014 | Mutation Lab Kotlin opt-in | **pendiente** | Runner Android permanece en GameHub | Contrato explícito y opt-in probado |
| US-015 | OMEGA de voz/trazas | **pendiente** | `packages/contracts/` general, pero sin OMEGA integrado | Contratos Android reales y trazas de QA |
| US-016 | Autorrevisión desde fuente confiable | **parcial** | `packages/core/ultra_sentinel_core.cjs`, `docs/quality/GATES.md` | Gate autónomo comprobado, independiente del autor |
| US-017 | Informes trazables schema/SHA | **implementado** | `packages/reports/evidence-recommendations.cjs`, `packages/orchestrator/gamehub-shadow.cjs` | Sanidad/uso de reportes en producción pendiente |
| US-018 | Evidencia de revisores externos | **parcial** | `adapters/github/ultra_sentinel_review_integrations.cjs`, `scripts/gamehub-provider-observer.cjs` | No equivale a consenso ni aprobación independientes |
| US-019 | Cierre terminal de voz | **pendiente (Sentinel)** | Código Android pertenece a **GameHub** | Probar contrato, no migrar voz |
| US-020 | release() STT/TTS idempotente | **pendiente (Sentinel)** | Código Android pertenece a **GameHub** | Tests de regresión en dispositivo |
| US-021 | Ingesta Sentry autorizada | **pendiente** | `adapters/sentry/README.md` (solo descripción) | Adaptador real con auth y privacidad |
| US-022 | Correlación crash→APK/SHA | **pendiente** | Futuro `adapters/sentry/` + release GameHub | IDs de release verificables, E2E |
| US-023 | Breadcrumbs privados y consentimiento | **pendiente** | Instrumentación pertenece a producto (GameHub/JARVIS) | Política de consentimiento y retención |
| US-024 | Reproducción instrumentada Android | **pendiente** | Runner pertenece a **GameHub** | Dispositivo/emulador QA, trazas reales |
| US-025 | Diagnóstico causal con TDD RED | **parcial** | `packages/core/ultra_sentinel_remediation.cjs`; `tests/unit/family-hunter-adversarial.test.cjs` | Repro RED/GREEN por causa verificada |
| US-026 | Reparación TDD Android/Kotlin | **parcial** | `packages/recovery/repair-draft.cjs`; PR #34 para sandbox | Reparador Kotlin probado y autorizado |
| US-027 | Gate detectar→autorizar | **parcial** | `packages/recovery/repair-draft.cjs`; `adapters/gamehub/ultra_sentinel_repair_authorization.cjs` | Integrar identidad y firma reales de #34 |
| US-028 | Chaos/fuzz concurrencia/voz | **parcial** | `tests/unit/rollback-scratch-drill.test.cjs`; PR #34 con SIGKILL | Fuzz de voz/red/Android y verificación de proceso real |
| US-029 | OMEGA permisos/red/estado | **pendiente** | Pendiente de contrato GameHub | Pruebas cross-product |
| US-030 | Predicción calibrada de regresiones | **pendiente** | No se evidencia modelo calibrado en Core | Medir precision/recall/confianza |
| US-031 | Memoria dinámica revocable | **parcial** | `packages/memory/ultra_sentinel_memory_ledger.cjs` | Acreditar fixes y revocación antes de utilizar |
| US-032 | Benchmark ciego independiente | **pendiente** | `docs/migration/SSS-CERTIFICATION-SEQUENCE.md` (plan) | Conjunto reservado, terceros, FP/FN, latencia/coste |
| US-033 | Panel Sentinel en GameHub | **pendiente (Sentinel)** | UI pertenece a **GameHub**, `apps/control-plane/README.md` | API de estado / panel verificado, sin copiar UI |
| US-034 | Canary releases / rollback | **pendiente** | `docs/operations/RUNBOOK.md` (plan) | Pipeline/release reales y reversión supervisada |
| US-035 | Red Team supply chain/injection | **parcial** | `tests/unit/certification-adversarial.test.cjs`, `docs/security/THREAT-MODEL.md` | Campaña independiente/fixtures inéditos |

## Regla de reutilización y dependencias

1. **Reutilizar, no duplicar:** Core, Family Hunter, memoria, `gamehub-live-reader`, observador de proveedores y preflight GameHub de #37.
2. **Bloque 1 / PR #34:** sincronizar con `main` mediante integración sin sobrescribir #37; validar con TDD el vínculo *actor autenticado → firma sobre plan SHA-256 → autorización preflight GameHub*. El preflight aún recibe un `verifyAuthorization` inyectable: no equivale por sí mismo a atestación real.
3. **Modo sombra:** el observador de proveedores ya selecciona PR en vivo tras #38; `gamehub-shadow.yml` y `gamehub-readonly.yml` conservan defaults #201 y deben usar el selector **existente**, con `IDLE_NO_OPEN_PR` auditable.
4. **Paridad semántica:** los dos checks con nombre coincidente no demuestran igualdad; comparar findings con etiquetas de verdad por SHA, cobertura, FP/FN, regresiones y tiempo, sin declarar victoria por checks verdes.
5. **Interfaces pendientes:** Sentry, JARVIS, monitor/alertas y evaluador ciego deben integrarse por fronteras ya existentes, sin nueva arquitectura ni mover archivos Android.
6. **Cutover reversible:** mantener workflows y scripts de GameHub mientras no exista una equivalencia verificada. No fusionar/retirar componentes por simple recuento de tests.

**Criterio de certificación:** 0 hallazgos P0/P1/P2 confirmados, CI exacta sin gates saltados, pruebas hostiles nuevas, autorización verificable, auditoría independiente registrada y pruebas E2E operativas. **Estado de Triple SSS: NO CERTIFICADO**.
