'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const p=require('../../docs/quality/C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const eight=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const l=require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json');
const b=require('../../docs/quality/C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json');
const {FROZEN_RULES,FROZEN_CORE_BLOBS}=require('../../packages/quality-gates/c2-frozen-path-rule-prefilter.cjs');

test('new authenticated owner source has exact independent run evidence but zero oracle truth',()=>{
 assert.equal(p.candidate.pr,7681);
 assert.equal(p.release.ownerGithubActorId,322222186);
 assert.equal(p.release.runId,40131542020);
 assert.equal(p.release.ownerReleaseJob,'success');
 assert.equal(p.release.separateGitAndBlobAttestor,'success');
 assert.match(p.release.artifactSha256,/^[0-9a-f]{64}$/);
 assert.match(p.blobs.baseProductionGitBlob,/^[0-9a-f]{40}$/);
 assert.match(p.blobs.headProductionGitBlob,/^[0-9a-f]{40}$/);
 assert.notEqual(p.blobs.baseProductionGitBlob,p.blobs.headProductionGitBlob);
 assert.equal(p.scope.frozenRules,FROZEN_RULES.length);
 assert.equal(p.scope.frozenCoreBlob,FROZEN_CORE_BLOBS.core);
 assert.equal(p.scope.exactFrozenRuleId,null);
 assert.equal(p.scope.exactRulePathLineMatch,false);
 assert.equal(p.upstreamMechanism.originalJUnitExecuted,false);
 assert.equal(p.upstreamMechanism.fixedJUnitExecuted,false);
 assert.equal(p.upstreamMechanism.benignControlExecuted,false);
 assert.equal(p.upstreamMechanism.realWebViewNativeCrashReproduced,false);
 assert.equal(p.upstreamMechanism.upstreamFixMerged,false);
 assert.equal(p.scoring.detectorPredictionsRead,false);
 assert.equal(p.scoring.baselinePredictionsRead,false);
 assert.equal(p.scoring.truthSealed,false);
 assert.equal(p.scoring.addedGoldLabels,0);
 assert.equal(p.noGoldPromotion,true);
 assert.equal(p.verdict,'INCONCLUSIVE_NO_COMPATIBLE_FROZEN_RULE');
});

test('11 source disclosures separate from 158 untouched metadata-only PRs',()=>{
 const seen=new Set(eight.disclosures.map(x=>x.repository.toLowerCase()+'#'+x.pr));
 for(const c of [l.original,b.candidate,p.candidate]){
  const key=c.repository.toLowerCase()+'#'+c.pr;
  assert.equal(seen.has(key),false);
  seen.add(key);
  const entry=roster.candidates.filter(x=>x.repository===c.repository&&x.pr===c.pr);
  assert.equal(entry.length,1);
  assert.equal(entry[0].headSha,c.headSha);
  assert.equal(entry[0].baseSha,c.baseSha);
 }
 assert.equal(seen.size,11);
 assert.equal(roster.candidates.length-seen.size,158);
 assert.equal(p.corpus.remainingSourceUntouched,158);
 assert.equal(p.scoring.priorDocumentedSourceScopedTruth,9);
 assert.equal(p.scoring.remainingTo120,111);
 assert.equal(p.scoring.sssPlusCertified,false);
});
