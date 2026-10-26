# Revisión de la edición privada — 26-10-2026

Base inspeccionada: `bfbf8eb181d588bc73cce9ab67598997a3035e50`.
Alcance: suite local completa, estado de PR, ejecuciones recientes del observador,
control de entrega de reparaciones, auditor de latidos y coherencia documental.
No es una auditoría exhaustiva ni certifica las 35 capacidades.

## Evidencia comprobada

- La base pasó `npm run check`: 1.116 pruebas, cero fallos y cero omitidas.
- No había PR abiertos al iniciar esta revisión.
- El [run 40396977618](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40396977618)
  del observador terminó correctamente sobre la base indicada. Se verificaron sus
  pasos de pruebas, restauración, observación y persistencia del checkpoint.
- La autorización OIDC, aprobación única, antirreplay, reparación Kotlin registrada
  y rollback ya están en el código principal. Su presencia no autoriza operaciones nuevas.
- La consulta autenticada `actions/runs?event=schedule&per_page=100` muestra un
  intervalo de **443,33 minutos (7 h 23 min 20 s)** entre los runs
  [40288339643](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40288339643)
  y [40347370464](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40347370464).
  El auditor, con corte `2026-10-26T21:15:00Z`, devuelve `SCHEDULE_GAP`, cinco
  muestras en 24 horas y cero ejecuciones fallidas. El cron de 30 minutos no
  demuestra continuidad; no se atribuye la causa del intervalo sin investigación.

## Defectos reproducidos y corregidos en este cambio

1. `registered-pr-handoff`: un check adicional pendiente, `stale` o indeterminado
   podía coexistir con `PR_REVIEW_READY_NO_AUTO_MERGE`. Ahora bloquea la entrega.
   Los checks obligatorios siguen exigiendo un único éxito del SHA exacto.
2. El mismo conjunto válido de archivos se rechazaba si GitHub lo devolvía en otro
   orden. Se verifica por rutas, manteniendo exactamente dos archivos.
3. El archivo de regresión podía carecer de una identidad Git válida. Se exige SHA
   hexadecimal de 40 caracteres; esto no autentica por sí solo su contenido.
4. `scheduled-heartbeat-audit`: `Date.parse` normalizaba fechas imposibles como
   30 de febrero o 24:00. Se comprueban los campos de calendario originales.

Las regresiones se ejecutaron primero contra la implementación anterior y fallaron
por estos defectos. Los controles de escritura, fusión y despliegue permanecen cerrados.
Verificación local del cambio: `npm run check`, **1.121 pruebas aprobadas, cero fallos
y cero omitidas**, Node.js 24.22.1. La CI configura Node.js 22 y debe verificarse
separadamente sobre el SHA del PR.
La [CI 40402215290](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40402215290)
pasó en `9c11403bf55d28b6b2d8ef667e5726a201909614`; cualquier commit posterior
requiere su propia CI. No reutilizar este resultado para autorizar otro HEAD.

## Brechas operativas que no cierran los tests locales

| Área | Pieza disponible | Evidencia pendiente para finalizar |
|---|---|---|
| Detección y causalidad | Core, Family Hunter y oráculos de regresión | Matriz de aceptación por capacidad y ejemplos representativos vigentes; no se exige cifra de 120 etiquetas |
| Memoria | Ledger y revocación | Uso de fixes acreditados y revocación en el flujo real |
| Reparación supervisada | Planes registrados, OIDC, nonce, sandbox y rollback | Autorización específica vigente, recibos del host y revisión de cada parche |
| Procedencia CI | Lectores y gate de entrega | Listados completos autenticados y relectura terminal del HEAD; la función pura recibe metadatos, no consulta GitHub |
| GameHub | Observadores y reparación registrada de batería | Aceptación funcional del producto y contratos del SHA que se entregue |
| JARVIS | Adaptador de lectura y observación GitHub | Incidente de voz y recuperación E2E con evidencia del producto |
| Sentry | Lectura minimizada, cifrado y smoke opt-in | Conectividad/configuración real de Sentinel, recepción y correlación de evento; un token configurado en otro repo no demuestra esto |
| Alertas | Outbox, checkpoints y monitor programado | Entrega y acuse del destino externo; observador independiente ante ausencia de ejecuciones |
| Cadena de suministro | Pruebas adversariales y aislamiento | Validación operativa del entorno final y revisión de permisos |
| Inventario | US-001–US-035 histórico | Reconciliar cada capacidad con código, propietario y prueba actual; no marcar DONE por recuento de tests |

El hook local, exportador Frontier, modelo predictivo calibrado y pipeline canary
no quedan implementados por esta revisión. Las capacidades Android permanecen en
GameHub/JARVIS; este PR no modifica esos repositorios. El inventario del 15-10 se
conserva como corte histórico, sin convertir pendientes en éxitos declarativos.

Prioridad de cierre: validar este PR por CI; reunir los recibos operativos de
autorización/rollback e integración; verificar Sentry y entrega externa; cerrar la
matriz de aceptación. No cambiar la visibilidad ni afirmar `SSS+` certificado.
