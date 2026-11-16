'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {verify,adjudicate}=require('../../scripts/phase2-kotlin-api-v2-eval.cjs');
test('v4 immutable first-run evidence retains ordering/oracle scope mismatch and no replicated discovery',()=>{
 const root=path.resolve(__dirname,'../../docs/quality/evidence/block26-v4-first-run');
 const bytes=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(bytes(p));
 for(const f of json('receipt.json').files)
  assert.equal(crypto.createHash('sha256').update(bytes(f.path)).digest('hex'),f.sha256);
 const m=require('../../docs/quality/PHASE2-BLOCK26-V4-COHORT.json');
 const e=json('predictions/index.json').map(x=>({...x,raw:bytes('predictions/'+x.file)}));
 const a=json('predictions/abstentions.json'),s=json('predictions/prediction-seal.json');
 verify(m,e,a,s);
 const v=adjudicate(m,e,a,s,[json('independent/oracle-1.json')]);
 assert.deepEqual(v,json('independent/independent-verdict.json'));
 assert.equal(v.confirmedDistinctDefects,0);assert.equal(v.unadjudicatedHypotheses,2);
 assert.equal(v.methodsProbed,4);assert.equal(v.scopedIndependentObservations,9);
 assert.equal(json('coverage-note.json').countedAsHunterDiscoveries,false);
 assert.equal(json('coverage-note.json').scopedMismatchedNumericObservations.length,4);
 assert.throws(()=>verify(m,[{...e[0],raw:Buffer.concat([e[0].raw,Buffer.from(' ')])},...e.slice(1)],a,s));
});
