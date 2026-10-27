'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {planRegressionBisect}=require('../../packages/quality-gates/regression-investigator.cjs');
const SHAS=Array.from({length:9},(_,i)=>i.toString(16).padStart(40,'0'));
const base=()=>({repository:'cardenaspiero255-lang/gamehub-ultra',commits:SHAS,
 observations:[{sha:SHAS[0],result:'GOOD'},{sha:SHAS.at(-1),result:'BAD'}]});
test('proposes midpoint from exact good/bad boundaries without executing code',()=>{
 const r=planRegressionBisect(base());
 assert.equal(r.status,'TEST_REQUIRED');
 assert.equal(r.nextSha,SHAS[4]);
 assert.equal(r.executable,false);
 assert.equal(r.commitsVerifiedExternally,false);
 assert.equal(r.mergeAllowed,false);
});
test('narrows to one suspected commit but never certifies it',()=>{
 const x=base();x.observations.push({sha:SHAS[4],result:'GOOD'});
 assert.equal(planRegressionBisect(x).nextSha,SHAS[6]);
 x.observations.push({sha:SHAS[6],result:'BAD'});
 assert.equal(planRegressionBisect(x).nextSha,SHAS[5]);
 x.observations.push({sha:SHAS[5],result:'BAD'});
 const r=planRegressionBisect(x);
 assert.equal(r.status,'CANDIDATE_REQUIRES_REPRO');
 assert.equal(r.suspectedFirstBadSha,SHAS[5]);
 assert.equal(r.causalityVerified,false);
});
test('does not guess culprit from non-monotonic test results',()=>{
 const x=base();x.observations.push({sha:SHAS[3],result:'BAD'},{sha:SHAS[5],result:'GOOD'});
 const r=planRegressionBisect(x);
 assert.equal(r.status,'NON_MONOTONIC_INCONCLUSIVE');
 assert.equal(r.nextSha,null);
 assert.equal(r.suspectedFirstBadSha,null);
});
test('missing verified endpoints cannot begin a bisect',()=>{
 const x=base();x.observations.splice(0,1);
 const r=planRegressionBisect(x);
 assert.equal(r.status,'MISSING_BOUNDARY_OBSERVATIONS');
 assert.equal(r.nextSha,null);
});
test('rejects unknown commits, duplicates and unsupported outcomes',()=>{
 const variants=[
  x=>x.commits.push(x.commits[0]),
  x=>x.commits[3]='g'.repeat(40),
  x=>x.observations.push({sha:'f'.repeat(40),result:'BAD'}),
  x=>x.observations.push({...x.observations[0]}),
  x=>x.observations.push({sha:SHAS[1],result:'SKIPPED'}),
  x=>x.repository='attacker/repository',
  x=>x.observations[0].grantWrites=true
 ];
 for(const mutate of variants){const x=base();mutate(x);assert.throws(()=>planRegressionBisect(x));}
});

const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {planRegressionFromGit}=require('../../packages/quality-gates/regression-investigator.cjs');
function history(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'regression-lineage-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false',...args],{
  cwd:directory,encoding:'utf8',env:{PATH:process.env.PATH,HOME:directory,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();
 git('init','-q','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
 const commits=[];
 for(let i=0;i<5;i++){
  fs.writeFileSync(path.join(directory,'source.txt'),String(i)+'\n');git('add','source.txt');git('commit','-qm','fixture '+i);
  commits.push(git('rev-parse','HEAD'));
 }
 const input={repository:'cardenaspiero255-lang/Ultra-Sentinel',commits,
  observations:[{sha:commits[0],result:'GOOD'},{sha:commits[4],result:'BAD'}]};
 return {directory,git,input,run:()=>planRegressionFromGit({directory,input})};
}
test('derive bisect from exact contiguous Git parent links without running project code',t=>{
 const f=history(t),head=f.git('rev-parse','HEAD'),r=f.run();
 assert.equal(r.nextSha,f.input.commits[2]);assert.equal(r.localGitLineageVerified,true);
 assert.equal(r.commitsVerifiedExternally,false);assert.equal(r.causalityVerified,false);
 assert.equal(r.executable,false);assert.equal(r.mergeAllowed,false);
 assert.equal(f.git('rev-parse','HEAD'),head);assert.equal(f.git('status','--porcelain'),'');
});
for(const bad of ['skip','reverse','unknown','shallow','graft','replacement','unsafe config','symlink'])test('Git lineage rejects '+bad,t=>{
 const f=history(t);
 if(bad==='skip')f.input.commits.splice(2,1);
 if(bad==='reverse')[f.input.commits[1],f.input.commits[2]]=[f.input.commits[2],f.input.commits[1]];
 if(bad==='unknown')f.input.commits[2]='f'.repeat(40);
 if(bad==='shallow')fs.writeFileSync(path.join(f.directory,'.git/shallow'),f.input.commits[1]+'\n');
 if(bad==='graft')fs.writeFileSync(path.join(f.directory,'.git/info/grafts'),f.input.commits[1]+'\n');
 if(bad==='replacement')f.git('replace',f.input.commits[1],f.input.commits[2]);
 if(bad==='unsafe config')f.git('config','core.sshCommand','false');
 if(bad==='symlink'){
  const link=f.directory+'-link';fs.symlinkSync(f.directory,link);t.after(()=>fs.unlinkSync(link));
  assert.throws(()=>planRegressionFromGit({directory:link,input:f.input}),/UNVERIFIED_GIT_LINEAGE/);return;
 }
 assert.throws(f.run,/UNVERIFIED_GIT_LINEAGE/);
});
test('merge ancestry is inconclusive rather than silently choosing a parent',t=>{
 const f=history(t);f.git('checkout','-qb','side',f.input.commits[1]);
 fs.writeFileSync(path.join(f.directory,'side.txt'),'side\n');f.git('add','side.txt');f.git('commit','-qm','side');
 f.git('checkout','-q','main');f.git('merge','--no-ff','-qm','merge','side');
 const merge=f.git('rev-parse','HEAD');f.input.commits.push(merge);f.input.observations[1].sha=merge;
 assert.throws(f.run,/UNVERIFIED_GIT_LINEAGE/);
});
test('hash-mismatched loose commit object cannot authenticate a lineage',t=>{
 const f=history(t),sha=f.input.commits[2];
 const file=path.join(f.directory,'.git/objects',sha.slice(0,2),sha.slice(2));
 const zlib=require('node:zlib'),bytes=zlib.inflateSync(fs.readFileSync(file));
 fs.chmodSync(file,0o600);
 fs.writeFileSync(file,zlib.deflateSync(Buffer.from(bytes.toString().replace('fixture 2','fixture X'))));
 assert.throws(f.run,/UNVERIFIED_GIT_LINEAGE/);
});
test('CLI optionally verifies local Git while legacy mode remains explicitly unverified',t=>{
 const f=history(t),file=path.join(f.directory,'input.json');fs.writeFileSync(file,JSON.stringify(f.input));
 const cli=path.join(__dirname,'../../scripts/plan-regression-bisect.cjs');
 const local=JSON.parse(execFileSync(process.execPath,[cli,file,f.directory],{encoding:'utf8'}));
 const legacy=JSON.parse(execFileSync(process.execPath,[cli,file],{encoding:'utf8'}));
 assert.equal(local.localGitLineageVerified,true);assert.equal(legacy.commitsVerifiedExternally,false);
 assert.equal(local.observationsAuthenticated,false);assert.equal(local.remoteRepositoryIdentityAuthenticated,false);
});
