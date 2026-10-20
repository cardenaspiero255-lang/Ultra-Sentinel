# C2: PR #150 — registro causal provisional sobre el inventario histórico

**Fecha:** 2026-10-20. El sello Run23 permanece **intacto** y el corpus no incorpora nuevas etiquetas.

## Fuentes originales verificadas

El workflow [Run de overlay #39509828801](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39509828801) autenticó de forma independiente los metadatos, HEAD, SHA-256 de artefactos y permisos de las siguientes ejecuciones de propietario:

1. [Auditoría histórica Run23 #39498922958](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39498922958) — 23 identidades y blobs originales, 11 positivas y 12 negativas, `inventorySha256` del orden histórico.
2. [Recuperación de 10 recibos #39505160347](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39505160347) — oráculos Kotlin originales de 10 identidades, incluyendo las tres observaciones de GameHub #150.
3. [Adjudicación contrafactual #39507901311](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39507901311) — matriz factorial Kotlin original / reparación del historial / reparación de evidencia externa / ambas reparaciones, con controles benignos.

Se descargaron los tres archivos de evidencia originales sin ejecutar su contenido. El validador de `packages/quality-gates/c2-pr150-historical-causal-overlay.cjs` confirma el digest del inventario histórico, la concordancia exacta de `pr/commit/blob/ruleId/path/line/polarity` y vuelve a evaluar la matriz de confianza antes de emitir el overlay.

## Vista derivada, sin reescribir Run23

Se generan **tres anotaciones**, y ninguna cambia los datos de verdad histórica:

| Línea | Regla | Polaridad | Clasificación |
|---|---|---|---|
| 251 | `NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE` | Positiva | `PROVISIONAL_SHARED_FAMILY` |
| 252 | `ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION` | Positiva | `PROVISIONAL_SHARED_FAMILY` |
| 250 | `WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE` | Negativa | `NEGATIVE_CONTROL` |

Las dos guardas positivas se pueden reparar por separado, pero pertenecen **conservadoramente a una sola familia**, `RECOMMENDATION_CONFIDENCE_CALIBRATION`. Su huella usa el dominio `c2-provisional-family/v1`, deliberadamente distinto del dominio de causas acreditadas `c2-cause/v1`.

La línea 250 no constituye un defecto, carece de huella positiva y permanece como control negativo en todas las comparaciones. El mismo oráculo original de confianza aporta evidencia para las líneas 250 y 252; **no representa dos oráculos independientes**.

El nuevo archivo de salida `pr150-historical-causal-overlay.json` contiene una vista derivada de las 23 entradas con `causalAdjudication`, sin alterar los artefactos Run22, Run23 ni sus SHA.

## Lectura correcta de las cifras

- Antes: **21 identidades** sin grupo causal documentado en el informe histórico.
- Ahora: **2 positivos** con anotación de familia **provisional**; **19** permanecen sin anotación nueva, incluyendo el control negativo de línea 250.
- **21 causas siguen sin certificación de independencia**. No se convierte una familia provisional en un logro de las cuotas de diversidad.
- Corpus: **23/120** (11 positivas / 12 negativas). **0 GOLD nuevos**, 0 indicadores de benchmark calculados; HOLDOUT no congelado y SSS+ `NOT_CERTIFIED`.
- La prueba CI del overlay aprobó **758/758 pruebas Node** y tres verificaciones de archivo de origen.

**Siguiente trabajo**: usar estas relaciones en la cola de revisión sin contar como independiente lo que comparte familia; continuar las restantes causas originales y completar `BASELINE_INCOMPLETE` antes de evaluar precisión, recall o F1.
