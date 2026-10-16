# C2 — cohorte holdout pre-registrada para evaluar defectos desconocidos

**Propietario único**, sin humano externo ni permiso de escritura. Este paso **solo congela las identidades** de GitHub de una cohorte distinta de la usada para ajustar las reglas de Ultra Sentinel. No se descargan las predicciones, las etiquetas o el baseline de esta cohorte durante el registro.

## Cohorte no utilizada en el desarrollo de las cuatro reglas C2

| GameHub PR | Estado al registrar | HEAD fijado | Archivos |
|---|---|---|---:|
| #172 | Fusionado | `34199fe8e093903c987f59d746661285d6e7caee` | 5 |
| #205 | Fusionado | `1ecf73e789b91354ce9d8b7289d9492930ae5950` | 6 |
| #206 | Fusionado | `53cb89551d6e750d263bc0e25dde9f4d3069144f` | 14 |
| #208 | Abierto | `df2bd33416d652480e51994784e511fbcb7ede12` | 13 |

Se fijan también los base SHA, el repositorio GitHub id `1375408706` y el owner id `322222186`. El código Core de referencia queda fijado al commit `bb38bb77983339301cafe8a7594e258e0c2924a6`. Si #208 cambia de HEAD, se bloquea esta cohorte: se requiere registrar una **nueva versión**, sin tratar un rebase como si fuera la misma muestra.

Los PR de desarrollo C2 #73/#132/#159/#161 y el histórico #163 quedan excluidos. Esta separación evita la filtración directa de esos cuatro fallos usados para construir reglas. **No prueba que todos los defectos potenciales de los PR nuevos sean inéditos; esa propiedad solo se podrá evaluar con la procedencia de cada oráculo.**

## Ejecución

Workflow `.github/workflows/c2-unseen-holdout-freeze.yml`, con opción manual (solo actor propietario) o comentario literal `ULTRA_SENTINEL_C2_HOLDOUT_FREEZE_V1` desde el propietario en el issue #50.

El workflow obtiene por API autenticada metadatos de PR, no diffs ni findings. Verifica los HEAD/base exactos, tamaño, estado y las identidades del repositorio. Luego elimina credenciales del proceso que congela el manifiesto, verifica SHA-256 canónico y publica el artefacto mínimo `ultra-sentinel-c2-unseen-holdout-freeze`.

## Pasos siguientes — no intercambiar su orden

1. **Congelar estas identidades**; dejar constancia de qué versión del detector existía antes del ensayo.
2. Sin abrir predictions ni baseline, desarrollar pruebas del comportamiento real del código por PR y guardar evidencia de positivos **y** negativos en archivos/variantes/paths. Casos sin reproducción se registran `UNVERIFIED`, fuera del score.
3. Cerrar y firmar opcionalmente el corpus y su procedencia (clave Ed25519 del propietario privada fuera del repositorio). La firma certifica integridad, **no** corrección de la etiqueta.
4. Solo entonces ejecutar **el mismo** detector congelado y baseline heredado en los mismos SHA, verificar CI directamente con GitHub API, cruzar FP/FN y calcular micro y por regla.
5. Aplicar los umbrales internos: al menos **4 PR, 120 etiquetas**, 48 positivas y 48 negativas, 6 reglas, 4 rutas, >=95 % de precision/recall/F1, sin aumento de FP frente al baseline y cero FN críticos; revisar sesgo y distribución por familia. El mínimo numérico no garantiza validez metodológica.
6. Conservar un segundo conjunto nuevo sin optimizar el detector sobre él. Cualquier ajuste de reglas por un caso de esta cohorte convierte ese caso en **regresión de desarrollo**, no validación ciega del nuevo motor.

**Estado inicial:** `FROZEN_INPUT_ONLY`, `labelsVerified=0`, `unseenDefectsVerified=0`, `precision/recall/f1=null`, `canCertify=false`. No habilita reparaciones, fusiones automáticas, Sentry ni certificación Triple S+.

Los pasos siguientes de SSS+ siguen siendo, en orden: autorización y rollback E2E; Sentry privado consentido; continuidad observada del cron; auditoría SHA final.
