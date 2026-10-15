# Bubblewrap — drill real de aislamiento en GitHub Actions

Este ensayo se ejecuta en un runner efímero gratuito `ubuntu-24.04` de GitHub Actions, **sin VPS**. No ejecuta código de GameHub ni una reparación, no usa token personal, ni crea un commit.

## Qué comprueba

- `scripts/drill-bwrap-isolation.cjs` usa el **mismo generador de parámetros Bubblewrap** de `scripts/run-owner-sandbox-repair.cjs`, con `--unshare-all`, `--clearenv`, mounts mínimos y directorio desechable.
- Instala, si hace falta, el paquete `bubblewrap` de los repositorios Ubuntu; si el runner prohíbe namespaces no privilegiados o bwrap no está disponible, falla explícitamente, **sin ejecutar la prueba desprotegida**.
- Verifica de forma efectiva que un archivo benigno montado en `/workspace` se ve desde el contenedor; otro archivo de prueba fuera del workspace no se puede abrir.
- Comprueba que el namespace de red del hijo es distinto del namespace del proceso padre, que el socket no alcanza una IP externa y que las variables `GITHUB_TOKEN` y `ULTRA_SENTINEL_OWNER_GITHUB_TOKEN` no aparecen en el hijo.
- Solo emite un reporte booleano acotado, sin rutas absolutas, tokens ni salida arbitraria del proceso aislado.

## Ejecución opt-in

Tras fusionar la implementación con CI en verde, el propietario puede comentar la cadena exacta `ULTRA_SENTINEL_BWRAP_DRILL_V1` en la issue #50 de Ultra Sentinel. El workflow `.github/workflows/bwrap-isolation-drill.yml` requiere ID numérico de propietario `322222186`, repositorio `1418338512`, `main`, checkout confiable sin credenciales persistidas y permisos `contents: read`.

## Límites

**Un resultado de éxito significa exclusivamente que este runner temporal permitió aislamiento Bubblewrap para esa prueba.** No prueba que funcione en otro sistema Linux o Android, ni la autenticación real del propietario, la correcta atestación del auditor, ni rollback real de una reparación, y no autoriza ninguna acción de escritura.

La clasificación Triple S+ permanece `NOT_CERTIFIED` hasta comprobar la cadena completa y obtener evidencia externa de paridad e identidad autorizada.
