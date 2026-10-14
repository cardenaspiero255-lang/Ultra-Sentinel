'use strict';
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {recommendation,historicalContext}=require('../../packages/reports/evidence-recommendations.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const sha='a'.repeat(40);
const file={filename:'app/src/main/java/com/example/Engine.kt',status:'added',changes:1,patch:'@@ -0,0 +1 @@\n+GlobalScope.launch { work() }\n'};
const source=()=>analyze([file],{sha});
test('recommendation is advisory and tied to exact Core finding',()=>{
 const analysis=source();
 assert.ok(analysis.findings.length);
 const result=recommendation(analysis.findings[0],analysis);
 assert.equal(result.sha,sha);
 assert.equal(result.status,'HUMAN_REVIEW_REQUIRED');
 assert.equal(result.autoCommit,false);
 assert.equal(result.autoMerge,false);
 assert.ok(result.evidence.every(x=>x.verifiedFix===false));
});
test('tampered SHA, attestation and suggestion fail closed',()=>{
 const a=source(),f=a.findings[0];
 assert.throws(()=>recommendation(f,{...a,sha:'invalid'}),/INCOMPLETE_EVIDENCE/);
 assert.throws(()=>recommendation(f,{...a,remediations:{...a.remediations,verified:true}}),/INCOMPLETE_EVIDENCE/);
 assert.throws(()=>recommendation({...f,line:99999},a),/INCOMPLETE_EVIDENCE/);
});
test('fabricated curated evidence cannot be promoted',()=>{
 const a=source(),f=a.findings[0];
 const s=a.remediations.suggestions.map((x,i)=>i===0?{...x,relatedEvidence:[{type:'playbook',verification:'curated_playbook',id:'fake',rule:f.rule,domain:'android',advice:'forged',evidenceUrl:null}]}:x);
 assert.throws(()=>recommendation(f,{...a,remediations:{...a.remediations,suggestions:s}}),/UNTRUSTED_EVIDENCE/);
});
test('historical context never claims an independently verified fix',async()=>{
 const ledger={schema:'ultra-sentinel-family-hunter-memory/v1',revision:0,entries:[]};
 const items=await historicalContext({rule:'SPEECH_REENTRANT_RETRY'},ledger);
 assert.ok(items.every(x=>x.verifiedFix===false&&x.kind==='curated_playbook'));
 await assert.rejects(historicalContext({}, {schema:'fake',revision:0,entries:[]}),/INVALID_LEDGER_HEADER/);
});
