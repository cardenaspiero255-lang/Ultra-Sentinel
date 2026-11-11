'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {adjudicateFactorialCausalHypotheses}=require('../../packages/quality-gates/phase2-causal-factorial.cjs');
const HEAD='a'.repeat(40);
const paths=Array.from({length:5},(_,i)=>'app/src/main/kotlin/Node'+i+'.kt');
const files=paths.map((path,i)=>({path,blobSha:String(i+1).repeat(40)}));
const relations=Array.from({length:4},(_,i)=>({from:paths[i],to:paths[i+1],fromBlobSha:files[i].blobSha,toBlobSha:files[i+1].blobSha}));
function sample(opts={}){
 const n=2**paths.length;
 return {expectedHeadSha:HEAD,files,relations,observations:Array.from({length:n},(_,mask)=>({mask,sourceHeadSha:HEAD,defectObserved:!(Boolean(mask&1)&&Boolean(mask&16)),benignPassed:true})),...opts};
}
test('5-file counterfactual enumerates minimal interacting repair set without causal attestation',()=>{
 const r=adjudicateFactorialCausalHypotheses(sample());
 assert.equal(r.status,'INTERVENTION_HYPOTHESES_REQUIRING_TRUSTED_ORACLE');
 assert.equal(r.filesEvaluated,5);
 assert.deepEqual(r.minimalRepairSets,[[paths[0],paths[4]]]);
 assert.deepEqual(r.necessaryFiles,[paths[0],paths[4]]);
 assert.equal(r.graphClaimOnly,true);
 assert.equal(r.compilerProvenanceAuthenticated,false);
 assert.equal(r.independentOriginalOracleAuthenticated,false);
 assert.equal(r.causalityVerified,false);
 assert.equal(r.remoteWrites,false);
});
test('missing or ambiguous matrix rows and bad benign baseline block fail-closed',()=>{
 const s=sample();
 for(const bad of [
  {...s,observations:s.observations.slice(1)},
  {...s,observations:[s.observations[0],...s.observations.slice(0,-1)]},
  {...s,observations:s.observations.map((row,i)=>i===0?{...row,benignPassed:false}:row)},
  {...s,observations:s.observations.map((row,i)=>i===31?{...row,defectObserved:true}:row)},
  {...s,files:[...s.files.slice(0,4),s.files[0]]},
  {...s,relations:[...s.relations,{...s.relations[0],toBlobSha:'f'.repeat(40)}]}
 ])assert.match(adjudicateFactorialCausalHypotheses(bad).status,/^BLOCKED_/);
});
test('failed benign controls are excluded from minimal repair sets',()=>{
 const s=sample();
 const observations=s.observations.map(row=>row.mask===17?{...row,benignPassed:false}:row);
 const r=adjudicateFactorialCausalHypotheses({...s,observations});
 assert.equal(r.status,'INTERVENTION_HYPOTHESES_REQUIRING_TRUSTED_ORACLE');
 assert.deepEqual(r.minimalRepairSets,[[paths[0],paths[1],paths[4]],[paths[0],paths[2],paths[4]],[paths[0],paths[3],paths[4]]]);
});
test('rejects untrusted getters and proxies without evaluating them',()=>{
 let touched=0;
 const trap=()=>{touched++;throw Error('trap');};
 const s=sample();Object.defineProperty(s.observations[3],'benignPassed',{get:trap});
 assert.match(adjudicateFactorialCausalHypotheses(s).status,/^BLOCKED_/);
 assert.match(adjudicateFactorialCausalHypotheses(new Proxy(sample(),{ownKeys:trap})).status,/^BLOCKED_/);
 assert.equal(touched,0);
});
test('input is bounded to 12 files and 4096 exhaustive combinations',()=>{
 const s=sample();
 const thirteen=Array.from({length:13},(_,i)=>({path:'app/src/main/kotlin/T'+i+'.kt',blobSha:'a'.repeat(40)}));
 assert.match(adjudicateFactorialCausalHypotheses({...s,files:thirteen}).status,/^BLOCKED_/);
 assert.match(adjudicateFactorialCausalHypotheses({...s,expectedHeadSha:'not-a-sha'}).status,/^BLOCKED_/);
});

test('nested blob hashes and relation endpoints must be primitive before serialization',()=>{
 let effects=0;
 const forgedSha={toString(){effects++;return 'a'.repeat(40);}};
 const s=sample();
 const maliciousFile={...s,files:s.files.map((row,i)=>i===0?{...row,blobSha:forgedSha}:row)};
 assert.match(adjudicateFactorialCausalHypotheses(maliciousFile).status,/^BLOCKED_/);
 const maliciousEdge={...s,relations:s.relations.map((row,i)=>i===0?{...row,from:{toJSON(){effects++;return paths[0];}}}:row)};
 assert.match(adjudicateFactorialCausalHypotheses(maliciousEdge).status,/^BLOCKED_/);
 assert.equal(effects,0);
});


test('rejects Windows separator traversal masquerading as a distinct Kotlin source path',()=>{
 const s=sample();
 const unsafe='app\\\\..\\\\Secret.kt';
 const forged={
  ...s,
  files:s.files.map((file,i)=>i===0?{...file,path:unsafe}:file),
  relations:s.relations.map(edge=>({
   ...edge,
   from:edge.from===paths[0]?unsafe:edge.from,
   to:edge.to===paths[0]?unsafe:edge.to
  }))
 };
 assert.equal(adjudicateFactorialCausalHypotheses(forged).status,'BLOCKED_COUNTERFACTUAL_MATRIX');
});
