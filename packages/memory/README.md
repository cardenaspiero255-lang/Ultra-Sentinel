# Memoria auditada de errores — código instalado, sin aprendizajes inventados

**Componentes existentes en `main`:**
- `ultra_sentinel_memory.cjs`: cuatro *playbooks* curados y búsqueda determinista de solo lectura, con etiqueta explícita `curated_playbook`.
- `ultra_sentinel_memory_ledger.cjs`: schema separado de evidencias históricas, normalizador acotado y hashes de contenido. Por diseño, `verifiedEntries()` entrega cero arreglos históricos hasta disponer de una atestación real independiente con procedencia RED/GREEN.

**Buzón de cuarentena propuesto:** `ultra_sentinel_memory_quarantine.cjs` reutiliza `parseLedger`, `entryDigest` y `searchVerified` existentes. No abre conexión de red, no autoriza reparaciones y no crea un segundo motor. Cada afirmación externa de «fix verificado» se mantiene en `QUARANTINED`; devuelve solo ID, regla, dominio, SHAs y digest (no descripción, secretos o código). Una sugerencia de revocación sin autenticar solo puede excluir una propuesta, nunca promoverla. Las sugerencias de búsqueda siguen apuntando exclusivamente a playbooks curados.

**Limitación importante:** registrar candidatos NO es aprendizaje autónomo acreditado. Aún no hay correcciones históricas promovidas ni lista de revocación autenticada y persistente. Para habilitar aprendizaje de errores confirmados se necesitan: diffs y commits inmutables reales, demostración de test RED antes del fix y GREEN después, validación de CI desde la API oficial, control de cambios por revisión externa, digest de contenido fijado en `main`, caducidad y revocación verificable. No confiar en SHA o palabras de un bot sin esa cadena de prueba.

No importar el dataset masivo externo como «errores confirmados» ni subir textos privados, correos, conversaciones, token o códigos fuente confidenciales a artifacts públicos. No mezclar la memoria de Ultra Sentinel con la memoria personal de ChatGPT.
