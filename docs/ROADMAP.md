> **Nuevo alcance aprobado (25-10-2026):** las 120 etiquetas, la distribución comercial y el benchmark público se excluyen de los requisitos de la edición privada. Preservar campañas anteriores, pruebas reales, autorizaciones, rollback, CI y verificación por SHA. El repositorio **no** se hará privado antes de finalizar. Véase [gates Private Edition](quality/PRIVATE-EDITION-RELEASE-GATES.md).

# Roadmap ejecutable de Ultra Sentinel — cinco bloques sin duplicar motores

**Corte actualizado:** `main@a251653f58641a90658ae2940266f11cec03ca7d` (PR #34/#42/#44/#46/#47 fusionados después de #39/#40/#41). El estado fuente por cada capacidad está en [US-CAPABILITY-INVENTORY.md](US-CAPABILITY-INVENTORY.md); el [issue #5](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/5) permanece como histórico de ideas y propietarios.

## Bloque 1 — Autorización y recuperación de producción
- **Ya fusionado:** preflight GameHub [PR #37](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/37).
- **Fusionado como código inactivo:** [PR #34](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/34), autorización Ed25519, nonce persistente y rollback transaccional. **No desplegado** con claves o token reales ni aislamiento probado en host autorizado.
- **Trabajo restante**: comprobar el flujo contra identidad/token real, recibos de auditoría externos y aislamiento Bubblewrap en el entorno autorizado; no otorgar permisos de escritura antes de esos gates.
- **Salida**: ninguna autorización falsa/tardía/reutilizada habilita commits; jamás merge por test verde únicamente.

## Bloque 2 — Paridad real del modo sombra
- Reusar `gamehub-live-reader`, `gamehub-shadow` y selector actual de [PR #38](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/38); no crear segundo observador.
- Quitar dependencia por defecto del antiguo PR GameHub #201 (los snapshots históricos se preservan).
- Evaluador de métricas **ya fusionado** en [PR #40](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/40): TP/FP/FN, precisión/recall/F1 sin certificación automática. Falta recopilar hallazgos **por regla, archivo, línea y SHA** sobre corpus real con etiquetas independientes y latencias verificadas.
- **Salida:** conjunto representativo con límites y resultados publicados; `BLOCKED_SOURCE_CI` ante falla heredada.

## Bloque 3 — Quality Gate, red team y evaluación externa
- **Implementación interna:** [PR #47](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/47) incorpora Mutation Lab sintético de ocho reglas y scorecard cuantitativo con umbrales fijos; faltan corpus ciego y revisores externos con etiquetas independientes. Reutilizar Core, Family Hunter y memoria.
- **Salida:** gates de exact HEAD, 0 P0/P1/P2 confirmados abiertos, resultados objetivos; sin declarar superioridad sobre competidores sin benchmark validado.

## Bloque 4 — Conectores Sentry, JARVIS y GameHub
- Adaptadores de **solo lectura** Sentry/JARVIS implementados en [PR #41](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/41); reutilizar lectores GitHub. Pendientes: token Sentry real, QA autorizado, consentimiento, privacidad E2E y transporte/versionado de incidentes.
- No migrar los componentes de voz, APK, UI o CAR específicos de GameHub.
- **Salida:** E2E autorizados, telemetría sanitizada, operación observable y reversión comprobada.

## Bloque 5 — Monitor supervisor y cutover reversible
- **Serverless desplegado con GitHub Actions:** [PR #42](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/42) fusionado, activación propietaria en [#44](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/44) y comprobación bajo demanda [#46](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/46). Primer baseline y dos ciclos de restauración reales acreditados; en cada cambio GitHub registra warning y job rojo intencionalmente. No equivale a supervisor 24/7, ni dispone de Sentry privado o monitor externo.
- Pruebas de pérdida de red, reinicios, tareas duplicadas y alerta, con límites de gasto claros.
- Retirar código obsoleto de GameHub **solo tras** paridad y cierre de regresiones; conservar adaptadores de producto.
- **Salida:** evidencias operativas y auditoría de seguridad antes de cualquier etiqueta Triple SSS.


## Bloque 6 — Memoria verificada y cuarentena

- Código curado y ledger histórico de evidencia ya en `main`; sin fixes históricos promovidos.
- Nueva cola de cuarentena de propuestas: no hay escritura, credenciales, promoción por un bot ni revocación autoconcedida. Los digests permiten revisar diferencias de contenido sin publicar consejos/secretos del PR.
- Requisito para pasar a `verified_fix`: auditoría externa del before/after, pruebas RED/GREEN ligadas a SHA inmutable y lista autorizada en `main`.

## Clasificación

**Triple S+ NO CERTIFICADO.** El scorecard sintético y los workflows verdes acreditan lógica interna. Siguen pendientes benchmarks blindados con etiquetas independientes, integraciones Sentry autorizadas, pruebas de reparaciones en un entorno aislado real, medición de fiabilidad a lo largo del tiempo y rollback operativo.

## Política común

- Cada bloque tiene prueba y responsabilidad propia. No reestructurar el repositorio, no duplicar motores ni asumir que un issue histórico implica entrega.
- Modo 2 de sugerencias por defecto; reparaciones solo con autorización específica revocable, nunca autofusión implícita.
- Los cambios de **lectura inactiva o modo sombra** pueden fusionarse con CI y auditoría exacta aprobadas sin afirmar despliegue. La **habilitación de reparación/escritura o certificación** continúa bloqueada si faltan integraciones operativas, identidad o pruebas hostiles reales.
- Los PRs de origen solo respaldan procedencia; `main` del nuevo repositorio es el inventario de funcionalidad instalada.
- Codex excluido según política explícita del propietario. No agregar nuevos rulesets ni obligación de aprobación externa no solicitada.
