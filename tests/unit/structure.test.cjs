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

const os=require('node:os');

test('layout rejects a regular file reached through an external directory symlink',()=>{
 const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-layout-red-'));
 const root=path.join(sandbox,'repository');
 const outside=path.join(sandbox,'outside');
 try{
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside,'secret.txt'),'sensitive fixture');
  fs.symlinkSync(outside,path.join(root,'docs'),'dir');
  const result=checkLayout(root,{schemaVersion:1,paths:['docs/secret.txt']});
  assert.ok(result.errors.some(error=>error.includes('symlink')||
    error.includes('outside root')),'must never accept a file outside root through an intermediate symlink');
 }finally{
  fs.rmSync(sandbox,{recursive:true,force:true});
 }
});

test('layout rejects an intermediate symlink even if it resolves inside the repository',()=>{
 const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-layout-internal-'));
 const root=path.join(sandbox,'repository');
 try{
  fs.mkdirSync(path.join(root,'real'),{recursive:true});
  fs.writeFileSync(path.join(root,'real','ok.txt'),'fixture');
  fs.symlinkSync(path.join(root,'real'),path.join(root,'alias'),'dir');
  const result=checkLayout(root,{schemaVersion:1,paths:['alias/ok.txt']});
  assert.ok(result.errors.some(error=>error.includes('symlink')),
    'symlinked parents must be rejected consistently for deterministic CI');
 }finally{
  fs.rmSync(sandbox,{recursive:true,force:true});
 }
});

test('layout accepts regular nested files and rejects direct file symlinks',()=>{
 const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-layout-file-'));
 const root=path.join(sandbox,'repository');
 try{
  fs.mkdirSync(path.join(root,'docs'),{recursive:true});
  fs.writeFileSync(path.join(root,'docs','ok.md'),'fixture');
  fs.symlinkSync('ok.md',path.join(root,'docs','alias.md'),'file');
  assert.deepEqual(checkLayout(root,{schemaVersion:1,paths:['docs/ok.md']}).errors,[]);
  assert.ok(checkLayout(root,{schemaVersion:1,paths:['docs/alias.md']}).errors.length>0);
 }finally{
  fs.rmSync(sandbox,{recursive:true,force:true});
 }
});
