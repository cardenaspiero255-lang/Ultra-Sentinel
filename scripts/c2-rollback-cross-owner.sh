#!/usr/bin/env bash
set -euo pipefail
umask 077
test "$GITHUB_ACTIONS" = true
test "$C2_OWNER_SANDBOX" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
for c in gh jq kotlinc java bwrap python3 node;do command -v "$c" >/dev/null;done
test "$#" = 1
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
mkdir -p "$root/output"
fetch(){
 local tag="$1" head="$2" blob="$3" path="$4" sum="$5"
 # Authenticate exact Git tree entry and Git blob without moving branch refs.
 echo "C2_SOURCE_AUTH_BEGIN tag=$tag commit=$head"
 if [ "$tag" != store ];then
  gh api "/repos/cardenaspiero255-lang/gamehub-ultra/git/commits/$head" > "$root/commit.json"
  local tree
  tree="$(jq -er --arg sha "$head" 'select(.sha==$sha) | .tree.sha | select(test("^[a-f0-9]{40}$"))' "$root/commit.json")"
  gh api "/repos/cardenaspiero255-lang/gamehub-ultra/git/trees/$tree?recursive=1" > "$root/tree.json"
  jq -e --arg p "$path" --arg b "$blob" '
   .truncated==false and ([.tree[]|select(.path==$p and .type=="blob" and .sha==$b)]|length)==1
  ' "$root/tree.json" >/dev/null
 else
  # GitHub Actions token cannot resolve historical 104b7d commit, but immutable
  # original blob is pinned in authenticated historical Run23 owner archive.
  # Never infer a NEW HEAD attestation from a blob-only lookup.
  echo "C2_STORE_GIT_BLOB_ONLY_PRIOR_ORIGINAL_HEAD_ATTESTED_IN_RUN23"
 fi
 gh api "/repos/cardenaspiero255-lang/gamehub-ultra/git/blobs/$blob" > "$root/meta.json"
 jq -e --arg b "$blob" '.sha==$b and .encoding=="base64" and .size>100 and .size<1000000' "$root/meta.json" >/dev/null
 jq -r .content "$root/meta.json" | base64 --decode > "$root/$tag-original.kt"
 test "$(git hash-object "$root/$tag-original.kt")" = "$blob"
 if [ "$sum" != - ];then test "$(sha256sum "$root/$tag-original.kt"|cut -d' ' -f1)" = "$sum";fi
 rm -f "$root/meta.json" "$root/tree.json" "$root/commit.json"
}
fetch adaptive 6508cc124076b9dea437ea1efc213d3ce55d7baf d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt -
fetch store 104b7dc33e4c0341cec3c8fbe3625357f ed936aa687b08cf8d964d54f9d88e68bb12344ec app/src/main/java/com/cardenaspiero255/gamehubultra/data/AiProfileProposalStore.kt f06604f1bdd7bba80d060adac49d99d9edfb38234e47a91d2f861af3997435da
fetch negative 6508cc124076b9dea437ea1efc213d3ce55d7baf 18911c26a9afaf051fda0e9ea14cdaccf943a47b app/src/main/java/com/cardenaspiero255/gamehubultra/data/GameStateOwnershipContracts.kt 8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15
node - "$root" <<'NODE'
const fs=require('node:fs'),p=require('node:path');
const {patchOriginal}=require('./packages/quality-gates/c2-pr153-replay-causal.cjs');
fs.writeFileSync(p.join(process.argv[2],'adaptive-repaired.kt'),patchOriginal(fs.readFileSync(p.join(process.argv[2],'adaptive-original.kt'),'utf8')),{flag:'wx'});
NODE
python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1])
x=(r/'store-original.kt').read_text()
a='        require(proposal.version > 0) { "proposal version must be positive" }'
assert x.count(a)==1,'STORE_SOURCE_DRIFT'
(r/'store-repaired.kt').write_text(x.replace(a,a+'\n        if (proposal.version < preferences.getInt(versionKey(cleanPackage), 0)) return',1))
x=(r/'negative-original.kt').read_text()
a='''        delegate.saveAdaptiveProfileForGame(packageName, profile)
    }'''
c='''        delegate.saveAdaptiveProfileForGame(packageName, profile)
        onExplicitGameProfileSelection(packageName, profile)
    }'''
assert x.count(a)==1,'NEGATIVE_SOURCE_DRIFT'
(r/'negative-mutant.kt').write_text(x.replace(a,c,1))
PY
for suite in adaptive store negative;do
 other=repaired
 if [ "$suite" = negative ];then other=mutant;fi
 test "$(git hash-object "$root/$suite-original.kt")" != "$(git hash-object "$root/$suite-$other.kt")"
 for v in original "$other";do
  if [ "$suite" = adaptive ];then
   abis=(tests/oracles/c2-next-pr153-domain-abi.kt tests/oracles/c2-next-pr153-data-abi.kt tests/oracles/c2-next-pr153-coroutines-abi.kt tests/oracles/c2-pr153-replay-causal.kt)
  elif [ "$suite" = store ];then
   abis=(tests/oracles/c2-run20-android-preferences-abi.kt tests/oracles/c2-pr186-rollback-ttl-domain-abi.kt tests/oracles/c2-rollback-152-store-cross.kt)
  else
   abis=(tests/oracles/c2-run16-ownership-domain-abi.kt tests/oracles/c2-run16-ownership-data-abi.kt tests/oracles/c2-run16-ownership-flow-abi.kt tests/oracles/c2-run16-ownership-oracle.kt)
  fi
  kotlinc "$root/$suite-$v.kt" "${abis[@]}" -include-runtime -d "$root/$suite-$v.jar" > "$root/$suite-$v.compile" 2>&1 || {
   grep -E 'error:|Exception' "$root/$suite-$v.compile"|head -12 >&2 || :;exit 2;
  }
  test -s "$root/$suite-$v.jar"
 done
done
jvm(){
 local name="$1" jdk
 jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
 local mounts=(--ro-bind /usr /usr)
 for m in /bin /lib /lib64;do
  if [ -L "$m" ];then
   local target
   target="$(readlink "$m")"
   [[ "$target" != /* && "$target" != *..* ]] || return 2
   mounts+=(--symlink "$target" "$m")
  elif [ -d "$m" ];then mounts+=(--ro-bind "$m" "$m")
  else return 2;fi
 done
 env -i PATH=/usr/bin:/bin HOME=/tmp /usr/bin/bwrap --die-with-parent --unshare-all \
 --new-session --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
 --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
 -- /jdk/bin/java -jar "/workspace/$name.jar"
}
for s in adaptive store;do
 for v in original repaired;do
  jvm "$s-$v" > "$root/$s-$v.log" 2>&1
  if [ "$s" = adaptive ];then jq -e 'type=="object" and (keys|length)==7' "$root/$s-$v.log" >/dev/null
  else jq -e 'type=="object" and (keys|length)==4' "$root/$s-$v.log" >/dev/null;fi
 done
done
jvm negative-original > "$root/negative-original.log" 2>&1
grep -Fxq 'C2_PR153_EXPLICIT_CONTROL_PASS' "$root/negative-original.log"
grep -Fxq 'C2_PR153_ADAPTIVE_CALLBACK_ISOLATION_PASS' "$root/negative-original.log"
set +e
jvm negative-mutant > "$root/negative-mutant.log" 2>&1
exit_code=$?
set -e
test "$exit_code" -ne 0
grep -Fq 'C2_PR153_ADAPTIVE_WRITE_LEAKS_EXPLICIT_CALLBACK' "$root/negative-mutant.log"
node - "$root" <<'NODE'
const fs=require('node:fs'),p=require('node:path'),{createHash}=require('node:crypto');
const root=process.argv[2],H=x=>createHash('sha256').update(fs.readFileSync(p.join(root,x))).digest('hex');
const item=s=>({
 original:JSON.parse(fs.readFileSync(p.join(root,s+'-original.log'),'utf8')),
 repaired:JSON.parse(fs.readFileSync(p.join(root,s+'-repaired.log'),'utf8')),
 ...Object.fromEntries(['original','repaired'].flatMap(v=>[[v+'LogSha256',H(s+'-'+v+'.log')],[v+'JarSha256',H(s+'-'+v+'.jar')]]))
});
const data={schema:'c2-original-rollback-cross-jvm-input/v1',
 source:[
 {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',repairSha256:H('adaptive-repaired.kt')},
 {id:'152:41',head:'104b7dc33e4c0341cec3c8fbe3625357f',blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec',repairSha256:H('store-repaired.kt')},
 {id:'153:69',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b',sourceSha256:H('negative-original.kt')}
 ],adaptive:item('adaptive'),store:item('store'),
 negative:{
  originalControlsPassed:true,mutantKilled:true,originalOperatorUntouched:true,
  originalLogSha256:H('negative-original.log'),mutantLogSha256:H('negative-mutant.log'),
  originalJarSha256:H('negative-original.jar'),mutantJarSha256:H('negative-mutant.jar')
 },sourceBlobsAuthenticated:true,sandboxEnforced:true,
 candidateSourceRead:false,detectorPredictionsRead:false,newGoldLabels:0};
const {adjudicateRollbackCross}=require('./packages/quality-gates/c2-rollback-cross-owner.cjs');
console.log('C2_SAFE_GATE_INPUT '+JSON.stringify({sources:data.source,sourceBlobsAuthenticated:data.sourceBlobsAuthenticated,sandboxEnforced:data.sandboxEnforced,candidateSourceRead:data.candidateSourceRead,detectorPredictionsRead:data.detectorPredictionsRead,newGoldLabels:data.newGoldLabels}));
const output=adjudicateRollbackCross(data);
fs.writeFileSync(p.join(root,'output','rollback-cross.json'),JSON.stringify(output,null,2)+'\n',{flag:'wx',mode:0o600});
process.stdout.write(JSON.stringify({realJvm:6,controls:0,certifiedFamilies:0,gold:0,evidenceSha256:output.evidenceSha256})+'\n');
NODE
test -s "$root/output/rollback-cross.json"
