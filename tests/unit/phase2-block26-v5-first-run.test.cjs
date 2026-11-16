'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {verify,adjudicate}=require('../../scripts/phase2-kotlin-api-v2-eval.cjs');
test('v5 first-run evidence preserves zero effective methods and independently scoped controls without discovery inflation',()=>{
 const root=path.resolve(__dirname,'../../docs/quality/evidence/block26-v5-first-run');
 const bytes=p=>{const f=path.join(root,p);return fs.existsSync(f)?fs.readFileSync(f):zlib.gunzipSync(fs.readFileSync(f+'.gz'));};
 const json=p=>JSON.parse(bytes(p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 for(const f of json('receipt.json').files){assert.equal(hash(bytes(f.path)),f.sha256);if(f.rawSha256)assert.equal(hash(zlib.gunzipSync(bytes(f.path))),f.rawSha256);}
 const m=require('../../docs/quality/PHASE2-BLOCK26-V5-COHORT.json');
 const e=json('predictions/index.json').map(x=>({...x,raw:bytes('predictions/'+x.file)}));
 const a=json('predictions/abstentions.json'),s=json('predictions/prediction-seal.json');
 verify(m,e,a,s);
 const v=adjudicate(m,e,a,s,[json('independent/oracle-1.json'),json('independent/oracle-3.json')]);
 assert.deepEqual(v,json('independent/independent-verdict.json'));
 assert.equal(v.methodsProbed,0);assert.equal(v.confirmedDistinctDefects,0);
 assert.equal(v.confirmedHypotheses,0);assert.equal(v.unadjudicatedHypotheses,0);
 assert.equal(v.scopedIndependentObservations,1);assert.equal(v.falseNegatives,null);
 assert.deepEqual(a,[{cohortId:2,reason:'COMPILATION_ABSTENTION',exitStatus:1}]);
 const p=json('preflight/compile-only-admissions.json');assert.deepEqual(p.admissions.map(x=>x.cohortId),[1,3]);assert.equal(p.oracleExecuted,false);
 assert.equal(json('coverage-note.json').countedAsHunterDiscoveries,false);
 assert.equal(json('coverage-note.json').unsupportedControlDisagreementsAdjudicatedAsDefects,false);
 assert.throws(()=>verify(m,[{...e[0],raw:Buffer.concat([e[0].raw,Buffer.from(' ')])},...e.slice(1)],a,s));
});
