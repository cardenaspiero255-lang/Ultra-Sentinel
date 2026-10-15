# C2 — benchmark empírico parcial del propietario

**Objetivo:** validar el comportamiento real de Ultra Sentinel sin segundo humano y sin inventar etiquetas ni métricas.

## Evidencia auténtica e inmutable

- Captura del candidato: [Actions #38800582701](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38800582701), artefacto `12004770556`, SHA-256 de `c2-candidate.json`: `134ac2f6e71bb6f9e3ab76d76c82a26a1d09c63c32b8b2089b707212dcdea931`.
- Comportamiento del código original #73: [Actions #38815014127](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38815014127), artefacto `12009932922`, SHA-256 de `c2-owner-witness.json`: `42628481dc3cea6f44b15accc376ad33ea3afb9dc9e04667b9277f973219f711`.
- Paquete original: cuatro PR (#132, #159, #161, #73), SHA-256 canónico `a4962a2decfceb0236c327a2a5c622644b7a9f8b67690cbed789e0471986ec08`.

El workflow `.github/workflows/c2-owner-observed-benchmark.yml` verifica cada run original por ID, repositorio, actor, evento, workflow, SHA, estado y artefacto antes de descargarlo. El CLI `scripts/evaluate-c2-owner-observed.cjs` comprueba el SHA-256 **byte a byte** y la identidad congelada completa. Rechaza archivos extraños, rutas relativas, enlaces simbólicos, cobertura parcial, CI incompleta, anomalías de estructura y recibos de evidencia alterados. **No ejecuta código de los PR ni recibe credenciales de escritura.**

## Resultados y límites

En GameHub #73, el código original reprodujo un error: presentó un artículo musical sobre «Cielo azul» como referencia confiable para explicar el color atmosférico. Ultra Sentinel detectó **0** findings en ese PR, es decir, **0 de 1 casos conocidos detectados**; esto no equivale al recall global del motor.

La alerta `BLOCKING_ANDROID_CALL` de #161 permanece **sin verificar** y no puede etiquetarse FP ni TP por simple intuición. Los dos controles positivos/negativos del ensayo #73 son aserciones de comportamiento, no etiquetas independientes `(rule,path,line)` adicionales. No se fabrica un conjunto de 120 casos.

El resultado JSON publica `benchmark.precision=null`, `benchmark.recall=null`, `benchmark.f1=null`, `baselineComparable=false` y `verdict=INSUFFICIENT_REAL_BENCHMARK_EVIDENCE`. Requisitos pendientes: 120 etiquetas reales contrastadas, al menos 48 positivas y 48 negativas, familias representativas, salidas del revisor heredado en idénticos SHA y resolución de las alertas sin verificar. **Un conjunto pequeño o sesgado no permite afirmar ≥95% de calidad.**

## Ejecución

CLI local, sin red:

```sh
node scripts/evaluate-c2-owner-observed.cjs /abs/c2-candidate.json /abs/c2-owner-witness.json
```

En `main`, el propietario puede ejecutar workflow `Ultra Sentinel — C2 owner evidence benchmark (no external reviewer)` manualmente, o comentar exactamente `ULTRA_SENTINEL_C2_BENCHMARK_V1` en el [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50) desde su cuenta GitHub. El workflow produce el artefacto sanitizado `ultra-sentinel-c2-owner-benchmark-partial`.

**Solo el propietario controla autorizaciones.** Ningún humano externo es obligatorio. No activar fusión, reparación o certificación por tener un informe de benchmark parcial.
