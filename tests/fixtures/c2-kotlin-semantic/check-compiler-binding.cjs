'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {bindCommittedKotlinSemanticClaims,planCommittedKotlinCallClaims}=
 require('../../../packages/investigation/committed-kotlin-semantic-claims.cjs');
const [directory,claimPath]=process.argv.slice(2);
const paths=['app/src/main/kotlin/a/Caller.kt','app/src/main/kotlin/b/Target.kt'];
const expectedCommitSha=execFileSync('git',['rev-parse','HEAD'],{cwd:directory,encoding:'utf8'}).trim();
const claim=JSON.parse(fs.readFileSync(claimPath,'utf8'));
const options={directory,expectedCommitSha,paths,seeds:paths,maxFiles:8,maxDepth:4,claims:[claim]};
const result=bindCommittedKotlinSemanticClaims(options);
assert.equal(result.sourceCommitMembershipVerified,true);
assert.equal(result.compilerExecutionVerified,false);
assert.equal(result.symbolResolutionVerified,false);
assert.equal(result.causalityVerified,false);
assert.equal(result.externalRepositoryAuthenticated,false);
assert.equal(result.originalFunctionalOracleVerified,false);
assert.equal(result.relations[0].callPath,paths[0]);
assert.equal(result.relations[0].declarationPath,paths[1]);
assert.equal(result.relations[0].callBlobSha,claim.callSite.gitBlobSha);
assert.equal(result.relations[0].declarationBlobSha,claim.declarationSite.gitBlobSha);
// The emitter above really runs the Kotlin compiler, but this API still treats
// its output as untrusted caller data and never attests that execution.
const graph=planCommittedKotlinCallClaims({...options,seeds:[paths[0]]});
assert.deepEqual(graph.plan.files.map(f=>f.path),paths);
assert.equal(graph.sourceCommitMembershipVerified,true);
assert.equal(graph.compilerExecutionVerified,false);
assert.equal(graph.symbolResolutionVerified,false);
assert.equal(graph.causalityVerified,false);
assert.equal(graph.commitAllowed,false);
const forged=structuredClone(claim);forged.callSite.gitBlobSha='0'.repeat(40);
assert.throws(()=>bindCommittedKotlinSemanticClaims({...options,claims:[forged]}),/KOTLIN_SEMANTIC_CLAIM_REJECTED/);
assert.throws(()=>planCommittedKotlinCallClaims({...options,claims:[forged]}),/COMMITTED_KOTLIN_CALL_GRAPH_REJECTED/);
fs.appendFileSync(path.join(directory,paths[0]),'// changed after analysis\n');
assert.throws(()=>bindCommittedKotlinSemanticClaims(options),/KOTLIN_SEMANTIC_CLAIM_REJECTED/);
console.log('Real Kotlin compiler output bound to synthetic local Git tree; tampering rejected');
