# Vinculación Hunter → Fixer → Judge al SHA del propietario

**Alcance:** preflight local de la edición privada. El pipeline no tiene permisos de escritura remota, publicación ni merge. `NOT_CERTIFIED` hasta el E2E autenticado en un host autorizado con una reproducción real.

## Contrato de la vinculación

El objeto `plan` autorizado contiene `hunterFinding`: `{rule,path,line,familyId}`. Se incluye **dentro** del `planDigest` que el propietario firma por Ed25519 con `stableAuthorization` y `digestPlan(plan,changes)`. Alterar la regla, ruta, línea o familia **después de firmar** invalida la autorización. La pertenencia al plan no transforma por sí sola un hallazgo en una causa raíz demostrada.

Antes de crear el journal o consumir el nonce, la ruta de producción `scripts/run-owner-sandbox-repair.cjs` exige `requireRedGreenJudge:true` y `requireHunterEvidence:true`. El verificador `packages/recovery/hunter-repair-binding.cjs` comprueba:

1. Checkout Git desechable en directorio temporal, rama `sandbox/*`, sin remotos y worktree limpio.
2. `HEAD` exacto del plan y del contexto autorizado, archivo regular sin symlink ni hardlink.
3. `beforeBlobSha` del plan coincide tanto con el SHA del blob recalculado desde el archivo como con `git rev-parse HEAD:path`.
4. Construye exclusivamente a partir de **los bytes originales en Git** una representación completa de diffs `added` de los archivos del plan y reejecuta `Ultra Sentinel Core`; el input aportado por un atacante no puede elegir hallazgos arbitrarios.
5. `Family Hunter` genera la familia a partir del mismo análisis; la identidad `rule/path/line/familyId` debe existir exactamente una vez y el archivo formar parte del conjunto de cambios autorizado.
6. Cobertura completa y cero alertas truncadas; los blobs binarios, CRLF no soportado, archivos demasiado grandes o fuente ambigua se rechazan, no se etiquetan como limpios.
7. Sigue la secuencia autenticada RED→Fixer→GREEN→Judge y el rollback transaccional que ya existían; un veto recupera el árbol original cuando la reversión es segura y demostrable.

Esta detección sobre un archivo completo no demuestra que el defecto fue **introducido** en un PR ni que la propuesta lo solucione causalmente. Sirve para ligar un hallazgo existente al código y al plan firmado. La prueba RED independiente y el oráculo posterior siguen siendo imprescindibles.

## Evidencia TDD

- RED reproducido en CI: módulo ausente.
- GREEN: pruebas del nuevo módulo y prueba de integración sobre repositorio Git desechable con firma Ed25519 efímera, simulación de actor GitHub y fallo tipo `GlobalScope.launch`.
- Ensayo de veto: el Judge deniega una reparación y `sandbox-rollback` restaura el **tree SHA** del HEAD original.
- Credenciales reales del propietario, fuente real verificada de GameHub/JARVIS, validación en dispositivo, prueba de namespace Bubblewrap en host delegado y recibo SHA-bound de producción **no acreditados** por las pruebas anteriores.

**Siguiente frontera:** seleccionar una regresión legítima de GameHub/JARVIS que coincida con una regla conocida y cuyo test original falle sobre la versión antigua y pase sobre una corrección; probar la ruta completa en Bubblewrap con autorización individual de propietario. No adjudicar etiquetas de benchmark para ganar un umbral artificial.
