# Aprobar reparación remota de JARVIS #105 con GitHub, sin Termux

**Alcance actual:** autorización del propietario desde un comentario en GitHub, verificada con un JWT OIDC **RS256 emitido por GitHub** y una lectura independiente del comentario original y de los SHA. A diferencia de la vía aislada del [PR #249](../quality/OWNER-ONE-APPROVAL-MOBILE.md), esta operación está vinculada a un PR remoto de JARVIS. **No elimina ni relaja la ruta Ed25519 anterior**, no autoriza merge y no autoriza rollback por sí misma.

## Principios

- Se mantiene el [PR de ensayo JARVIS #105](https://github.com/cardenaspiero255-lang/JARVIS/pull/105) en borrador. Los dos blobs Kotlin de origen, los blobs del candidato, HEAD, base, árbol y digest del plan están fijados. El plan es `COMMIT_TO_EXISTING_DRAFT_PR_BRANCH`, solo sobre `fix/ultra-sentinel-polite-voice-20261106`.
- El evento `issue_comment.created` tiene que proceder del usuario real `cardenaspiero255-lang` (ID `322222186`), en el issue **#50 de Ultra Sentinel**, y contener un mensaje exacto sin firmas o secretos. El `GITHUB_TOKEN` nativo de Ultra Sentinel se usa únicamente para lectura.
- El JWT OIDC de ese mismo workflow tiene que tener la audiencia exclusiva `urn:ultra-sentinel:one-owner-approval:jarvis-remote-105`, `workflow_ref` del default branch, issuer oficial, repositorio y propietario con ID inmutables, un `run_id`, intento **1** y vencimiento vigente. La clave pública se obtiene exclusivamente del JWKS oficial de GitHub.
- Se vuelve a consultar GitHub para comprobar que el comentario sigue íntegro, que el nonce **no aparece en otro comentario** (incluida la ruta de sandbox), que `main` de Ultra Sentinel coincide con el SHA del workflow y que el PR #105 y `main` de JARVIS conservan los SHA fijados. Si algo se movió, **fail closed**. El comando vence en un máximo de 15 minutos.
- La autorización OIDC no significa que se haya ejecutado el cambio. El recibo inicial solo confirma el alcance y mantiene `remoteWrites:false`.

## Uso desde GitHub o ChatGPT sin Termux

Una vez fusionado y validado `.github/workflows/owner-remote-jarvis-approval.yml`, el operador crea un **nonce nuevo aleatorio** y un vencimiento Unix en milisegundos dentro de los próximos 15 minutos. El SHA debe ser el `main` **actual** de Ultra Sentinel. La única forma de aprobación admitida es un comentario con esta estructura exacta en el [issue #50 de Ultra Sentinel](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50):

```text
ULTRA_SENTINEL_REMOTE_APPROVAL_V1|COMMIT_TO_EXISTING_DRAFT_PR_BRANCH|<SHA_ACTUAL_DE_ULTRA_SENTINEL_MAIN>|a36b79303c6f75b28564cd30fc4616053ed45f845ee3f92058dd1fcc31112aa4|<NONCE_ALEATORIO_NUEVO>|<VENCIMIENTO_UNIX_MS>
```

Se puede publicar directamente desde GitHub móvil o mediante el conector GitHub **solo si** la cuenta realmente autenticada es la del propietario. Una frase de chat como «te autorizo» no constituye por sí sola la autorización GitHub. El workflow se dispara solo por el comentario real. No copiar un comentario viejo ni reusar el nonce.

## Ejecución: controles explícitos y protección por defecto

El workflow se ejecuta inicialmente sin permisos `contents:write`; obtiene una prueba de autorización de **solo lectura**. La ejecución opcional en la rama remota está **deshabilitada por defecto**. Para habilitar el modo de preflight sin firma personal, el propietario tendría que configurar una vez en el repositorio Ultra Sentinel:

- Secret GitHub Actions `ULTRA_SENTINEL_JARVIS_OWNER_TOKEN`: token personal de duración acotada, con acceso **únicamente a JARVIS**, y el mínimo necesario: contenido lectura/escritura y lectura de PR. No pegar ni publicar el secreto, y usar el gestor de secretos de GitHub.
- Variable de repositorio `ULTRA_SENTINEL_GITHUB_REMOTE_ENABLED=true` para permitir preparar Bubblewrap, compilador Kotlin y la verificación adicional. **Sin esta variable no se ofrece ningún token de escritura al trabajo.**
- Dejar `ULTRA_SENTINEL_REMOTE_DRAFT_APPLY=false` mientras el mecanismo de rollback GitHub sin Termux no esté habilitado y verificado. Para permitir una escritura en el PR en borrador hace falta además una decisión **explícita** del propietario y `ULTRA_SENTINEL_REMOTE_DRAFT_APPLY_CONFIRMED=true`. No habilitar estas variables de escritura como un bypass de revisión.

Con el modo adicional habilitado, el ejecutor reobtiene la fuente Kotlin mediante API y Git blobs verificados, reconstruye el candidato, repite las cuatro combinaciones de Kotlin/JVM bajo Bubblewrap, exige la prueba adversarial y Judge local, revalida la autorización OIDC **dentro del mismo ejecutor**, autentica el token contra `GET /user` de GitHub y comprueba las referencias de destino antes de cualquier escritura. Solo un commit atómico a la rama del PR, con HEAD esperado, puede ser solicitado. No se escribe `main`, no hay auto-merge, ni cambio de visibilidad.

## Rollback y límites

El retorno a los blobs originales exige un **nuevo** consentimiento para `ROLLBACK_EXISTING_DRAFT_PR_BRANCH`, otro nonce y una verificación independiente del árbol resultante. Existe un [flujo separado de rollback con GitHub/OIDC](GITHUB-REMOTE-ROLLBACK-NO-TERMUX.md), además de la ruta anterior Ed25519; la existencia de ambos no demuestra que se haya ejecutado un rollback remoto real. Por seguridad, dejar el modo de escritura deshabilitado hasta verificar el preflight y ensayar la recuperación con las autorizaciones específicas. La existencia de un JWT OIDC o recibo local no sustituye la comprobación real de GitHub después de cada commit.

Este mecanismo no certifica Android físico, Sentry ni los 13 controles Private Edition. **Nunca publicar tokens, firmas, archivos de autorización o datos privados en comentarios, PR o artefactos.**
