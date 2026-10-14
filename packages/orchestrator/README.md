# Orquestación de diagnósticos

Coordina `detectar → reproducir → proponer → probar → revisión independiente → solicitar autorización`. Los jobs se identifican con incidentId, repo, HEAD, fingerprint y claves de idempotencia; presupuestos, timeouts, cooldown y cancelación explícita.

No equivale a un agente con permisos de GitHub. Jarvis puede solicitar investigaciones, **pero no puede hacer que Sentinel salte una aprobación, un gate o una comprobación de SHA**. Recuperaciones y escrituras las ejecutan servicios distintos con identidades y políticas propias.
