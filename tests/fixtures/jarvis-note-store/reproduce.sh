#!/usr/bin/env bash
# Local research only. No Android device, fresh compiler attestation or production authorization.
set -euo pipefail
[ "$#" = 3 ] || { echo 'Usage: reproduce.sh JARVIS_CHECKOUT KOTLIN_ROOT SENTINEL_CHECKOUT' >&2; exit 2; }
source_root=$(realpath "$1")
kotlin_root=$(realpath "$2")
sentinel_root=$(realpath "$3")
evidence_root=$(cd "$(dirname "$0")" && pwd)
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
expected=747c14b5d97750a7b2736968e2d516f02448558d
kgit(){ git -C "$source_root" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }
[ "$(kgit rev-parse HEAD)" = "$expected" ]
[ -z "$(kgit status --porcelain)" ]
[ "$("$kotlin_root/bin/kotlinc" -version 2>&1 | head -n1 | cut -d' ' -f2-3)" = 'kotlinc-jvm 2.0.21' ]
base=apps/android/app/src/main/java/com/cardenaspiero255/jarvis
check_blob(){
  local filename=$1 expected_blob=$2 actual
  actual=$(kgit rev-parse "HEAD:$filename")
  [ "$actual" = "$expected_blob" ]
  [ "$(git hash-object "$source_root/$filename")" = "$expected_blob" ]
}
check_blob "$base/core/LocalDialogue.kt" 6e1117c05fe585fc843dddd8143042e7f49238f4
check_blob "$base/core/PrivateKnowledgePack.kt" 449733693643446cd692a59a12d94c8d8d88a581
check_blob "$base/PrivateConversationStore.kt" 155c9a4bb55ea917a7bc5c856b7721e52e91c820
umask 077
work=$(mktemp -d /tmp/sentinel-note-oracle-XXXXXXXX)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/stubs" "$work/junit"
mapfile -t stubs < <(find "$evidence_root/android-stubs" -type f -name '*.java' | sort)
mapfile -t junit < <(find "$evidence_root/junit-shim" -type f -name '*.java' | sort)
mapfile -t kotlin < <(find "$source_root/$base/core" -maxdepth 1 -type f -name '*.kt' | sort)
[ "${#kotlin[@]}" -eq 66 ]
node - "$source_root" "$sentinel_root" "$base" <<'JS'
'use strict';
// No suspect filename is supplied to Hunter: scan the eligible original core
// source directory and let the detector identify the candidate file itself.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=process.argv[2],sentinel=process.argv[3],base=process.argv[4];
const {scanKotlinFamilyAdvisories}=require(
 path.join(sentinel,'packages/family-hunter/combined-kotlin-family-advisories.cjs'));
const dir=path.join(root,base,'core'),sources=fs.readdirSync(dir,{withFileTypes:true})
 .filter(x=>x.isFile()&&x.name.endsWith('.kt')).map(x=>{
  const rel=base+'/core/'+x.name,source=fs.readFileSync(path.join(dir,x.name),'utf8');
  const expectedBlobSha=execFileSync('git',['-C',root,'rev-parse','HEAD:'+rel],{
   encoding:'utf8',env:{PATH:process.env.PATH,HOME:root,GIT_NO_REPLACE_OBJECTS:'1',
    GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}
  }).trim();
  return {path:rel,source,expectedBlobSha};
 }).filter(x=>x.source.length>=10&&x.source.endsWith('\n')&&!x.source.includes('\r'));
const r=scanKotlinFamilyAdvisories({expectedCommitSha:'747c14b5d97750a7b2736968e2d516f02448558d',
 files:sources});
const expected=base+'/core/LocalDialogue.kt';
if(r.status!=='MULTIPLE_UNVERIFIED_FAMILIES_REQUIRING_ORACLES'||
 !r.findings.some(f=>f.path===expected&&f.rule==='EPHEMERAL_KNOWLEDGE_REACHES_HISTORY_SNAPSHOT')||
 !r.findings.some(f=>f.rule==='BOUNDED_READ_ZERO_PROGRESS'&&f.path.endsWith('/BoundedImageInputStream.kt'))||
 r.sourceRepositoryAuthenticated!==false||r.productContractConfirmed!==false||
 r.generalizationVerified!==false||r.causalityVerified!==false||
 r.remoteWrites!==false||r.mergeAllowed!==false)
 throw Error('ADVISORY_HUNTER_DISCOVERY_MISSING');
console.log('hunter_advisory_local_note_persistence=FOUND_UNVERIFIED');
console.log('hunter_multiple_kotlin_families=UNVERIFIED');
console.log('hunter_distinct_kotlin_rules='+r.rules.length);
console.log('hunter_eligible_original_sources='+r.filesScanned);
JS
java -m jdk.compiler/com.sun.tools.javac.Main -d "$work/stubs" "${stubs[@]}"
java -m jdk.compiler/com.sun.tools.javac.Main -d "$work/junit" "${junit[@]}"
"$kotlin_root/bin/kotlinc" "${kotlin[@]}" -include-runtime -d "$work/original.jar"
"$kotlin_root/bin/kotlinc" -cp "$work/stubs:$work/original.jar" \
 "$source_root/$base/PrivateConversationStore.kt" "$evidence_root/NoteStoreOracle.kt" -d "$work/oracle.jar"
node - "$source_root/$base/core/LocalDialogue.kt" "$work/LocalDialogue.kt" "$sentinel_root" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const originalPath=process.argv[2],candidatePath=process.argv[3],sentinel=process.argv[4];
const {draftPinnedJarvisNoteCandidate}=require(
 path.join(sentinel,'packages/investigation/jarvis-note-transient-draft.cjs'));
const source=fs.readFileSync(originalPath,'utf8');
const draft=draftPinnedJarvisNoteCandidate({
 expectedCommitSha:'747c14b5d97750a7b2736968e2d516f02448558d',
 file:{
  path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalDialogue.kt',
  source,expectedBlobSha:'6e1117c05fe585fc843dddd8143042e7f49238f4'
 }
});
if(draft.status!=='CANDIDATE_REQUIRES_PRODUCT_CONTRACT_AND_INDEPENDENT_JVM_ORACLE'||
 draft.generatedByGeneralFixer!==false||draft.originalFunctionalOracleVerified!==false||
 draft.remoteWrites!==false||draft.mergeAllowed!==false)
 throw Error('PINNED_NOTE_DRAFT_REJECTED');
const bytes=Buffer.from(draft.candidateSource,'utf8');
const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
if(sha!==draft.candidateBlobSha)throw Error('CANDIDATE_BLOB_MISMATCH');
fs.writeFileSync(candidatePath,bytes,{flag:'wx',mode:0o600});
console.log('pinned_note_candidate_generated=PASS (not generalized; JVM proof required)');
JS
"$kotlin_root/bin/kotlinc" -cp "$work/original.jar" "$work/LocalDialogue.kt" -d "$work/candidate.jar"
python3 - "$work/LocalDialogue.kt" "$work/wrong.kt" <<'PY'
from pathlib import Path
import sys
src=Path(sys.argv[1]).read_text()
old='        val lines = turns.filter { it.persistent }.map { it.text }.takeLast(24).toMutableList()'
assert src.count(old)==1
Path(sys.argv[2]).write_text(src.replace(old, '        val lines = mutableListOf<String>()'))
PY
"$kotlin_root/bin/kotlinc" -cp "$work/original.jar" "$work/wrong.kt" -d "$work/wrong.jar"
# The local Judge runner itself launches all three independent JVM oracles.
"$kotlin_root/bin/kotlinc" -cp "$work/junit:$work/candidate.jar:$work/original.jar" \
 "$source_root/apps/android/app/src/test/java/com/cardenaspiero255/jarvis/core/PrivateKnowledgePackTest.kt" \
 "$evidence_root/OriginalTestRunner.kt" -d "$work/tests.jar"
java -XX:-UsePerfData -cp "$work/junit:$work/tests.jar:$work/candidate.jar:$work/original.jar" OriginalTestRunnerKt | grep -Fx 'original_test_methods_passed=5'
git -c core.hooksPath=/dev/null clone --no-hardlinks -q "$source_root" "$work/disposable"
git -C "$work/disposable" remote remove origin
git -C "$work/disposable" switch -q -c sandbox/note-persistence
cp "$work/LocalDialogue.kt" "$work/disposable/$base/core/LocalDialogue.kt"
git -C "$work/disposable" -c core.hooksPath=/dev/null add "$base/core/LocalDialogue.kt"
git -C "$work/disposable" -c core.hooksPath=/dev/null -c user.name='Sentinel sandbox' \
 -c user.email='sandbox@example.invalid' -c commit.gpgsign=false commit -qm 'sandbox: candidate'
node - "$work/disposable" "$sentinel_root" "$work" <<'JS'
'use strict';
const {execFileSync,spawnSync}=require('node:child_process');
const path=require('node:path');
const directory=process.argv[2],sentinel=process.argv[3],work=process.argv[4];
const file='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalDialogue.kt';
const git=(...args)=>execFileSync('git',args,{cwd:directory,encoding:'utf8',env:{PATH:process.env.PATH,HOME:directory,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();
const repairHeadSha=git('rev-parse','HEAD'),baselineHeadSha=git('rev-parse','HEAD^');
const beforeBlobSha=git('rev-parse',baselineHeadSha+':'+file),afterBlobSha=git('rev-parse',repairHeadSha+':'+file);
const expectedTree=git('rev-parse',baselineHeadSha+'^{tree}');
const patchBytes=Buffer.byteLength(git('diff','--binary',baselineHeadSha,repairHeadSha));
const plan={branch:'sandbox/note-persistence',expectedHeadSha:baselineHeadSha,changes:[{path:file,beforeBlobSha,afterBlobSha,patchBytes}]};
// The oracle executes inside the already-isolated CI runner, not via
// caller-supplied transcript data. The resulting decision gates this SAME
// disposable candidate commit before a single combined local verdict.
const runJar=jar=>{
 const cp=[path.join(work,'oracle.jar'),path.join(work,'stubs'),
  path.join(work,jar),path.join(work,'original.jar')].join(':');
 const p=spawnSync('java',['-XX:-UsePerfData','-cp',cp,'NoteStoreOracleKt'],{
  cwd:directory,encoding:'utf8',timeout:15000,maxBuffer:65536,
  env:{PATH:process.env.PATH,HOME:directory,JAVA_HOME:process.env.JAVA_HOME}
 });
 if(p.error||p.signal||!Number.isSafeInteger(p.status)||
  typeof p.stdout!=='string'||typeof p.stderr!=='string')throw Error('JVM_ORACLE_EXECUTION_FAILED');
 return {exitCode:p.status,stdout:p.stdout,stderr:p.stderr};
};
const triplet=require(path.join(sentinel,'packages/recovery/original-jvm-case-triplet.cjs'))
 .assessOriginalJvmTriplet({caseId:'JARVIS_TRANSIENT_NOTE_HISTORY',
  original:runJar('original.jar'),candidate:runJar('candidate.jar'),
  unsafe:runJar('wrong.jar')});
const judge=require(path.join(sentinel,'packages/recovery/repair-judge.cjs'))
 .judgeLocalRepair({directory,baselineHeadSha,repairHeadSha,plan});
// Always attempt rollback for this disposable candidate, including a veto.
const rollback=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs'))
 .rollbackSandbox({directory,baselineHeadSha,repairHeadSha});
if(triplet.status!=='LOCAL_JVM_FAMILY_TRIPLET_ACCEPTED'||
 !judge.approved||judge.status!=='APPROVED_LOCAL_POLICY_ONLY'||
 rollback.status!=='ROLLBACK_VERIFIED'||rollback.restoredTree!==expectedTree||
 git('status','--porcelain')!=='')throw Error('JOINT_FUNCTIONAL_POLICY_ROLLBACK_VETO');
console.log(JSON.stringify({status:'RUNNER_LOCAL_FUNCTIONAL_AND_POLICY_VERIFIED',
 baselineHeadSha,repairHeadSha,beforeBlobSha,afterBlobSha,expectedTree,
 triplet,judge,rollback,cleanAfterRollback:true,
 functionalOracleIndependentlyIntegrated:true,sourceProvenanceBeyondPinnedRunner:false,
 productContractConfirmed:false,causalityVerified:false,
 ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false},null,2));
JS
[ "$(kgit rev-parse HEAD)" = "$expected" ]
[ -z "$(kgit status --porcelain)" ]
# A separate original-source family uses the SAME shared process policy and
# the same isolated toolchain, but an independent JVM oracle and local Git tree.
bash "$sentinel_root/tests/fixtures/jarvis-bounded-functional/reproduce.sh" \
 "$source_root" "$kotlin_root" "$sentinel_root"
echo 'Original RED, local candidate GREEN, wrong candidate vetoed; disposable Git rollback verified.'
echo 'Not an Android-device test; advisory lexical Hunter found a source path, but semantic causality and product contract remain unverified; JVM uses Android test doubles.'
