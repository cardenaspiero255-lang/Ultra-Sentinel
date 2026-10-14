# Roadmap ejecutable de Ultra Sentinel — cinco bloques sin duplicar motores

**Corte actualizado:** `main@d5f5a347862777cee79a32d70468601b32b38f9b` (PR #39/#40/#41 fusionados). El estado fuente por cada capacidad está en [US-CAPABILITY-INVENTORY.md](US-CAPABILITY-INVENTORY.md); el [issue #5](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/5) permanece como histórico de ideas y propietarios.

## Bloque 1 — Autorización y recuperación de producción
- **Ya fusionado:** preflight GameHub [PR #37](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/37).
- **Abierto:** [PR #34](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/34), autorización del propietario Ed25519, nonce persistente y rollback transaccional.
- **Trabajo**: reconciliar la rama con `main`, integrar el verificador real (no callback arbitrario) con el preflight, E2E de autenticación y aislamiento de pruebas con permisos mínimos, CI adversarial y auditoría del último SHA.
- **Salida**: ninguna autorización falsa/tardía/reutilizada habilita commits; jamás merge por test verde únicamente.

## Bloque 2 — Paridad real del modo sombra
- Reusar `gamehub-live-reader`, `gamehub-shadow` y selector actual de [PR #38](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/38); no crear segundo observador.
- Quitar dependencia por defecto del antiguo PR GameHub #201 (los snapshots históricos se preservan).
- Evaluador de métricas **ya fusionado** en [PR #40](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/40): TP/FP/FN, precisión/recall/F1 sin certificación automática. Falta recopilar hallazgos **por regla, archivo, línea y SHA** sobre corpus real con etiquetas independientes y latencias verificadas.
- **Salida:** conjunto representativo con límites y resultados publicados; `BLOCKED_SOURCE_CI` ante falla heredada.

## Bloque 3 — Quality Gate, red team y evaluación externa
- Reutilizar Core, Family Hunter, memory ledger y pruebas adversariales existentes. Completar Mutation Lab portable, criterios ciegos, reproducibilidad y autorrevisión basada en `main` confiable.
- **Salida:** gates de exact HEAD, 0 P0/P1/P2 confirmados abiertos, resultados objetivos; sin declarar superioridad sobre competidores sin benchmark validado.

## Bloque 4 — Conectores Sentry, JARVIS y GameHub
- Adaptadores de **solo lectura** Sentry/JARVIS implementados en [PR #41](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/41); reutilizar lectores GitHub. Pendientes: token Sentry real, QA autorizado, consentimiento, privacidad E2E y transporte/versionado de incidentes.
- No migrar los componentes de voz, APK, UI o CAR específicos de GameHub.
- **Salida:** E2E autorizados, telemetría sanitizada, operación observable y reversión comprobada.

## Bloque 5 — Monitor supervisor y cutover reversible
- Checkpoint y outbox persistentes **en desarrollo en [PR #42](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/42)**; pendientes: despliegue/host real, health externo, entrega efectiva de alarmas, presupuestos, escalación, retención y supervisor externo.
- Pruebas de pérdida de red, reinicios, tareas duplicadas y alerta, con límites de gasto claros.
- Retirar código obsoleto de GameHub **solo tras** paridad y cierre de regresiones; conservar adaptadores de producto.
- **Salida:** evidencias operativas y auditoría de seguridad antes de cualquier etiqueta Triple SSS.

## Política común

- Cada bloque tiene prueba y responsabilidad propia. No reestructurar el repositorio, no duplicar motores ni asumir que un issue histórico implica entrega.
- Modo 2 de sugerencias por defecto; reparaciones solo con autorización específica revocable, nunca autofusión implícita.
- Todos los PRs se mantienen abiertos/draft mientras falten verificación final del HEAD, CI, integraciones operativas o revisión de hallazgos.
- Los PRs de origen solo respaldan procedencia; `main` del nuevo repositorio es el inventario de funcionalidad instalada.
- Codex excluido según política explícita del propietario. No agregar nuevos rulesets ni obligación de aprobación externa no solicitada.
