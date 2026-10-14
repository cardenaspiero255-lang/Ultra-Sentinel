'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const {checkLayout,safeRelativePath}=require('../../scripts/verify-structure.cjs');

test('architecture manifest matches committed repository structure',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'config/layout.json'),'utf8'));
 const result=checkLayout(ROOT,manifest);
 assert.deepEqual(result.errors,[]);
 assert.ok(result.checked>=35,'structure must define real bounded module boundaries');
});
test('layout rejects path traversal, absolute paths and backslashes',()=>{
 for(const input of ['../secrets','.github/../../secrets','/etc/passwd','C:\\hidden','\\\\server\\path',''])
  assert.equal(safeRelativePath(input),false,input);
 assert.equal(safeRelativePath('packages/core/README.md'),true);
});
test('layout never marks duplicate or missing paths as valid',()=>{
 const duplicate=checkLayout(ROOT,{schemaVersion:1,paths:['README.md','README.md']});
 assert.ok(duplicate.errors.some(x=>x.includes('duplicate')));
 const missing=checkLayout(ROOT,{schemaVersion:1,paths:['docs/not-a-real-file.md']});
 assert.ok(missing.errors.some(x=>x.includes('missing')));
});
test('default security policy is read-only and fail-closed',()=>{
 const policy=JSON.parse(fs.readFileSync(path.join(ROOT,'config/policy.example.json'),'utf8'));
 assert.equal(policy.defaultMode,'REVIEW_WITH_SOLUTIONS');
 assert.equal(policy.repairCommitsEnabled,false);
 assert.equal(policy.autoApproveEnabled,false);
 assert.equal(policy.autoMergeEnabled,false);
 assert.equal(policy.productionDeployEnabled,false);
 assert.equal(policy.allowUnverifiedEvidence,false);
});
test('versioned contract schemas have closed shapes',()=>{
 for(const name of ['incident','review-result','repair-authorization']){
  const f=path.join(ROOT,'packages/contracts/schemas',name+'.v1.schema.json');
  const schema=JSON.parse(fs.readFileSync(f,'utf8'));
  assert.equal(schema.type,'object');
  assert.equal(schema.additionalProperties,false);
  assert.ok(Array.isArray(schema.required)&&schema.required.length>=3);
  assert.ok(schema.$id.includes(name));
 }
});
test('project registry examples do not enable production integrations',()=>{
 const project=JSON.parse(fs.readFileSync(path.join(ROOT,'config/projects.example.json'),'utf8'));
 assert.equal(project.schemaVersion,1);
 assert.ok(project.projects.length>=2);
 assert.ok(project.projects.every(x=>x.enabled===false));
});