'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('source-original Kotlin oracle independently challenges negative-only history confidence',()=>{
 const s=read('tests/oracles/c2-next-pr150-negative-history.kt');
 assert.match(s,/NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE/);
 assert.match(s,/RecommendationConfidenceBand\.HIGH/);
 assert.match(s,/RecommendationConfidenceBand\.MEDIUM/);
 assert.match(s,/knownBad\s*=\s*mapOf/);
 assert.match(s,/measuredGood\s*=\s*emptyMap/);
 assert.match(s,/acceptedFeedback\s*=\s*emptyMap/);
 assert.match(s,/externalEvidence\s*=\s*emptyList/);
 assert.match(s,/executedOriginalSource/);
});
test('owner source runner pins exact unchanged original Git Kotlin, counterfactual and sandbox',()=>{
 const s=read('.github/workflows/c2-next-pr150-negative-history-oracle.yml');
 for(const k of [
  'ULTRA_SENTINEL_C2_NEXT_PR150_NEGATIVE_HISTORY_ORACLE_V1',
  '4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',
  '37866fd3dbfcd19d9daaf29a5e1e426391c723d4',
  'NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE',
  'tests/oracles/c2-next-pr150-negative-history.kt',
  'c2-next-pr150-negative-history-mutant.sh',
  'bwrap','--unshare-all','sha256',
  'candidateInspected','tripleSPlusCertified'
 ])assert.ok(s.includes(k),k);
 assert.doesNotMatch(s,/contents:\s*write|pull_request_target|auto.?merge|newTruthLabelsSealed:\s*[1-9]/);
});
