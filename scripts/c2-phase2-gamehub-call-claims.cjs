'use strict';
// Development-only observation: run the compiler separately, then bind its
// claims to an isolated, clean local copy of the owner's pinned Git commit.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {planCommittedKotlinSourceImports}=require('../packages/family-hunter/committed-kotlin-import-graph.cjs');
const {planCommittedKotlinCallClaims}=require('../packages/investigation/committed-kotlin-semantic-claims.cjs');
const COMMIT='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const sources=[
 {path:'app/src/main/java/com/cardenaspiero255/gamehubultra/store/SteamMultiAccountSyncGuard.kt',blobSha:'037f4bda0349cef491746b5a7a118cc9b980ddc7'},
 {path:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/GameAccountValidation.kt',blobSha:'c608c277ce1b7610a345971fd643c4c0f8b7c9e3'},
 {path:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/GamePlatform.kt',blobSha:'673121b0c2e8fc558b88e46aad460c727f9e5fad'}
];
const [mode,directory,claimPath,receiptPath]=process.argv.slice(2);
assert.ok(mode==='preflight'||mode==='verify');
assert.ok(directory&&((mode==='preflight'&&!claimPath&&!receiptPath)||
 (mode==='verify'&&claimPath&&receiptPath)));
const paths=sources.map(x=>x.path);
const pinned=planCommittedKotlinSourceImports({directory,expectedCommitSha:COMMIT,
 paths,seeds:paths,maxFiles:paths.length,maxDepth:0});
assert.equal(pinned.localCommitVerified,true);
assert.deepEqual(pinned.sourceBlobs,sources);
if(mode==='verify'){
 const claims=JSON.parse(fs.readFileSync(claimPath,'utf8'));
 assert.equal(claims.length,3);
 // The compiler reads a read-only /original mount. Map its paths back to the
 // same local checkout; blob and commit checks below still authenticate bytes.
 for(const claim of claims)for(const key of ['callSite','declarationSite']){
  const location=claim[key];
  assert.ok(location&&typeof location.path==='string'&&location.path.startsWith('/original/'));
  const relative=location.path.slice('/original/'.length);
  assert.ok(paths.includes(relative));
  location.path=path.join(directory,relative);
 }
 const options={directory,expectedCommitSha:COMMIT,paths,seeds:[paths[0]],
  maxFiles:paths.length,maxDepth:2,claims};
 const graph=planCommittedKotlinCallClaims(options);
 assert.equal(graph.status,'LOCAL_COMMITTED_CALL_CLAIMS_REQUIRE_COMPILER_ATTESTATION');
 assert.equal(graph.sourceFilesVerified,3);
 assert.equal(graph.uniqueEdges,1);
 assert.deepEqual(graph.plan.files.map(x=>x.path),paths.slice(0,2));
 const cross=graph.relations.filter(r=>r.callPath===paths[0]&&r.declarationPath===paths[1]);
 assert.deepEqual(cross.map(r=>r.callLine).sort((a,b)=>a-b),[24,29]);
 assert.ok(cross.every(r=>r.declarationLine===25));
 assert.equal(graph.compilerExecutionVerified,false);
 assert.equal(graph.symbolResolutionVerified,false);
 assert.equal(graph.causalityVerified,false);
 assert.equal(graph.externalRepositoryAuthenticated,false);
 const forged=structuredClone(claims);forged[0].callSite.gitBlobSha='0'.repeat(40);
 assert.throws(()=>planCommittedKotlinCallClaims({...options,claims:forged}),/COMMITTED_KOTLIN_CALL_GRAPH_REJECTED/);
 const open=structuredClone(claims);open[0].dispatch='OPEN';
 assert.throws(()=>planCommittedKotlinCallClaims({...options,claims:open}),/COMMITTED_KOTLIN_CALL_GRAPH_REJECTED/);
 const receipt={schema:'ultra-sentinel-phase2-gamehub-call-claims/v1',
  repository:'cardenaspiero255-lang/gamehub-ultra',originalCommit:COMMIT,
  kotlinCompilerVersionObserved:'2.0.21',sourceBlobs:sources,
  emittedClaims:claims.length,crossFileCallSites:cross.length,uniqueCrossFileEdges:graph.uniqueEdges,
  plannedPaths:graph.plan.files.map(f=>f.path),sourceCommitMembershipVerified:true,
  graphCompilerAttested:false,graphSymbolResolutionVerified:false,
  originalFunctionalOracleVerified:false,causalityVerified:false,
  externalRepositoryAuthenticatedByGraph:false,remoteWrites:false,mergeAllowed:false};
 fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('Pinned GameHub compiler claims bound to local Git; forged blob and open dispatch rejected.');
}
