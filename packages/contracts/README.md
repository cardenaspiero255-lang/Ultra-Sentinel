# Contratos versionados

Responsabilidad: **definir formatos interoperables**, nunca iniciar red, leer secretos ni elevar permisos.

- `schemas/incident.v1.schema.json`: telemetría mínima de GameHub/Jarvis/Sentinel.
- `schemas/review-result.v1.schema.json`: veredicto con SHA y estado de evidencia.
- `schemas/repair-authorization.v1.schema.json`: **estructura** de un permiso temporal; un JSON bien formado NO es una autorización auténtica.

Compatibilidad: versiones `v1` inmutables tras publicación; cualquier cambio incompatible crea `v2`. `$id` usa `.invalid` deliberadamente, NO es un endpoint. Validación criptográfica/autorización del emisor ocurrirá **fuera del esquema**, con fuente de confianza separada. No confiar jamás en `evidenceState: VERIFIED` proporcionado por un PR o servicio no confiable.

## Contrato de fechas RFC 3339 (obligatorio)

En JSON Schema Draft 2020-12, `format: date-time` puede ser solo una anotación. Los consumidores **DEBEN** validar `incident.observedAt` y `repair-authorization.expiresAt` mediante `isStrictRfc3339` de `packages/contracts/strict-rfc3339.cjs`, **además** de validar el esquema, antes de confiar en las fechas o almacenarlas.

El validador verifica calendario, años bisiestos, horas y desfases numéricos RFC 3339 completos (de `-23:59` a `+23:59`, aunque algunos no correspondan a husos horarios reales); admite el segundo intercalar `:60` únicamente en los instantes históricos **oficialmente registrados**, expresados en UTC o con un desplazamiento local equivalente. La lista de 27 inserciones se basa en los registros de [NIST](https://www.nist.gov/pml/time-and-frequency-division/time-realization/leap-seconds) / boletines C del [IERS](https://data.iers.org/bulletins.php). Actualizar deliberadamente esa lista y sus pruebas cuando se anuncien nuevos segundos intercalares; los instantes desconocidos se rechazan por defecto. El esquema `pattern` solo comprueba la forma léxica, **no** confirma la validez del instante.

**Una fecha válida no otorga permisos.** El consumidor de una autorización debe comprobar aparte, contra fuentes fiables, expiración con reloj de confianza, emisor y firma, nonce antirrepetición, SHA, ámbito y presupuesto. Este bootstrap todavía no despliega escritores ni consumidores de producción. No considerar suficiente la sola aceptación del esquema.

## Guardia v1 de formas de datos (fase A, PR borrador)

`validateWire(name, payload)` de `packages/contracts/validate-wire.cjs` comprueba **solo** las tres formas versionadas conocidas: `incident`, `review-result` y `repair-authorization`. Está diseñada como verificador puro, sin acceso a red, tokens ni escritura, para entradas JSON ya decodificadas. Rechaza por defecto versiones no compatibles, propiedades desconocidas, getters, objetos no simples, estructuras cíclicas, arreglos con propiedades exóticas, fechas inválidas y ámbitos con `..`.

Este validador admite deliberadamente **solo el vocabulario JSON Schema utilizado por estos contratos**. Las palabras clave nuevas no soportadas provocan error al cargar el esquema hasta que se implementen y prueben. No sustituye un motor JSON Schema general ni comprueba firmas, origen de la evidencia o autorización.

**`{ok:true}` significa exclusivamente estructura aceptada**. No indica identidad autenticada, `evidenceState` realmente acreditado, permisos de escritura, validez de expiración contra un reloj confiable, ni que el repositorio/HEAD/nonce/presupuesto sean fiables. Los consumidores deberán comprobarlo explícitamente contra servicios de confianza antes de permitir una acción. Ningún campo `authorized` forma parte del resultado.
