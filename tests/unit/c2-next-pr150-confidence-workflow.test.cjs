'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('original frozen PR150 JVM oracle covers opposing evidence and weak evidence independently',()=>{
 const abi=read('tests/oracles/c2-next-pr150-confidence-domain-abi.kt');
 const oracle=read('tests/oracles/c2-next-pr150-confidence.kt');
 assert.match(abi,/enum class PerformanceProfile/);
 assert.match(oracle,/ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION/);
 assert.match(oracle,/WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE/);
 assert.match(oracle,/RecommendationConfidenceBand\.HIGH/);
 assert.match(oracle,/RecommendationConfidenceBand\.MEDIUM/);
 assert.match(oracle,/supportsRecommendation\s*=\s*false/);
 assert.match(oracle,/fresh\s*=\s*false/);
 assert.match(oracle,/authoritative\s*=\s*false/);
 assert.match(oracle,/executedOriginalSource/);
 assert.doesNotMatch(oracle,/require\(['"]\.\.\/.*core|eval\(/);
});
test('owner SHA-pinned PR150 original oracle workflow does not access reviewer predictions',()=>{
 const w=read('.github/workflows/c2-next-pr150-confidence-oracle.yml');
 for(const s of ['ULTRA_SENTINEL_C2_NEXT_PR150_CONFIDENCE_ORACLE_V1',
  '4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',
  '37866fd3dbfcd19d9daaf29a5e1e426391c723d4',
  '38974165470','12077973482',
  'git hash-object','kotlinc','bwrap','--unshare-all',
  'ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION',
  'WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE',
  'mutant','counterfactual','candidateInspected',
  'precision','tripleSPlusCertified'])assert.ok(w.includes(s),s);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge|core\.analyze/);
});
