# ADR-0001 — Separación de repositorios y Clean Architecture
**Estado:** aceptada como estructura objetivo; implementación pendiente.

## Contexto
Ultra Sentinel nació como scripts/workflows en `cardenaspiero255-lang/gamehub-ultra`. Ese acoplamiento ocasiona compilaciones Android y cambios de seguridad compartidos para revisiones de motor, y dificulta supervisar Jarvis sin dependencias cruzadas.

## Decisión
- Ultra Sentinel se desarrolla en `cardenaspiero255-lang/Ultra-Sentinel` como producto independiente, con módulos Core, contratos, adaptadores, gates, memoria, recuperación y operaciones.
- Las dependencias apuntan **hacia contratos y lógica pura**, nunca Core → API externa.
- Los conectores de GameHub/Jarvis tienen interfaces y pruebas propias; ningún servicio comparte una clave de administrador universal.
- Los checks de ambos proyectos deben integrarse sin desactivar la protección de `main`.

## Alternativas descartadas
- Monorepo continuo: más simple inicialmente, pero demasiado acoplado a CI Android y permisos.
- Copiar todo `.github` sin clasificación: peligroso por rutas absolutas, hardcodes de repo/SHA, workflows privilegiados y tests históricos.
- Reescribir el motor en un lenguaje nuevo al extraer: riesgo alto sin mejora funcional demostrada.

## Consecuencias
Más flexibilidad de despliegue y CI por módulo; también se añade trabajo de contratos, versionado, compatibilidad, credenciales y pruebas E2E entre repositorios. Comparación en modo sombra obligatoria antes de desactivar el flujo viejo.
