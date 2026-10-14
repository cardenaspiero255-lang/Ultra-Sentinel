# Read-only review provider evidence — migrado desde GameHub #199

Este adaptador se ejecuta **en Ultra Sentinel**, jamás en GameHub. Inspecciona snapshots de revisiones y checks de GitHub asociados al SHA exacto del PR. CodeRabbit, Qodo y Sentry son señales **advisory**, no aprobaciones independientes ni autorización de escrituras.

Codex está excluido indefinidamente: no se busca, solicita ni utiliza en decisiones. Los estados `STALE`, `PENDING`, `COMMENT_ONLY_NOT_APPROVED`, `CHECK_FAILED`, `CHECK_UNVERIFIED` y `CHECK_SUCCESS_ADVISORY` distinguen información incompleta o falible. Nunca se otorga permiso de commit/merge.

Proveniencia: `cardenaspiero255-lang/gamehub-ultra#199` (SHA `6c9c01af66458b5d5d9db9da6fa7ff1c0e2b74d0`). Pruebas TDD: `tests/unit/github-review-integrations.test.cjs`. No se incluyen secrets ni permisos de escritura. Las integraciones de ChatGPT **no** se invocan desde GitHub Actions.

Observación real de GameHub (sin escribir): `scripts/gamehub-provider-observer.cjs` usa REST de GitHub limitado, paginado, compara el último HEAD/base y falla cerrado ante errores o evidencia incompleta. El workflow `gamehub-provider-observer.yml` se ejecutará únicamente desde `main` confiable (disparo manual y cron de seis horas) **después de fusionarse**, utilizando `contents: read`. Valor por defecto: `auto` selecciona un PR abierto y verificado de GameHub, priorizando Sentinel/SSS y excluyendo drafts de validación `NO MERGE`. Muestra acotada: **no** revisa automáticamente todos los PR y nunca certifica limpieza. El disparador manual permite seleccionar un PR concreto. Una lista incompleta produce error, no un falso OK.
