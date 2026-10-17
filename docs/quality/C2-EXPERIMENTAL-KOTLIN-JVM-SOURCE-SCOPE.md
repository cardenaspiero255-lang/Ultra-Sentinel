# Kotlin JVM V3: alcance de archivos opt-in y separado del Core histórico

## Por qué era un bloqueo real

El Core histórico ignora archivos Kotlin de terceros bajo estructuras Gradle como `ktlint-rule-engine/src/main/kotlin/io/Parser.kt`: su predicado solo contempla GameHub `app/src/main` y otros directorios propios. Por eso un catálogo de 106 tareas Kotlin **no implica** cobertura de defectos reales por Ultra Sentinel. Esta etapa añade una clasificación **experimental y explícita** para archivos Kotlin de producción sin tocar el Core SHA-fijado usado en benchmarks históricos.

### Activación

```js
const {analyze}=require('./packages/core/ultra_sentinel_core.cjs');
const result=analyze(filesAtOriginalImmutableGitSha,{
  sourceScope:'KOTLIN_JVM_V3_EXPERIMENTAL',
  sha:'<original-commit-sha-40-hex>'
});
```

Se reconocen `src/main/kotlin/**/*.kt`, `src/main/java/**/*.kt` (Kotlin en directorio Java) y equivalentes con prefijos de módulo (`core/src/main/kotlin`, `modules/utils/src/main/kotlin`). Se rechazan `src/test`, `androidTest`, `testFixtures`, `*Test.kt`, `*Spec.kt`, traversal, rutas absolutas y `.gradle.kts`. Los parches aún requieren evidencia completa: se contrasta el `fullSource` del HEAD inmutable y cada hunk antes de confiar en el análisis léxico; de lo contrario el resultado es `INCOMPLETE`.

**No** se aceptan nuevos tipos de alerta de forma automática. Se reaprovecha solo el procesamiento ya existente de fuentes Kotlin; las reglas específicas de Android permanecen limitadas a archivos Android. `mode` se marca `experimental-kotlin-jvm-v3-source-scope` para evitar confundir la prueba con el Core histórico.

### Requisitos de evaluación inalterados

- Sin `sourceScope` explícito, `analyze` conserva **exactamente** el predicado de GameHub y modo anteriores.
- La cohorte histórica de ocho PR sigue con límite **153/241 archivos**; no se transforma retrospectivamente en 241 archivos analizados.
- Los 106 candidatos de Kotlin SWE-bench siguen en `METADATA_ONLY_106_CANDIDATES_UNVERIFIED` hasta verificar repositorios, fixes, pruebas y correspondencia de reglas.
- El nuevo modo **no** ha ejecutado un benchmark ciego ni probado 95 % de precisión, recall o F1. No hay etiquetado automático ni comparación baseline/candidato.
- Para Kotlin de terceros se requiere construir detectores/contratos relevantes, reproducir defectos y negativos reales y preinscribir una nueva cohorte para evaluación, no modificar la cohorte histórica revelada.

Se incluyen pruebas que confirman no regresión del comportamiento por defecto, exclusión de tests/Gradle, verificación de fuente original y rechazo con cobertura parcial de fuentes manipuladas.
