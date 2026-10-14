# Certificación Triple SSS — Secuencia aprobada

## C1: Integración GameHub Ultra (en curso)
- Integrar **solo** `cardenaspiero255-lang/gamehub-ultra`. JARVIS queda fuera de los bloqueos de certificación hasta su creación y autorización.
- El primer adaptador acepta snapshots inertes, analiza con Core y produce informes **UNVERIFIED**, sin escritura.
- Para conexión real: instalar una GitHub App o workflow de solo lectura con autenticación de origen, comprobación de HEAD/base actuales, paginación completa de diffs, manejo de 403/429/5xx, redacción de secretos y control de permisos.
- Ningún informe del adaptador debe usarse como check obligatorio de aprobación hasta completar la etapa de evidencia real.

## C2: Modo sombra
- Ejecutar sobre PR reales y comparar con los revisores existentes: findings, severidad, falsos positivos, omisiones y cobertura. Conservar evidencia reproducible por SHA.

## C3: Autorreparación supervisada
- Diseñar ejecutor separado con aprobación explícita, scope mínimo, CAS de HEAD, branch aislada, diff validado y rollback. No fusionar automáticamente.

## C4: Auditoría independiente
- Revisión adversarial externa de inyección, permisos, rutas, integridad de evidencia y fallos operativos.

## C5: Validación operacional
- Ensayos E2E, protección de main, checks requeridos, alertas, continuidad y rollback.

**Regla de salida:** no declarar Triple SSS hasta que C1–C5 tengan evidencia verificable y no existan defectos bloqueantes. No usar Codex.
