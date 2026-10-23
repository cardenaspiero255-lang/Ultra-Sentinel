#!/usr/bin/env bash
set -euo pipefail
umask 077
test "$GITHUB_ACTIONS" = true
test "$C2_OWNER_SANDBOX" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
test "$#" -eq 1
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
for name in gh jq git kotlinc bwrap python3 node java sha256sum;do command -v "$name" >/dev/null;done
repo=cardenaspiero255-lang/gamehub-ultra
fetch_original(){
 local label="$1" blob="$2" expected_sha="$3"
 gh api "/repos/$repo/git/blobs/$blob" > "$root/meta.json"
 jq -e --arg sha "$blob" '.sha==$sha and .encoding=="base64" and .size>100 and .size<1000000' "$root/meta.json" >/dev/null
 jq -r .content "$root/meta.json" | base64 --decode > "$root/$label-original.kt"
 test "$(git hash-object "$root/$label-original.kt")" = "$blob"
 if [ "$expected_sha" != - ];then
  test "$(sha256sum "$root/$label-original.kt"|cut -d' ' -f1)" = "$expected_sha"
 fi
 rm "$root/meta.json"
}
fetch_original adaptive d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f -
fetch_original store ed936aa687b08cf8d964d54f9d88e68bb12344ec f06604f1bdd7bba80d060adac49d99d9edfb38234e47a91d2f861af3997435da
# PR153 immutable HEAD tree attestation; PR152 HEAD association remains
# inherited from earlier original-owner receipt (historical HEAD API unavailable).
gh api "/repos/$repo/git/commits/6508cc124076b9dea437ea1efc213d3ce55d7baf" > "$root/commit.json"
tree="$(jq -er 'select(.sha=="6508cc124076b9dea437ea1efc213d3ce55d7baf")|.tree.sha' "$root/commit.json")"
gh api "/repos/$repo/git/trees/$tree?recursive=1" > "$root/tree.json"
jq -e '[.tree[]|select(.path=="app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt" and .sha=="d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f")]|length==1' "$root/tree.json" >/dev/null
rm "$root/commit.json" "$root/tree.json"
node - "$root" <<'NODE'
const fs=require('node:fs'),p=require('node:path');
const root=process.argv[2];
const {patchOriginal}=require('./packages/quality-gates/c2-pr153-replay-causal.cjs');
fs.writeFileSync(p.join(root,'adaptive-repaired.kt'),
 patchOriginal(fs.readFileSync(p.join(root,'adaptive-original.kt'),'utf8')),{flag:'wx',mode:0o600});
NODE
python3 - "$root" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1]);original=(root/'store-original.kt').read_text()
before='        require(proposal.version > 0) { "proposal version must be positive" }'
after=before+'\n        if (proposal.version < preferences.getInt(versionKey(cleanPackage), 0)) return'
assert original.count(before)==1 and after not in original,'C2_STORE_SOURCE_OR_PATCH_DRIFT'
(root/'store-repaired.kt').write_text(original.replace(before,after,1))
PY
test "$(git hash-object "$root/adaptive-original.kt")" = d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f
test "$(git hash-object "$root/store-original.kt")" = ed936aa687b08cf8d964d54f9d88e68bb12344ec
test "$(git hash-object "$root/adaptive-repaired.kt")" != d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f
test "$(git hash-object "$root/store-repaired.kt")" != ed936aa687b08cf8d964d54f9d88e68bb12344ec
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
mounts=(--ro-bind /usr /usr)
for m in /bin /lib /lib64;do
 if [ -L "$m" ];then
  target="$(readlink "$m")"
  [[ "$target" != /* && "$target" != *..* ]] || exit 2
  mounts+=(--symlink "$target" "$m")
 elif [ -d "$m" ];then mounts+=(--ro-bind "$m" "$m")
 else exit 2;fi
done
for mode in 00 01 10 11;do
 a=original;s=original
 case "$mode" in 10|11) a=repaired;;esac
 case "$mode" in 01|11) s=repaired;;esac
 kotlinc "$root/adaptive-$a.kt" "$root/store-$s.kt" \
  tests/oracles/c2-pr153-152-shared-domain-abi.kt \
  tests/oracles/c2-next-pr153-data-abi.kt \
  tests/oracles/c2-next-pr153-coroutines-abi.kt \
  tests/oracles/c2-run20-android-preferences-abi.kt \
  tests/oracles/c2-pr153-152-shared-jvm-oracle.kt \
  -include-runtime -d "$root/$mode.jar" > "$root/$mode.compile" 2>&1 || {
   echo "C2_SHARED_COMPILE_BLOCKED mode=$mode" >&2
   grep -E 'error:|Exception' "$root/$mode.compile"|head -24 >&2 || :;exit 2;
 }
 env -i PATH=/usr/bin:/bin HOME=/tmp /usr/bin/bwrap --die-with-parent \
  --unshare-all --new-session --clearenv --setenv PATH /usr/bin:/bin \
  --setenv HOME /tmp "${mounts[@]}" \
  --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
  --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
  -- /jdk/bin/java -jar "/workspace/$mode.jar" "$mode" > "$root/$mode.log" 2>&1 || {
   echo "C2_SHARED_RUNTIME_BLOCKED mode=$mode" >&2
   grep -E 'Exception|C2_SHARED' "$root/$mode.log"|head -24 >&2 || :;exit 2;
 }
 grep -Fxq C2_SHARED_JVM_ORIGINAL_SOURCE_CONTROLS_PASS "$root/$mode.log"
 localCorrect=false;stale=false;coupled=false;blocked=false
 case "$mode" in 10|11) localCorrect=true;;esac
 case "$mode" in 01|11) stale=true;;esac
 case "$mode" in 11) coupled=true;;esac
 case "$mode" in 10) blocked=true;;esac
 grep -Fxq "C2_SHARED_JVM mode=$mode localReplayCorrect=$localCorrect staleRejected=$stale coupledReplayCorrect=$coupled staleGuardBlockedReplay=$blocked" "$root/$mode.log"
done
mkdir -p "$root/output"
node scripts/c2-shared-pr153-pr152-receipt.cjs "$root"
