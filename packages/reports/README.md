# Reports / evidencias portables

Emitir JSON/SARIF o resúmenes sanitizados con esquema, ID de incidente/PR, SHA, versión de motor, fecha, estado y límites. Nunca incluir audio, credenciales, trazas privadas o contenido de código sensible sin consentimiento/controles explícitos.

Las métricas de benchmarks y los tests internos no equivalen automáticamente a certificación SSS. La ausencia de evidencia produce `INCOMPLETE`, no confianza elevada.

El exportador Frontier recibe el JSON de Ultra Sentinel Core y emite un resumen de cobertura y hallazgos vinculados al SHA. Incluye la ubicación, regla, severidad y confianza de cada hallazgo.

```sh
node scripts/export-frontier-report.cjs json core-report.json > frontier.json
node scripts/export-frontier-report.cjs html core-report.json > frontier.html
```
