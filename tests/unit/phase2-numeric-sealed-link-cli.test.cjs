'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const HEAD='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const REL='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const SHA='8b9e934ca90852d77ddab274b60fd8dce4f4a2ca';
const expression='((level.toLong() * 100L) / scale).toInt().coerceIn(0, 100)';
const source=[
 'package com.cardenaspiero255.gamehubultra',
 '',
 'object BatteryTelemetry {',
 '    fun sanitizePercentage(value: Int?): Int? = value?.takeIf { it in 0..100 }',
 '',
 '    fun fromBroadcast(level: Int, scale: Int): Int? {',
 '        if (level < 0 || scale <= 0) return null',
 '        return sanitizePercentage('+expression+')',
 '    }',
 '}',
 ''
].join('\n');
const fixture=path.join(root,'tests/fixtures/gamehub-three-source/verify-numeric-link.cjs');
function setup(t){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'phase2-numeric-line-link-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const original=path.join(temp,'original'),work=path.join(temp,'work'),report=path.join(temp,'sealed.json');
 fs.mkdirSync(path.dirname(path.join(original,REL)),{recursive:true});fs.mkdirSync(work);
 fs.writeFileSync(path.join(original,REL),source);
 const blind={schema:'ultra-sentinel-blind-numeric/v1',status:'NUMERIC_BLIND_HYPOTHESES_UNVERIFIED',
  findings:[{path:REL,line:8,rule:'WIDE_NUMERIC_NARROWED_BEFORE_CLAMP',expectedBlobSha:SHA}],
  filesScanned:238,skippedOversized:0,skippedNoncanonical:0,sourceByteIntegrityVerified:true,
  compilerAuthenticated:false,sourceRepositoryAuthenticated:false,originalOracleVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false};
 const typed={schema:'ultra-sentinel-numeric-semantic-claims/v1',claims:[{path:path.join(original,REL),line:8,rule:'WIDE_NUMERIC_NARROWED_BEFORE_CLAMP',blobSha:SHA}],compilerAuthenticated:false,originalOracleVerified:false};
 const save=()=>{fs.writeFileSync(report,JSON.stringify(blind));fs.writeFileSync(path.join(work,'numeric-original.json'),JSON.stringify(typed));};
 save();return {original,work,report,blind,typed,save};
}
const run=x=>spawnSync(process.execPath,[fixture,x.original,root,x.work,HEAD,x.report],{encoding:'utf8'});
test('original pinned type claim agrees with sealed blind target on rule and line',t=>{
 const x=setup(t);const out=run(x);assert.equal(out.status,0,out.stderr);
 assert.match(out.stdout,/SEALED_NUMERIC_COMPILER_LINE_RULE_LINKED_ADVISORY_NOT_ORACLE/);
});
test('original type claim must not differ by line, rule, blob or path',t=>{
 for(const edit of [
  x=>x.typed.claims[0].line=7,
  x=>x.typed.claims[0].rule='INT_MULTIPLICATION_BEFORE_WIDENING',
  x=>x.blind.findings[0].line=9,
  x=>x.typed.claims[0].blobSha='f'.repeat(40),
  x=>x.blind.findings[0].expectedBlobSha='f'.repeat(40),
  x=>x.typed.claims[0].path='/tmp/other.kt',
 ]){const x=setup(t);edit(x);x.save();assert.notEqual(run(x).status,0);}
});
test('modified source blob, missing reports and incorrect pin fail closed',t=>{
 const x=setup(t);fs.appendFileSync(path.join(x.original,REL),'// tampered\n');
 assert.notEqual(run(x).status,0);
 const y=setup(t);fs.unlinkSync(y.report);assert.notEqual(run(y).status,0);
 const z=setup(t);const out=spawnSync(process.execPath,[fixture,z.original,root,z.work,'f'.repeat(40),z.report],{encoding:'utf8'});
 assert.notEqual(out.status,0);
});
