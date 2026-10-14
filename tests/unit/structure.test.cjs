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


test('manifest paths reject control characters that could forge CI log lines',()=>{
 for(const candidate of ['docs/bad\nlabel.md','docs/bad\rlabel.md',
  'docs/bad\tlabel.md','docs/bad\x1b[31m.md']){
  assert.equal(safeRelativePath(candidate),false,
    'manifest path control characters must not appear in diagnostics');
 }
});

test('contract v1 fields remain complete, closed and versioned',()=>{
 const mandatory={
  incident:['schemaVersion','sourceRepo','service','eventType','observedAt','evidenceState'],
  'review-result':['schemaVersion','targetRepo','headSha','verdict','evidenceState'],
  'repair-authorization':['schemaVersion','mode','repository','prNumber','headSha','actor','scope','expiresAt','nonce','budget']
 };
 for(const [name,required] of Object.entries(mandatory)){
  const schema=JSON.parse(fs.readFileSync(path.join(ROOT,'packages/contracts/schemas',
   name+'.v1.schema.json'),'utf8'));
  assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.$id,'https://ultra-sentinel.invalid/contracts/'+name+'.v1.schema.json');
  assert.deepEqual([...schema.required].sort(),[...required].sort());
  assert.equal(schema.properties.schemaVersion.const,1);
  assert.equal(schema.additionalProperties,false);
  assert.ok(schema.required.every(field=>Object.hasOwn(schema.properties,field)));
 }
});

test('repair authorization schema limits identities, scopes, replay and timestamps',()=>{
 const schema=JSON.parse(fs.readFileSync(path.join(ROOT,'packages/contracts/schemas',
  'repair-authorization.v1.schema.json'),'utf8'));
 const p=schema.properties;
 assert.equal(p.mode.const,'REPAIR_COMMITS_AUTHORIZED');
 assert.equal(p.prNumber.minimum,1);
 assert.equal(p.headSha.pattern,'^[0-9a-f]{40}$');
 assert.equal(p.scope.type,'array');
 assert.equal(p.scope.uniqueItems,true);
 assert.ok(p.scope.minItems>=1&&p.scope.maxItems<=30);
 assert.ok(p.nonce.minLength>=16&&p.nonce.maxLength<=128);
 assert.equal(p.expiresAt.format,'date-time');
});

test('incident and review schemas reject ambiguous verdict definitions',()=>{
 const load=name=>JSON.parse(fs.readFileSync(path.join(ROOT,
  'packages/contracts/schemas',name+'.v1.schema.json'),'utf8'));
 const incident=load('incident').properties;
 const review=load('review-result').properties;
 assert.deepEqual(incident.evidenceState.enum.slice().sort(),
  ['INCOMPLETE','UNVERIFIED','VERIFIED'].sort());
 assert.equal(incident.observedAt.format,'date-time');
 assert.equal(incident.sourceRepo.pattern,'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$');
 assert.deepEqual(review.verdict.enum.slice().sort(),
  ['CLEAR','ADVISORY','BLOCKED','INCOMPLETE'].sort());
 assert.equal(review.headSha.pattern,'^[0-9a-f]{40}$');
 assert.deepEqual(review.evidenceState.enum.slice().sort(),
  ['INCOMPLETE','UNVERIFIED','VERIFIED'].sort());
});

test('repair authorization v1 includes a closed finite repair budget',()=>{
 const schema=JSON.parse(fs.readFileSync(path.join(ROOT,
  'packages/contracts/schemas/repair-authorization.v1.schema.json'),'utf8'));
 const budget=schema.properties.budget;
 assert.ok(schema.required.includes('budget'),'budget cannot be omitted');
 assert.equal(budget.type,'object');
 assert.equal(budget.additionalProperties,false);
 const keys=['maxCommits','maxCiRuns','maxDurationSeconds','maxFilesChanged','maxPatchBytes'];
 assert.deepEqual([...budget.required].sort(),[...keys].sort());
 for(const key of keys){
  const limit=budget.properties[key];
  assert.equal(limit.type,'integer',key);
  assert.ok(Number.isSafeInteger(limit.minimum)&&limit.minimum>=1,key);
  assert.ok(Number.isSafeInteger(limit.maximum)&&limit.maximum>=limit.minimum,key);
 }
 assert.ok(budget.properties.maxCommits.maximum<=3);
 assert.ok(budget.properties.maxCiRuns.maximum<=6);
 assert.ok(budget.properties.maxDurationSeconds.maximum<=900);
 assert.ok(budget.properties.maxFilesChanged.maximum<=30);
 assert.ok(budget.properties.maxPatchBytes.maximum<=200000);
});

test('CLEAR requires VERIFIED evidence in the versioned review contract',()=>{
 const s=JSON.parse(fs.readFileSync(path.join(ROOT,'packages/contracts/schemas/review-result.v1.schema.json'),'utf8'));
 assert.ok(Array.isArray(s.allOf)&&s.allOf.some(rule=>rule.if?.properties?.verdict?.const==='CLEAR'&&rule.then?.properties?.evidenceState?.const==='VERIFIED'));
});
test('repair scopes cannot be empty or whitespace-only',()=>{
 const s=JSON.parse(fs.readFileSync(path.join(ROOT,'packages/contracts/schemas/repair-authorization.v1.schema.json'),'utf8'));
 assert.ok(s.properties.scope.items.minLength>=1);
 assert.ok(s.properties.scope.items.pattern);
 assert.equal(new RegExp(s.properties.scope.items.pattern).test(''),false);
 assert.equal(new RegExp(s.properties.scope.items.pattern).test('   '),false);
});
test('repair expiry requires enforceable RFC3339 syntax beyond format annotation',()=>{
 const s=JSON.parse(fs.readFileSync(path.join(ROOT,'packages/contracts/schemas/repair-authorization.v1.schema.json'),'utf8'));
 const expiry=s.properties.expiresAt;
 assert.equal(expiry.format,'date-time');
 assert.ok(expiry.pattern,'date-time format alone is annotation under JSON Schema 2020-12');
 assert.equal(new RegExp(expiry.pattern).test('never'),false);
 assert.equal(new RegExp(expiry.pattern).test('2026-10-14T14:57:22Z'),true);
});

test('strict RFC3339 validator rejects calendar-invalid and malformed timestamps',()=>{
 const {isStrictRfc3339}=require('../../packages/contracts/strict-rfc3339.cjs');
 for(const good of ['2024-02-29T23:59:59Z','2026-10-14T12:20:00-03:00','2026-12-31T23:59:59.123+14:00'])
  assert.equal(isStrictRfc3339(good),true,good);
 for(const bad of ['never','2026-02-29T12:00:00Z','2026-02-31T12:00:00Z','2026-04-31T12:00:00Z','2026-13-01T12:00:00Z','2026-01-01T24:00:00Z','2026-01-01T12:00:00+14:30','2026-01-01T12:00:00','2026-01-01T12:00:60Z'])
  assert.equal(isStrictRfc3339(bad),false,bad);
});
test('incident observedAt requires syntax assertion beyond JSON Schema format annotation',()=>{
 const s=JSON.parse(fs.readFileSync(path.join(ROOT,'packages/contracts/schemas/incident.v1.schema.json'),'utf8'));
 assert.equal(s.properties.observedAt.format,'date-time');
 assert.ok(s.properties.observedAt.pattern);
 assert.equal(new RegExp(s.properties.observedAt.pattern).test('never'),false);
 assert.equal(new RegExp(s.properties.observedAt.pattern).test('2026-10-14T12:20:00Z'),true);
});

test('official RFC3339 positive leap seconds are accepted across UTC offsets',()=>{
 const {isStrictRfc3339}=require('../../packages/contracts/strict-rfc3339.cjs');
 const valid=[
  '1972-06-30T23:59:60Z',
  '1990-12-31T23:59:60Z',
  '2016-12-31T23:59:60.123Z',
  '2016-12-31T18:59:60-05:00',
  '2017-01-01T00:59:60+01:00',
  '2017-01-01T13:59:60+14:00',
  '2016-12-31T09:59:60-14:00'
 ];
 for(const stamp of valid)assert.equal(isStrictRfc3339(stamp),true,stamp);
});
test('leap-second validation rejects fabricated dates and non-matching offsets',()=>{
 const {isStrictRfc3339}=require('../../packages/contracts/strict-rfc3339.cjs');
 const invalid=[
  '2016-12-30T23:59:60Z','2016-12-31T22:59:60Z',
  '2016-12-31T23:59:60+01:00','2017-01-01T23:59:60Z',
  '2026-12-31T23:59:60Z','2016-02-31T23:59:60Z',
  '2016-12-31T23:59:61Z','2016-12-31T23:59:60+14:30'
 ];
 for(const stamp of invalid)assert.equal(isStrictRfc3339(stamp),false,stamp);
});
test('both contracts allow leap-second syntax while still rejecting nonsense',()=>{
 for(const [name,key] of [['incident','observedAt'],['repair-authorization','expiresAt']]){
  const s=JSON.parse(fs.readFileSync(path.join(ROOT,'packages/contracts/schemas',name+'.v1.schema.json'),'utf8'));
  const pattern=new RegExp(s.properties[key].pattern);
  assert.equal(pattern.test('1990-12-31T23:59:60Z'),true,name);
  assert.equal(pattern.test('2016-12-31T23:59:60+01:00'),true,name);
  assert.equal(pattern.test('never'),false,name);
  assert.equal(pattern.test('2016-12-31T23:59:61Z'),false,name);
 }
});
