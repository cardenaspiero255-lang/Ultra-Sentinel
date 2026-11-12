#!/usr/bin/env bash
# Executes only the frozen Hunter SHA. Oracles and truth labels are NOT mounted.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
engine=$(realpath "$1")
atomic=$(realpath "$2")
compose=$(realpath "$3")
out=$(realpath "$4")
[ -d "$out" ] && [ -z "$(find "$out" -mindepth 1 -maxdepth 1 -print -quit)" ] || exit 2
root=$(cd "$(dirname "$0")/.." && pwd -P)
manifest="$root/docs/quality/PHASE2-NEW-KMP-PROSPECTIVE-FREEZE-20261112.json"
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
node - "$manifest" "$engine" "$atomic" "$compose" <<'JS'
'use strict';
const fs=require('node:fs'),cp=require('node:child_process');
const [file,engine,atomic,compose]=process.argv.slice(2),lock=JSON.parse(fs.readFileSync(file,'utf8'));
if(lock.schema!=='ultra-sentinel-phase2-kmp-prospective-freeze/v1'||
 lock.engine.commitSha!=='ce2c030fde3465ee4c3203022fee2c09c2233f59'||
 lock.truth.commitmentSha256!=='0e74b367c33f65f01d67c96b35fcda0185f9b49d410f9cfeb00f960bfde4155c'||
 lock.cohorts.length!==2||lock.cohorts[0].scopes.length!==2||lock.cohorts[1].scopes.length!==1)
 throw Error('UNTRUSTED_PRECOMMITMENT');
const git=(dir,...args)=>cp.execFileSync('git',['-C',dir,'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',...args],
 {encoding:'utf8',env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();
for(const [dir,item] of [[engine,lock.engine],[atomic,lock.cohorts[0]],[compose,lock.cohorts[1]]]){
 if(git(dir,'rev-parse','HEAD')!==item.commitSha||
   git(dir,'status','--porcelain','--untracked-files=all')!=='')throw Error('UNTRUSTED_GIT_STATE');
 if(!item.scopes)continue;
 if(git(dir,'rev-parse','HEAD^{tree}')!==item.treeSha)throw Error('SOURCE_TREE_MISMATCH');
 for(const scope of item.scopes){
  const files=git(dir,'ls-tree','-r','--full-tree','HEAD','--',scope.scope).split('\n')
   .filter(x=>x.endsWith('.kt')).map(x=>{
    const m=/^100644 blob ([a-f0-9]{40})\t(.+\.kt)$/.exec(x);
    if(!m)throw Error('INVALID_SOURCE_TREE_RECORD');
    return {path:m[2],blobSha:m[1]};
   }).sort((a,b)=>a.path.localeCompare(b.path));
  if(files.length!==scope.files.length||
    files.some((x,i)=>x.path!==scope.files[i].path||x.blobSha!==scope.files[i].blobSha))
   throw Error('INCOMPLETE_OR_MUTATED_KOTLIN_SOURCE_COHORT');
 }
}
console.log('FROZEN_HUNTER_AND_ORIGINAL_GIT_TREES_VERIFIED');
JS
umask 077
helper="$engine/packages/investigation/plain-kotlin-payload.cjs"
policy="$engine/packages/investigation/novel-kotlin-path-policy.cjs"
scratch=$(mktemp -d "$RUNNER_TEMP/atomic-compose-source-XXXXXX")
trap 'rm -rf "$scratch"' EXIT
for id in atomic-common atomic-jvm compose-common; do
 case "$id" in
  atomic-common) checkout=$atomic; scope=atomicfu/src/commonMain/kotlin; sha=063dd3c8e9b8bd8b7fc2a7e897c3f6eeb2c9a428; count=7 ;;
  atomic-jvm) checkout=$atomic; scope=atomicfu/src/jvmMain/kotlin; sha=063dd3c8e9b8bd8b7fc2a7e897c3f6eeb2c9a428; count=6 ;;
  compose-common) checkout=$compose; scope=components/resources/library/src/commonMain/kotlin; sha=8431de3fdab6251ce5a0d7ab07303f5c85b13827; count=25 ;;
  *) exit 2 ;;
 esac
 node "$engine/tests/fixtures/gamehub-blind-numeric/prepare-inventory.cjs" \
  "$checkout" "$sha" "$scope" "$scratch/n-$id.json"
 node "$engine/tests/fixtures/gamehub-codec/prepare-blind-inventory.cjs" \
  "$checkout" "$sha" "$scope" "$scratch/c-$id.json"
 node - "$scratch/n-$id.json" "$scratch/c-$id.json" "$count" <<'JS'
'use strict';
const fs=require('node:fs'),[a,b,n]=process.argv.slice(2);
const x=JSON.parse(fs.readFileSync(a,'utf8')),y=JSON.parse(fs.readFileSync(b,'utf8'));
if(x.files.length!==Number(n)||y.files.length!==Number(n)||x.skippedOversized!==0||x.skippedNoncanonical!==0)
 throw Error('UNVERIFIED_INVENTORY_COVERAGE');
for(let i=0;i<x.files.length;i++)if(x.files[i].path!==y.files[i].path||
 x.files[i].expectedBlobSha!==y.files[i].expectedBlobSha)throw Error('MISMATCHED_INVENTORIES');
JS
 for kind in numeric codec identity; do mkdir -m 700 "$scratch/out-$id-$kind"; done
 bash "$engine/tests/fixtures/gamehub-blind-numeric/run-hunter.sh" \
  "$scratch/n-$id.json" "$engine/packages/family-hunter/phase2-numeric-risk-hunter.cjs" \
  "$engine/packages/family-hunter/blind-numeric-worker.cjs" "$helper" "$policy" "$scratch/out-$id-numeric"
 bash "$engine/tests/fixtures/gamehub-codec/run-blind-codec-hunter.sh" \
  "$scratch/c-$id.json" "$engine/packages/family-hunter/phase2-codec-integrity-hunter.cjs" \
  "$engine/packages/family-hunter/phase2-blind-codec-worker.cjs" "$helper" "$policy" "$scratch/out-$id-codec"
 bash "$engine/tests/fixtures/gamehub-identity/run-blind-identity-hunter.sh" \
  "$scratch/c-$id.json" "$engine/packages/family-hunter/phase2-identity-delimiter-hunter.cjs" \
  "$engine/packages/family-hunter/phase2-blind-identity-worker.cjs" "$helper" "$policy" "$scratch/out-$id-identity"
 for kind in numeric codec identity; do cp "$scratch/out-$id-$kind/discovery.json" "$out/$id-$kind.json"; done
done
node - "$manifest" "$out" <<'JS'
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const [file,dir]=process.argv.slice(2),m=JSON.parse(fs.readFileSync(file,'utf8'));
const groups=[
 {id:'atomic-common',cohort:m.cohorts[0],scope:m.cohorts[0].scopes[0]},
 {id:'atomic-jvm',cohort:m.cohorts[0],scope:m.cohorts[0].scopes[1]},
 {id:'compose-common',cohort:m.cohorts[1],scope:m.cohorts[1].scopes[0]}
];
const receipt={schema:'ultra-sentinel-phase2-new-kmp-frozen-source-receipt/v1',
 engineSha:m.engine.commitSha,truthCommitmentSha256:m.truth.commitmentSha256,
 originalKotlinFiles:38,skippedOversized:0,skippedNoncanonical:0,
 reports:[],unverifiedFindings:0,oracleVerified:false,scored:false,
 truePositives:null,falsePositives:null,falseNegatives:null,
 precision:null,recall:null,f1:null,novelFamilyVerified:false,
 sourceRepositoryAuthenticatedInWorker:false,mergeAllowed:false,remoteWrites:false};
for(const {id,scope} of groups){
 const bound=new Map(scope.files.map(x=>[x.path,x.blobSha]));
 for(const kind of ['numeric','codec','identity']){
  const bytes=fs.readFileSync(path.join(dir,id+'-'+kind+'.json'));
  const verdict=JSON.parse(bytes);
  if(verdict.filesScanned!==scope.files.length||
   verdict.sourceRepositoryAuthenticated!==false||
   verdict.remoteWrites!==false||verdict.mergeAllowed!==false||
   !Array.isArray(verdict.findings)||typeof verdict.status!=='string'||
   verdict.status.startsWith('BLOCKED_')||
   (kind==='numeric'&&(verdict.skippedOversized!==0||verdict.skippedNoncanonical!==0||
       verdict.sourceByteIntegrityVerified!==true)))
   throw Error('INCOMPLETE_OR_UNSAFE_FROZEN_WORKER');
  for(const f of verdict.findings){
   if(bound.get(f.path)!==f.expectedBlobSha||!Number.isSafeInteger(f.line)||
     f.line<1||f.line>4000||typeof f.rule!=='string'||!/^[A-Z][A-Z0-9_]+$/.test(f.rule))
    throw Error('UNAUTHENTICATED_GIT_SOURCE_FINDING');
  }
  receipt.reports.push({id,kind,files:verdict.filesScanned,findings:verdict.findings.length,
   sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  receipt.unverifiedFindings+=verdict.findings.length;
 }
}
if(receipt.reports.length!==9||groups.reduce((n,x)=>n+x.scope.files.length,0)!==38)
 throw Error('PARTIAL_FROZEN_KMP_EVALUATION');
fs.writeFileSync(path.join(dir,'source-only-seal.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log('FROZEN_KMP_SOURCE_FILES=38');
console.log('FROZEN_KMP_REPORTS=9');
console.log('FROZEN_KMP_UNVERIFIED_FINDINGS='+receipt.unverifiedFindings);
JS
(cd "$out" && sha256sum *.json > SHA256SUMS.txt)
echo 'FROZEN_KMP_ALL_PREDICTIONS_SEALED_WITHOUT_ORACLE'
