'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {verify,adjudicate}=require('../../scripts/phase2-kotlin-api-v6-eval.cjs');
test('v6 first original experiment remains negative with two independently adjudicated scoped false positives',()=>{
 const root=path.resolve(__dirname,'../../docs/quality/evidence/block26-v6-first-run');
 const bytes=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(bytes(p));
 const receipt=json('receipt.json');
 for(const f of receipt.files){assert.equal(bytes(f.path).length,f.sizeBytes);assert.equal(crypto.createHash('sha256').update(bytes(f.path)).digest('hex'),f.sha256);}
 assert.equal(receipt.runId,43995181112);
 assert.equal(receipt.protocolHeadSha,'37db856b78a1c80bd998ee3c578c6e19ec0ff81a');
 assert.ok(Date.parse(receipt.predictionsPublishedAt)<Date.parse(receipt.independentPublishedAt));
 const m=require('../../docs/quality/PHASE2-BLOCK26-V6-COHORT.json');
 const entries=json('predictions/index.json').map(x=>({...x,raw:bytes('predictions/'+x.file)}));
 const abstentions=json('predictions/abstentions.json'),seal=json('predictions/prediction-seal.json');
 verify(m,entries,abstentions,seal);
 assert.equal(entries.length,17);
 const truth=[json('independent/oracle-3.json'),json('independent/oracle-4.json')];
 const verdict=adjudicate(m,entries,abstentions,seal,truth);
 assert.deepEqual(verdict,json('independent/independent-verdict.json'));
 assert.equal(verdict.methodsProbed,6);assert.equal(verdict.confirmedDistinctDefects,0);
 assert.equal(verdict.confirmedHypotheses,0);assert.equal(verdict.scopedFalsePositiveHypotheses,2);
 assert.equal(verdict.unadjudicatedHypotheses,0);assert.equal(verdict.scopedIndependentObservations,83);
 assert.deepEqual(abstentions,[{cohortId:2,reason:'COMPILATION_ABSTENTION',exitStatus:1},
  {cohortId:4,scope:'br',reason:'PROBE_EXECUTION_ABSTENTION',exitStatus:1}]);
 assert.equal(verdict.globalPrecision,null);assert.equal(verdict.globalRecall,null);assert.equal(verdict.falseNegatives,null);
 assert.equal(receipt.originalFiles,37);assert.equal(receipt.originalSourcesNowExposed,true);
 for(const key of ['block26Closed','block27Allowed','engineRetuned'])assert.equal(receipt[key],false);
 const changed=[{...entries[0],raw:Buffer.concat([entries[0].raw,Buffer.from(' ')])},...entries.slice(1)];
 assert.throws(()=>verify(m,changed,abstentions,seal));
 assert.throws(()=>adjudicate(m,entries,abstentions,seal,[{...truth[0],sourceSha:'0'.repeat(40)},truth[1]]));
});
