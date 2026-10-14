# Ultra Sentinel

**Estado actual: estructura preparada para la migración.** Este repositorio todavía **NO** tiene el motor de auditoría de GameHub Ultra, un agente de reparación, conexiones a Sentry/Jarvis ni monitorización 24/7 desplegada. Nada de eso debe interpretarse como operativo por la presencia de carpetas o esquemas.

## Objetivo
Plataforma independiente de análisis de código, revisión segura, detección de familias de errores y recuperación supervisada. Consumirá eventos de **GameHub Ultra** y **Jarvis** mediante interfaces versionadas y permisos mínimos.

## Estructura
```text
apps/                 # procesos optativos: watchdog y panel de control
adapters/             # adaptadores externos: github, sentry, gamehub, jarvis
packages/
  contracts/          # esquemas de intercambio versionados v1
  core/               # análisis puro del código y evidencias
  family-hunter/      # clasificación y familias (hipótesis vs pruebas)
  memory/             # playbooks auditables (no aprendizaje de datos no fiables)
  quality-gates/      # reglas de paso/bloqueo y revisión independiente
  orchestrator/       # coordinación sin poderes de GitHub implícitos
  recovery/           # propuestas y recuperación reversible
  reports/            # salidas sanitizadas y trazables
config/               # ejemplos inactivos, sin secretos ni permisos
docs/
  architecture/       # decisiones ADR y límites
  migration/          # migración gradual desde GameHub Ultra
  security/           # modelo de amenazas
  quality/            # tests y gates
  operations/         # runbooks, métricas y observabilidad
scripts/              # verificación de layout (sin red)
tests/                # pruebas unitarias, integraciones y E2E
.github/workflows/    # CI de estructura de mínimo privilegio
```

## Trabajo de migración
1. Estabilizar PRs de origen **por separado**; el **PR #197 no se importa en esta etapa**.
2. Migrar el código estable por capas, con TDD y CI de HEAD exacto.
3. Implementar integraciones externas **solo** tras verificar identidades, scopes y permisos.
4. Comparar modo sombra en GameHub hasta demostrar equivalencia y mantener rollback.
5. Cortar los workflows antiguos únicamente después de pruebas reales E2E.

Documentos: [Arquitectura](docs/architecture/OVERVIEW.md) · [Plan de migración](docs/migration/PLAN.md) · [Gates](docs/quality/GATES.md) · [Roadmap](docs/ROADMAP.md).

## Verificaciones del bootstrap
Requiere Node.js >=22. Solo usa dependencias estándar para las comprobaciones de estructura:
```sh
npm run check
```
Este comando valida **únicamente la estructura, los ejemplos y los contratos**, no demuestra que el motor de Sentinel esté migrado.

## Seguridad
- Por defecto `REVIEW_WITH_SOLUTIONS`, **sin commits automáticos, aprobaciones, autofusión ni despliegue**.
- No ejecutar código de un PR con privilegios; tratar diffs, logs, issues y plugins como datos no confiables.
- La protección de `main`, los controles obligatorios y la GitHub App deben configurarse y comprobarse explícitamente antes del despliegue.
- No añadir credenciales a Git, incluidas credenciales Sentry/Supabase o llaves privadas.

Issues: [#1](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/1)–[#5](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/5).
