# C1 — Lectura autenticada real de GameHub Ultra
El flujo `.github/workflows/gamehub-readonly.yml` corre en `main` o por ejecución manual, con `GITHUB_TOKEN` efímero del job y `permissions: contents: read`. No hace checkout ni ejecuta código de PR de GameHub, no utiliza endpoints de escritura, no fusiona y no publica comentarios.

Controles implementados:
- Destino GitHub API fijo y allowlist `cardenaspiero255-lang/gamehub-ultra`; conexiones HTTPS sin redirecciones.
- Token obligatorio y solicitudes GET únicamente; respuestas JSON limitadas, plazo máximo y errores bloqueantes.
- Metadata del PR verificada antes y después de leer **todas** las páginas de archivos. Rechaza cambios en HEAD, base, cantidad y repo.
- Hasta 300 archivos; nombres únicos, estadísticas de líneas añadidas/eliminadas cotejadas con el parche. Rechaza parches ausentes, truncados y tamaños excesivos.
- Informe solo de lectura; `evidenceState: UNVERIFIED` hasta la auditoría independiente de CI/autor.
- Salida de CI incluye únicamente SHA, estado y conteos; nunca publica código ni token.

Límites: el token de Ultra-Sentinel únicamente permite consultar recursos públicos o autorizados; los diffs de GitHub no son una certificación criptográfica de integridad de código fuente, ni prueban ausencia de vulnerabilidades. Queda pendiente validar en un workflow real de GitHub, incluyendo manejo de 401/403/429/5xx, las protecciones de rama, modo sombra, y rollback.
