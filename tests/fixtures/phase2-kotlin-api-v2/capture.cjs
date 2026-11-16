'use strict';
// Trusted host orchestration only; every external compilation and method runs
// through the already frozen networkless cgroup launchers.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {seal}=require('../../../scripts/phase2-kotlin-api-v2-eval.cjs');
const [manifestFile,engine,sources,kotlin,work,out]=process.argv.slice(2);
if(process.argv.length!==8)throw Error('V2_CAPTURE_ARGUMENTS');
const m=JSON.parse(fs.readFileSync(manifestFile)),root=path.resolve(__dirname,'../../..');
const adapter=path.join(root,'scripts/phase2-kotlin-api-v2-eval.cjs');
const command=(exe,args,timeout=150000)=>cp.spawnSync(exe,args,{encoding:'utf8',timeout,maxBuffer:1048576});
const requireSuccess=r=>{if(r.error||r.status!==0)throw Error('V2_CAPTURE_PROTOCOL_REFUSED');};
for(const f of m.engine.modules){
 const bytes=fs.readFileSync(path.join(engine,f.path));
 const blob=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(blob!==f.blobSha)throw Error('V2_FROZEN_ENGINE_CHANGED');
}
fs.mkdirSync(work,{recursive:false,mode:0o700});fs.mkdirSync(out,{recursive:false,mode:0o700});
const probe=path.join(work,'probe');fs.mkdirSync(probe);
requireSuccess(command('javac',['-d',probe,path.join(engine,'packages/family-hunter/GenericJvmMetamorphicProbe.java')],30000));
const entries=[],index=[],abstentions=[];
for(const c of m.cohorts){
 const base=path.join(work,'cohort-'+c.id),input=path.join(base,'input'),compiled=path.join(base,'compiled');
 fs.mkdirSync(base);fs.mkdirSync(compiled);
 requireSuccess(command(process.execPath,[adapter,'prepare',manifestFile,String(c.id),engine,path.join(sources,'source-'+c.id),input]));
 const compile=command('bash',[path.join(engine,'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh'),
  'compile-v2',kotlin,input,compiled]);
 if(compile.error||compile.status!==0){
  abstentions.push({cohortId:c.id,reason:'COMPILATION_ABSTENTION',exitStatus:compile.status});
  for(const name of ['diagnostics.log','execution.log']){
   const p=path.join(compiled,name);if(fs.existsSync(p))fs.copyFileSync(p,path.join(out,'compile-'+c.id+'-'+name));
  }
  continue;
 }
 const jar=path.join(compiled,'target.jar'),scopeFile=path.join(base,'scopes.json');
 requireSuccess(command(process.execPath,[adapter,'scopes',jar,scopeFile],15000));
 const scopes=JSON.parse(fs.readFileSync(scopeFile));
 if(scopes.length===0){abstentions.push({cohortId:c.id,reason:'NO_ELIGIBLE_CLASS_SCOPES'});continue;}
 const artifactSha256=crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex');
 for(const [i,scope] of scopes.entries()){
  const relative='cohort-'+c.id+'/scope-'+i,output=path.join(out,relative);fs.mkdirSync(output,{recursive:true});
  const run=command('bash',[path.join(engine,'tests/fixtures/jvm-metamorphic/run-probe-v2.sh'),jar,probe,scope,output],60000);
  if(run.error||run.status!==0){
   abstentions.push({cohortId:c.id,scope,reason:'PROBE_EXECUTION_ABSTENTION',exitStatus:run.status});continue;
  }
  const file=relative+'/discovery.json',raw=fs.readFileSync(path.join(out,file));
  index.push({cohortId:c.id,scope,artifactSha256,file});entries.push({cohortId:c.id,scope,artifactSha256,raw});
 }
}
for(const [file,value] of [['index.json',index],['abstentions.json',abstentions],
 ['prediction-seal.json',seal(m,entries,abstentions)]])
 fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('V2_ORIGINAL_PREDICTIONS_CAPTURED_BEFORE_ORACLE');
