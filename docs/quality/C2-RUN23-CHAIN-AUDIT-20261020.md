# C2 — reconciliación auténtica Run22 → Run23 (23 etiquetas históricas)

Fecha: 2026-10-20. PR #171. Sin nuevas etiquetas ni score.

## Evidencia de GitHub ejecutada

- Run22 propietario: [#39076132177](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39076132177), `SUCCESS`; commit `0633de8fec9e06c0249dae8e64cf127dba01b7ae`, artifact `12117067167`, digest del archive `sha256:7a77bdc5b53c18c24f87de5c754d094f008639020da1a31fbd67ae5815bf16cc`.
- Run23 propietario: [#39077240648](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39077240648), `SUCCESS`; commit `1c60224e114bb34b75f6268088b86e136fd378c0`, artifact `12117128918`, digest `sha256:31ea72b3231fe73fb97e815ff70d88f3a5ddeb1d7fd7a3324584de9b7fbe3400`.
- [Nueva auditoría de PR #171, run #39498507463](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39498507463): comprueba propietario y repository IDs, commits de los dos runs, metadata de artifacts y sus digests; descarga recibos inmutables. Ejecuta nuevamente `presealRun23()` sobre el Run22 original y dos witnesses originales #151/#152. Compara el contenido de la cadena, su digest y las 23 etiquetas. Recupera desde la API original de GameHub ocho commits y árboles Git, verifica cada sha original y el blob y ruta de **cada etiqueta**. Todas las operaciones son read-only.

### Resultado medido (CI auténtico, no fixture)

- Etiquetas históricas fuente: **23** (11 positivas / 12 negativas).
- Identidades en source tree Git con blob correcto: **23/23**.
- Grupos causales explícitos ausentes: **21**.
- Digests de evidencia individuales ausentes: **10**.
- Huellas causales duplicadas detectadas entre las que tienen `rootCauseGroup`: **0**. No interpretar como "23 causas independientes"; existen 21 causas sin agrupación acreditada.
- Veredicto: `CAUSAL_REVIEW_REQUIRED`, `historicalEvidenceAuthenticated=false` (el control actual no coteja todavía los 21 witnesses originales **individuales** contra cada artefacto original del encadenamiento completo).
- No hay nueva etiqueta GOLD ni muestra HOLDOUT. `newLabels=0`, `precision=recall=f1=null`, `tripleSPlusCertified=false`.

El artefacto `c2-run23-source-provenance-causal-audit` (id `12298808223`) contiene solamente metadatos sanitizados y el inventario reproducible de 23 identidades; ningún código original, secreto ni predicción de Ultra Sentinel.

## Próximos desbloqueos en el orden acordado

1. **Cerrar las 21 huellas causales faltantes y 10 recibos originales individuales**, recorriendo la cadena Run22→Run21→Run18→Run17… y los oráculos de sus SHAs originales, manteniendo `UNVERIFIED` cuando falte material. Los registros admitidos a desarrollo no cambian de clase por tener blob válido. Confirmar que dos líneas/rules no representan la misma causa.
2. **Cola de desarrollo**: utilizar los 106 candidatos públicos Kotlin solo si su prueba vulnerable/corregida es genuina, su regla propia existe y hay negativos originales. No usar 106 tareas como 106 etiquetas automáticamente.
3. **Cohorte futura**: preregistrar metadatos nuevos del repositorio externo, excluir GameHub conocido, Auto Sentinel y PR públicos revelados. `holdoutFrozen=false` hasta evidencia verdaderamente independiente.
4. **Benchmark**: resolver `BASELINE_INCOMPLETE`, comprobar cobertura de los mismos archivos y commits en baseline y candidato, y puntuar al menos 120 etiquetas (48 por clase) y métricas ≥95 % con no-regresión de FP. Ningún score es calculable ahora.
5. **SSS+**: pruebas owner-only de permisos, rollback E2E, Sentry privado, cron y auditoría final. Sigue `NOT_CERTIFIED` y no requiere dos humanos externos.

No actualizar el Core para perseguir resultados de un holdout que se pretenda ciego.
