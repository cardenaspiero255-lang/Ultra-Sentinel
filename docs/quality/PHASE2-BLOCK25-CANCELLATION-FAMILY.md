# Ultra Sentinel — Fase 2, Bloque 2.5: descubrimiento funcional de otra familia

**Estado de esta entrega: 2.5a (nuevo motor de hipótesis, pruebas y aislamiento). No existe todavía evidencia de una familia descubierta en fuentes originales.**

## Motivación y límite respecto del Bloque 2.4

El Bloque 2.4 demostró cobertura de seis archivos Kotlin de una cohorte nueva, pero los tres detectores congelados emitieron **cero hipótesis**. Mejorar únicamente las rutas no soluciona el descubrimiento. En el Bloque 2.5 añadimos un detector *distinto* de los patrones previos (numérico, códec e identidad): `CANCELLATION_EXCEPTION_SWALLOWED`, destinado a localizar **hipótesis** de cancelaciones Kotlin consumidas en un `catch (e: CancellationException)` sin ninguna instrucción `throw` reconocible en ese bloque.

La implementación en `packages/family-hunter/phase2-cancellation-propagation-hunter.cjs` es un análisis **estructural y de flujo de control limitado**, no un compilador semántico completo: elimina comentarios anidados, strings ordinarias y raw strings, preserva líneas, empareja llaves y usa una condición conservadora de posible relanzamiento. No infiere aún tipos de símbolos, alias o consecuencias funcionales. Capturas amplias de `Exception` se omiten deliberadamente. Puede haber falsos negativos y falsos positivos, por lo que los resultados nunca son certificación ni reparaciones.

## Seguridad e invariantes

- Ingesta de records ordinarios sin getters ni proxies; SHA Git recomputado desde bytes UTF-8 exactos, presupuesto de 65.536 bytes por archivo, 80 archivos por lote, rutas consultivas permitidas y sin traversal/test/generated.
- Worker de solo lectura: no acepta oráculos, golden labels, reparaciones, secretos ni permisos protegidos. Los hallazgos son **advisory**, sujetos a oráculo funcional independiente.
- Launcher Bubblewrap/AppArmor, namespace sin red; monta únicamente inventario de fuentes, scanner, worker, política y validación inerte. Nunca monta el checkout completo ni los oráculos.
- CI ejecuta primero suites completas, luego prueba realmente el worker bajo Bubblewrap. La muestra sintética de la CI es **solo entrenamiento/regresión**, no una cohorte a ciegas ni descubrimiento novedoso.
- Conserva por Git SHA las versiones v1 (`3668a4ff860c49c5aaf69a594efc4fa48d94def3`) y v2 (`34679a71aed54abbc3ecbffbf29299cfb25f65b8`). No amplía autorizaciones de Fixer/Judge, ni las altera.

## Subbloques restantes de 2.5

- **2.5b — congelación y reserva prospectiva nueva:** tras pasar y fusionar toda la CI de 2.5a, fijar SHA y árbol de la nueva versión, seleccionar fuentes Kotlin **distintas** de `kotlinx.coroutines` (ocho ya reveladas) y `kotlinx-io` (seis ya reveladas), exclusivamente con metadatos de árboles Git, registrar todos los archivos sin retocarlos tras ver sus contenidos. Preparar oráculos funcionales independientes y controles benignos, comprometidos antes de predicciones.
- **2.5c — predicción sellada y verdad separada:** ejecutar versión congelada en aislamiento real sin acceso a respuestas; sellar *todos* los reports crudos antes de ejecutar oráculos JVM en un job dependiente. Medir archivos admitidos, abstenciones, hipótesis no verificadas y resultados funcionales solo en la porción con verdad independiente, preservando cuatro estados (positivo, benigno, desconocido, incompatible).
- **2.5d — generalización:** solo si se prueba un defecto original positivo y causalidad funcional, verificar reproducibilidad, contrafactual, reparación automática original y veto/rollback; usar otra cohorte si se modifica de nuevo Hunter.

**Criterio final de cierre del Bloque 2.5:** demostrar como mínimo un caso verdaderamente nuevo con causa y prueba funcional independiente, sin fuga de oráculos ni ajuste posterior a la evaluación. Si no aparece, documentar honestamente el resultado negativo y mantener el bloque abierto: una versión que detecta un fixture sintético no cumple esa condición.
