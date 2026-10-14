# Política de seguridad
No depositar secretos ni reportes con información personal en PRs o issues públicos. Informar vulnerabilidades por el canal privado de seguridad del repositorio, si se habilita; si no existe, contactar al propietario mediante un canal privado fuera de GitHub Issues.

**Principio:** un analizador que inspecciona entrada no confiable no puede autorizarse, aprobar su propia reparación ni ejecutar código inspeccionado con permisos privilegiados.

En ausencia de SHA, cobertura, autorizaciones, controles o revisión independiente: **fallar cerrado**. Los incidentes de Android se procesan únicamente con datos mínimos y consentimiento conforme al proyecto de origen. La existencia de esta política no implica que branch protection o CodeQL estén configurados.
