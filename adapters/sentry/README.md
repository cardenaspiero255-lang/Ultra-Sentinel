# Adaptador Sentry

**Implementación de muestra de solo lectura:** [sentry-readonly.cjs](sentry-readonly.cjs). Consulta el endpoint de issues de organización de Sentry, limita respuestas y elimina stacks, mensajes, identificadores de usuario y otros datos privados de la salida.

**No está desplegado ni conectado a un proyecto real.** La muestra no certifica inventario completo, correlación APK/SHA, consentimientos ni monitorización 24/7. Requiere token de lectura `event:read`, slug de organización y project ID suministrados por configuración confiable. No almacenar secretos en Git.

[Contrato, pruebas y criterios operativos](../../docs/operations/EXTERNAL-READONLY-ADAPTERS.md).
