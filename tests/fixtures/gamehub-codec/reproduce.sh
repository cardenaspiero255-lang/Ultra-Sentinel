#!/usr/bin/env bash
# Must run in authenticated networkless Bubblewrap/AppArmor runner.
# Worker report already sealed before this answer-bearing namespace is mounted.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
original=$(realpath "$1"); kotlin=$(realpath "$2"); sentinel=$(realpath "$3")
discovery=$(realpath "$4")
[ -f "$discovery" ] && [ ! -L "$discovery" ]
head=e4ca122422f1cb591d407db3fb21fb00fd78b022
rel=app/src/main/java/com/cardenaspiero255/gamehubultra/data/GameSessionStore.kt
blob=00e88981f1f56649e637bdebda7b43209a669f2c
fixture="$sentinel/tests/fixtures/gamehub-codec"
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
kgit(){ git -C "$original" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }
test "$(kgit rev-parse HEAD)" = "$head"
test -z "$(kgit status --porcelain)"
test "$(kgit rev-parse "HEAD:$rel")" = "$blob"
test "$(git hash-object "$original/$rel")" = "$blob"
[[ "$("$kotlin/bin/kotlinc" -version 2>&1)" == *'kotlinc-jvm 2.0.21 '* ]]
umask 077
work=$(mktemp -d /tmp/sentinel-blind-codec-XXXXXXXX)
trap 'rm -rf "$work"' EXIT
cp -- "$discovery" "$work/discovery.json"
node - "$original" "$sentinel" "$head" "$rel" "$blob" "$work" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [repo,sentinel,head,rel,blob,work]=process.argv.slice(2);
const r=JSON.parse(fs.readFileSync(path.join(work,'discovery.json'),'utf8'));
if(r.status!=='CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE'||
   r.filesScanned!==238||r.sourceByteIntegrityVerified!==true||
   r.sourceRepositoryAuthenticated!==false||r.originalFunctionalOracleVerified!==false||
   r.mergeAllowed!==false)throw Error('UNSEALED_OR_UNTRUSTED_DISCOVERY');
const hits=r.findings.filter(x=>x.path===rel&&x.rule==='LOSSY_BASE64_UTF8_DECODE');
if(hits.length!==1||hits[0].expectedBlobSha!==blob)throw Error('HELD_OUT_CODEC_FINDING_MISSING');
const source=fs.readFileSync(path.join(repo,rel),'utf8');
const gitBlob=s=>{const b=Buffer.from(s);return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
if(gitBlob(source)!==blob)throw Error('CHANGED_ORIGINAL_SOURCE');
const {draftCodecIntegrityCandidate}=require(path.join(sentinel,'packages/recovery/phase2-codec-integrity-candidate.cjs'));
const result=draftCodecIntegrityCandidate({expectedCommitSha:head,
 file:{path:rel,source,expectedBlobSha:blob},finding:hits[0]});
if(result.status!=='CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE'||
  gitBlob(result.candidateSource)!==result.candidateBlobSha||
  result.originalFunctionalOracleVerified!==false||result.remoteWrites!==false||
  result.mergeAllowed!==false)throw Error('CODEC_CANDIDATE_VETO');
const old='if (fields.size != 9) return null';
if(result.candidateSource.split(old).length!==2)throw Error('WRONG_CANDIDATE_AMBIGUOUS');
fs.writeFileSync(path.join(work,'candidate.kt'),result.candidateSource,{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(work,'wrong.kt'),result.candidateSource.replace(old,'if (true) return null'),{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(work,'candidate-blob.txt'),result.candidateBlobSha,{flag:'wx',mode:0o600});
// This is a syntax-only metamorphic variant of the SHA-pinned ORIGINAL
// GameHub source, not another product defect or an independent holdout.
const oldCodec='String(Base64.getDecoder().decode(fields[index]), StandardCharsets.UTF_8)';
if(source.split(oldCodec).length!==2)throw Error('MULTILINE_ORIGINAL_NOT_UNIQUE');
const multilineCodec=[
 'String(',
 '  Base64.getDecoder()',
 '    .decode(fields[index]),',
 '  StandardCharsets.UTF_8',
 ')'
].join('\n');
const multilineOriginal=source.replace(oldCodec,multilineCodec);
const multilineBlob=gitBlob(multilineOriginal);
const {scanCodecIntegrityHypotheses}=require(path.join(sentinel,
 'packages/family-hunter/phase2-codec-integrity-hunter.cjs'));
const multilineFile={path:rel,source:multilineOriginal,expectedBlobSha:multilineBlob};
const multilineScan=scanCodecIntegrityHypotheses({expectedCommitSha:head,files:[multilineFile]});
if(multilineScan.status!=='CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE'||
 multilineScan.findings.length!==1||multilineScan.findings[0].path!==rel)
 throw Error('MULTILINE_HUNTER_DID_NOT_DISCOVER');
const multilineFix=draftCodecIntegrityCandidate({
 expectedCommitSha:head,file:multilineFile,finding:multilineScan.findings[0]
});
if(multilineFix.status!=='CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE'||
 gitBlob(multilineFix.candidateSource)!==multilineFix.candidateBlobSha||
 multilineFix.remoteWrites!==false||multilineFix.mergeAllowed!==false||
 multilineFix.originalFunctionalOracleVerified!==false)
 throw Error('MULTILINE_FIXER_REJECTED');
fs.writeFileSync(path.join(work,'multiline-original.kt'),multilineOriginal,{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(work,'multiline-candidate.kt'),multilineFix.candidateSource,{flag:'wx',mode:0o600});
console.log('CODEC_MULTILINE_HUNTER_FIXER_HANDOFF_PASS');
console.log('BLIND_CODEC_FINDING_TO_SCOPED_FIXER_PASS');
JS
for variant in original candidate wrong multiline-original multiline-candidate; do
 case "$variant" in
  original) source="$original/$rel" ;;
  candidate) source="$work/candidate.kt" ;;
  wrong) source="$work/wrong.kt" ;;
  multiline-original|multiline-candidate) source="$work/$variant.kt" ;;
 esac
 "$kotlin/bin/kotlinc" -nowarn "$source" "$fixture"/*.kt -include-runtime \
  -d "$work/$variant.jar"
done
# Execute the same independent original Kotlin oracle against a source
# reflowed only at the codec call site: original RED, scoped Fixer GREEN.
set +e
java -XX:-UsePerfData -cp "$work/multiline-original.jar" \
 com.cardenaspiero255.gamehubultra.data.OriginalCodecOracleKt \
 > "$work/multiline-original.out" 2> "$work/multiline-original.err"
multiline_red=$?
java -XX:-UsePerfData -cp "$work/multiline-candidate.jar" \
 com.cardenaspiero255.gamehubultra.data.OriginalCodecOracleKt \
 > "$work/multiline-candidate.out" 2> "$work/multiline-candidate.err"
multiline_green=$?
set -e
test "$multiline_red" -eq 2
grep -Fxq 'BENIGN_CODEC_PASS' "$work/multiline-original.out"
test "$(cat "$work/multiline-original.err")" = 'LOSSY_UTF8_RECORD_ACCEPTED'
test "$multiline_green" -eq 0
test ! -s "$work/multiline-candidate.err"
grep -Fxq 'BENIGN_CODEC_PASS' "$work/multiline-candidate.out"
grep -Fxq 'CODEC_INTEGRITY_ORACLE_PASS' "$work/multiline-candidate.out"
printf '%s\n' 'CODEC_MULTILINE_ORIGINAL_RED_GREEN_PASS'
git -c core.hooksPath=/dev/null clone --no-hardlinks -q "$original" "$work/disposable"
git -C "$work/disposable" remote remove origin
git -C "$work/disposable" switch -q -c sandbox/codec-blind-original
cp "$work/candidate.kt" "$work/disposable/$rel"
git -C "$work/disposable" -c core.hooksPath=/dev/null add -- "$rel"
git -C "$work/disposable" -c core.hooksPath=/dev/null -c user.name='Sentinel sandbox' \
 -c user.email='sandbox@example.invalid' -c commit.gpgsign=false \
 commit -qm 'sandbox: reject lossy persisted UTF8'
node - "$work" "$sentinel" "$head" "$rel" "$blob" <<'JS'
'use strict';
const path=require('node:path'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const [work,sentinel,head,rel,blob]=process.argv.slice(2),directory=path.join(work,'disposable');
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{
 cwd:directory,encoding:'utf8',env:{PATH:process.env.PATH,HOME:'/tmp',
 GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
}).trim();
const repair=git('rev-parse','HEAD'),base=git('rev-parse','HEAD^');
const candidate=fs.readFileSync(path.join(work,'candidate-blob.txt'),'utf8');
if(base!==head||git('rev-parse',base+':'+rel)!==blob||
  git('rev-parse',repair+':'+rel)!==candidate)throw Error('CODEC_GIT_PROVENANCE');
const result=require(path.join(sentinel,'packages/recovery/phase2-executed-jvm-triplet.cjs'))
 .executeOriginalJvmTriplet({directory:work,
 mainClass:'com.cardenaspiero255.gamehubultra.data.OriginalCodecOracleKt',
 caseId:'LOSSY_BASE64_UTF8_DECODE',sourceHeadSha:base,originalBlobSha:blob,
 candidateBlobSha:candidate,markers:{originalFailure:'LOSSY_UTF8_RECORD_ACCEPTED',
 green:['BENIGN_CODEC_PASS','CODEC_INTEGRITY_ORACLE_PASS'],unsafeFailure:'BENIGN_SESSION_LOST'}});
if(result.status!=='LOCAL_JVM_TRIPLET_EXECUTED_AND_CLASSIFIED'||result.jvmProcessesExecutedLocally!==true||
 result.originalSourceAuthenticated!==false||result.remoteWrites!==false)throw Error('CODEC_JVM_VETO');
const patchBytes=Buffer.byteLength(git('diff','--binary',base,repair));
const plan={branch:'sandbox/codec-blind-original',expectedHeadSha:base,
 changes:[{path:rel,beforeBlobSha:blob,afterBlobSha:candidate,patchBytes}]};
const {judgeLocalRepair}=require(path.join(sentinel,'packages/recovery/repair-judge.cjs'));
const {rollbackSandbox}=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs'));
let approved=false;
try{
 const v=judgeLocalRepair({directory,baselineHeadSha:base,repairHeadSha:repair,plan});
 approved=v.status==='APPROVED_LOCAL_POLICY_ONLY'&&v.approved===true;
 if(!approved)throw Error('CODEC_GIT_JUDGE_VETO');
}finally{
 const revert=rollbackSandbox({directory,baselineHeadSha:base,repairHeadSha:repair});
 if(revert.status!=='ROLLBACK_VERIFIED'||
   revert.restoredTree!==git('rev-parse',base+'^{tree}')||
   git('status','--porcelain')!==''||git('rev-parse','HEAD:'+rel)!==blob)
   throw Error('CODEC_EXACT_ROLLBACK_VETO');
}
if(!approved)throw Error('NO_CODE_VALIDATION');
console.log('BLIND_CODEC_ORIGINAL_RED_GREEN_VETO_ROLLBACK_PASS');
console.log(JSON.stringify({caseId:result.caseId,jarSha256:result.artifactsSha256,
 originalSourceAuthenticatedByBridge:false,ownerAuthorizationGranted:false,
 remoteWrites:false,mergeAllowed:false}));
JS
test "$(kgit rev-parse HEAD)" = "$head"
test -z "$(kgit status --porcelain)"
test "$(git hash-object "$original/$rel")" = "$blob"
