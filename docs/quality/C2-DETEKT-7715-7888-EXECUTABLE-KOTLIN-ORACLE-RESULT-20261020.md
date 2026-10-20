# C2 — Oráculos Kotlin ejecutables de Detekt #7715 y #7888

**Fecha:** 20 de octubre de 2026. **Ejecución original:** [GitHub Actions #39369492505](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39369492505), SUCCESS, HEAD Ultra Sentinel 7b48f06b2206d1acf26ff4489e6e959b8a766f2f (PR #162). **CI de infraestructura:** [39369340664](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39369340664), 715/715 aprobados.

Se compilaron módulos originales de detekt/detekt con Gradle 8.10.2 y JDK 21 y se ejecutaron dos fixtures Kotlin/JUnit independientes contra cuatro checkouts upstream inmutables. El validador verificó SHA original, XML íntegro, nombres de los tests, recuento y ausencia de fallos/errores/omisiones. Es ejecución **real** del código de Detekt, no una imitación sintética del detector.

## Resultados

| PR | Fase | SHA upstream | Pruebas JUnit | Artifact ID |
| --- | --- | --- | ---: | ---: |
| [#7715](https://github.com/detekt/detekt/pull/7715) | BEFORE | 8a3565572208446ff769152ded9ca5bdf957f8b0 | 6/6 PASS | 12241225933 |
| #7715 | AFTER | 5d9ee0d6d61e7b59d798c99611e48e4105681624 | 6/6 PASS | 12241325057 |
| [#7888](https://github.com/detekt/detekt/pull/7888) | BEFORE | 6c8f571d886aa581b62b02964e00ef7008559e72 | 5/5 PASS | 12240444934 |
| #7888 | AFTER | 97e110402f4f25fccdfa0875b42300dac43dc41f | 5/5 PASS | 12240728402 |

Total medido: **4/4 jobs + summary SUCCESS, 22/22 tests JUnit PASS**, 0 etiquetas GOLD. Artifact de resumen: ID 12240304138; status ORIGINAL_DETEKT_RULE_BEFORE_AFTER_ORACLES_PASS. Los ZIP y XML originales tienen una retención declarada de 14 días.

### SHA-256 de los cuatro XML verificados manualmente contra sus recibos

- 7715 BEFORE: 76827cd9f174072ae208eb216bf48919aed6115cf52f50486955a069133d6b41
- 7715 AFTER: 6c73459aa1dd26b8dd4673e795b21656c7d3e572b0223e0d7cd5d1845fb1763c
- 7888 BEFORE: aa8ae13d9a0268dd21fc4ae2fff99d8f414cea49afe5c574fbce6947f8b9a0ac
- 7888 AFTER: ddd25315e8f8956b67bf57547085ab2e890e799e55698e14d77a762070fc5733

## Hallazgos causales acotados

**#7715 — ThrowingExceptionsWithoutMessageOrCause.** El código BEFORE reporta falsamente funciones de nombre similar con otras mayúsculas/minúsculas; el AFTER deja de hacerlo mediante una comparación exacta. Un constructor real sin argumentos continúa generando una alerta y con mensaje no. **Hallazgo crítico:** una función definida por el usuario con el **mismo nombre exacto que la clase de excepción** continúa siendo reportada por Detekt aun después del parche. Por tanto, su regla no resuelve realmente la identidad del símbolo Kotlin. Copiar ese patrón textual a Ultra Sentinel perpetuaría falsos positivos. Sería necesario comprobar referencias resueltas a constructor frente a función.

**#7888 — UnusedImport.** BEFORE excluye por código un conjunto fijo de operadores adicionales, incluido assign; AFTER permite configurarlos mediante additionalOperatorSet. Los tests registran configuración vacía vs explícita, imports ordinarios, infix con KotlinCoreEnvironment y el comportamiento de la lista de operadores incorporados. No se ejecutó el plugin de asignaciones implícitas del Gradle Kotlin DSL ni su classpath auténtico: la prueba con contexto de tipos de Detekt no demuestra la semántica exacta de dicho plugin.

## Decisión de desarrollo

No crear reglas de Ultra Sentinel basadas solamente en coincidencias de texto. Para #7715, la siguiente etapa es una integración **optativa** de análisis de símbolos Kotlin que distinga constructor, función, overload, alias e import con identidad resuelta, y un detector con ruleId/path/line únicamente tras demostrarlo. Para #7888, se requiere un entorno con el plugin/DSL real de Gradle y un conjunto de importaciones contrafactuales, evitando confundir configuración fija con ausencia de análisis de imports.

**No es certificación SSS+ ni benchmark ciego.** Es ejecución de Detekt upstream en casos conocidos, no ejecución de una regla propia del Core sobre los estados vulnerables. Estado: 23/120 históricos, cero nuevos, precision/recall/F1 no calculables, holdout independiente pendiente, SSS+ NOT_CERTIFIED. No se activó el monitor pausado.
