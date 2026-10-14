# Arquitectura objetivo — Ultra Sentinel independiente

## Estado y no-objetivos
La infraestructura actual es un **scaffold con CI de estructura**. No hay motor migrado, endpoints, watchdog desplegado ni compatibilidad E2E acreditada. El PR #197 está **expresamente fuera** de esta etapa.

## Topología lógica
```text
                    ┌── GameHub Ultra ── Sentry / Android / CI ──┐
                    │                                           │
   Jarvis ──────────┤            mensajes versionados           ├────> adapters/
   (voz/orquestación)└───────────────────────────────────────────┘           |
                                                                            v
 apps/monitor (futuro) → contracts/ → core/ → family-hunter/ → reports/
                       └───────────→ quality-gates/  ↗
                                     |              |
                         orchestrator/ → recovery/  (propuestas)
                                     |
                  autorizador separado → reparador aislado (futuro, opt-in)
```

## Regla de dependencias
1. `packages/contracts` es la capa más estable, sin dependencias hacia productos ni infra.
2. `packages/core` y `packages/family-hunter` no deben importar `adapters/*` ni `apps/*`; reciben datos normalizados como argumentos.
3. `packages/memory` acepta solo evidencias verificadas por mecanismo externo y expone sugerencias, no permisos.
4. `packages/quality-gates` valida reportes/evidencias, pero NO es el actor que publica cambios.
5. `packages/orchestrator` combina funciones abstractas, presupuesto y colas; sin secretos ni permisos implícitos.
6. `packages/recovery` prepara propuestas y estrategias reversibles. Un **writer de reparaciones** es un componente separado por identidad y autorización, no un método genérico de Core.
7. `adapters/*` resuelve API, autenticación, cuotas y cambios externos; `apps/*` compone y despliega procesos opcionales.

## Eventos y autoridad
- **Evento** (incidencia o observación): datos no confiables salvo procedencia autenticada externamente; contrato `incident.v1`.
- **Diagnóstico**: evidencia, hipótesis, incertidumbre y SHA; no contiene permiso para escribir.
- **Review-result**: informe de lectura, no equivale a aprobación GitHub.
- **Repair-authorization**: esquema describe campos; solo identidad independiente y política externa hacen real la autorización.
- **Jarvis** puede ordenar diagnósticos pero no autorizar en nombre del propietario.

## Límites por producto
- GameHub Ultra conserva todos los artefactos Android y su ciclo CAR específico.
- Jarvis conserva la interfaz de voz y su razonamiento conversacional.
- Sentinel conserva motor, calidad, datos sanitizados, métricas de revisión y decisiones de seguridad auditadas.

Leer [ADR-0001](ADR-0001-boundaries.md), [ADR-0002](ADR-0002-trust.md), [ADR-0003](ADR-0003-versioned-contracts.md), [plan de migración](../migration/PLAN.md).
