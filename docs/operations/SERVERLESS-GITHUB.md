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

## Primera activación — GitHub sin VPS

1. Opción manual: en Ultra Sentinel → **Actions → Ultra Sentinel — serverless GitHub observer → Run workflow**.
   Opción automática del propietario: abrir una única issue con título exacto `ULTRA_SENTINEL_FIRST_BOOTSTRAP_V1`. El workflow solo admite ese evento si el autor y el emisor de GitHub tienen el ID numérico `322222186`, en el repositorio con ID `1418338512`. No responde a PR externos, ediciones o comentarios. Si ya existe un checkpoint, **se niega a reinicializar**. Esta opción deja un registro público en la issue y no hace commits.
2. Con la opción manual, seleccionar `main` y marcar `bootstrap=true` **solo una vez**. La issue autenticada configura ese parámetro automáticamente, sin tokens adicionales.
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


## Endurecimiento comprobado del primer despliegue

- **Contextos válidos de Actions:** `runner.temp` se usa únicamente dentro de `steps.env` o `steps.with`, no en `jobs.env`. El antiguo workflow se registraba como fallido antes de iniciar jobs cuando contenía contextos fuera de alcance; se corrigió y hay una regresión dedicada.
- **Artefactos públicos sin filtraciones:** el checkpoint serverless exige un esquema exacto. Se rechazan propiedades adicionales tanto en la raíz del estado como dentro de las entradas PR, incluso si la validación más general del watchdog las permitiría por compatibilidad.
- **Origen de la persistencia:** antes de restaurar, se comprueba que el run esté completado, pertenezca al mismo repositorio, venga de `main` y del workflow serverless, y tenga evento `schedule` o `workflow_dispatch`. Se rechazan timestamps futuros y se indica una **brecha de observación** si el último checkpoint tiene más de dos horas. Esa advertencia no recupera transiciones intermedias.
- **Alcance explícito:** el archivo del workflow todavía está en el PR #42; la CI del PR únicamente prueba código y estructura. La programación y la restauración real de artifacts en `main` **no se pueden acreditar hasta integrarlo** y ejecutar una campaña de arranque, segundo ciclo, interrupción y reanudación.

No confundir cobertura de pruebas unitarias con una certificación de funcionamiento en GitHub Actions programado.


## Segundo ciclo real, sin dar permisos adicionales

Después de que la issue [#45](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/45) haya generado un checkpoint válido, el propietario (GitHub ID `322222186`) puede comentar allí la cadena **exacta** `ULTRA_SENTINEL_CHECK_NOW_V1`. La automatización escucha exclusivamente los comentarios de esa issue, en este repositorio numérico (`1418338512`), con autor y emisor autenticados; no escucha comandos desde PR ni otros issues. El paso es de lectura; no crea commits ni autoriza reparaciones.

Este evento inicia una nueva observación con `bootstrap=false`, restaura el checkpoint de la última ejecución verificada y crea un nuevo artifact si la inspección termina sin error. Después se pueden verificar los eventos `issue_comment` y los jobs correspondientes. **Su éxito es una prueba del segundo ciclo, no una garantía de disponibilidad permanente:** los cron siguen siendo *best effort* y las notificaciones dependen de GitHub.
