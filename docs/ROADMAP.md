# Roadmap consolidado de Ultra Sentinel

La **fuente de ideas y alcance** son los issues públicos de este repositorio:

- [#1 — Ecosistema Jarvis + GameHub, vigilancia 24/7 y Autonomous Recovery](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/1)
- [#2 — Family Hunter, familias/variantes, modos y commits controlados](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/2)
- [#3 — Quality Gate SSS, análisis independiente, evidence, benchmarks](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/3)
- [#4 — Plugins, observación PR y automatizaciones](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/4)
- [#5 — Catálogo US-001…US-035 e IAF-01…IAF-07](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/5)

Orden de implementación seguro:
1. Bootstrap de estructura y CI (este PR).
2. Inventario exacto desde `main` estable de GameHub y extracción del motor Core.
3. Contratos y quality gates de lectura; integraciones por repo.
4. Family Hunter y memoria auditada, sin duplicados ni saltos de autorización.
5. Monitor/operaciones tras despliegue real y pruebas E2E.
6. Writer controlado solo si existe autorización separada, revocable y validación independiente.

**Excepción de alcance:** No importar el PR #197. El scaffold no equivale a haber migrado las 35 capacidades ni a nivel “Triple SSS”.
