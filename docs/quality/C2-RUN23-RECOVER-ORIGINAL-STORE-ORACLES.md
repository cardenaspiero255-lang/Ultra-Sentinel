# Run23 — recuperar oráculos originales del PR #124 sin reiniciar el corpus

## Origen y falla anterior

[PR #124](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/124) contiene dos pruebas históricas de GameHub Ultra preparadas sobre el baseline de 18 etiquetas. Su CI falló por una **constante incorrecta del digest preseal anterior**, por lo que no se fusionó ni acreditó ninguna de sus etiquetas. Las seis pruebas y auxiliares Kotlin de #124 se recuperaron **sin reformular los comportamientos originales** en una rama actual basada en el corpus de 21 etiquetas. La nueva verificación de recibos sustituye al antiguo bloque de 18: **primero Run22 auténtico de 21 (10P/11N), después las dos pruebas**.

## Dos identidades de comportamiento original

- **PR #152**, `AiProfileProposalStore.kt:41`, blob `ed936aa687b08cf8d964d54f9d88e68bb12344ec`, SHA-256 original `f06604f1bdd7bba80d060adac49d99d9edfb38234e47a91d2f861af3997435da`. Regla `STALE_PROPOSAL_VERSION_REPLACES_NEWER_ROLLBACK_STATE` (positivo): la llamada con versión 4 invalida el estado de rollback versión 5. Una copia temporal con rechazo de versiones obsoletas preserva versión 5. Causa `state_version_monotonicity`.
- **PR #151**, `SessionCoachSessionStore.kt:185`, blob `742e440004d51743e8e4b02c40171f951edfd125`, SHA-256 original `d8dbd5fadac170ed7b36c844f2480a03185046f381f64fd30feee0d20c219a70`. Regla `SESSION_ID_MISMATCH_REJECTS_FOREIGN_FINISH` (negativo): el cierre de una sesión distinta debe rechazarse. Una copia temporal que omite el guard debe fallar. Causa `session_ownership_guard`.

Los archivos y llamadas de producción de ambos PR se verifican por Git blob exacto y SHA-256 dentro del workflow, sin ejecutar scripts del repositorio histórico. Se ejecuta el Kotlin original en JVM confinada con AppArmor/Bubblewrap, sin red ni token, con ABI stubs explícitos. Solo después de validar comportamiento, contrafactuales y origen pueden incorporarse como **verdad histórica de desarrollo**, no como nuevos defectos de una cohorte ciega.

## Flujo y resultado esperado (nunca anticipado)

Workflow: `.github/workflows/c2-run23-two-original-store-truths.yml`, exclusivamente propietario desde `main`.

Prerequisito fijo: [GitHub Actions Run22 #39076132177](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39076132177), artefacto `12117067167`, sha256 `7a77bdc5b53c18c24f87de5c754d094f008639020da1a31fbd67ae5815bf16cc`, con **dos** archivos esperados (recibo y `158-witness.json`). Valida además owner ID, repo ID, HEAD workflow, y digest interno del recibo de 21.

Si el workflow pasa: **23 etiquetas originales de desarrollo** (11 positivas y 12 negativas), 97 restantes (mínimos adicionales de 37 positivas, 36 negativas, 24 de diversidad). Antes de esa ejecución: 21, no 23. Precisión, recall, F1 y FP non-regression quedan sin medir y `tripleSPlusCertified=false`. **No** actualiza el benchmark histórico congelado ni utiliza Run23 como holdout ciego.

Disparador autorizado, solo después de una fusión con CI verde: comentario exacto `ULTRA_SENTINEL_C2_RUN23_STORES_TRUTH_V1` en [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50).

## Desbloqueo escalable para los 97 restantes

1. Extraer candidatos de defectos originales Kotlin de diversos repositorios y releases, priorizando commit previo/corrección y pruebas upstream reproducibles. Fuente potencial: [DefextsKotlin](https://github.com/defexts/defexts) (225 casos declarados), pero su configuración histórica usa JDK 8 / Gradle 4.8 y debe verificarse individualmente hoy.
2. **No** contar proyectos Java de [Defects4J](https://github.com/rjust/defects4j) automáticamente como cobertura Kotlin de Ultra Sentinel; su aplicación depende de compatibilidad real de motor, archivos y reglas.
3. Congelar los metadatos de un nuevo conjunto prospectivo *antes* de abrir código/fix/predicciones del detector; separar a nivel repositorio, linaje Git, ruta y causa raíz. Caso expuesto a revisión se degrada irrevocablemente a **desarrollo**.
4. Para cada posible etiqueta: autenticidad commit Git/hash, origen/permiso de distribución, ejecutar suite original vulnerable frente a corregida, controlar flaky/reintentos, deduplicar causa y capturar witness sin predicción. Los negativos requieren fuente original íntegra más control adversarial/mutante.
5. Ejecutar comparaciones `rule/path/line` entre detector nuevo y baseline sobre **la misma** población admitida, y mantener resultados nulos hasta medir el gate del 95% y no-regresión de falsos positivos.

Estos pasos son un plan de ingeniería, no la certificación. Las etiquetas obtenidas del GitHub original por un mismo grupo histórico siguen sin constituir verdad independiente de un benchmark ciego.
