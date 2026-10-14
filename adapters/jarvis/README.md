# Adaptador JARVIS

**Implementación de lectura GitHub:** [jarvis-readonly.cjs](jarvis-readonly.cjs), fijada al repositorio `cardenaspiero255-lang/JARVIS` e ID inmutable. Verifica identidad del repositorio y recopila metadatos limitados de PR abiertos. No obtiene conversaciones, audio ni código de PR, y nunca concede permisos de escritura.

**No está desplegado como observador continuo.** Conectar desde un runner confiable con token de solo lectura y validar QA de fallos de permisos/API antes de crear alertas. El sistema de comandos de JARVIS es otra integración que exige autenticación y autorización de cada acción.

[Contrato, pruebas y criterios operativos](../../docs/operations/EXTERNAL-READONLY-ADAPTERS.md).
