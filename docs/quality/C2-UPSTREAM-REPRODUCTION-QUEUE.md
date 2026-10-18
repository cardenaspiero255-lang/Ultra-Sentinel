# C2 — cola verificable de reproducción de 106 tareas Kotlin

Esta fase no añade etiquetas ni simula resultados. Punto de partida del sello Run23: **23 etiquetas históricas (11 positivas, 12 negativas)**; restan **97** (mínimos 37 positivas, 36 negativas y 24 diversas).

El índice Kotlin SWE-bench congelado contiene 106 tareas en nueve repositorios, pero **una tarea no es una etiqueta**. El roster se autentica contra el SHA de árbol Git fijo `7e6c0a3c10c8f082b8f7a9c5efbcc51c360356a9`, no contra un checksum autocontenido que un atacante pueda recalcular. El módulo `packages/quality-gates/c2-upstream-evidence-queue.cjs` mantiene explícitos los estados de reproducción y rechaza un índice alterado, duplicados, causas repetidas y recibos sin test original, fallo original, commit base, licencia revisada e independencia metodológica del detector.

## Protocolo para cada candidato

1. Acreditar Git tree SHA y commit anterior original; verificar licencias del proyecto.
2. Reproducir prueba original en versión anterior (**FAIL**) y versión corregida (**PASS**), en entorno aislado con dependencias fijadas. Un fallo de infraestructura no es evidencia.
3. Identificar causa raíz y regla realmente soportada por Sentinel; comparar huella causal con las etiquetas previas. Un PR con varias líneas no produce automáticamente varias causas.
4. Exigir oráculo separado del detector y evidencia trazable (fallo BEFORE, commit corregido distinto, PASS AFTER y hashes de pruebas y logs); sin pruebas completas se rechaza el recibo y **no se crean etiquetas**.
5. Los recibos aptos siguen en `HISTORICAL_CAUSE_COMPARISON_REQUIRED` porque aún falta importar y cotejar los 23 fingerprints históricos autenticados. Ni siquiera avanzan a la revisión independiente; solo un sello independiente con testigo real autenticado podrá admitirlos al corpus de desarrollo. Para controles negativos, probar comportamiento seguro original y mutación adversarial que lo rompe.
6. No convertir tareas Kotlin SWE-bench públicas ni los ocho PR históricos en un benchmark ciego nuevo. Congelar posteriormente una cohorte prospectiva sin revisar antes sus soluciones ni las predicciones.

El catálogo de 106 es insuficiente por sí solo para producir 97 etiquetas válidas, especialmente las 36 negativas requeridas. Si no hay causas nuevas suficientes, ampliar fuentes originales en lugar de fabricar etiquetas.

La cobertura experimental de Kotlin JVM del PR #130 solo habilita rutas; **no demuestra detección semántica ni 95%**. El estado de certificación sigue `NOT_CERTIFIED`. No se han consultado predicciones del detector ni alterado el Core congelado.
