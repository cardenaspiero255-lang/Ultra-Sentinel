# Adaptador Sentry

**Pendiente de integración real.** Consumir solo incidentes autorizados y minimizados: fingerprint, proyecto, release/SHA, categoría, frecuencia, entorno y timestamps. No almacenar stacks privados completos, tokens ni audio por defecto.

Control de consentimiento y credenciales exclusivamente en entorno/secret manager; correlación con GitHub Actions o despliegues verificables. Sentry puede detectar crashes, pero el fallo silencioso de micrófono exige health checks del producto.
