# C2 — Detekt: matriz de aplicabilidad de seis PR revelados

**Fuente upstream:** detekt/detekt; manifestaciones Kotlin SWE-bench fijadas en SHA b9025d86f7ae634901396766bd61f6d4ae6d2165. **Reproducción original:** [Actions 39321487604](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39321487604); XML completos revalidados en [39347389415](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39347389415). Estos casos ya están revelados: NO constituyen un holdout ciego.

**Core congelado para la prueba:** Git blob 836f9400f42f269b80f446e89601744c59c73073; patrones semánticos 7df2a994f566ad56bdacab999fa6ba83b69e3b4d y regresiones conocidas 8c2fa4289d331e157b07f4e693239ac7e31cae8c. Evaluar el motor real en modo KOTLIN_JVM_V3_EXPERIMENTAL sobre fuentes Kotlin completas obtenidas de blobs Git originales y parches de PR, con SHAs verificados.

## Matriz de causas y reglas

| PR upstream | Archivo de origen, zona de cambio | Causa raíz sugerida por diff | Regla en Ultra Sentinel | Estado |
| --- | --- | --- | --- | --- |
| [#7625](https://github.com/detekt/detekt/pull/7625) | BaselineFormat.kt ~L54 | Formato de etiquetas XML vacías de baseline | Ninguna regla de serialización XML verificada | NOT_ATTESTED |
| [#7635](https://github.com/detekt/detekt/pull/7635) | UndocumentedPublicClass.kt ~L41–92 | No existía opción para ignorar companion object por defecto | Sin regla Kotlin PSI equivalente verificada | NOT_ATTESTED |
| [#7667](https://github.com/detekt/detekt/pull/7667) | SarifOutputReport.kt ~L55 | Emisión de originalURIBaseIDS no deseada | Sin regla de generación SARIF propia verificada | NOT_ATTESTED |
| [#7715](https://github.com/detekt/detekt/pull/7715) | ThrowingExceptionsWithoutMessageOrCause.kt ~L60–64 | Comparación ignoreCase=true de nombres de excepción provoca falsos positivos; corregida a igualdad exacta | Sin ruleId/ruta/línea causal acreditados del Core | PRIORIDAD 1 |
| [#7718](https://github.com/detekt/detekt/pull/7718) | Results.kt ~L25 | Emisión SARIF sin partialFingerprints signature/v1 | Sin regla SARIF propia verificada | NOT_ATTESTED |
| [#7888](https://github.com/detekt/detekt/pull/7888) | UnusedImport.kt ~L27–162 | additionalOperatorSet ya existía como conjunto fijo, pero no era configurable; pasa a by config(emptyList()) | Sin regla Kotlin import/operator resolver acreditada | PRIORIDAD 2 |

Una regla de Detekt como ThrowingExceptionsWithoutMessageOrCause o UnusedImport NO es automáticamente una regla de Ultra Sentinel. La habilitación de rutas JVM no demuestra que el Core inspeccione símbolos Kotlin o resuelva operadores.

## Pruebas y controles contrafactuales

- **#7715:** CONTRASTE ESTÁTICO de fuente base original y HEAD original. Antes se comparaba el nombre del callee con ignoreCase=true; después se compara por igualdad exacta. Control benigno: código corregido tanto antes como después, o expresiones en comentarios, no deben producir un testigo de transición. Esto es una comprobación de fuente, NO la ejecución auténtica del compilador de Kotlin.
- **#7888:** CONTRASTE ESTÁTICO de fuente base y HEAD. Antes existía un conjunto fijo de operadores adicionales, incluido assign; después se configura la lista y se pasa al visitante. Controles benignos: ausencia de configuración real, conjunto original distinto, o código ya corregido no demuestran la misma causa. No simular análisis de imports semánticos.
- **Detector real:** obtener comparación por commits inmutables del PR y blobs SHA-1 verificados de los seis archivos completos. Rechazar fuentes manipuladas, hunks incompletos, y atribuciones falsas. Registrar únicamente las alertas realmente devueltas por Ultra Sentinel y sus ruleId/ruta/línea. No asignar equivalencia causal a una alerta incidental.
- **Historia divergente:** para #7667, #7718 y #7888 GitHub informa comparación divergente frente al SHA base del PR. El HEAD de PR y el solution/fix.patch del benchmark NO deben intercambiarse; registrar la divergencia y no afirmar un historial lineal.
- **Cuatro requisitos de admisión:** reproducir realmente la causa original con un oráculo independiente, contar defectos distintos y controles negativos, atribuir una regla real de Ultra Sentinel con ubicación original, y acreditar independencia respecto al corpus histórico. Esta matriz no cumple los cuatro por sí sola.

Workflow acotado, lectura solamente: .github/workflows/c2-detekt-rule-applicability.yml, con marcador único de propietario ULTRA_SENTINEL_C2_DETEKT_RULE_MATRIX_V1. El reporte enlaza los seis commits, blobs, diferencias y salidas efectivas del Core. No añadir reglas apresuradas basadas en un patrón léxico: #7715 necesita conocer llamadas/constructores y #7888 necesita información de resolución de imports/operadores, antes de poder medir falsos positivos.

**Conservación de estado:** 23 etiquetas históricas, 0 nuevas, 97 pendientes, holdout ciego no ejecutado, sin métricas 95 % ni SSS+, monitor programado pausado.
