'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const disclosures=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const lawnchair=require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json');
const sourceRequest=require('../../docs/quality/C2-OWNER-ONE-PR-SOURCE-RELEASE-BITWARDEN7499-20261024.json');
const snapshot=require('../../docs/quality/C2-BITWARDEN7499-FROZEN-PATH-PRESEAL-20261024.json');
const {prefilterFrozenRules,FROZEN_RULES,FROZEN_CORE_BLOBS}=require('../../packages/quality-gates/c2-frozen-path-rule-prefilter.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const ctx={roster,disclosures,lawnchair,sourceRequest,snapshot};

test('selects only historically exact Core-compatible app production paths, never exact rule findings',()=>{
 const got=prefilterFrozenRules(ctx);
 assert.equal(got.status,'FROZEN_CORE_PATH_ELIGIBLE_RULE_UNVERIFIED');
 assert.equal(got.changedFiles,8);
 assert.equal(got.coreEligibleProduction,5);
 assert.equal(got.eligibleFiles.every(x=>x.startsWith('app/src/main/kotlin/')),true);
 assert.equal(got.testFiles,3);
 assert.equal(got.candidate.pr,7499);
 assert.equal(got.frozenRuleCount,17);
 assert.equal(FROZEN_RULES.length,17);
 assert.equal(got.exposedBefore,9);
 assert.equal(got.untouchedBeforeThisRead,160);
 assert.equal(got.exactRuleMatched,false);
 assert.equal(got.originalFixBenignExecuted,false);
 assert.equal(got.newGoldLabels,0);
 assert.equal(got.truthSealed,false);
 assert.equal(got.detectorPredictionsRead,false);
 assert.equal(got.sourceReadPermitted,false);
});
test('canonical historical Core blob and 17-rule vocabulary cannot silently change',()=>{
 assert.equal(FROZEN_CORE_BLOBS.core,'db29f94be1e0afb791a241d26f449695df0eafd0');
 assert.ok(FROZEN_RULES.includes('POTENTIAL_HARDCODED_SECRET'));
 assert.ok(FROZEN_RULES.includes('SPEECH_REENTRANT_RETRY'));
 assert.ok(!FROZEN_RULES.includes('EXIF_GPS_LEAK'));
});
test('tampered source identity, paths, blobs or scope never pass path gate',()=>{
 const mutations=[
  ()=>{const x=clone(ctx);x.snapshot.candidate.headSha='a'.repeat(40);return x;},
  ()=>{const x=clone(ctx);x.sourceRequest.candidate.pr=7498;return x;},
  ()=>{const x=clone(ctx);x.snapshot.files[0].filename='../.env';return x;},
  ()=>{const x=clone(ctx);x.snapshot.files[0].sha='f'.repeat(40);return x;},
  ()=>{const x=clone(ctx);x.snapshot.files.pop();return x;},
  ()=>{const x=clone(ctx);x.snapshot.files[0]=x.snapshot.files[1];return x;},
  ()=>{const x=clone(ctx);x.snapshot.files[0].patch='source code';return x;},
  ()=>{const x=clone(ctx);x.snapshot.frozenCore.coreBlobSha='1'.repeat(40);return x;},
  ()=>{const x=clone(ctx);x.snapshot.exactRuleMatched=true;return x;},
  ()=>{const x=clone(ctx);x.snapshot.newGoldLabels=1;return x;},
  ()=>{const x=clone(ctx);x.sourceRequest.oracleAuthenticated=true;return x;},
  ()=>{const x=clone(ctx);x.lawnchair.original={...x.lawnchair.original,pr:7499,repository:'bitwarden/android'};return x;}
 ];
 for(const mutate of mutations)assert.throws(()=>prefilterFrozenRules(mutate()),/C2_FROZEN_PATH_PREFILTER_BLOCKED/);
});
test('none of the 9 exposed PRs can be silently readmitted to untouched cohort',()=>{
 for(const row of [...disclosures.disclosures,lawnchair.original]){
  const x=clone(ctx);
  x.snapshot.candidate={...row,headSha:roster.candidates.find(c=>c.repository===row.repository&&c.pr===row.pr).headSha,
  baseSha:roster.candidates.find(c=>c.repository===row.repository&&c.pr===row.pr).baseSha,
  createdAt:roster.candidates.find(c=>c.repository===row.repository&&c.pr===row.pr).createdAt};
  x.sourceRequest.candidate=x.snapshot.candidate;
  assert.throws(()=>prefilterFrozenRules(x),/C2_FROZEN_PATH_PREFILTER_BLOCKED/);
 }
});
