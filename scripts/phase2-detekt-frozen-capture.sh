#!/usr/bin/env bash
# Capture unscored predictions only; no oracle, labels or repair is read here.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
engine=$(realpath "$1")
source_a=$(realpath "$2")
source_b=$(realpath "$3")
output=$(realpath "$4")
[ -d "$output" ] && [ -z "$(find "$output" -mindepth 1 -maxdepth 1 -print -quit)" ] || exit 2
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
verify_git(){
 local dir=$1 commit=$2 tree=$3
 [ "$(git -C "$dir" -c core.hooksPath=/dev/null rev-parse HEAD)" = "$commit" ]
 [ "$(git -C "$dir" -c core.hooksPath=/dev/null rev-parse 'HEAD^{tree}')" = "$tree" ]
 [ -z "$(git -C "$dir" -c core.hooksPath=/dev/null status --porcelain --untracked-files=all)" ]
}
verify_git "$engine" f5be850a7d50c8978318b3bc371f4f03ef49d983 ef9114cda9a4acc3f816387708940667bb4ab0b0
verify_git "$source_a" 04f97401d462e899383156b25d026b7b8c181401 1d990fe1dfd22f5735fd57a71c605b5315128307
verify_git "$source_b" ba8f3a29716cd0ee540e8c449064098b203ee34d 7241d29184caa9ad11eb7f6ed3199013e6d71bb7
umask 077
work=$(mktemp -d "${RUNNER_TEMP:?}/sentinel-detekt-input-XXXXXXXX")
trap 'rm -rf "$work"' EXIT
scope=detekt-api/src/main/kotlin
helper="$engine/packages/investigation/plain-kotlin-payload.cjs"
policy="$engine/packages/investigation/novel-kotlin-path-policy.cjs"
for id in a b; do
 if [ "$id" = a ]; then source=$source_a; head=04f97401d462e899383156b25d026b7b8c181401
 else source=$source_b; head=ba8f3a29716cd0ee540e8c449064098b203ee34d; fi
 node "$engine/tests/fixtures/gamehub-blind-numeric/prepare-inventory.cjs" \
  "$source" "$head" "$scope" "$work/numeric-$id.json"
 node "$engine/tests/fixtures/gamehub-codec/prepare-blind-inventory.cjs" \
  "$source" "$head" "$scope" "$work/codec-$id.json"
 node - "$work/numeric-$id.json" "$work/codec-$id.json" "$head" <<'JS'
const fs=require('node:fs');
const [a,b,head]=process.argv.slice(2).map((x,i)=>i<2?JSON.parse(fs.readFileSync(x,'utf8')):x);
if(a.expectedCommitSha!==head||b.expectedCommitSha!==head||a.files.length!==33||b.files.length!==33||
 a.skippedOversized!==0||a.skippedNoncanonical!==0)throw Error('INCOMPLETE_SOURCE_INVENTORY');
for(let i=0;i<33;i++)if(a.files[i].path!==b.files[i].path||
 a.files[i].expectedBlobSha!==b.files[i].expectedBlobSha)throw Error('INVENTORY_IDENTITY_MISMATCH');
JS
 for kind in numeric codec identity; do mkdir "$work/out-$id-$kind"; done
 bash "$engine/tests/fixtures/gamehub-blind-numeric/run-hunter.sh" \
  "$work/numeric-$id.json" "$engine/packages/family-hunter/phase2-numeric-risk-hunter.cjs" \
  "$engine/packages/family-hunter/blind-numeric-worker.cjs" "$helper" "$policy" "$work/out-$id-numeric"
 bash "$engine/tests/fixtures/gamehub-codec/run-blind-codec-hunter.sh" \
  "$work/codec-$id.json" "$engine/packages/family-hunter/phase2-codec-integrity-hunter.cjs" \
  "$engine/packages/family-hunter/phase2-blind-codec-worker.cjs" "$helper" "$policy" "$work/out-$id-codec"
 bash "$engine/tests/fixtures/gamehub-identity/run-blind-identity-hunter.sh" \
  "$work/codec-$id.json" "$engine/packages/family-hunter/phase2-identity-delimiter-hunter.cjs" \
  "$engine/packages/family-hunter/phase2-blind-identity-worker.cjs" "$helper" "$policy" "$work/out-$id-identity"
 for kind in numeric codec identity; do
  cp "$work/out-$id-$kind/discovery.json" "$output/$id-$kind.json"
 done
 # Seal and externally log A before the separate B worker receives B's source.
 if [ "$id" = a ]; then
  (cd "$output" && sha256sum a-numeric.json a-codec.json a-identity.json > A-SHA256SUMS.txt)
  printf '%s\n' 'REVISION_A_PREDICTIONS_SEALED'
  cat "$output/A-SHA256SUMS.txt"
 fi
done
(cd "$output" && sha256sum --check --status A-SHA256SUMS.txt)
node - "$output" <<'JS'
const fs=require('node:fs'),path=require('node:path');
const root=process.argv[2];
for(const id of ['a','b'])for(const kind of ['numeric','codec','identity']){
 const report=JSON.parse(fs.readFileSync(path.join(root,`${id}-${kind}.json`),'utf8'));
 if(report.filesScanned!==33||!Array.isArray(report.findings)||report.status.startsWith('BLOCKED_'))
  throw Error('INCOMPLETE_OR_BLOCKED_PREDICTIONS');
}
JS
(cd "$output" && sha256sum a-numeric.json a-codec.json a-identity.json b-numeric.json b-codec.json b-identity.json > SHA256SUMS.txt)
printf '%s\n' 'FROZEN_DETEKT_PREDICTIONS_SEALED_NO_SCORES'
cat "$output/SHA256SUMS.txt"
for id in a b; do for kind in numeric codec identity; do
 printf 'PREDICTION_%s_%s=' "$id" "$kind"
 cat "$output/$id-$kind.json"
 printf '\n'
done; done
