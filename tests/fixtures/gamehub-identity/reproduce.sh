#!/usr/bin/env bash
# Run only after sealed source-only Hunter; inside no-network Bubblewrap.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
original=$(realpath "$1"); kotlin=$(realpath "$2"); sentinel=$(realpath "$3")
discovery=$(realpath "$4")
[ -f "$discovery" ] && [ ! -L "$discovery" ] || exit 2
head=e4ca122422f1cb591d407db3fb21fb00fd78b022
rel=app/src/main/java/com/cardenaspiero255/gamehubultra/domain/OptimizationFingerprint.kt
blob=a52f626cd6d0e7fc6b22ee9754c3349d5151ec1c
fixture="$sentinel/tests/fixtures/gamehub-identity"
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
kgit(){ git -C "$original" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }
test "$(kgit rev-parse HEAD)" = "$head"
test -z "$(kgit status --porcelain)"
test "$(kgit rev-parse "HEAD:$rel")" = "$blob"
test "$(git hash-object "$original/$rel")" = "$blob"
[[ "$("$kotlin/bin/kotlinc" -version 2>&1)" == *'kotlinc-jvm 2.0.21 '* ]]
umask 077
work=$(mktemp -d /tmp/sentinel-identity-XXXXXXXX)
trap 'rm -rf "$work"' EXIT
node - "$original" "$sentinel" "$work" "$discovery" "$rel" "$blob" "$head" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [original,sentinel,work,discovery,rel,blob,head]=process.argv.slice(2);
const report=JSON.parse(fs.readFileSync(discovery,'utf8'));
if(report.status!=='IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE'||
 report.filesScanned!==238||report.sourceByteIntegrityVerified!==true||
 report.originalFunctionalOracleVerified!==false||report.sourceRepositoryAuthenticated!==false||
 report.remoteWrites!==false||report.mergeAllowed!==false)
 throw Error('UNSEALED_IDENTITY_DISCOVERY');
const matching=report.findings.filter(f=>f.path===rel&&f.rule==='AMBIGUOUS_DELIMITED_IDENTITY');
if(matching.length!==1||matching[0].expectedBlobSha!==blob)throw Error('UNSEEN_IDENTITY_FINDING_MISSING');
const source=fs.readFileSync(path.join(original,rel),'utf8');
const gitBlob=s=>{const b=Buffer.from(s);return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
if(gitBlob(source)!==blob)throw Error('ORIGINAL_BLOB_CHANGED');
const {draftIdentityDelimiterCandidate}=require(path.join(sentinel,'packages/recovery/phase2-identity-delimiter-candidate.cjs'));
const candidate=draftIdentityDelimiterCandidate({expectedCommitSha:head,
 file:{path:rel,source,expectedBlobSha:blob},finding:matching[0]});
if(candidate.status!=='CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_AND_MIGRATION_ORACLE'||
 gitBlob(candidate.candidateSource)!==candidate.candidateBlobSha||
 candidate.legacyKeyMigrationVerified!==false||candidate.originalFunctionalOracleVerified!==false||
 candidate.remoteWrites!==false||candidate.mergeAllowed!==false)
 throw Error('IDENTITY_FIXER_VETO');
const fragment='.map { "'+'$'+'{it.length}:$it" }';
if(candidate.candidateSource.split(fragment).length!==2)throw Error('AMBIGUOUS_CANDIDATE_PATCH');
const wrong=candidate.candidateSource.replace(fragment,'.map { "0" }');
for(const [name,text] of [['candidate',candidate.candidateSource],['wrong',wrong]])
 fs.writeFileSync(path.join(work,name+'.kt'),text,{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(work,'candidate-blob.txt'),candidate.candidateBlobSha,{flag:'wx',mode:0o600});
console.log('BLIND_IDENTITY_FINDING_TO_SCOPED_FIXER_PASS');
JS
for variant in original candidate wrong; do
 case "$variant" in
  original) source="$original/$rel" ;;
  candidate|wrong) source="$work/$variant.kt" ;;
 esac
 "$kotlin/bin/kotlinc" -nowarn "$source" \
  "$fixture/Build.kt" "$fixture/DeviceInfo.kt" "$fixture/IndependentIdentityOracle.kt" \
  -include-runtime -d "$work/$variant.jar"
done
set +e
java -XX:-UsePerfData -jar "$work/original.jar" > "$work/original.out" 2> "$work/original.err"; red=$?
java -XX:-UsePerfData -jar "$work/candidate.jar" > "$work/candidate.out" 2> "$work/candidate.err"; green=$?
java -XX:-UsePerfData -jar "$work/wrong.jar" > "$work/wrong.out" 2> "$work/wrong.err"; veto=$?
set -e
test "$red" -eq 2 && test "$green" -eq 0 && test "$veto" -eq 3
grep -Fxq 'BENIGN_IDENTITY_PASS' "$work/original.out"
grep -Fxq 'AMBIGUOUS_FINGERPRINT_COLLISION' "$work/original.err"
grep -Fxq 'BENIGN_IDENTITY_PASS' "$work/candidate.out"
grep -Fxq 'IDENTITY_DELIMITER_INDEPENDENT_ORACLE_GREEN' "$work/candidate.out"
test ! -s "$work/candidate.err"
grep -Fxq 'BENIGN_FINGERPRINT_REGRESSION' "$work/wrong.err"
printf '%s\n' 'IDENTITY_ORIGINAL_JVM_RED_GREEN_WRONG_VETO_PASS'
git -c core.hooksPath=/dev/null clone --no-hardlinks -q "$original" "$work/disposable"
git -C "$work/disposable" remote remove origin
git -C "$work/disposable" switch -q -c sandbox/identity-delimiter
cp "$work/candidate.kt" "$work/disposable/$rel"
git -C "$work/disposable" -c core.hooksPath=/dev/null add -- "$rel"
git -C "$work/disposable" -c core.hooksPath=/dev/null -c user.name='Sentinel sandbox' \
 -c user.email='sandbox@example.invalid' -c commit.gpgsign=false \
 commit -qm 'sandbox: length-prefix ambiguous fingerprint fields'
node - "$work" "$sentinel" "$head" "$rel" "$blob" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const [work,sentinel,head,rel,blob]=process.argv.slice(2),directory=path.join(work,'disposable');
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{
 cwd:directory,encoding:'utf8',env:{PATH:process.env.PATH,HOME:'/tmp',
 GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',
 GIT_TERMINAL_PROMPT:'0'}}).trim();
const repair=git('rev-parse','HEAD'),base=git('rev-parse','HEAD^');
const candidate=fs.readFileSync(path.join(work,'candidate-blob.txt'),'utf8');
if(base!==head||git('rev-parse',base+':'+rel)!==blob||git('rev-parse',repair+':'+rel)!==candidate)
 throw Error('IDENTITY_CANDIDATE_PROVENANCE_VETO');
const {judgeLocalRepair}=require(path.join(sentinel,'packages/recovery/repair-judge.cjs'));
const {rollbackSandbox}=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs'));
const plan={branch:'sandbox/identity-delimiter',expectedHeadSha:base,
 changes:[{path:rel,beforeBlobSha:blob,afterBlobSha:candidate,
 patchBytes:Buffer.byteLength(git('diff','--binary',base,repair))}]};
let approved=false;
try {
 const result=judgeLocalRepair({directory,baselineHeadSha:base,repairHeadSha:repair,plan});
 approved=result.status==='APPROVED_LOCAL_POLICY_ONLY'&&result.approved===true&&
  result.remoteWrites===false&&result.mergeAllowed===false;
 if(!approved)throw Error('IDENTITY_LOCAL_JUDGE_VETO');
} finally {
 const result=rollbackSandbox({directory,baselineHeadSha:base,repairHeadSha:repair});
 if(result.status!=='ROLLBACK_VERIFIED'||result.restoredTree!==git('rev-parse',base+'^{tree}')||
 git('status','--porcelain')!==''||git('rev-parse','HEAD:'+rel)!==blob)
 throw Error('IDENTITY_EXACT_ROLLBACK_VETO');
}
if(!approved)throw Error('IDENTITY_NOT_APPROVED');
console.log('IDENTITY_LOCAL_JUDGE_ROLLBACK_PASS');
JS
test "$(kgit rev-parse HEAD)" = "$head"
test -z "$(kgit status --porcelain)"
printf '%s\n' 'BLIND_IDENTITY_ORIGINAL_RED_GREEN_VETO_ROLLBACK_PASS'
