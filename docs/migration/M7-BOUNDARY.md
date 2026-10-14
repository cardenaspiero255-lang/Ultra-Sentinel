# M7 — Contrato de integración sin privilegios

Este bloque define exclusivamente mensajes inertes entre Ultra-Sentinel, GameHub Ultra y JARVIS. **No hay despliegue ni GitHub App conectada**.

- Lista cerrada de repositorios; HEAD SHA exacto y contrato v1 validado.
- Toda evaluación es `UNVERIFIED` hasta que un verificador independiente y auditado compruebe la CI y la procedencia.
- No aceptar `CLEAR`, tokens, webhooks, commits, merges ni autorizaciones de ejecución desde este adaptador.
- Futuro adaptador GitHub: credenciales de mínimo privilegio, firma de eventos, protección contra replay, base/head verificados, rate limits, privacidad, fallos API y pruebas E2E antes de habilitarlo.
- JARVIS debe conectarse solo con consentimiento y permisos explícitos del propietario.
