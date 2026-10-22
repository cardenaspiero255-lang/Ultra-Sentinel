'use strict';
/*
 * Joins an ORIGINAL four-test Kotlin/JUnit witness from a prior successful
 * owner run to the CURRENT original-vs-derived Core/JVM result.
 * The caller MUST retrieve run/artifact JSON from GitHub API and artifact bytes
 * using GitHub Actions; this module never trusts a self-declared score.
 */
const {createHash}=require('node:crypto');
const {HEAD,BLOB,ORIGINAL_PATH,RULE_ID}=require('./c2-original-speech-206.cjs');
const RUN_ID=39827001646;
const RUN_SHA='e34330964d519c194f6b56a886a48567435fba99';
const WORKFLOW='.github/workflows/c2-pr206-utf16-triple-source-oracle.yml';
const REPO_ID=1418338512,OWNER_ID=322222186;
const ARTIFACT_ID=12447597134;
const ARTIFACT_NAME='c2-pr206-original-fixed-real-kotlin-core-unscored';
const ARTIFACT_SHA256='5deccbf951d42fbe9b8f236911ebd6e005d466cf424d9701d69ad265f4f43030';
const XML_SHA256='ed3b6a82f9e2ffbf11d8fc54bd5512206fe471e4dd5590b2c105e5b061e72936';
const CLASS='com.cardenaspiero255.gamehubultra.voice.C2OriginalSpeechChunkerOracleTest';
const EXPECTED_TESTS=['asciiControlHasNoSplitSurrogate','whitespaceBeforeEmojiAvoidsSurrogateSplit',
  'smallTextControlRemainsUnchanged','originalEmojiAtHardBoundarySplitsSurrogatePair'];
const fail=()=>{throw Error('C2_REUSED_JUNIT_LINK_BLOCKED');};
const digest=b=>createHash('sha256').update(b).digest('hex');
function verifyJUnitLink({run,artifact,xml,joined,core}={}){
 if(!run||run.id!==RUN_ID||run.head_sha!==RUN_SHA||
    run.path!==WORKFLOW||run.event!=='pull_request'||
    run.status!=='completed'||run.conclusion!=='success'||
    run.actor?.id!==OWNER_ID||run.repository?.id!==REPO_ID)fail();
 if(!artifact||artifact.id!==ARTIFACT_ID||artifact.name!==ARTIFACT_NAME||
    artifact.digest!=='sha256:'+ARTIFACT_SHA256||
    artifact.expired!==false||artifact.workflow_run?.id!==RUN_ID||
    artifact.workflow_run?.repository_id!==REPO_ID)fail();
 if(!Buffer.isBuffer(xml)||xml.length!==999||digest(xml)!==XML_SHA256)fail();
 const text=xml.toString('utf8');
 const escaped=CLASS.replace(/[.*+?^$\x7b\x7d()|[\]\\]/g,'\\$&');
 const suite=text.match(/<testsuite\s+([^>]+)>/);
 if(!suite||!suite[1].includes('name="'+CLASS+'"')||
    !['tests="4"','skipped="0"','failures="0"','errors="0"']
      .every(v=>suite[1].includes(v)))fail();
 const cases=[...text.matchAll(/<testcase\s+name="([^"]+)"\s+classname="([^"]+)"\s+time="[^"]+"\s*\/>/g)];
 if(cases.length!==4||cases.some(x=>x[2]!==CLASS)||
    new Set(cases.map(x=>x[1].replace(/\(\)$/,''))).size!==4||
    EXPECTED_TESTS.some(n=>!cases.some(x=>x[1]===n+'()'))||!escaped)fail();
 if(!joined||joined.schema!=='c2-pr206-original-counterfactual-jvm-joined-core/v1'||
    joined.observedSource!==BLOB||!(/^[a-f0-9]{40}$/).test(joined.derivedSource||'')||
    joined.derivedSource===BLOB||
    joined.core?.sourceRuleId!==RULE_ID||joined.core?.originalPath!==ORIGINAL_PATH||
    joined.core?.originalLine!==26||joined.core?.originalExactRulePathLineCount!==1||
    joined.core?.counterfactualSameRuleCount!==0||joined.core?.partial!==false||
    joined.behavior?.originalHeadSha!==HEAD||joined.behavior?.originalSourceBlobSha!==BLOB||
    joined.behavior?.originalSourcePath!==ORIGINAL_PATH||
    joined.behavior?.originalRuleLine!==26||
    joined.behavior?.counterfactualSourceBlobSha!==joined.derivedSource||
    joined.behavior?.sourceVersionsExecuted!==2||
    joined.behavior?.behavioralTransitions!==2||joined.behavior?.benignInputControlsPassed!==6||
    joined.realUpstreamFixProven!==false||joined.independentBenignSourceLabels!==0||
    joined.admittedGoldLabels!==0||joined.falsePositiveRate!==null||
    joined.precision!==null||joined.recall!==null||joined.f1!==null||
    joined.sssPlusCertified!==false)fail();
 if(!core||core.headSha!==HEAD||core.sourceBlobSha!==BLOB||
    core.sourcePath!==ORIGINAL_PATH||core.ruleId!==RULE_ID||core.line!==26||
    core.originalSourceAndDiffVerified!==true||
    core.knownPublicRegression!==true||core.newLabels!==0)fail();
 return Object.freeze({
  schema:'c2-pr206-owner-archived-original-junit-bound-to-current-kotlin-core/v1',
  status:'OWNER_ARCHIVED_JUNIT_BYTES_SHA_AUTHENTICATED_LINKED_NO_INDEPENDENT_LABEL',
  originalRunId:RUN_ID,originalRunHeadSha:RUN_SHA,
  originalArtifactId:ARTIFACT_ID,originalArtifactArchiveSha256:ARTIFACT_SHA256,
  originalArchiveAuthenticated:true,junitSha256:XML_SHA256,junitTests:4,
  originalGameHubHeadSha:HEAD,originalGameHubBlobSha:BLOB,
  originalRuleId:RULE_ID,originalSourcePath:ORIGINAL_PATH,originalSourceLine:26,
  currentCounterfactualBlobSha:joined.derivedSource,
  originalSourceWitnessLinkedToCurrentCore:true,
  independentBenignLabels:0,newGoldLabels:0,scoredFalsePositiveRate:null,
  precision:null,recall:null,f1:null,holdoutFrozen:false,sssPlusCertified:false
 });
}
module.exports={verifyJUnitLink,RUN_ID,ARTIFACT_ID,XML_SHA256};
