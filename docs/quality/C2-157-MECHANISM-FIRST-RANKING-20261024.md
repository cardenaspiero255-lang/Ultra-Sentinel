# C2 — Ranking V2 por indicios de mecanismo (157 candidatos intactos)

**Fecha:** 2026-10-24. **Estado:** SOLO METADATOS; NINGUNA PREDICCIÓN; NO GOLD; SSS+ NOT_CERTIFIED.

## Cohorte congelada

De 169 PR Git públicos preregistrados con SHA de base, HEAD y fecha, **12 ya están expuestos**: ocho anteriores en cuarentena, Lawnchair #7428, Bitwarden #7499, Home Assistant #7681 y Nextcloud Talk #6940. Se comprueba el último recibo propietario `C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024.json` y su atestador independiente antes de excluirlo. **157 PR se mantienen sin inspección de código.** Es imposible reintroducir cualquiera de los 12 al ranking V2 sin que el gate falle. El manifiesto original no se edita.

## Cambio esencial frente al ranking anterior

Antes, una prueba modificada podía agregar **+5 puntos** y un archivo Kotlin de Activity recibir puntuación alta solo por llamarse Activity, pese a no existir un detector de backstack Android. Esto llevó a Nextcloud Talk #6940, un PR auténtico pero fuera de las 17 reglas congeladas. No se usó ese caso para entrenar ni alterar ninguna regla del Core; ahora se corrige el protocolo de selección en un ranking nuevo y **no se recicla #6940 como muestra ciega**.

`packages/quality-gates/c2-157-mechanism-first-ranker.cjs` V2 consume exclusivamente `filename,status,sha,additions,deletions,changes` de los 157 PR junto con identidad preregistrada exacta Git. Los valores no incluyen título, body, patch ni código fuente. El endpoint GitHub de archivos trae patches por protocolo pero el workflow los proyecta directamente por `jq` antes de guardar datos y nunca los entrega al detector.

**Pesos fijos definidos antes de la nueva evaluación fuente-libre:**

| Afinidad del nombre/ruta | Regla congelada que sería técnicamente plausible | Puntaje base por indicio |
|---|---|---:|
| speech, recognizer, voice, ASR | `SPEECH_REENTRANT_RETRY` | 8 |
| untrusted, pull_request_target, checkout, fork en workflows | `PRIVILEGED_UNTRUSTED_CHECKOUT` | 8 |
| coroutine, async, dispatcher, scope | `UNSCOPED_COROUTINE` | 7 |
| blocking, thread, deadlock, ANR | `BLOCKING_ANDROID_CALL` | 7 |
| recursive, traversal, depth | `UNBOUNDED_RECURSION` | 7 |
| logging, logcat, Timber, redaction | `POTENTIAL_PRIVATE_LOG` | 7 |
| polling, infinite loop, retry loop | `NON_CANCELLABLE_LOOP` | 7 |
| secret, token, credential | `POTENTIAL_HARDCODED_SECRET` | 6 |
| garbage collector, forced GC, memory pressure | `FORCED_GC` | 6 |

**Advertencia imprescindible:** cada término es solo un nombre de archivo o ruta, nunca contenido o línea. Incluso si se llama `Secret.kt`, no demuestra una clave incrustada; incluso si se llama `UntrustedPR.yml`, no demuestra que se use `pull_request_target`. Las puntuaciones no son probabilidades calibradas ni verificación causal. El ranking **no ejecuta el detector congelado ni produce predicciones**.

En la nueva puntuación, los nombres que no evocan claramente una de esas familias tienen **puntuación 0**, incluso si hay pruebas añadidas. Los nombres `MainActivity.kt`, `ViewModel.kt` o `MainActivityLaunch.kt` ya no se clasifican como riesgos relevantes por sí solos. Una prueba nueva da como máximo **+1** punto y una prueba existente modificada **+2**; un PR pequeño da +1, y más de 40 o 100 archivos resta puntos. Una segunda familia plausible agrega como máximo +2 puntos, evitando acumulación arbitraria. La regla `REGRESSION_TEST_COVERAGE` es una alerta genérica de evidencia, no un defecto original certificado. Se excluyen las reglas semánticas de rutas GameHub específicas de la comparación sobre otros repositorios.

## Gate ejecutable sin exponer holdout

El workflow propietario `.github/workflows/c2-157-mechanism-first-ranking.yml` primero corre `npm run check`. Solo tras la fusión introductoria por el actor GitHub propietario 322222186 en main protegido, consulta las 157 identidades Git originales y comprueba base SHA, HEAD SHA, fecha de creación y repositorio. Para cada PR guarda solo metadatos de rutas, blobs y conteos. Errores API, cambios SHA y listados truncados permanecen `NOT_RANKED`, jamás negativos.

Se produce un informe JSON con **157 entradas obligatorias**, ranking determinista por puntaje y desempate estable, top 12, evidencia de nombres, resultados no comparables y conteo de 12 previamente expuestos. No se descarga código para ejecutarlo ni se consulta un modelo. El informe de Actions no representa verdad independiente ni certificación SSS+.

## Próximo gate, separado

Elegir **un solo PR** de mayor afinidad no expuesto; bloquear toda inspección hasta un nuevo gate propietario y atestador Git, como con #6940. Recién entonces verificar `ruleId/path/line`, procedencia, entrenamiento y necesidad de oráculo. Solo si existe regla original específica y pruebas reproducibles, ejecutar original/fix/benigno en sandbox aislado, revalidar JUnit de manera independiente, sellar verdad y solo entonces medir Ultra Sentinel vs baseline. **No se puede inventar un positivo/negativo a partir de un nombre.**

Las 9 etiquetas históricas documentadas siguen sin validación ciega exhaustiva; la brecha nominal de 111 hacia 120 etiquetas no cambia, ni la falta de métricas certificadas. Estado `NOT_CERTIFIED`.
