#!/usr/bin/env bash
# Execute only inside the externally configured networkless Bubblewrap runner.
# Three original Kotlin sources participate; the experiment deliberately
# distinguishes that fact from a three-file minimal causal interaction.
set -euo pipefail
[ "$#" -eq 3 ] || { echo 'Usage: reproduce.sh GAMEHUB KOTLINC_ROOT SENTINEL' >&2; exit 2; }
original=$(realpath "$1")
kotlin=$(realpath "$2")
sentinel=$(realpath "$3")
fixture="$sentinel/tests/fixtures/gamehub-three-source"
head=e4ca122422f1cb591d407db3fb21fb00fd78b022
paths=(
  app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt
  app/src/main/java/com/cardenaspiero255/gamehubultra/platform/RuntimeDiagnostics.kt
  app/src/main/java/com/cardenaspiero255/gamehubultra/session/SessionCoachTelemetryMapper.kt
)
blobs=(8b9e934ca90852d77ddab274b60fd8dce4f4a2ca 61ab93d2f4e6deb7aaf321b7b18583de2acc5699 d2dc3a59470efcd25e0c1a05d1ca2726ee20371d)
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
kgit(){ git -C "$original" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }
verify_original(){
 [ "$(kgit rev-parse HEAD)" = "$head" ]
 [ -z "$(kgit status --porcelain)" ]
 for i in 0 1 2; do
  [ "$(kgit rev-parse "HEAD:${paths[$i]}")" = "${blobs[$i]}" ]
  [ "$(git hash-object "$original/${paths[$i]}")" = "${blobs[$i]}" ]
 done
}
verify_original
[[ "$("$kotlin/bin/kotlinc" -version 2>&1)" == *'kotlinc-jvm 2.0.21 '* ]]
umask 077
work=$(mktemp -d /tmp/sentinel-telemetry-factorial-XXXXXXXX)
trap 'rm -rf "$work"' EXIT
sha256sum "$fixture"/*.kt > "$work/oracle-and-abi.sha256"
node "$fixture/prepare.cjs" "$original" "$sentinel" "$work" "$head"
"$kotlin/bin/kotlinc" -nowarn -language-version 1.9 -cp "$kotlin/lib/kotlin-compiler.jar" \
 "$sentinel/packages/kotlin-semantic/C2OptionalKotlinSemantic.kt" \
 "$sentinel/tests/fixtures/c2-kotlin-semantic/C2EmitSemanticClaim.kt" -d "$work/emitter.jar"
java -cp "$work/emitter.jar:$kotlin/lib/*" C2EmitSemanticClaimKt \
 "$kotlin/lib/kotlin-stdlib.jar" --name=fromBroadcast \
 "$original/${paths[0]}" "$original/${paths[1]}" "$original/${paths[2]}" \
 "$fixture"/*.kt > "$work/semantic-claims.json"
node "$fixture/verify-semantic-call.cjs" "$original" "$work/semantic-claims.json"
git -c core.hooksPath=/dev/null clone --no-hardlinks -q "$original" "$work/local-git"
git -C "$work/local-git" remote remove origin
git -C "$work/local-git" switch -q -c sandbox/telemetry-three-source
for mask in 0 1 2 3 4 5 6 7; do
 mkdir "$work/case-$mask-src"
 sources=()
 for i in 0 1 2; do
  if (( mask & (1 << i) )); then name="candidate-$i.kt"; else name="original-$i.kt"; fi
  target="$work/case-$mask-src/$(basename "${paths[$i]}")"
  cp "$work/$name" "$target"
  expected=$(node -e 'const m=require(process.argv[1]);const i=Number(process.argv[2]);const changed=process.argv[3]==="1";process.stdout.write(changed?m.files[i].afterBlobSha:m.files[i].beforeBlobSha)' \
   "$work/interventions.json" "$i" "$(( (mask >> i) & 1 ))")
  [ "$(git hash-object "$target")" = "$expected" ]
  sources+=("$target")
 done
 "$kotlin/bin/kotlinc" -nowarn "${sources[@]}" "$fixture"/*.kt -include-runtime \
  -d "$work/case-$mask.jar" > "$work/case-$mask.compile" 2>&1
 sha256sum "$work/case-$mask.jar" > "$work/case-$mask.sha256"
 set +e
 java -XX:-UsePerfData -cp "$work/case-$mask.jar" \
  com.cardenaspiero255.gamehubultra.session.IndependentTelemetryOracleKt \
  > "$work/case-$mask.out" 2> "$work/case-$mask.err"
 status=$?
 set -e
 printf '%s\n' "$status" > "$work/case-$mask.exit"
 sha256sum --check --status "$work/case-$mask.sha256"
 if (( mask > 0 )); then
  node "$fixture/git-drill.cjs" "$work/local-git" "$sentinel" "$work" "$head" "$mask"
 fi
done
# An intentionally wrong candidate must fail the independent benign control.
"$kotlin/bin/kotlinc" -nowarn "$work/unsafe.kt" "$work/original-1.kt" "$work/original-2.kt" \
 "$fixture"/*.kt -include-runtime -d "$work/wrong.jar" > "$work/wrong.compile" 2>&1
mkdir "$work/triplet"
cp "$work/case-0.jar" "$work/triplet/original.jar"
cp "$work/case-1.jar" "$work/triplet/candidate.jar"
cp "$work/wrong.jar" "$work/triplet/wrong.jar"
node "$fixture/check-triplet.cjs" "$sentinel" "$work" "$head"
node "$fixture/adjudicate.cjs" "$sentinel" "$work" "$head"
sha256sum --check --status "$work/oracle-and-abi.sha256"
verify_original
printf '%s\n' 'THREE_SOURCE_EXECUTED_COUNTERFACTUALS_PASS'
