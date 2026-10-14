# ADR-0002 — Fronteras de confianza y autorización
**Estado:** aceptada como política; no implica permisos GitHub ya configurados.

## Decisiones irreversibles por defecto
- PRs, diffs, comentarios, issues, SDK externos, prompts, webhooks sin verificar, textos del modelo y artefactos descargados son **datos no confiables**.
- Ejecutar analizadores desde un commit confiable; no checkout/ejecutar HEAD no confiable con credenciales o privilegios.
- Roles separados: recolector de solo lectura, motor de análisis, auditor independiente, autorizador, writer de reparación, desplegador.
- Valores por defecto: `REVIEW_WITH_SOLUTIONS`, `repairCommitsEnabled=false`, `autoApproveEnabled=false`, `autoMergeEnabled=false`, `productionDeployEnabled=false`.
- Cuando falten checks del HEAD, aprobación, identidad, cobertura, estado del repo o cuotas: `INCOMPLETE` / **denegado**.

## Acción de reparación futura
Requiere credencial temporal derivada del propietario, vinculada a repositorio, PR, HEAD, scope, caducidad, nonce y presupuesto. Revalidar justo antes de escribir y registrar un acto de autorización auténtico. Una `repair-authorization.v1` emitida por el propio PR jamás es suficiente.
Separar PR/commit autorizados de **merge**; las protecciones de `main` permanecen activas y una fusión requiere controles y aprobación aplicables.

## Riesgos residuales
Compromiso de una app GitHub, dependencia de un parser, errores de límites, salida del modelo que suplanta instrucciones, bug en verificador, bucles de reparación. Mitigaciones documentadas en [modelo de amenazas](../security/THREAT-MODEL.md).
