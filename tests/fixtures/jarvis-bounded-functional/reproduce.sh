#!/usr/bin/env bash
# A second, independent Kotlin original-source functional family. NEVER deploy.
# Runs inside the caller's already enforced networkless Bubblewrap/AppArmor
# boundary with the same pinned JARVIS checkout and Kotlin toolchain as the
# note experiment. Source is read-only; candidate and Git state are disposable.
set -euo pipefail
[ "$#" -eq 3 ] || { echo "Expected ORIGINAL KOTLIN_ROOT SENTINEL_ROOT" >&2; exit 2; }
original="$(realpath "$1")"
kotlin="$(realpath "$2")"
sentinel="$(realpath "$3")"
evidence_root="$(cd "$(dirname "$0")" && pwd)"
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
head='747c14b5d97750a7b2736968e2d516f02448558d'
rel='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt'
blob='fd061b9dad636684184ccf2e96f87084d3b99df5'
git_orig(){ git -C "$original" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }
test "$(git_orig rev-parse HEAD)" = "$head"
test -z "$(git_orig status --porcelain)"
test "$(git_orig rev-parse "HEAD:$rel")" = "$blob"
test "$(git hash-object "$original/$rel")" = "$blob"
test "$("$kotlin/bin/kotlinc" -version 2>&1 | head -n1 | cut -d' ' -f2-3)" = 'kotlinc-jvm 2.0.21'
umask 077
work="$(mktemp -d /tmp/sentinel-bounded-second-family-XXXXXXXX)"
trap 'rm -rf "$work"' EXIT
mkdir "$work/candidate" "$work/wrong"
node - "$original/$rel" "$work/candidate/BoundedImageInputStream.kt" "$sentinel" "$rel" "$blob" "$head" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path');
const [sourcePath,candidatePath,sentinel,rel,blob,head]=process.argv.slice(2);
const {draftBoundedReadProgressRepair}=require(path.join(sentinel,
 'packages/investigation/bounded-read-progress-repair.cjs'));
const {blobSha}=require(path.join(sentinel,
 'packages/investigation/novel-kotlin-hypotheses.cjs'));
const source=fs.readFileSync(sourcePath,'utf8');
if(blobSha(source)!==blob)throw Error('SOURCE_BLOB_CHANGED');
const draft=draftBoundedReadProgressRepair({expectedCommitSha:head,
 file:{path:rel,source,expectedBlobSha:blob}});
if(draft.status!=='CANDIDATE_REQUIRES_TRUSTED_ORIGINAL_ORACLE'||
 draft.rule!=='BOUNDED_READ_ZERO_PROGRESS'||draft.path!==rel||
 draft.sourceBlobSha!==blob||draft.remoteWrites!==false||
 draft.mergeAllowed!==false||draft.originalFunctionalOracleVerified!==false||
 blobSha(draft.candidateSource)!==draft.candidateBlobSha)
 throw Error('BOUNDED_FIXER_ADVISORY_REJECTED');
fs.writeFileSync(candidatePath,draft.candidateSource,{flag:'wx',mode:0o600});
console.log('bounded_read_existing_hunter_fixer_candidate=GENERATED_UNVERIFIED');
JS
python3 - "$work/candidate/BoundedImageInputStream.kt" "$work/wrong/BoundedImageInputStream.kt" <<'PY'
from pathlib import Path
import sys
candidate=Path(sys.argv[1]).read_text(encoding="utf-8")
before='if (actual == 0 || actual > allowed || actual < -1)'
after='if (actual >= 0 || actual < -1)'
assert candidate.count(before)==1
Path(sys.argv[2]).write_text(candidate.replace(before,after),encoding="utf-8")
PY
oracle="$evidence_root/BoundedReadOracle.kt"
"$kotlin/bin/kotlinc" "$original/$rel" "$oracle" -include-runtime -d "$work/original.jar"
"$kotlin/bin/kotlinc" "$work/candidate/BoundedImageInputStream.kt" "$oracle" \
 -include-runtime -d "$work/candidate.jar"
"$kotlin/bin/kotlinc" "$work/wrong/BoundedImageInputStream.kt" "$oracle" \
 -include-runtime -d "$work/wrong.jar"

git -c core.hooksPath=/dev/null clone -q --no-hardlinks "$original" "$work/disposable"
git -C "$work/disposable" remote remove origin
git -C "$work/disposable" switch -q -c sandbox/bounded-read-second-family
cp "$work/candidate/BoundedImageInputStream.kt" "$work/disposable/$rel"
git -C "$work/disposable" -c core.hooksPath=/dev/null add -- "$rel"
git -C "$work/disposable" -c core.hooksPath=/dev/null -c user.name='Sentinel sandbox' \
 -c user.email='sandbox@example.invalid' -c commit.gpgsign=false \
 commit -qm 'sandbox: original JVM bounded progress candidate'
node - "$work/disposable" "$sentinel" "$work" "$rel" "$blob" "$head" <<'JS'
'use strict';
const {spawnSync,execFileSync}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const [directory,sentinel,work,file,originalBlob,originalHead]=process.argv.slice(2);
const env={PATH:process.env.PATH,HOME:directory,GIT_CONFIG_NOSYSTEM:'1',
 GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{
 cwd:directory,encoding:'utf8',env,timeout:10000}).trim();
const head=git('rev-parse','HEAD'),baseline=git('rev-parse','HEAD^');
const originalTree=git('rev-parse',baseline+'^{tree}');
const before=git('rev-parse',baseline+':'+file),after=git('rev-parse',head+':'+file);
const candidate=fs.readFileSync(path.join(work,'candidate/BoundedImageInputStream.kt'));
const actualBlob=crypto.createHash('sha1').update('blob '+candidate.length+'\0').update(candidate).digest('hex');
if(before!==originalBlob||after!==actualBlob||originalHead!==baseline&&
 git('rev-parse',baseline)!==originalHead) {
 // A disposable clone inherits the original JARVIS parent commit exactly:
 // comparing both refs makes source substitution fail closed.
 throw Error('BOUNDED_CASE_SOURCE_IDENTITY_MISMATCH');
}
const run=jar=>{
 const r=spawnSync('java',['-XX:-UsePerfData','-cp',path.join(work,jar),
  'com.cardenaspiero255.jarvis.core.BoundedReadOracleKt'],{
  cwd:directory,encoding:'utf8',env,timeout:15000,maxBuffer:65536
 });
 if(r.error||r.signal||!Number.isSafeInteger(r.status)||
   typeof r.stdout!=='string'||typeof r.stderr!=='string')throw Error('BOUNDED_JVM_EXECUTION_FAILED');
 return {exitCode:r.status,stdout:r.stdout,stderr:r.stderr};
};
const verdict=require(path.join(sentinel,'packages/recovery/original-jvm-case-triplet.cjs'))
 .assessOriginalJvmTriplet({caseId:'JARVIS_BOUNDED_READ_NONPROGRESS',
  original:run('original.jar'),candidate:run('candidate.jar'),unsafe:run('wrong.jar')});
const patchBytes=Buffer.byteLength(git('diff','--binary',baseline,head));
const plan={branch:'sandbox/bounded-read-second-family',expectedHeadSha:baseline,
 changes:[{path:file,beforeBlobSha:before,afterBlobSha:after,patchBytes}]};
const judge=require(path.join(sentinel,'packages/recovery/repair-judge.cjs'))
 .judgeLocalRepair({directory,baselineHeadSha:baseline,repairHeadSha:head,plan});
// Roll back even if the candidate is functionally rejected.
const rollback=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs'))
 .rollbackSandbox({directory,baselineHeadSha:baseline,repairHeadSha:head});
if(verdict.status!=='LOCAL_JVM_FAMILY_TRIPLET_ACCEPTED'||
 !judge.approved||judge.status!=='APPROVED_LOCAL_POLICY_ONLY'||
 rollback.status!=='ROLLBACK_VERIFIED'||rollback.restoredTree!==originalTree||
 git('status','--porcelain')!==''||git('rev-parse','HEAD:'+file)!==before)
 throw Error('BOUNDED_JUDGE_OR_ROLLBACK_VETO');
console.log('bounded_second_family_independent_jvm=RED_GREEN_VETO');
console.log(JSON.stringify({status:'BOUNDED_SECOND_FAMILY_PINNED_JVM_LOCAL_JUDGE_ROLLBACK',
 caseId:verdict.caseId,originalBlobSha:before,candidateBlobSha:after,
 independentJvmOriginalRed:verdict.originalRed,
 independentJvmCandidateGreen:verdict.candidateGreen,
 independentJvmUnsafeVeto:verdict.unsafeVeto,
 localGitPolicyJudgeApproved:judge.approved,exactTreeRollbackVerified:true,
 sourceRepositoryAuthenticatedBeyondRunner:false,
 causalMultiFileProof:false,novelFamilyProven:false,generalizationProven:false,
 ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false},null,2));
JS
test "$(git_orig rev-parse HEAD)" = "$head"
test -z "$(git_orig status --porcelain)"
test "$(git hash-object "$original/$rel")" = "$blob"
