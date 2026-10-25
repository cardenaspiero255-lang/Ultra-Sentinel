# C2 · Campaña de etiquetas en un lote: admisión real y límites

**Estado:** una ejecución fuente-libre para la cohorte históricamente congelada; no es una certificación.

## Resultado verificado que origina este trabajo

GitHub Actions `40148603915` finalizó **3/3 SUCCESS** con autor GitHub owner 322222186, SHA de `main` `f91cbc71074f39254c6d3058d186319d7b483bc1`, artefacto `12581349654` con digest SHA256 `88a7f5764b156c7713f324667839f6f96172cfdfee95a2d8d4d519d131426003`. El informe V3 tiene **155** PR fuente-no-inspeccionados; **148** observaciones con identidad comparable, **7** no verificables (4 SHA drift, 3 listas de archivos truncadas), **4** retenidos por más de 100 archivos, **0** candidatos del ranking automático y `shortlist=[]`.

Esto impide seleccionar a continuación un candidato del ranking como si estuviese validado. No se permite leer los parches de la cohorte aún reservada ni rebajar el filtro después de observar el resultado solo para aumentar el conteo. `nextcloud/android#17870` permanece intacto y en revisión por sus 258 rutas.

## Qué ejecuta el lote de 32 particiones

Este cambio añade `c2-one-shot-111-admission.cjs` que **vuelve a calcular el ranking V3 completo** desde las 155 observaciones y el manifiesto original de 169 casos, excluyendo por sus recibos verificables los 14 casos cuyo código ya se divulgó. Rechaza cualquier cantidad, contenido, estado, puntaje, SHA o resultado inyectado que difiera del informe recalculado.

El plan único distribuye las **155 identidades** entre **32 particiones deterministas**: errores de identidad / lista incompleta a nueva verificación de metadatos sin leer código; PR de 100+ archivos a revisión manual de alcance; candidatos con indicio compatible necesitan gate del dueño y un atestador **por candidato**, y los demás quedan no priorizados. Las particiones son de **metadatos**; no son 32 ejecuciones de código de terceros.

El workflow `.github/workflows/c2-one-shot-111-admission.yml` exige un *merge protegido de introducción del propietario* a `main`, comprueba la CI completa y vuelve a autenticar la identidad, el commit y el digest del artefacto fuente original antes de permitir leer `report.json`. El propietario puede programar otra campaña **nueva y explícita**, pero este permiso concreto para el informe V3 está limitado a un único merge. No tiene permisos de escritura fuera de la propia revisión y nunca invoca el Core como predictor ni descarga parches de PR.

**No se generan 111 GOLD por repetir un script 111 veces.** Las nueve etiquetas históricas son solo documentadas aquí, no reautenticadas. La brecha nominal de **111** permanece. Para cada nueva etiqueta independiente se exige la regla congelada exacta y `path/line` ejecutable, prueba original que demuestre fallo real, corrección que pasa, benigno controlado que pasa, identidad Git y JUnit verificadas independientemente y procedencia causal única. La verdad debe estar sellada antes de usar Sentinel o baseline. El script de admisión emite siempre `newGoldLabels:0`.

**La infraestructura de lote anterior** `c2-bulk-evidence-intake.cjs` ya soporta hasta 512 candidatos y 32 lotes con recibos en cuarentena; no se duplica ese sistema ni se reinterpreta la cuarentena como autentificación. La próxima campaña con posibilidades de producir GOLD debe construir primero una **nueva lista prospectiva de casos externos** con condiciones de regla conocidas y sellar los metadatos Git antes de abrir cualquier fuente. El máximo de 32 particiones no certifica independencia causal ni garantiza 111 casos reproducibles.

Estado final hasta nuevas pruebas: `NOT_CERTIFIED`, 155 sin inspección, 14 divulgados, 9 etiquetas históricas documentadas, 0 nuevas GOLD.
