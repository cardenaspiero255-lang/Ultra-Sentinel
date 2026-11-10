'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const executable=path.join(root,'tests/fixtures/gamehub-three-source/scan-numeric.cjs');
const head='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const rel='app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt';
const expression='((level.toLong() * 100L) / scale).toInt().coerceIn(0, 100)';
const original=[
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
const fixed=original.replace(expression,'((level.toLong() * 100L) / scale).coerceIn(0L, 100L).toInt()');
function setup(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'numeric-bridge-'));
 const repo=path.join(temp,'repo'),work=path.join(temp,'work');
 fs.mkdirSync(path.dirname(path.join(repo,rel)),{recursive:true});fs.mkdirSync(work);
 fs.writeFileSync(path.join(repo,rel),original);fs.writeFileSync(path.join(work,'candidate-0.kt'),fixed);
 return {temp,repo,work};
}
function run(t,mutate){const fixture=setup();t.after(()=>fs.rmSync(fixture.temp,{recursive:true,force:true}));if(mutate)mutate(fixture);return spawnSync(process.execPath,[executable,fixture.repo,root,fixture.work,head],{encoding:'utf8'});}

test('pinned original emits a source-only numeric finding, candidate does not',t=>{
 const out=run(t);
 assert.equal(out.status,0,out.stderr);
 assert.match(out.stdout,/PINNED_NUMERIC_SOURCE_ADVISORY_NOT_ORACLE/);
});

test('modified original bytes are blocked before interpreting the numeric finding',t=>{
 const out=run(t,f=>fs.appendFileSync(path.join(f.repo,rel),'// tampered\n'));
 assert.notEqual(out.status,0);
});

test('a candidate retaining the risky narrowing cannot be presented as source-clean',t=>{
 const out=run(t,f=>fs.writeFileSync(path.join(f.work,'candidate-0.kt'),original));
 assert.notEqual(out.status,0);
});
