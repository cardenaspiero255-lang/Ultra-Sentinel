# Quality Gates

Separa **colección confiable** de GitHub, evaluación pura y decisión autorizada. Veredictos: `CLEAR`, `ADVISORY`, `BLOCKED`, `INCOMPLETE`.

Requisitos antes de cualquier elegibilidad: HEAD exacto, base y archivos completos, checks requeridos exitosos de ese SHA, hilos bloqueantes resueltos, revisión independiente cuando corresponda y protección de `main` vigente. Un estado incompleto o desconocido **no** permite aprobar/fusionar.

Modo sombra inicial obligatorio. No exponer API `merge()` ni `approve()` desde este paquete. Portar la evidencia del antiguo `.github/scripts/` mediante adaptador de lectura.
