# C2 PR #189 — ejecución original y adjudicación preliminar de 16 candidatos Kotlin

**Estado hasta tener receipts reales:** ejecución pendiente / `NOT_CERTIFIED`. Este cambio sí ejecuta los tests originales en CI; no sustituye resultados por fixtures.

## Selección inmutable

- Fuente: `Kotlin/kotlin-swe-bench` en el SHA fijo `b9025d86f7ae634901396766bd61f6d4ae6d2165`.
- Git tree `tasks`: `7e6c0a3c10c8f082b8f7a9c5efbcc51c360356a9`.
- **16 originales** según el piloto de PR #188, distribuidos en **10 shards de un mismo repositorio**; `max-parallel: 3`.
- **Otros 90 sin ejecutar**, preservados en la cola de planificación.

## Evidencia de ejecución

Se reutiliza el ejecutor histórico `scripts/c2-bulk-kotlin-campaign.py run-shard`, sin modificar el corpus congelado. En cada tarea, un GitHub runner efímero crea las imágenes desde recetas upstream declaradas, con red disponible **solo durante el build**. Para ejecutar tests, el contenedor se inicia con `--network none`, `--cap-drop ALL`, `no-new-privileges`, límites de memoria, CPU y procesos.

La fuente base y los tests originales se aplican en una fase `BEFORE`; la referencia pública publicada se aplica en `AFTER`. Los hashes de commits reportados son **declaraciones que aún requieren acreditación**, no prueba de un parche real de producción. Se valida evidencia JUnit con transiciones comprobables; un reward aislado no cuenta como reproducción. Los casos se clasifican de forma separada:

| Estado | Interpretación |
| --- | --- |
| `TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED` | Se vieron transiciones JUnit válidas; faltan autenticación independiente de la causa y procedencia |
| `INFRA_BLOCKED` | Falló el build, el entorno, recursos o dependencias; no es un negativo |
| `REPRODUCTION_MISMATCH` | Evidencia JUnit o conducta distinta de la esperada; investigar |
| `NO_DECLARED_REGRESSION` | El benchmark no declara test f2p; no permite inferir positivo ni negativo |

Los 16 recibos deben existir y tener nombres únicos; cualquier ausencia, excepción del validador, ID externo al piloto, intento de sumar GOLD o manipulación de identidad bloquea la consolidación. Los recibos originales y la matriz resultante se conservan como artefactos de GitHub Actions.

## Causa y deduplicación

En esta primera etapa se clasifica la evidencia de reproducción por tarea. Una transición JUnit original no certifica automáticamente causa raíz distinta, correspondencia con un detector ni ausencia de contaminación frente a las 23 etiquetas históricas. La entrada correspondiente queda `SEMANTIC_DEDUP_PENDING` y se le asigna el siguiente gate: procedencia real upstream, causa, regla aplicable y comparación semántica, o reprocesamiento del caso infra-bloqueado.

**Ninguna entrada pública puede usarse como holdout prospectivo ciego** porque la solución y los tests están divulgados.

**Métricas congeladas:** 23 etiquetas históricas, cero admisiones GOLD nuevas, cero causas adicionales acreditadas, 90 sin ejecutar, precisión/recall/F1 nulos, SSS+ `NOT_CERTIFIED`.

Una vez completadas las ejecuciones, se revisará la matriz de los 16 y se trabajará sobre los casos realmente reproducidos con SHA de origen y pruebas discriminatorias; la investigación de causa independiente no debe atribuirse a este primer informe de ejecución.
