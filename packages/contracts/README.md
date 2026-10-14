# Contratos versionados

Responsabilidad: **definir formatos interoperables**, nunca iniciar red, leer secretos ni elevar permisos.

- `schemas/incident.v1.schema.json`: telemetría mínima de GameHub/Jarvis/Sentinel.
- `schemas/review-result.v1.schema.json`: veredicto con SHA y estado de evidencia.
- `schemas/repair-authorization.v1.schema.json`: **estructura** de un permiso temporal; un JSON bien formado NO es una autorización auténtica.

Compatibilidad: versiones `v1` inmutables tras publicación; cualquier cambio incompatible crea `v2`. `$id` usa `.invalid` deliberadamente, NO es un endpoint. Validación criptográfica/autorización del emisor ocurrirá **fuera del esquema**, con fuente de confianza separada. No confiar jamás en `evidenceState: VERIFIED` proporcionado por un PR o servicio no confiable.

## Timestamp security contract

JSON Schema Draft 2020-12 `format: date-time` may be annotation-only. Consumers MUST validate `incident.observedAt` and `repair-authorization.expiresAt` with `isStrictRfc3339` from `packages/contracts/strict-rfc3339.cjs` **in addition to** schema validation, before trusting or persisting them. The validator rejects nonexistent calendar dates, leap-day errors, malformed offsets, and noncanonical timestamp strings. Repair authorization consumers MUST also verify expiry against a trusted clock, issuer authenticity, replay nonce, target SHA, scope, and budget; the bootstrap has no deployed writer or runtime gate. Do not treat regex-only schema acceptance as sufficient for authorization.
