'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const d=require('../../docs/quality/C2-NEXTCLOUD-TALK6946-AUTHENTICATED-DISPOSITION-20261024.json');
const r=require('../../docs/quality/C2-NEXTCLOUD-TALK6946-PREAUTHORIZED-SOURCE-20261024.json');
const {FROZEN_RULES,FROZEN_CORE_BLOBS}=require('../../packages/quality-gates/c2-frozen-path-rule-prefilter.cjs');
test('owner attestor authorized exact sixteen path Git blobs, no permission to certify bug',()=>{
 assert.equal(d.authorization.runId,40145173894);
 assert.equal(d.authorization.ownerGithubActorId,322222186);
 assert.equal(d.authorization.offlineContracts,'success');
 assert.equal(d.authorization.ownerIntroduction,'success');
 assert.equal(d.authorization.ownerRead,'success');
 assert.equal(d.authorization.independentGitHeadTreeSixteenBlobs,'success');
 assert.equal(d.candidate.headSha,r.candidate.headSha);
 assert.equal(d.candidate.baseSha,r.candidate.baseSha);
 assert.equal(d.source.changedPaths,r.pathScope.length);
 assert.equal(d.frozenCore.blob,FROZEN_CORE_BLOBS.core);
 assert.equal(d.frozenCore.ruleCount,FROZEN_RULES.length);
});
test('no executable added GlobalScope calls: no exact frozen rule match, no oracle or GOLD',()=>{
 assert.equal(d.source.exactFrozenGlobalScopeLaunchOrAsyncAdded,0);
 assert.equal(d.source.newViewModelScopeLaunchCallsAdded,2);
 assert.equal(d.frozenCore.examinedRuleId,'UNSCOPED_COROUTINE');
 assert.equal(d.frozenCore.exactRuleMatch,false);
 assert.equal(d.frozenCore.exactMatchingPath,null);
 assert.equal(d.frozenCore.exactMatchingLine,null);
 assert.equal(d.originalTests.originalTestsExecuted,false);
 assert.equal(d.originalTests.fixedTestsExecuted,false);
 assert.equal(d.originalTests.benignTestsExecuted,false);
 assert.equal(d.originalTests.independentOracleAttested,false);
 assert.equal(d.evaluation.goldNew,0);
 assert.equal(d.evaluation.truthSealed,false);
 assert.equal(d.evaluation.detectorPredictionsRead,false);
 assert.equal(d.evaluation.baselinePredictionsRead,false);
 assert.equal(d.decision,'INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE');
});
test('new proposed JUnit methods absent from original do not establish original failing test',()=>{
 assert.equal(d.originalTests.newProposedTestCases,3);
 assert.equal(d.originalTests.newFeaturesAbsentInOriginal,true);
 for(const name of ['originalGitBlob','fixedGitBlob','fakeRepositoryOriginalGitBlob','fakeRepositoryFixedGitBlob','originalViewModelGitBlob','fixedViewModelGitBlob'])
  assert.match(d.originalTests[name],/^[0-9a-f]{40}$/);
 assert.notEqual(d.originalTests.originalGitBlob,d.originalTests.fixedGitBlob);
 assert.equal(d.originalTests.originalSourceRuleFailureReproduced,false);
 assert.equal(d.originalTests.originalFixBenignOracleExecuted,false);
 assert.equal(d.corpus.priorSourceExposed,12);
 assert.equal(d.corpus.sourceUntouchedRemaining,156);
 assert.equal(d.corpus.originalProspective-d.corpus.priorSourceExposed-d.corpus.newlySourceExposed,156);
 assert.equal(d.evaluation.remainingNominalTo120,111);
 assert.equal(d.evaluation.certifiedSSSPlus,false);
});
