#!/usr/bin/env bash
# JARVIS immutable source: independent Kotlin/JVM 2x2 read-only policy experiment.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${JARVIS_CROSSFILE_ISOLATED:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
test "$#" -eq 1
for cmd in gh jq git base64 kotlinc java bwrap node sha256sum; do command -v "$cmd" >/dev/null; done
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
umask 077
repo=cardenaspiero255-lang/JARVIS
head=f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868
prefix=apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core
for item in \
 gate:OfflineVoiceQuestionGate.kt:6e7c1a644a6f4d6657f6884712f403edef825628 \
 policy:LocalGgufPolicy.kt:54b4c2fe561bf151c6ca7c7daa6c1c7c561569fb \
 preview:HandsFreePreviewPolicy.kt:61836b0adc6f617d732c98fefb26a684b58c5f28; do
 IFS=: read -r alias filename blob <<< "$item"
 remote="$prefix/$filename"
 gh api "/repos/$repo/contents/$remote?ref=$head" > "$root/metadata.json"
 jq -e --arg p "$remote" --arg s "$blob" \
 '.type=="file" and .path==$p and .sha==$s and .encoding=="base64" and .size>100 and .size<60000' \
 "$root/metadata.json" >/dev/null
 jq -r .content "$root/metadata.json" | base64 --decode > "$root/$alias.original.kt"
 test "$(git hash-object "$root/$alias.original.kt")" = "$blob"
 rm "$root/metadata.json"
done
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path');
const {blobSha}=require('./packages/investigation/novel-kotlin-hypotheses.cjs');
const {scanKotlinPolicyBoundaries}=require('./packages/investigation/kotlin-policy-boundaries.cjs');
const root=process.argv[2],commit='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const rows=[
 ['gate','OfflineVoiceQuestionGate.kt','6e7c1a644a6f4d6657f6884712f403edef825628'],
 ['policy','LocalGgufPolicy.kt','54b4c2fe561bf151c6ca7c7daa6c1c7c561569fb'],
 ['preview','HandsFreePreviewPolicy.kt','61836b0adc6f617d732c98fefb26a684b58c5f28']
];
const files=rows.map(([alias,name,blob])=>{
 const source=fs.readFileSync(p.join(root,alias+'.original.kt'),'utf8');
 if(blobSha(source)!==blob)throw Error('ORIGINAL_SOURCE_MUTATED');
 return {path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/'+name,
  source,expectedBlobSha:blob};
});
const risk=scanKotlinPolicyBoundaries({expectedCommitSha:commit,files});
if(risk.status!=='UNVERIFIED_POLICY_BOUNDARY_HYPOTHESES'||risk.findings.length!==3||
 !risk.findings.some(f=>f.rule==='GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP')||
 !risk.findings.some(f=>f.rule==='PREVIEW_TIME_REVIVAL_AFTER_CLOCK_ROLLBACK')||
 !risk.findings.some(f=>f.rule==='PREVIEW_REMAINING_REVIVAL_AFTER_CLOCK_ROLLBACK')||
 risk.originalFunctionalOracleVerified!==false||risk.remoteWrites!==false)
 throw Error('BOUNDARY_SCAN_NOT_OBSERVED');
const [gate,policy]=files,oldCall='!LocalGgufPolicy.validPrompt(question)';
if(gate.source.split(oldCall).length!==2)throw Error('INVALID_GATE_OLD_CALL');
const gateCandidate=gate.source.replace(oldCall,'!LocalGgufPolicy.validReadOnlyQuestion(question)');
const method=String.raw`
    /** Stronger read-only voice query screening; generic typed prompts unchanged. */
    fun validReadOnlyQuestion(prompt: String): Boolean {
        if (!validPrompt(prompt)) return false
        val folded = java.text.Normalizer.normalize(
            prompt.lowercase(java.util.Locale.ROOT),
            java.text.Normalizer.Form.NFD
        ).replace(Regex("""\p{M}+"""), "").trim()
        val imperative = Regex("""^(?:reinicia|reiniciar|restablece|restablecer)\b""")
        val chained = Regex("""\b(?:y|luego)\s+(?:reinicia|reiniciar|restablece|restablecer)\b""")
        return !imperative.containsMatchIn(folded) && !chained.containsMatchIn(folded)
    }
`;
if(!policy.source.endsWith('\n}\n')||policy.source.includes('validReadOnlyQuestion('))
 throw Error('INVALID_POLICY_ORIGINAL');
const policyCandidate=policy.source.slice(0,-2)+method+'}\n';
const revised=files.map((f,i)=>i===0?
 {...f,source:gateCandidate,expectedBlobSha:blobSha(gateCandidate)}:i===1?
 {...f,source:policyCandidate,expectedBlobSha:blobSha(policyCandidate)}:f);
const after=scanKotlinPolicyBoundaries({expectedCommitSha:commit,files:revised});
if(after.findings.some(f=>f.rule==='GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP')||
 after.originalFunctionalOracleVerified!==false)throw Error('STATIC_RISK_STILL_PRESENT');
for(const [file,src] of [['gate.candidate.kt',gateCandidate],
 ['policy.candidate.kt',policyCandidate]])
 fs.writeFileSync(p.join(root,file),src,{flag:'wx',mode:0o600});
fs.writeFileSync(p.join(root,'crossfile-advisory-receipt.json'),JSON.stringify({
 schema:'ultra-sentinel-original-crossfile-advisory/v1',commit,
 observedFamilies:risk.findings.map(f=>({rule:f.rule,familyId:f.familyId,path:f.path})),
 gateCandidateBlob:blobSha(gateCandidate),policyCandidateBlob:blobSha(policyCandidate),
 coreModified:false,originalJVMOracleVerifiedHere:false,
 remoteWrites:false,mergeAllowed:false
},null,2)+'\n',{flag:'wx',mode:0o600});
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
 -- /jdk/bin/java -jar "/workspace/crossfile_$mode.jar" > "$root/crossfile_$mode.log" 2>&1
}
for mask in 0 1 2 3; do
 gate=original;policy=original
 if ((mask & 1)); then gate=candidate; fi
 if ((mask & 2)); then policy=candidate; fi
 jar="$root/crossfile_$mask.jar"
 before_a="$(sha256sum "$root/gate.$gate.kt" | cut -d' ' -f1)"
 before_b="$(sha256sum "$root/policy.$policy.kt" | cut -d' ' -f1)"
 set +e
 kotlinc "$root/gate.$gate.kt" "$root/policy.$policy.kt" \
 "$repo_root/tests/oracles/jarvis-gguf-readonly-original.kt" \
 -include-runtime -d "$jar" > "$root/crossfile_$mask.compile" 2>&1
 compiled=$?
 set -e
 test "$(sha256sum "$root/gate.$gate.kt" | cut -d' ' -f1)" = "$before_a"
 test "$(sha256sum "$root/policy.$policy.kt" | cut -d' ' -f1)" = "$before_b"
 if [ "$mask" -eq 1 ]; then
  test "$compiled" -ne 0
  grep -qi 'unresolved reference' "$root/crossfile_$mask.compile"
  grep -Fq 'validReadOnlyQuestion' "$root/crossfile_$mask.compile"
  continue
 fi
 test "$compiled" -eq 0 && test -s "$jar"
 chmod 0400 "$jar"
 set +e
 run_java "$mask"
 code=$?
 set -e
 if [ "$mask" -eq 3 ]; then
  test "$code" -eq 0
  grep -Fxq 'CROSS_FILE_POLICY_ORACLE_PASS' "$root/crossfile_$mask.log"
 else
  test "$code" -ne 0
  grep -Fq 'UNSAFE_RESTART_PASSED_TO_GGUF' "$root/crossfile_$mask.log"
 fi
done
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path'),c=require('node:crypto');
const {GATE,POLICY,BLOBS,COMMIT,checkLinkedKotlinJVMMatrix}=
 require('./packages/investigation/jarvis-crossfile-policy-proof.cjs');
const root=process.argv[2],sha=b=>c.createHash('sha256').update(b).digest('hex');
const rows=[
 {selectedFiles:[],compile:'PASS',oracle:'FAIL',marker:'UNSAFE_RESTART_PASSED_TO_GGUF'},
 {selectedFiles:[GATE],compile:'FAIL',oracle:'NOT_RUN',marker:'UNRESOLVED_NEW_POLICY_METHOD'},
 {selectedFiles:[POLICY],compile:'PASS',oracle:'FAIL',marker:'UNSAFE_RESTART_PASSED_TO_GGUF'},
 {selectedFiles:[GATE,POLICY],compile:'PASS',oracle:'PASS',marker:'CROSS_FILE_POLICY_ORACLE_PASS'}
];
const scenarios=rows.map((x,i)=>({...x,artifactSha256:sha(fs.readFileSync(
 p.join(root,'crossfile_'+i+(x.compile==='FAIL'?'.compile':'.jar'))))}));
const proof=checkLinkedKotlinJVMMatrix({sourceCommit:COMMIT,sourceBlobs:BLOBS,scenarios});
if(proof.status!=='JOINT_PATCH_API_DEPENDENCY_REPRODUCED'||
 proof.rootCauseGenerallyCertified!==false||proof.remoteWrites!==false)
 throw Error('ORIGINAL_JVM_CROSSFILE_PROOF_VETO');
fs.writeFileSync(p.join(root,'crossfile-jvm-receipt.json'),JSON.stringify({
 ...proof,scenarios,sourceBlobs:BLOBS,
 isolatedJVMOriginalKotlin:true,androidDeviceObserved:false
},null,2)+'\n',{flag:'wx',mode:0o600});
console.log('AUTHENTIC_ORIGINAL_KOTLIN_CROSSFILE_JOINT_API_REPAIR_OBSERVED');
JS
