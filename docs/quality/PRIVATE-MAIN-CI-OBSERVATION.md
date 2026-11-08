# Observación acotada de CI de main

`scripts/observe-private-main-ci.cjs` consulta la API oficial de GitHub mediante GET y sin seguir redirecciones. Requiere un token de lectura y recibe un SHA completo y run ID elegidos por el operador. No recibe URLs, nombres de workflow, repo ni política de un PR o artefacto.

```sh
node scripts/observe-private-main-ci.cjs SHA_DE_40_CARACTERES RUN_ID
```

El operador proporciona el token temporal mediante `ULTRA_SENTINEL_CI_READ_TOKEN` de un gestor de secretos. No poner el token en argumentos, Git, logs ni artifacts. El proceso corre únicamente en un host confiable; la API de GitHub y su transporte TLS son parte del límite de confianza.

La observación comprueba ID y propietario del repositorio, evento push en main, SHA, workflow, estado y conclusión, intento, blob Git del workflow fijado y recalculado, un único job `structure-and-contracts` y el éxito de su paso `Verify architecture (no external integrations)`. Relee el intento después de observar los jobs. El contenido confiable del workflow está fijado a `e9463946d6496765e123c259d8f350c41fe96502`; ante un cambio legítimo se debe revisar por separado el archivo antes de actualizar el anclaje y sus pruebas. No se aceptan PR ni runs de otros workflows.

El resultado es una **instantánea de metadatos** de ese run, no acredita contenido ni integridad de artifacts, semántica de las pruebas, que el SHA siga siendo el main actual, independencia del runner, los 13 controles ni un resultado operativo real. Una reejección posterior puede cambiar el intento. No se conecta a decisiones de escritura, fusión, reparación, despliegue o certificación. Errores, datos parciales o políticas nuevas bloquean la observación.
