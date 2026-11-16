'use strict';
// This entrypoint is used only by the separate job after prediction upload.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const [manifestFile,engine,sources,kotlin,predictions,work,out]=process.argv.slice(2);
const compileOnly=process.argv[9]==='compile-only';
if(process.argv.length!==(compileOnly?10:9))throw Error('V2_ORACLE_ARGUMENTS');
const root=path.resolve(__dirname,'../../..'),adapter=path.join(root,'scripts/phase2-kotlin-api-v2-eval.cjs');
const command=(exe,args)=>cp.spawnSync(exe,args,{encoding:'utf8',timeout:150000,maxBuffer:1048576});
const requireSuccess=r=>{if(r.error||r.status!==0)throw Error('V2_INDEPENDENT_PROTOCOL_REFUSED');};
if(!compileOnly)requireSuccess(command(process.execPath,[adapter,'verify',manifestFile,predictions,path.join(predictions,'prediction-seal.json')]));
const m=JSON.parse(fs.readFileSync(manifestFile)),abstentions=[],admissions=[];
fs.mkdirSync(work,{mode:0o700});fs.mkdirSync(out,{mode:0o700});
for(const c of m.cohorts){
 if(!m.oracles.some(o=>o.cohortId===c.id)){
  abstentions.push({cohortId:c.id,reason:'NO_INDEPENDENT_ORACLE_COMMITTED'});continue;
 }
 const base=path.join(work,'cohort-'+c.id),input=path.join(base,'input'),compiled=path.join(base,'compiled'),output=path.join(base,'output');
 fs.mkdirSync(base);fs.mkdirSync(compiled);fs.mkdirSync(output);
 requireSuccess(command(process.execPath,[adapter,'prepare',manifestFile,String(c.id),engine,path.join(sources,'source-'+c.id),input]));
 requireSuccess(command(process.execPath,[adapter,'oracle-input',manifestFile,String(c.id),input]));
 const launcher=path.join(engine,'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh');
 const compile=command('bash',[launcher,'compile-v2',kotlin,input,compiled]);
 if(compile.error||compile.status!==0){
  abstentions.push({cohortId:c.id,reason:'INDEPENDENT_COMPILATION_ABSTENTION',exitStatus:compile.status});
  for(const name of ['diagnostics.log','execution.log']){
   const p=path.join(compiled,name);if(fs.existsSync(p))fs.copyFileSync(p,path.join(out,'compile-'+c.id+'-'+name));
  }
  if(compileOnly&&m.oracles.find(o=>o.cohortId===c.id).admission!=='DEPENDENCY_ABSTENTION')
   throw Error('V2_COMMITTED_ORACLE_MUST_COMPILE_BEFORE_HUNTER');
  continue;
 }
 if(compileOnly){admissions.push({cohortId:c.id,compilationSucceeded:true,oracleExecuted:false});continue;}
 const run=command('bash',[launcher,'oracle',kotlin,compiled,output]);
 if(run.error||run.status!==0){
  abstentions.push({cohortId:c.id,reason:'INDEPENDENT_EXECUTION_ABSTENTION',exitStatus:run.status});
  for(const name of ['diagnostics.log','execution.log']){
   const p=path.join(output,name);if(fs.existsSync(p))fs.copyFileSync(p,path.join(out,'run-'+c.id+'-'+name));
  }
  continue;
 }
 requireSuccess(command(process.execPath,[adapter,'wrap-oracle',manifestFile,String(c.id),path.join(output,'execution.log'),
  path.join(out,'oracle-'+c.id+'.json')]));
}
fs.writeFileSync(path.join(out,'oracle-abstentions.json'),JSON.stringify(abstentions,null,2)+'\n',{flag:'wx',mode:0o600});
if(compileOnly){
 fs.writeFileSync(path.join(out,'compile-only-admissions.json'),JSON.stringify({admissions,abstentions,oracleExecuted:false},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('V2_COMMITTED_ORACLES_COMPILED_WITHOUT_EXECUTION');
 process.exit(0);
}
requireSuccess(command(process.execPath,[adapter,'verdict',manifestFile,predictions,path.join(predictions,'prediction-seal.json'),
 out,path.join(out,'independent-verdict.json')]));
console.log('V2_INDEPENDENT_ORIGINAL_ORACLES_COMPLETED_AFTER_PUBLIC_PREDICTIONS');
