#!/usr/bin/env bash
# Original immutable JARVIS Kotlin source, real JVM RED/GREEN, negative repair.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${JARVIS_TERMUX_ISOLATED:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
test "$#" -eq 1
for tool in gh jq base64 git kotlinc java bwrap node; do command -v "$tool" >/dev/null; done
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
umask 077
repo=cardenaspiero255-lang/JARVIS
head=f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868
blob=7c6f326cb267b56f4ca6b2d0614753695259da56
source_path=apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt
gh api "/repos/$repo/contents/$source_path?ref=$head" > "$root/source-metadata.json"
jq -e --arg p "$source_path" --arg b "$blob" '
  .type=="file" and .path==$p and .sha==$b and .encoding=="base64" and
  .size>100 and .size<10000
' "$root/source-metadata.json" >/dev/null
jq -r .content "$root/source-metadata.json" | base64 --decode > "$root/original.kt"
rm "$root/source-metadata.json"
test "$(git hash-object "$root/original.kt")" = "$blob"
node - "$root" <<'JS'
const fs=require('node:fs'),path=require('node:path');
const {makeTermuxCandidate,verifyOriginalAndCandidate}=
 require('./packages/recovery/jarvis-termux-original-fix.cjs');
const root=process.argv[2],original=fs.readFileSync(path.join(root,'original.kt'),'utf8');
const generated=makeTermuxCandidate(original);
if(!verifyOriginalAndCandidate({original,candidate:generated.candidate}))process.exit(3);
fs.writeFileSync(path.join(root,'candidate.kt'),generated.candidate,{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(root,'unsafe.kt'),generated.unsafe,{flag:'wx',mode:0o600});
JS
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
test -x "$jdk/bin/java"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if [ -L "$mount" ]; then
  dest="$(readlink "$mount")"
  [[ "$dest" != /* && "$dest" != *..* ]] || exit 2
  mounts+=(--symlink "$dest" "$mount")
 elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
run_java(){
 local mode="$1"
 env -i PATH=/usr/bin:/bin HOME=/tmp \
 bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
 --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
 -- /jdk/bin/java -jar "/workspace/$mode.jar" > "$root/$mode.log" 2>&1
}
for mode in original unsafe candidate; do
 before="$(sha256sum "$root/$mode.kt" | cut -d' ' -f1)"
 kotlinc "$root/$mode.kt" "$repo_root/tests/oracles/jarvis-termux-original.kt" \
  -include-runtime -d "$root/$mode.jar" > "$root/$mode.compile" 2>&1
 test -s "$root/$mode.jar"
 test "$(sha256sum "$root/$mode.kt" | cut -d' ' -f1)" = "$before"
 chmod 0400 "$root/$mode.jar"
 set +e
 run_java "$mode"
 code=$?
 set -e
 test "$(sha256sum "$root/$mode.kt" | cut -d' ' -f1)" = "$before"
 case "$mode" in
  original) test "$code" -ne 0
    grep -Fq 'UNTRUSTED_SUFFIX_ACCEPTED' "$root/$mode.log";;
  unsafe) test "$code" -ne 0
    grep -Fq 'NORMAL_ID_FORMAT_FAILED' "$root/$mode.log";;
  candidate) test "$code" -eq 0
    grep -Fxq 'TERMUX_ORIGINAL_ORACLE_PASS' "$root/$mode.log";;
 esac
 node - "$root" "$mode" <<'JS'
const fs=require('node:fs'),p=require('node:path'),crypto=require('node:crypto');
const root=process.argv[2],mode=process.argv[3];
const sum=ext=>crypto.createHash('sha256').update(fs.readFileSync(p.join(root,mode+ext))).digest('hex');
const receipt={sourceSha256:sum('.kt'),compileLogSha256:sum('.compile'),
 jarSha256:sum('.jar'),oracleLogSha256:sum('.log'),
 status:mode==='candidate'?'GREEN':'RED'};
fs.writeFileSync(p.join(root,mode+'.json'),JSON.stringify(receipt)+'\n',
 {flag:'wx',mode:0o600});
JS
done
echo JARVIS_AUTHENTIC_TERMUX_ORIGINAL_RED_REPAIRED_GREEN_UNSAFE_VETO_PASS
