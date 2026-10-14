# C3 — Autorreparación supervisada: planificación, todavía no ejecución

`packages/recovery/repair-draft.cjs` valida manifiestos `repair-authorization/v1` y planes de cambio predefinidos: repositorio y PR exactos, SHA inmutable, validez temporal máxima de 15 min, rutas bajo `app/src/main/` o `supabase/functions/`, límites de archivos y bytes, y hashes de blobs antes/después.

El módulo produce **`REVIEW_READY_NO_EXECUTOR`**, con `commitAllowed:false` y `mergeAllowed:false` en todos los casos. No existe un canal de escritura hacia GameHub en Ultra-Sentinel. Tener un manifiesto sintácticamente válido **no** autentica la identidad humana, no consume un nonce, no garantiza CI y no equivale a permiso operativo.

Para completar C3 hace falta un ejecutor separado auditado, explícitamente instalado por el propietario con permisos de rama mínimos, comprobación CAS de HEAD, nonce persistente de un solo uso, revisión humana fuera del proceso, permisos expiran, controles por ruta, pruebas CI posteriores y rollback. Nunca efectuar merge automáticamente.

No ejecutar commits mientras haya check fallido `Trusted main Sentinel inspects Sentinel changes` en GameHub #201.
