# C2 PR #188 — preparación de etiquetas auténticas, no certificadas

La preparación de la campaña empieza **en paralelo** a las pruebas discriminatorias Kotlin de los cuatro mecanismos históricos.

## Inventario de origen auténtico

- Fuente pública: `Kotlin/kotlin-swe-bench`, commit fijo `b9025d86f7ae634901396766bd61f6d4ae6d2165`.
- Directorio Git tree SHA: `7e6c0a3c10c8f082b8f7a9c5efbcc51c360356a9`.
- **106 candidatos en nueve repositorios**, no 106 etiquetas verificadas.
- Primera cohorte: **16 candidatos**, incluyendo seis Detekt, tres Ktlint y uno de cada uno de los otros siete proyectos.
- Los **90 restantes** permanecen registrados, nunca descartados.
- No se instala ni ejecuta código de terceros en este flujo: solo se construye un plan de admisión determinista. Para ejecuciones futuras se reutiliza el proceso aislado Kotlin 106 original, con límites de CPU/memoria, contenedores sin privilegios, JUnit completo y hashes de evidencia.

## Siete puertas de admisión por candidato

1. Verificar revisiones y código originales de la fuente externa.
2. Reproducir un test original fallido antes de la corrección.
3. Comprobar que la revisión arreglada supera el test y mantiene controles normales.
4. Acreditar regla aplicable y causa raíz con contrafactuales independientes.
5. Deducir la independencia frente a las 23 etiquetas históricas sin contaminar entrenamiento/evaluación.
6. Revisar licencia, procedencia y derechos aplicables.
7. Construir un oráculo de clase: defecto positivo real o control negativo genuino con mutante sensible.

## Restricciones explícitas

Las tareas públicas contienen información revelada. **Nunca se convierten automáticamente en conjunto ciego de evaluación**. Ni la reproducción `FAIL→PASS`, ni un parche del benchmark, ni un hash, ni un `npm test` verde certifican GOLD.

La campaña inicial sigue con **23 etiquetas históricas (11 positivas y 12 negativas), al menos 97 adicionales necesarias si todas las históricas resultan admisibles**, cero etiquetas GOLD nuevas, cero causas nuevas certificadas y precisión/recall/F1 nulos. SSS+ = **NOT_CERTIFIED**. No se requiere una aprobación humana externa como condición añadida por este plan; se exige evidencia técnica real e independencia.

El siguiente paso operativo, una vez integrado este plan, será recuperar los informes ya reproducidos y ejecutar o reintentar **solo** los candidatos prioritarios con oráculos válidos; ninguna tarea infra-bloqueada se tratará como positivo o negativo.
