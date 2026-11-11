#!/usr/bin/env bash
# Reveal and independently replay the previously committed truth.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
original=$(realpath "$1")
fixed=$(realpath "$2")
kotlin=$(realpath "$3")
sentinel=$(realpath "$4")
fixture="$sentinel/tests/fixtures/detekt-prospective-20261111"
target=detekt-api/src/main/kotlin/dev/detekt/api/ConfigProperty.kt
(cd "$fixture" && sha256sum --check --status REPORT-SHA256SUMS.txt)
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
[ "$(git -C "$original" rev-parse HEAD)" = 04f97401d462e899383156b25d026b7b8c181401 ]
[ "$(git -C "$fixed" rev-parse HEAD)" = ba8f3a29716cd0ee540e8c449064098b203ee34d ]
[ -z "$(git -C "$original" status --porcelain)" ]
[ -z "$(git -C "$fixed" status --porcelain)" ]
[ "$(git -C "$original" rev-parse "HEAD:$target")" = 93658b34aebd8a7fb47feb08a80bc38b4ec0ee57 ]
[ "$(git -C "$fixed" rev-parse "HEAD:$target")" = 4f9280b2584e39ae8853d863ea4d89f17f672269 ]
[ "$(git hash-object "$original/$target")" = 93658b34aebd8a7fb47feb08a80bc38b4ec0ee57 ]
[ "$(git hash-object "$fixed/$target")" = 4f9280b2584e39ae8853d863ea4d89f17f672269 ]
[[ "$("$kotlin/bin/kotlinc" -version 2>&1)" == *'kotlinc-jvm 2.0.21 '* ]]
node - "$fixture" <<'JS'
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=process.argv[2],sha=f=>createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const truth=JSON.parse(fs.readFileSync(path.join(root,'truth.json'),'utf8'));
if(sha('truth.json')!=='255d0ce2ae462746b38293256c0504f3800dce7bc1a4485ec0a68e0bc3d09b6f'||
 sha('ConfigTypeOracle.kt')!==truth.oracleSha256||sha('RuleStub.kt')!==truth.ruleStubSha256||
 sha('PokoStub.kt')!==truth.pokoStubSha256)throw Error('TRUTH_COMMITMENT_MISMATCH');
JS
umask 077
work=$(mktemp -d /tmp/sentinel-detekt-reveal-XXXXXXXX)
trap 'rm -rf "$work"' EXIT
mkdir "$work/jars" "$work/original-src" "$work/candidate-src" "$work/wrong-src"
cp "$original/$target" "$work/original-src/ConfigProperty.kt"
cp "$fixed/$target" "$work/candidate-src/ConfigProperty.kt"
node - "$work/original-src/ConfigProperty.kt" "$work/wrong-src/ConfigProperty.kt" <<'JS'
const fs=require('node:fs');
const [input,output]=process.argv.slice(2),source=fs.readFileSync(input,'utf8');
const target='if (defaultValue.all { it is String })';
if(source.split(target).length!==2)throw Error('WRONG_INTERVENTION_NOT_UNIQUE');
fs.writeFileSync(output,source.replace(target,'if (false)'),{flag:'wx',mode:0o600});
JS
for kind in original candidate wrong; do
 src=$kind
 [ "$kind" != candidate ] || src=candidate
 "$kotlin/bin/kotlinc" -nowarn "$work/$src-src/ConfigProperty.kt" \
  "$original/detekt-api/src/main/kotlin/dev/detekt/api/Config.kt" \
  "$original/detekt-api/src/main/kotlin/dev/detekt/api/ValuesWithReason.kt" \
  "$original/detekt-test/src/main/kotlin/dev/detekt/test/TestConfig.kt" \
  "$fixture/RuleStub.kt" "$fixture/PokoStub.kt" "$fixture/ConfigTypeOracle.kt" \
  "$fixture/OracleEntrypoint.kt" -include-runtime -d "$work/jars/$kind.jar"
done
git -c core.hooksPath=/dev/null clone --no-hardlinks -q "$original" "$work/checkout"
git -C "$work/checkout" remote remove origin
git -C "$work/checkout" switch -q -c sandbox/detekt-config
node "$fixture/judge.cjs" "$sentinel" "$work" "$work/checkout"
[ -z "$(git -C "$original" status --porcelain)" ]
