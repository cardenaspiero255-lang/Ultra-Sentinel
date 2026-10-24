'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const preseal=require('../../docs/quality/C2-HOMEASSISTANT7681-PATH-ONLY-PRESEAL-20261024.json');
const old=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const lc=require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json');
const bw=require('../../docs/quality/C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json');
const {screenFrozenSourceMetadata}=require('../../packages/quality-gates/c2-reusable-frozen-source-screen.cjs');
const base={roster,preseal,exposures:old,previousDispositions:[lc,bw]};
const clone=x=>JSON.parse(JSON.stringify(x));
test('one production Kotlin + one test qualifies for owner source read triage, NOT a rule label',()=>{
 const v=screenFrozenSourceMetadata(base);
 assert.equal(v.status,'METADATA_PATH_POSSIBLE_RULE_UNVERIFIED');
 assert.equal(v.productionEligibleFiles,1);
 assert.equal(v.testFiles,1);
 assert.equal(v.sourceReviewedBefore,10);
 assert.equal(v.untouchedSourceCandidatesBefore,159);
 assert.equal(v.candidate.pr,7681);
 assert.equal(v.frozenRuleCount,17);
 assert.equal(v.sourceReleaseGranted,false);
 assert.equal(v.exactRuleMatched,false);
 assert.equal(v.truthSealed,false);
 assert.equal(v.newGoldLabels,0);
 assert.equal(v.detectorPredictionsRead,false);
 assert.equal(v.originalFixBenignExecuted,false);
});
test('reject SHA drift, duplicate or exposed source, forged rule, injected code or oracle claims',()=>{
 const mutate=[
 x=>x.preseal.candidate.headSha='0'.repeat(40),
 x=>x.preseal.candidate.pr=7662,
 x=>x.preseal.paths[0].sha='0'.repeat(40),
 x=>x.preseal.paths[0].filename='../README',
 x=>x.preseal.paths[0].patch='attack',
 x=>x.preseal.paths.push(x.preseal.paths[0]),
 x=>x.preseal.paths.pop(),
 x=>x.preseal.paths[0].filename='src/com/android/launcher3/Danger.java',
 x=>x.preseal.goldAdded=1,
 x=>x.preseal.ownerReleaseGranted=true,
 x=>x.preseal.exactRuleVerified=true,
 x=>x.preseal.diffRead=true,
 x=>x.preseal.sourceOracleExecuted=true,
 x=>x.preseal.candidatePredictionsRead=true,
 x=>x.preseal.trainingIndependenceVerified=true,
 x=>x.exposures.disclosures.push({repository:'home-assistant/android',pr:7681,reason:'LEAK'}),
 x=>x.previousDispositions[0].original.repository='home-assistant/android'
 ];
 for(const f of mutate){const v=clone(base);f(v);assert.throws(()=>screenFrozenSourceMetadata(v),/C2_SOURCE_METADATA_BLOCKED/);}
});
