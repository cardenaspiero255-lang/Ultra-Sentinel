# Runbook (para operación futura)

## Incidente: Sentinel no responde
1. Monitor externo verifica ausencia de heartbeat con ventana adecuada.
2. Alertar al propietario y conservar timestamps/versión sin incluir datos sensibles.
3. Suspender escritores/autoreparaciones; permitir solo diagnóstico.
4. Comparar último deploy, CI y evento autenticado; rollback supervisado si está autorizado.
5. Verificar restablecimiento, deduplicar incidente y registrar causa confirmada.

## Incidente: Jarvis no escucha
1. Comprobar señal de salud de sesión, permisos, STT, TTS, eventos Bluetooth y timeout.
2. Distinguir fallo técnico de restricción Android o permiso revocado.
3. Recuperación local acotada y reversible dentro de las APIs permitidas; si falla, escalar a incidente.
4. Preparar caso RED y PR de corrección supervisado; no reescribir APK instalado desde GitHub.

## Incidente: GitHub API no disponible
Registrar error, usar backoff limitado, marcar `INCOMPLETE`, no elevar aprobación/fusión. Tras retorno, comprobar HEAD actual antes de reintentar.

## Incidente: parche produce regresión
Congelar automatizaciones de escritura, asociar release y commit, conservar evidencia sanitizada y solicitar rollback seguro o nuevo PR de reparación supervisada.

**Advertencia:** este runbook es diseño. No hay watchdog, flujos de recuperación o alertas desplegados por el PR de estructura.
