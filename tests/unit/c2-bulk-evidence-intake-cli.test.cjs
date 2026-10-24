'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {run}=require('../../scripts/c2-bulk-evidence-intake.cjs');
const expandedFixture=path.resolve(__dirname,
 '../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const fixture=path.resolve(__dirname,
 '../../docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json');

test('single CLI invocation processes all registered prospective PR metadata without source',()=>{
 const plan=run(['plan',fixture]);
 assert.equal(plan.sourceCandidates,4);
 assert.equal(plan.additionalTruthNeeded,111);
 assert.equal(plan.sourceInspected,false);
 assert.equal(plan.newGoldLabels,0);
});

test('CLI accepts isolated witness batch but quarantines every claim without evidence authentication',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-bulk-intake-'));
 try{
  const plan=run(['plan',fixture]);
  const planFile=path.join(dir,'plan.json'),receiptsFile=path.join(dir,'receipts.json');
  fs.writeFileSync(planFile,JSON.stringify(plan));
  fs.writeFileSync(receiptsFile,'[]');
  const out=run(['review',planFile,receiptsFile]);
  assert.equal(out.missing,4);
  assert.equal(out.remaining,111);
  assert.equal(out.newGoldLabels,0);
  assert.equal(out.sourceOracleAuthenticated,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('CLI refuses symlinked evidence and injected receipt claims',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-bulk-input-'));
 try{
  const link=path.join(dir,'untrusted.json');
  fs.symlinkSync(fixture,link);
  assert.throws(()=>run(['plan',link]),/C2_BULK_INTAKE_BLOCKED/);
  const injected=path.join(dir,'injected.json');
  fs.writeFileSync(injected,JSON.stringify({
   schema:'c2-bulk-source-candidate-manifest/v1',
   cutoff:'2026-10-20T19:30:54Z',candidates:[],
   goldLabels:111
  }));
  assert.throws(()=>run(['plan',injected]),/C2_BULK_INTAKE_BLOCKED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('one-shot CLI processes all 169 independent-looking metadata identities without labels',()=>{
 const plan=run(['plan',expandedFixture]);
 assert.equal(plan.sourceCandidates,169);
 assert.equal(plan.shards.length,16);
 assert.equal(plan.additionalTruthNeeded,111);
 assert.equal(plan.sourceInspected,false);
 assert.equal(plan.newGoldLabels,0);
});
