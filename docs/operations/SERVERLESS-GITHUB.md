# Ultra Sentinel Serverless — GitHub Actions sin VPS

## Estado y alcance

**Implementación disponible en PR #42.** Este modo utiliza los lectores **ya existentes** de JARVIS y GameHub, el snapshot/ledger del watchdog y GitHub Actions como ejecutor intermitente. No depende de Oracle Cloud, un VPS, una tarjeta, un webhook pagado ni de tokens Sentry. No crea otro Core ni un sistema paralelo de análisis.

**No es un servicio permanente 24/7.** Los cron de GitHub Actions pueden retrasarse o saltarse ejecuciones, y las programaciones de repositorios públicos se desactivan tras periodos largos de inactividad. Cada ejecución observa una **muestra** de PR GameHub y hasta 29 PR JARVIS; no certifica cobertura completa ni equivalencia de revisión.

## Seguridad y costos

- Workflow: `.github/workflows/serverless-github-monitor.yml`; cada **30 minutos** aproximadamente (minutos 17 y 47), más inicio manual. Solo se ejecuta sobre `main`, no desde PR externos.
- `permissions`: `contents: read`, `pull-requests: read` y `actions: read`; no se permite `contents: write`, fusionar PR, tocar servidores ni ejecutar código de los PR que observa.
- `GITHUB_TOKEN` efímero suministrado automáticamente por Actions. Si no puede leer los dos repositorios públicos, la ejecución se bloquea; **nunca** se solicita un token personal con escritura.
- Solo persiste como artifact la información **pública**: número de PR y SHA de GitHub; la lista de Sentry debe estar vacía. El archivo no contiene secretos, audios, correos ni cuerpos de los PR.
- Estado en un artefacto de Actions durante siete días, **renovado en cada ejecución**. Si el artefacto expira, falta o es inválido, el modo programado se bloquea. Se prohíbe un falso reinicio de historial.
- GitHub Actions normalmente no cobra por ejecutores estándar en repositorios **públicos**, sujeto a las condiciones y límites de GitHub. No hay promesa de cero costo si cambia la visibilidad o las políticas.

## Primera activación (después de fusionar PR #42 y pasar sus gates)

1. En Ultra Sentinel → **Actions → Ultra Sentinel — serverless GitHub observer → Run workflow**.
2. Seleccionar `main` y activar la entrada `bootstrap=true` **solo una vez**, para crear el primer checkpoint público sin alertas retrospectivas.
3. Confirmar que `Sentinel Architecture Bootstrap` y el workflow serverless pasan en el commit exacto de `main`; inspeccionar el artefacto `ultra-sentinel-github-only-state-v1`.
4. Desde entonces, las ejecuciones programadas deben reutilizar el checkpoint de la ejecución anterior. No marcar `bootstrap=true` si ya existe artefacto.
5. Configurar en GitHub tus preferencias de notificación de **workflow fallido**. Una detección nueva produce un evento `::warning` y un job de alerta **fallido intencionalmente**, para que GitHub registre la señal. No se garantizan push, correo, teléfono ni entrega humana: eso depende de tu configuración y de las políticas de GitHub.

## Reglas de recuperación

- El workflow solo acepta artefactos de `main` y verifica que el run de origen provenga del **mismo archivo workflow** en un evento `schedule` o `workflow_dispatch`.
- No se puede inicializar un nuevo estado si existe uno guardado. Si pierdes el artefacto por inactividad o caducidad, la recuperación requiere intervención manual, con aceptación explícita de que no podrás reconstruir automáticamente los cambios del intervalo.
- Un cambio detectado se escribe a disco antes de publicarse como aviso de Actions. Si el proceso cae antes del reconocimiento, el siguiente ciclo lo anuncia de nuevo (semántica de **al menos una vez**); el checkpoint distingue lotes distintos aunque tengan eventos idénticos.
- La aprobación de PR y la reparación quedan separadas en el PR #34. Este workflow **no** recibe token del propietario, claves Ed25519 o autoridad para escribir en GitHub.
- Sentry y alertas privadas no se habilitan en este primer modo; necesitan almacenamiento confidencial (p. ej. secreto AES-GCM) y una integración con permisos mínimos antes de enviar datos a Actions/artifacts.

## Certificación

Para afirmar Triple SSS aún hace falta paridad semántica con etiquetas independientes, autorización real y auditada, pruebas Android/JARVIS en dispositivo, E2E con los tres repositorios, recuperación de incidentes y observabilidad de ejecuciones omitidas. **No presentar el cron de GitHub como SLA 24/7 ni marcar "certificado" por tener CI verde.**

## Alternativa

Los ficheros `deploy/systemd/` permanecen disponibles **sin habilitar** para un futuro VPS; se reutiliza el mismo monitor, no se construye otra arquitectura. Para la etapa actual no necesitas contratarlo.
