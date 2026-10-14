# C2 — Primer modo sombra real, PR GameHub Ultra #201

SHA fijado: `3533a3005311833b47162f37f96bd0586c356eaf`.
Observación verificada con GitHub REST del 14/10/2026:
- 59 check runs: 54 success, 4 skipped, **1 failure**.
- Ambos checks de referencia `Sentinel Core / full regression suite` y `Ultra Sentinel Core — own reviewer` figuran success.
- El check **`Trusted main Sentinel inspects Sentinel changes`** marca failure, con `JS_CONTEXT_INCOMPLETE` en archivos JS de Sentinel. Es un fallo de acreditación de contexto, no una comprobación concluyente de error de código.
- El revisor Ultra-Sentinel en modo lectura mostró `ADVISORY` para PR #201, pero su diagnóstico semántico no es directamente equivalente al de la revisión protegida antigua.

El flujo programado `.github/workflows/gamehub-shadow.yml` recupera el análisis y los checks del SHA exacto cada seis horas; es de solo lectura y no ejecuta código del PR.
La comparación emite `BLOCKED_SOURCE_CI` ante cualquier check fallido. Ni éxito de checks ni acuerdo entre resultados prueban ausencia de bugs, y no constituye auditoría independiente.

**C2 aún no está certificado:** hay un check de GameHub fallido y faltan campañas representativas con comparación de detecciones, falsos positivos/negativos y revisores externos; no modificar ni fusionar el PR #201 de GameHub automáticamente.
