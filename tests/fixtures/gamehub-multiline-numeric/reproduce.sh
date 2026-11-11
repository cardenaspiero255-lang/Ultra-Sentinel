#!/usr/bin/env bash
# Development replay, intended for the existing networkless CI sandbox.
set -euo pipefail
[ "$#" -eq 3 ] || exit 2
original=$(realpath "$1")
kotlin=$(realpath "$2")
sentinel=$(realpath "$3")
head=e4ca122422f1cb591d407db3fb21fb00fd78b022
target=app/src/main/java/com/cardenaspiero255/gamehubultra/platform/RuntimeDiagnostics.kt
fixture="$sentinel/tests/fixtures/gamehub-multiline-numeric"
abi="$sentinel/tests/fixtures/gamehub-three-source"
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
kgit(){ git -C "$original" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }
[ "$(kgit rev-parse HEAD)" = "$head" ]
[ -z "$(kgit status --porcelain)" ]
[ "$(kgit rev-parse "HEAD:$target")" = 61ab93d2f4e6deb7aaf321b7b18583de2acc5699 ]
[ "$(git hash-object "$original/$target")" = 61ab93d2f4e6deb7aaf321b7b18583de2acc5699 ]
[[ "$("$kotlin/bin/kotlinc" -version 2>&1)" == *'kotlinc-jvm 2.0.21 '* ]]
umask 077
work=$(mktemp -d /tmp/sentinel-storage-development-XXXXXXXX)
trap 'rm -rf "$work"' EXIT
node "$fixture/prepare.cjs" "$original" "$sentinel" "$work"
sha256sum "$work/discovery.json" > "$work/discovery.sha256"
mkdir "$work/jars"
stubs=("$abi"/android-*.kt "$abi/coroutines-abi.kt" "$abi/domain-abi.kt" "$abi/platform-abi.kt" "$abi/tool-abi.kt")
for kind in original candidate wrong; do
 mkdir "$work/$kind-src"
 cp "$work/$kind.kt" "$work/$kind-src/RuntimeDiagnostics.kt"
 "$kotlin/bin/kotlinc" -nowarn "$work/$kind-src/RuntimeDiagnostics.kt" \
  "$original/app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt" \
  "${stubs[@]}" "$fixture/IndependentStorageOracle.kt" -include-runtime -d "$work/jars/$kind.jar"
done
git -c core.hooksPath=/dev/null clone --no-hardlinks -q "$original" "$work/checkout"
git -C "$work/checkout" remote remove origin
git -C "$work/checkout" switch -q -c sandbox/multiline-storage
node "$fixture/judge.cjs" "$sentinel" "$work" "$work/checkout"
sha256sum --check --status "$work/discovery.sha256"
[ "$(kgit rev-parse HEAD)" = "$head" ]
[ -z "$(kgit status --porcelain)" ]
