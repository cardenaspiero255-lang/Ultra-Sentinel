'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {seal,verify,adjudicate}=require('../../scripts/phase2-block26-object-eval.cjs');
const report=(findings=[])=>Buffer.from(JSON.stringify({
 schema:'ultra-sentinel-generic-jvm-metamorphic/v1',status:'PARTIAL_HYPOTHESES_REQUIRE_ORACLE',
 artifactSha256:'a'.repeat(64),classesInspected:4,methodsProbed:2,unsupportedMethods:2,
 abstainedProbes:1,unloadableClasses:0,nestedClassesSkipped:1,comparableClasses:1,
 comparablePairs:171,comparableTriples:100,constructorAbstentions:1,findings,
 sourceAuthenticated:false,oracleVerified:false,novelFamilyVerified:false,
 repairAuthorized:false,remoteWrites:false,mergeAllowed:false
}));
const finding={class:'io.uuddlrlrba.ktalgs.math.GcdKt',method:'lcm(int;int;)int',
 argument:0,otherArguments:100,inputs:['0','1','2147483647'],observed:['0','100','-100'],
 status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'};
function truth(){
 const observations=[];
 for(const a of [0,1,2,3,12,100,2147483647])for(const b of [0,1,2,3,12,100,2147483647]){
  if(a===0&&b===0)continue;
  let x=BigInt(a),y=BigInt(b);while(y){const next=x%y;x=y;y=next;}
  const expected=BigInt(a)*BigInt(b)/x,actual=Number(BigInt.asIntN(32,expected));
  observations.push({a,b,expected:String(expected),actual,threw:false,negativeForNonnegativeInputs:actual<0});
 }
 return {schema:'ultra-sentinel-block26-independent-arithmetic/v1',boundedLcmControls:40,
  overflowCases:8,orderingControls:625,observations};
}
test('seals original hypotheses without granting functional truth or authority',()=>{
 const raw=report([finding]),s=seal(raw,'a'.repeat(64));
 assert.equal(s.hypotheses,1);assert.equal(s.independentOracleExecuted,false);
 assert.equal(s.engineSha,'8c246fd285793350a2fa3ccc2dcaa4eeac052750');
 assert.equal(verify(s,raw).reportSha256,s.reportSha256);
 assert.throws(()=>verify(s,Buffer.concat([raw,Buffer.from(' ')])));
 assert.throws(()=>verify({...s,independentOracleExecuted:true},raw));
});
test('forged artifact identity, truth claims, malformed output and excessive findings fail closed',()=>{
 assert.throws(()=>seal(report(),'b'.repeat(64)));
 for(const patch of [{oracleVerified:true},{remoteWrites:true},{schema:'made-up'},
  {findings:Array(257).fill(finding)},{comparablePairs:-1}]){
  assert.throws(()=>seal(Buffer.from(JSON.stringify({...JSON.parse(report()),...patch})),'a'.repeat(64)));
 }
 assert.throws(()=>seal(Buffer.from('{'),'a'.repeat(64)));
});
test('a scoped original witness must match both the sealed concrete input and actual observation',()=>{
 const raw=report([finding]),s=seal(raw,'a'.repeat(64));
 const oracle=truth();
 const out=adjudicate(s,raw,oracle);
 assert.equal(out.verifiedOriginalDefects,1);assert.equal(out.verifiedWitnesses.length,1);
 assert.equal(out.globalPrecision,null);assert.equal(out.block26Closed,false);
 assert.equal(out.block27Allowed,false);
 assert.equal(adjudicate(seal(report(),'a'.repeat(64)),report(),oracle).verifiedOriginalDefects,0);
 const changed=truth(),w=changed.observations.find(x=>x.a===2147483647&&x.b===100);
 w.actual=0;w.negativeForNonnegativeInputs=false;
 assert.equal(adjudicate(s,raw,changed).verifiedOriginalDefects,0);
 assert.throws(()=>adjudicate(s,raw,{...oracle,observations:oracle.observations.slice(1)}));
 const forged=truth();forged.observations[0].expected='999';assert.throws(()=>adjudicate(s,raw,forged));
 assert.throws(()=>adjudicate(s,raw,{...oracle,orderingControls:0}));
});
test('the new original evaluation cannot reveal truth before the immutable prediction artifact',()=>{
 const root=path.resolve(__dirname,'../..');
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/phase2-block26-object-contracts.yml'),'utf8');
 assert.match(workflow,/needs: frozen-original-predictions/);
 assert.match(workflow,/ref: 8c246fd285793350a2fa3ccc2dcaa4eeac052750/);
 assert.match(workflow,/name: Publish sealed predictions BEFORE independent oracle execution/);
 const beforeOracle=workflow.slice(0,workflow.indexOf('  independent-original-oracle:'));
 assert.doesNotMatch(beforeOracle,/run-isolated\.sh oracle|IndependentArithmeticOracle\.kt/);
 assert.match(beforeOracle,/frozen-engine\/tests\/fixtures\/jvm-metamorphic\/run-probe.sh/);
 const file=path.join(root,'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh');
 assert.equal(cp.spawnSync('bash',['-n',file],{encoding:'utf8'}).status,0);
 const launcher=fs.readFileSync(file,'utf8');
 assert.match(launcher,/jvm-metamorphic\/assert-cgroup-and-exec.sh/);
 for(const term of ['--unshare-all','--clearenv','MemoryMax=512M','TasksMax=32','--ro-bind "$input" /input'])
  assert.ok(launcher.includes(term),term);
 assert.doesNotMatch(launcher,/--(?:ro-)?bind\s+"?\$GITHUB_WORKSPACE/);
});
