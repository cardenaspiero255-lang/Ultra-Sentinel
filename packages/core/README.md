# Core — Motor de análisis

**Pendiente de migración.** Núcleo sin acceso de escritura a GitHub, Android o Sentry. Recibe snapshots/diffs ya acotados como **datos no ejecutables**, produce hallazgos con evidencia, incertidumbre y SHA.

API objetivo: `analyze({repository, headSha, files, limits}) -> analysis` determinista sin IO de red. La procedencia confiable la prepara un adaptador fuera de Core.

Prohibido: ejecutar scripts de PR, leer tokens/secretos, emitir aprobaciones y promover hallazgos incompletos a CLEAR. Migrar progresivamente `.github/scripts/ultra_sentinel_core.cjs` y sus tests **desde un SHA estable**, sin copiar todo `.github` sin analizar dependencias.
