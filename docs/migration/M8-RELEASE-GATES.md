# M8 — Auditoría de cierre y criterios de liberación

## Evidencia automatizada
La suite `npm run check` cubre contratos, Core, Family Hunter, memoria, recomendaciones y planificación supervisada. El test de integración de M8 verifica que un hallazgo real atraviesa la cadena sin conceder autoridad de escritura y que un diff incompleto se bloquea.

## Límites verificables
- El motor es heurístico, no un sistema de inteligencia general ni una garantía de cero defectos.
- La memoria histórica no tiene entradas de reparaciones acreditadas: el lector devuelve cero `verified_fix`.
- La integración con GameHub Ultra/JARVIS se limita a un contrato inerte. **No existe despliegue, webhook, GitHub App ni monitoreo 24/7 validado**.
- No hay ejecutor de commits, aprobación ni fusión automáticos.
- La CI del repositorio valida contratos y regresiones locales; no acredita por sí sola paridad operacional con GameHub ni pruebas E2E con credenciales.

## Bloqueos para declarar SSS operativo o retirar el sistema anterior
1. Pruebas E2E de GitHub App de lectura, firma, anti-replay, límites y errores de API en repositorios de ensayo.
2. Modo sombra sobre PR reales de GameHub, comparando hallazgos y cobertura contra origen.
3. Validación de reglas de protección de main, checks obligatorios, alertas y permisos efectivos.
4. Integración JARVIS autorizada y probada con scopes mínimos.
5. Auditoría independiente de procedencia, ataques de inyección y ejecución; plan de rollback comprobado.
6. Implementar y auditar por separado el ejecutor supervisado antes de conceder escritura.

**Decisión:** el alcance de migración de módulos de lectura puede cerrarse con CI verde; el cutover productivo queda expresamente BLOQUEADO hasta demostrar los seis criterios.
