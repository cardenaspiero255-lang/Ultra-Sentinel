'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os');
test('sandbox denies secrets, host modification, nonloopback networking and root privileges',()=>{
 assert.equal(process.env.GITHUB_TOKEN,undefined);
 assert.equal(process.env.GH_TOKEN,undefined);
 assert.equal(process.env.ACTIONS_RUNTIME_TOKEN,undefined);
 assert.notEqual(process.getuid(),0);
 assert.equal(fs.existsSync('/home/runner/work'),false);
 assert.ok(Object.keys(os.networkInterfaces()).every(x=>x==='lo'));
 assert.throws(()=>fs.writeFileSync('/workspace/blocked.txt','write forbidden'),/EACCES|EROFS|EPERM/);
});
test('independent benign fixture remains GREEN',()=>assert.ok('benign'.length>3));
