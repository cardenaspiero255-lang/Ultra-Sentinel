'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const receipt=require('../../docs/quality/C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024.json');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const eight=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const earlier=[
 require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json').original,
 require('../../docs/quality/C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json').candidate,
 require('../../docs/quality/C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json').candidate
];
const {FROZEN_RULES,FROZEN_CORE_BLOBS}=require('../../packages/quality-gates/c2-frozen-path-rule-prefilter.cjs');
test('source release attested on exact protected owner SHA, never oracle or GOLD',()=>{
 assert.equal(receipt.decision,'INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE');
 assert.equal(receipt.release.runId,40136816063);
 assert.equal(receipt.release.ownerGithubActorId,322222186);
 assert.equal(receipt.release.sourceFreeContracts,'success');
 assert.equal(receipt.release.ownerIntroduction,'success');
 assert.equal(receipt.release.ownerSourceRead,'success');
 assert.equal(receipt.release.independentGitBlobAttestor,'success');
 assert.match(receipt.release.artifactSha256,/^[0-9a-f]{64}$/);
 assert.equal(receipt.ruleScope.ruleCount,FROZEN_RULES.length);
 assert.equal(receipt.ruleScope.frozenCoreGitBlob,FROZEN_CORE_BLOBS.core);
 assert.equal(receipt.ruleScope.exactRuleId,null);
 assert.equal(receipt.ruleScope.exactRulePathLine,null);
 assert.equal(receipt.oracle.originalJUnitExecuted,false);
 assert.equal(receipt.oracle.proposedFixedJUnitExecuted,false);
 assert.equal(receipt.oracle.benignJUnitExecuted,false);
 assert.equal(receipt.oracle.independentOracleAttested,false);
 assert.equal(receipt.security.candidatePredictionsRead,false);
 assert.equal(receipt.security.baselinePredictionsRead,false);
 assert.equal(receipt.security.truthSealed,false);
 assert.equal(receipt.promotableToGold,false);
 assert.equal(receipt.counts.newGoldLabels,0);
 assert.equal(receipt.counts.sssPlusCertified,false);
});
test('new test and decision files absent at original Git SHA, no invented upstream reproducer',()=>{
 assert.equal(receipt.source.originalDecisionFilePresent,false);
 assert.equal(receipt.source.originalTestFilePresent,false);
 assert.equal(receipt.source.proposedTestsCount,10);
 assert.equal(receipt.oracle.originalJUnitReproducibleAsIs,false);
 assert.equal(receipt.oracle.originalRuntimeFailureAuthenticated,false);
 assert.equal(receipt.oracle.fixedRuntimeSuccessAuthenticated,false);
 assert.equal(receipt.oracle.benignControlsAuthenticated,false);
 assert.match(receipt.source.originalMainActivityGitBlob,/^[0-9a-f]{40}$/);
 assert.notEqual(receipt.source.originalMainActivityGitBlob,receipt.source.proposedMainActivityGitBlob);
});
test('12 distinct sources inspected in 169; Nextcloud #6940 must not be readmitted to intact holdout',()=>{
 const exposed=[...eight.disclosures,...earlier,receipt.candidate];
 const seen=new Set();
 for(const c of exposed){
  const key=c.repository.toLowerCase()+'#'+c.pr;
  assert.equal(seen.has(key),false);seen.add(key);
  const originals=roster.candidates.filter(x=>x.repository===c.repository&&x.pr===c.pr);
  assert.equal(originals.length,1);
  if(c.baseSha)assert.equal(originals[0].baseSha,c.baseSha);
  if(c.headSha)assert.equal(originals[0].headSha,c.headSha);
 }
 assert.equal(exposed.length,12);
 assert.equal(roster.candidates.length-seen.size,157);
 assert.equal(receipt.counts.remainingSourceUninspected,157);
 assert.equal(receipt.counts.nominalRemainingToTarget120,111);
});
