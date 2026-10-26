# Ultra Sentinel SSS+ Private Edition — política del propietario

**Decisión del 25-10-2026:** Ultra Sentinel se desarrolla para uso personal exclusivo. No se exige distribución pública, benchmark público, certificación comercial, evaluador humano externo obligatorio ni conseguir **120 etiquetas** para dar por terminada la edición privada.

El benchmark C2 de 120 etiquetas permanece como **protocolo histórico opcional**; no se alteran sus evidencias, firmas, estadísticas o controles internos. No fabricar muestras, hallazgos GOLD ni precisión/recall/F1 sin denominadores y oráculos reproducibles.

**Visibilidad:** el repositorio continúa **público durante el desarrollo** por indicación del propietario. Solo después de completar y verificar el alcance podrá cambiarse a privado mediante instrucción explícita y acción administrativa. No incluir secretos, tokens, claves, incidentes Sentry ni datos personales en GitHub. Hacer privado un repositorio no revoca clones anteriores.

## Evidencia necesaria para completar el alcance

La edición privada no usa un número arbitrario de etiquetas como gate. Requiere pruebas reales de funcionamiento, controles benignos, análisis causal, revisiones adversariales y CI reproducible vinculada a SHA, sin omitir autorizaciones ni rollback.

Los **13 controles** del módulo `packages/quality-gates/private-edition-readiness.cjs` son:

- `REAL_DIFF_DETECTION`: hallazgos reales con controles benignos.
- `CAUSAL_ANALYSIS`: causas reproducidas y separadas de simples correlaciones.
- `MEMORY_REVOCATION`: revocación de fixes históricos inválidos.
- `RED_GREEN_REPAIR`: fallo reproducible, reparación y test verde bajo aislamiento.
- `OWNER_AUTHORIZATION`: identidad real, firma, nonce, permisos mínimos y anti-replay.
- `HOST_ROLLBACK_E2E`: interrupción, rollback y recuperación en host real autorizado.
- `GITHUB_SHA_CI_PROVENANCE`: CI y revisión ligadas a SHA exacto.
- `GAMEHUB_INTEGRATION`: contrato cross-repo validado, sin copiar runtime Android.
- `JARVIS_INTEGRATION`: contrato y permisos validados.
- `SENTRY_INTEGRATION`: evento recibido con consentimiento y datos sanitizados.
- `MONITOR_ALERT_DELIVERY`: ciclo operativo y alerta efectivamente entregada.
- `SUPPLY_CHAIN_AUDIT`: aislamiento, dependencias y pruebas adversariales.
- `INVENTORY_ACCEPTANCE`: capacidad US-001 a US-035 cerrada o atribuida a producto propietario con prueba verificable.

## Informe local de evidencias

```sh
node scripts/evaluate-private-edition-readiness.cjs /ruta/absoluta/recibos.json
```

Contrato JSON: `schema="ultra-sentinel-private-edition-input/v1"`, `repository="cardenaspiero255-lang/Ultra-Sentinel"`, `headSha` exacto (40 hex), `openBlockingFindings` entero no negativo, `proofs` array de objetos `{control,headSha,runId,artifactSha256,result}`. Cada control es único, `result` solo `SUCCESS` o `FAILURE`, `artifactSha256` 64 hex, y `runId` entero positivo. Es un inventario **declarativo**, no un verificador de procedencia.

**Límite explícito:** incluso al informar los 13 `SUCCESS`, `realWorldEvidenceAuthenticated=false`, `releaseAuthorized=false`, `mergeAllowed=false`, `autoRepairAllowed=false` y `deploymentAllowed=false`. El recibo aislado no equivale a comprobar el run real con GitHub/Sentry/host. Solo una etapa posterior de autentificación externa podrá validar estas pruebas. No conectar este informe directamente a una acción de escritura.

## Orden de trabajo

1. Cambiar los criterios de producto: edición privada, sin meta obligatoria de 120.
2. Completar Core, Family Hunter, memoria y autorreparación supervisada.
3. Autenticar autorización del propietario, aislamiento y rollback real.
4. Verificar E2E de GameHub, JARVIS y Sentry.
5. Acreditar supervisión, alertas y recuperación.
6. Finalizar inventario US-001–US-035, seguridad y suite CI en SHA fijo, con cero P0/P1/P2 confirmados abiertos.
7. **Solo entonces** cambiar visibilidad a privado con decisión explícita del propietario.

`NOT_CERTIFIED` sigue siendo el estado técnico hasta disponer de pruebas adecuadas. El cambio de alcance no confiere derechos de merge o reparación.
