#!/usr/bin/env bash
# Blind stage: never reads or mounts independent oracle files or labels.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
engine=$(realpath "$1")
poet=$(realpath "$2")
android=$(realpath "$3")
out=$(realpath "$4")
[ -d "$out" ] && [ -z "$(find "$out" -mindepth 1 -maxdepth 1 -print -quit)" ] || exit 2
root=$(cd "$(dirname "$0")/.." && pwd -P)
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
node - "$root/docs/quality/PHASE2-DOUBLE-EXTERNAL-HOLDOUT-FREEZE-20261111.json" "$engine" "$poet" "$android" <<'JS'
'use strict';
const cp=require('node:child_process'),fs=require('node:fs');
const [manifest,engine,poet,android]=process.argv.slice(2);
const lock=JSON.parse(fs.readFileSync(manifest,'utf8'));
if(lock.schema!=='ultra-sentinel-phase2-external-double-holdout-freeze/v1'||
 lock.engine.commitSha!=='ebd87b7690fa2223ab65ee200ccf816359ee1f08'||
 lock.protocol.truthCommitmentSha256!=='aa4743fb6aedcef5c347a6adfc69c407b8c5496124436afa0ef094b09b8cc5b9'||
 lock.cohorts.length!==2)throw Error('UNTRUSTED_FREEZE');
const git=(dir,...args)=>cp.execFileSync('git',['-C',dir,'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',...args],
 {encoding:'utf8',env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();
for(const [dir,item] of [[engine,lock.engine],[poet,lock.cohorts[0]],[android,lock.cohorts[1]]]){
 if(git(dir,'rev-parse','HEAD')!==item.commitSha||
   git(dir,'status','--porcelain','--untracked-files=all')!=='')throw Error('GIT_CHECKOUT_NOT_FROZEN');
 if(!item.files)continue;
 if(git(dir,'rev-parse','HEAD^{tree}')!==item.treeSha)throw Error('GIT_TREE_NOT_FROZEN');
 const actual=git(dir,'ls-tree','-r','--full-tree','HEAD','--',item.scope)
  .split('\n').filter(x=>x.endsWith('.kt')).map(x=>{
    const m=/^100644 blob ([a-f0-9]{40})\t(.+\.kt)$/.exec(x);
    if(!m)throw Error('UNTRUSTED_TREE');return {path:m[2],blobSha:m[1]};
  }).sort((a,b)=>a.path.localeCompare(b.path));
 if(JSON.stringify(actual)!==JSON.stringify(item.files))
  throw Error('INCOMPLETE_OR_MUTATED_ORIGINAL_SOURCE_UNIVERSE');
}
console.log('BLIND_SOURCE_GIT_TREES_AUTHENTICATED');
JS
umask 077
helper="$engine/packages/investigation/plain-kotlin-payload.cjs"
policy="$engine/packages/investigation/novel-kotlin-path-policy.cjs"
work=$(mktemp -d "$RUNNER_TEMP/phase2-double-XXXXXX")
trap 'rm -rf "$work"' EXIT
for id in poet android; do
 if [ "$id" = poet ]; then
  source=$poet; commit=f4e88d3655b0f5f795186ea8cf3cb5a8ceb6db01
  scope=kotlinpoet/src/commonMain/kotlin; count=9
 else
  source=$android; commit=ee66e1526b84c026615df032c705842b7d2a521f
  scope=app/src/main/java; count=33
 fi
 node "$engine/tests/fixtures/gamehub-blind-numeric/prepare-inventory.cjs" \
  "$source" "$commit" "$scope" "$work/n-$id.json"
 node "$engine/tests/fixtures/gamehub-codec/prepare-blind-inventory.cjs" \
  "$source" "$commit" "$scope" "$work/c-$id.json"
 node - "$work/n-$id.json" "$work/c-$id.json" "$count" <<'JS'
const fs=require('node:fs');const [a,b,num]=process.argv.slice(2);
const x=JSON.parse(fs.readFileSync(a)),y=JSON.parse(fs.readFileSync(b));
if(x.files.length!==Number(num)||y.files.length!==Number(num)||
 x.skippedOversized!==0||x.skippedNoncanonical!==0)throw Error('PARTIAL_INVENTORY');
for(let i=0;i<x.files.length;i++)if(x.files[i].path!==y.files[i].path||
 x.files[i].expectedBlobSha!==y.files[i].expectedBlobSha)throw Error('BLOB_MISMATCH');
JS
 for kind in numeric codec identity; do mkdir -m 700 "$work/$id-$kind"; done
 bash "$engine/tests/fixtures/gamehub-blind-numeric/run-hunter.sh" \
  "$work/n-$id.json" "$engine/packages/family-hunter/phase2-numeric-risk-hunter.cjs" \
  "$engine/packages/family-hunter/blind-numeric-worker.cjs" "$helper" "$policy" "$work/$id-numeric"
 bash "$engine/tests/fixtures/gamehub-codec/run-blind-codec-hunter.sh" \
  "$work/c-$id.json" "$engine/packages/family-hunter/phase2-codec-integrity-hunter.cjs" \
  "$engine/packages/family-hunter/phase2-blind-codec-worker.cjs" "$helper" "$policy" "$work/$id-codec"
 bash "$engine/tests/fixtures/gamehub-identity/run-blind-identity-hunter.sh" \
  "$work/c-$id.json" "$engine/packages/family-hunter/phase2-identity-delimiter-hunter.cjs" \
  "$engine/packages/family-hunter/phase2-blind-identity-worker.cjs" "$helper" "$policy" "$work/$id-identity"
 for kind in numeric codec identity; do cp "$work/$id-$kind/discovery.json" "$out/$id-$kind.json"; done
done
node - "$root/docs/quality/PHASE2-DOUBLE-EXTERNAL-HOLDOUT-FREEZE-20261111.json" "$out" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [file,dir]=process.argv.slice(2),lock=JSON.parse(fs.readFileSync(file,'utf8'));
const receipt={schema:'ultra-sentinel-phase2-dual-blind-capture/v1',engineSha:lock.engine.commitSha,
 truthCommitmentSha256:lock.protocol.truthCommitmentSha256,sourceCount:42,workerReports:[],
 unverifiedFindings:0,scored:false,precision:null,recall:null,falsePositives:null,
 verifiedRepairs:0};
for(const [id,cohort] of [['poet',lock.cohorts[0]],['android',lock.cohorts[1]]]){
 const sources=new Map(cohort.files.map(x=>[x.path,x.blobSha]));
 for(const kind of ['numeric','codec','identity']){
  const bytes=fs.readFileSync(path.join(dir,id+'-'+kind+'.json')),r=JSON.parse(bytes);
  if(r.filesScanned!==cohort.files.length||r.sourceByteIntegrityVerified!==true||
   r.sourceRepositoryAuthenticated!==false||r.remoteWrites!==false||r.mergeAllowed!==false||
   !Array.isArray(r.findings)||r.status.startsWith('BLOCKED_')||
   (kind==='numeric'&&(r.skippedOversized!==0||r.skippedNoncanonical!==0)))
   throw Error('UNTRUSTED_SOURCE_ONLY_WORKER');
  for(const f of r.findings){
   if(sources.get(f.path)!==f.expectedBlobSha||!Number.isSafeInteger(f.line)||
    f.line<1||typeof f.rule!=='string'||!/^[A-Z][A-Z0-9_]+$/.test(f.rule))
    throw Error('FINDING_HAS_NO_AUTHENTICATED_SOURCE_BLOB');
  }
  receipt.workerReports.push({cohort:id,kind,filesCovered:r.filesScanned,
   unverifiedFindings:r.findings.length,
   reportSha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  receipt.unverifiedFindings+=r.findings.length;
 }
}
if(receipt.workerReports.length!==6)throw Error('INCOMPLETE_WORKER_UNIVERSE');
fs.writeFileSync(path.join(dir,'sealed-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log('BLIND_SOURCE_COUNT=42');
console.log('BLIND_UNVERIFIED_FINDINGS='+receipt.unverifiedFindings);
JS
(cd "$out" && sha256sum poet-*.json android-*.json sealed-receipt.json > SHA256SUMS.txt)
cat "$out/SHA256SUMS.txt"
echo 'DUAL_EXTERNAL_PREDICTIONS_SEALED_BEFORE_ORACLES'
