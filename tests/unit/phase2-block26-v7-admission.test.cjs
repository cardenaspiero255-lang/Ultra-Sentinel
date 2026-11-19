'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {validateReservation}=require('../../scripts/phase2-kotlin-api-v7-preflight.cjs');
const root=path.resolve(__dirname,'../..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
test('v7 ABI preflight authenticates frozen engine, immutable reservation and six original identities',()=>{
 const reservation=json('docs/quality/PHASE2-BLOCK26-V7-RESERVATION.json');
 const freeze=json('docs/quality/PHASE2-BLOCK26-V7-FREEZE.json');
 const result=validateReservation(reservation,freeze);
 assert.equal(result.cohorts.length,6);
 assert.equal(result.cohorts.reduce((n,c)=>n+c.source.files.length,0),32);
 assert.equal(result.engine.sourceCommitSha,'689583c23277807345edb715d8c2d277a3d4bda7');
 assert.equal(result.expectedSourceBytesSha256,'11e53fe012cff24a594db6c47412495e5de43b587b598a93c6c7c6c86b56411c');
});
test('v7 ABI preflight refuses altered source, exposed blob, invalid SHA or changed frozen engine',()=>{
 const reservation=json('docs/quality/PHASE2-BLOCK26-V7-RESERVATION.json');
 const freeze=json('docs/quality/PHASE2-BLOCK26-V7-FREEZE.json');
 const copy=()=>JSON.parse(JSON.stringify(reservation));
 const changed=copy();changed.cohorts[0].source.files[0].blobSha='f'.repeat(40);
 assert.throws(()=>validateReservation(changed,freeze),/RESERVATION_CHANGED|SOURCE_BINDING/);
 const replaced=copy();replaced.cohorts[0].source.commitSha='z'.repeat(40);
 assert.throws(()=>validateReservation(replaced,freeze),/RESERVATION_CHANGED|SOURCE_BINDING/);
 const badFreeze=JSON.parse(JSON.stringify(freeze));
 badFreeze.engine.modules[0].blobSha='0'.repeat(40);
 assert.throws(()=>validateReservation(reservation,badFreeze),/ENGINE_CHANGED|FREEZE_CHANGED/);
 const repeated=copy();repeated.cohorts[1].source.files[0].blobSha=repeated.cohorts[0].source.files[0].blobSha;
 assert.throws(()=>validateReservation(repeated,freeze),/RESERVATION_CHANGED|SOURCE_BINDING/);
});
