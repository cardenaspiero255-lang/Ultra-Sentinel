'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtempSync,writeFileSync,readFileSync,existsSync,symlinkSync}=require('node:fs');
const {tmpdir}=require('node:os'),{join}=require('node:path');
const {execFileSync}=require('node:child_process');
const root=join(__dirname,'../..'),cli=join(root,'scripts/c2-causal-prospective-preflight.cjs');
test('preflight CLI writes new read-only report without certifying zero-input inventory',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c2-causal-'));
 const history=join(dir,'history.json'),candidates=join(dir,'candidates.json'),out=join(dir,'result.json');
 writeFileSync(history,'[]');writeFileSync(candidates,'[]');
 execFileSync(process.execPath,[cli,history,candidates,out],{timeout:5000,stdio:'pipe'});
 const r=JSON.parse(readFileSync(out,'utf8'));
 assert.equal(r.historicalStatus,'INCOMPLETE');
 assert.equal(r.holdoutFrozen,false);assert.equal(r.newLabels,0);assert.equal(r.precision,null);
 assert.throws(()=>execFileSync(process.execPath,[cli,history,candidates,out],{timeout:5000,stdio:'pipe'}));
});
test('preflight CLI refuses symlinks and unsupported JSON fields',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c2-causal-')),history=join(dir,'hist.json'),link=join(dir,'hist-link.json'),
 candidates=join(dir,'candidate.json'),out=join(dir,'report.json');
 writeFileSync(history,'[]');symlinkSync(history,link);writeFileSync(candidates,'[]');
 assert.throws(()=>execFileSync(process.execPath,[cli,link,candidates,out],{timeout:5000,stdio:'pipe'}));
 writeFileSync(history,'{"notAnArray":true}');
 assert.throws(()=>execFileSync(process.execPath,[cli,history,candidates,out],{timeout:5000,stdio:'pipe'}));
 assert.equal(existsSync(out),false);
});
