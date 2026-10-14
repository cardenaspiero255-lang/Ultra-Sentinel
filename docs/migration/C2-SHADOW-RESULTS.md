# C2 — Registro histórico del primer modo sombra (GameHub PR #201, cerrado)

SHA fijado: `3533a3005311833b47162f37f96bd0586c356eaf`.
Observación verificada con GitHub REST del 14/10/2026:
- 59 check runs: 54 success, 4 skipped, **1 failure**.
- Ambos checks de referencia `Sentinel Core / full regression suite` y `Ultra Sentinel Core — own reviewer` figuran success.
- El check **`Trusted main Sentinel inspects Sentinel changes`** marca failure, con `JS_CONTEXT_INCOMPLETE` en archivos JS de Sentinel. Es un fallo de acreditación de contexto, no una comprobación concluyente de error de código.
- El revisor Ultra-Sentinel en modo lectura mostró `ADVISORY` para PR #201, pero su diagnóstico semántico no es directamente equivalente al de la revisión protegida antigua.

**Nota de vigencia:** la primera campaña fue sobre #201 y se conserva exclusivamente como evidencia histórica. El workflow de modo sombra selecciona ahora un PR *abierto* de GameHub mediante el selector ya existente de proveedores (manual: número explícito; programado: `auto`). Si no existen PR abiertos, informa `IDLE_NO_OPEN_PR`; no reutiliza silenciosamente #201. La comparación es de solo lectura y no ejecuta código del PR.
La comparación emite `BLOCKED_SOURCE_CI` ante cualquier check fallido. Ni éxito de checks ni acuerdo entre resultados prueban ausencia de bugs, y no constituye auditoría independiente.

**C2 NO certificado:** el resultado fallido del #201 es **histórico**, no representa necesariamente los checks de un PR actual. Siguen pendientes campañas representativas y comparación de findings, falsos positivos/negativos, cobertura y revisores externos. No modificar ni fusionar PR de GameHub desde modo sombra.
