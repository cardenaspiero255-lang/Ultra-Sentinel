# C2 — Nextcloud Talk #6945, resultado posterior a autorización

**Veredicto:** `INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE`; **0 GOLD**.

El PR upstream #6945 está fusionado, pero el estudio se realizó sobre los SHA preregistrados de base `591f033cd87f44d90c430d7fa477285eb22186e0` y HEAD `705887c6795b2f7746bef47e08a5c8c2aba9c3ff`. El único archivo cambiado fue `LoggingHttpInterceptor.kt`, blob anterior `d82ebe834b837226ab948901ee99e258f9c88142`, final `89901a06d04e78206ca470532e4d4ccbd8908d1f`.

La revisión se hizo **después** de que la ejecución protegida GitHub Actions [#40146912385](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40146912385) aprobara **4/4 jobs**: contratos, fusión del propietario, autorización de una fuente, atestador Git independiente. Artefacto `12580868124` con digest `sha256:ac56aec0f57df70777c553af0e7e42470ccf6b32203c9016028caa4d1cf43537`.

La modificación agrega una condición de `BuildConfig.DEBUG` para permitir logging de tráfico HTTP en builds debug aun cuando la configuración de logging de la aplicación sea más restrictiva. Se mantiene la configuración previa `HttpLoggingInterceptor.Level.BODY`. Esto puede justificar una auditoría de confidencialidad separada, pero **no significa por sí mismo que haya ocurrido una filtración**.

La regla congelada `POTENTIAL_PRIVATE_LOG` exige una línea añadida de Kotlin Android con una llamada `Log` o `Timber` de niveles admitidos y ciertos nombres de datos sensibles. En el parche solo hay cuatro líneas añadidas (importación, comentarios, nueva condición); la llamada `logger.d` ya existía antes y **no se introduce** aquí. No hay coincidencia exacta `ruleId/path/line`. El Core no se modificó.

El PR upstream no añade pruebas nuevas. No se ejecutó el experimento original/fix/benigno ni un verificador JUnit; sin la coincidencia del detector no sería legítimo contabilizarlo como positivo o negativo. No se consultaron predicciones del detector ni del baseline.

**Cohorte:** de 169 candidatos, 14 ya tuvieron el código inspeccionado (8 originales, Lawnchair, Bitwarden, Home Assistant y tres Nextcloud Talk). Quedan **155** intactos. No nuevas etiquetas GOLD; sin verdad sellada ni SSS+ certificada.

La siguiente selección requiere ranking fuente-libre actualizado para excluir también #6945; de ninguna manera debe reutilizarse como muestra ciega. Si se quiere evaluar la seguridad de logging HTTP a nivel `BODY`, realizarlo como investigación independiente fuera de las 17 reglas congeladas.
