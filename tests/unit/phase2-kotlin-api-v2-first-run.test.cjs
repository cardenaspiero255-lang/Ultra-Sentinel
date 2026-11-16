'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {verify,adjudicate}=require('../../scripts/phase2-kotlin-api-v2-eval.cjs');
test('known v2 artifacts replay zero new confirmations and preserve measured coverage and a missed independent boundary case',()=>{
 const root=path.resolve(__dirname,'../../docs/quality/evidence/block26-kotlin-api-v2-first-run');
 const bytes=p=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p)):
  zlib.gunzipSync(fs.readFileSync(path.join(root,p+'.gz'))),json=p=>JSON.parse(bytes(p));
 for(const f of json('receipt.json').files){
  assert.equal(crypto.createHash('sha256').update(bytes(f.path)).digest('hex'),f.sha256);
  if(f.rawSha256)assert.equal(crypto.createHash('sha256').update(zlib.gunzipSync(bytes(f.path))).digest('hex'),f.rawSha256);
 }
 const m=require('../../docs/quality/PHASE2-KOTLIN-API-V2-COHORT.json');
 const entries=json('predictions/index.json').map(e=>({...e,raw:bytes('predictions/'+e.file)}));
 const a=json('predictions/abstentions.json'),s=json('predictions/prediction-seal.json');
 verify(m,entries,a,s);
 const truth=[1,2].map(id=>json(`independent/oracle-${id}.json`));
 const v=adjudicate(m,entries,a,s,truth);
 assert.deepEqual(v,json('independent/independent-verdict.json'));
 assert.equal(v.methodsProbed,5);assert.equal(v.confirmedDistinctDefects,0);
 assert.equal(v.unadjudicatedHypotheses,2);assert.equal(v.scopedIndependentObservations,578);
 const note=json('coverage-note.json');assert.equal(note.hunterDiscovery,false);
 assert.equal(note.independentlyObservedBoundaryDefectMissedByHunter.actual,'1');
 assert.equal(note.independentlyObservedBoundaryDefectMissedByHunter.expected,'0');
 assert.equal(note.block27Allowed,false);
 assert.throws(()=>verify(m,[{...entries[0],raw:Buffer.concat([entries[0].raw,Buffer.from(' ')])},entries[1]],a,s));
});
