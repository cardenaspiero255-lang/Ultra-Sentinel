# C2: ampliar prospectivamente 44 PR públicos Android en 11 nuevos repositorios

**Cohorte fuente-libre preregistrada: 24-oct-2026 (Chile)**. Objetivo nominal **111** etiquetas adicionales; resultado de este proceso: **0 nuevas GOLD**. No se modifican las 17 reglas del Core ni se inspecciona ningún parche, cuerpo o título del PR.

## Procedencia reproducible

Los 169 PR del manifiesto histórico `C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json`, blob Git `abeba6b0be1d84f34fa9c2d2cfc4b4c211f48538`, se mantienen inmutables; 14 tuvieron inspección de código individual y 155 permanecen no inspeccionados. El ranking V3 verificado por el propietario, Actions `40148603915`, clasificó 148/155, 7 sin metadatos íntegros y **ningún candidato con indicio suficientemente específico**. La campaña anterior de 32 particiones `40149814845` solo admitió metadatos y no creó etiquetas.

Para recuperar diversidad externa, se consultaron **solo listados de PR de GitHub** de once repositorios Android externos, con `created_at` posterior a `2026-10-20T19:30:54Z` y no posterior al instante de corte `2026-10-25T00:44:00Z` (UTC), respetando límites predefinidos por repositorio. Se congelaron exactamente **44 identidades** antes de leer siquiera sus rutas modificadas, con estos campos y ningún otro: repositorio, PR, SHA base, SHA HEAD, fecha UTC, `source=PROSPECTIVE_GITHUB`, `disclosure=METADATA_ONLY`. Todos son SHA 40 hex distintos, y ningún repositorio se encuentra en la cohorte original ni en la lista de proyectos de entrenamiento/excluidos.

| Nuevo proyecto | PR sellados |
|---|---:|
| Element X Android | 14 |
| NewPipe | 8 |
| StreetComplete | 6 |
| Organic Maps | 5 |
| Thunderbird Android | 3 |
| AntennaPod | 2 |
| Aegis Authenticator | 2 |
| Fossify Gallery | 1 |
| Fossify Calendar | 1 |
| Fossify Camera | 1 |
| Material Files | 1 |
| **Total** | **44** |

Los 169 previos + los 44 nuevos arrojan **213 identidades PR únicas**; **199** PR aún reservados (155 + 44). Son identidades, no fallos, raíces causales distintas, ejemplos positivos ni negativos confirmados. Los desarrollos históricos conocidos (por ejemplo AnkiDroid, Tasks.org, Kotlin/Detekt y el mismo Ultra Sentinel) quedan fuera del registro.

## Validación de metadatos en paralelo

El flujo nuevo `.github/workflows/c2-44-new-external-metadata.yml` requiere PR con **CI `npm run check` verde**, fusión del documento de prerregistro por el propietario autenticado (actor GitHub 322222186) en `main` protegido y un **único permiso de ejecutar la consulta de metadatos** de esas identidades.

Ejecuta exactamente 44 consultas mediante **4 trabajadores paralelos**, cotejando la identidad `repository/pr/created_at/baseSHA/headSHA`. Proyecta de inmediato la API de archivos de cada PR mediante `jq` a `filename/status/blobSHA/additions/deletions/changes`; el texto crudo `patch`, títulos, cuerpos y código **no se guardan ni se envían a otros procesos de análisis**. Las listas paginadas deben coincidir con `changed_files` y contener rutas distintas; un SHA cambiado se registra como `DRIFT`, una lista incompleta como `INCOMPLETE`, cualquier fallo como `API_ERROR`. No se reajusta el SHA automáticamente.

El evaluador emplea el ranking histórico V3 de afinidades de **nombre de archivo y conteos de líneas añadidas**, con penalización/retención de PR de 100+ archivos. **Una afinidad no verifica regla exacta, prueba original ni ninguna fuga/vulnerabilidad**. Las 44 observaciones se consolidan en un único artefacto fuente-libre, después un job independiente coteja la identidad del run, propietario, artefacto y las 44 identidades congeladas, sin leer los parches.

## Oráculos/etiquetas — puertas futuras, nunca implícitas

El informe nuevo puede proponer un shortlist, pero **no autoriza código fuente ni ejecuta las 17 reglas**. Una liberación de fuente requiere **un PR de autorización individual por candidato**, con sus blobs SHA y permiso de `main` confirmado por el dueño. Luego hace falta probar que la regla congelada coincide en `ruleId/path/line`, ejecutar el test original fallo, corrección pasa y benigno pasa en sandbox sin credenciales/red, autenticar artefactos JUnit + Git y decidir independencia causal. Cada nueva etiqueta se sella antes de consultar predicciones de Ultra Sentinel o baseline. Un control distinto del detector comprueba el oráculo original.

Podrán programarse **varios candidatos en paralelo**, pero no pueden saltarse autorización individual ni certificar por repetir patrones sintéticos. Si no aparecen 111 ejemplos auténticos dentro del conjunto ampliado, el déficit permanece medido; **SSS+ continúa `NOT_CERTIFIED`**.

**Límite:** selección por fecha/repositorio no garantiza exclusión del conjunto de entrenamiento ni representatividad; la prueba de independencia de entrenamiento/causas pertenece al futuro gate específico. Las 44 identidades todavía no se consideran etiquetas y se mantienen reservadas.
