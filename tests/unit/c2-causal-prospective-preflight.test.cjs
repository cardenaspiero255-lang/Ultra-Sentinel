'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {auditHistorical,screenCandidates,CUTOFF}=require('../../packages/quality-gates/c2-causal-prospective-preflight.cjs');
const hex=n=>n.toString(16).padStart(64,'0');
const sha=n=>n.toString(16).padStart(40,'0');
function historical(n=23){
 return Array.from({length:n},(_,i)=>({
  repository:'example/training',pr:100+i,headSha:sha(i+1),
  blobSha:sha(i+101),rule:'RULE_'+i,path:'src/main/kotlin/Case'+i+'.kt',
  line:i+1,positive:i<11,causalFingerprint:hex(i+1),
  oracleReceiptSha256:hex(i+101),sourceRunId:10000+i
 }));
}
const meta=(pr,source='PUBLIC_KOTLIN_BENCH',disclosure='REVEALED',date='2026-10-20T18:00:00Z')=>({
 repository:source==='PUBLIC_KOTLIN_BENCH'?'detekt/detekt':'newproject/library',
 pr,baseSha:sha(200+pr),headSha:sha(500+pr),createdAt:date,source,disclosure
});
test('incomplete or unsigned 23-label inventory never becomes an authenticated baseline',()=>{
 const r=auditHistorical(historical(22));
 assert.equal(r.count,22);assert.equal(r.status,'INCOMPLETE');
 assert.equal(r.historicalEvidenceAuthenticated,false);
 assert.equal(r.newLabels,0);assert.equal(r.precision,null);
 const full=auditHistorical(historical());
 assert.equal(full.count,23);assert.equal(full.positives,11);assert.equal(full.negatives,12);
 assert.equal(full.status,'UNATTESTED_PROVENANCE');
 assert.equal(full.historicalEvidenceAuthenticated,false);
});
test('fingerprint collisions or identical identity block the history even at 23 rows',()=>{
 const rows=historical();rows[22].causalFingerprint=rows[0].causalFingerprint;
 assert.equal(auditHistorical(rows).status,'DUPLICATE_CAUSAL_FINGERPRINT');
 const duplicates=historical();duplicates[22]={...duplicates[0]};
 assert.equal(auditHistorical(duplicates).status,'DUPLICATE_IDENTITY');
});
test('no source labels can be invented by self-declared verified or fake receipts',()=>{
 for(const bad of [
  {...historical()[0],historicalEvidenceAuthenticated:true},
  {...historical()[0],positive:'true'},
  {...historical()[0],headSha:'x'.repeat(40)},
  {...historical()[0],oracleReceiptSha256:'0'},
 ]){
  assert.throws(()=>auditHistorical([bad]),/CAUSAL_PREFLIGHT_BLOCKED/);
 }
});
test('public exposed Kotlin examples are development candidates, never blind holdout',()=>{
 const rows=[meta(7715),meta(7888),meta(19982)];
 const r=screenCandidates(historical(),rows);
 assert.deepEqual(r.candidates.map(x=>x.decision),Array(3).fill('DEVELOPMENT_ORACLE_REQUIRED'));
 assert.equal(r.holdoutFrozen,false);assert.equal(r.newLabels,0);assert.equal(r.precision,null);
});
test('known GameHub regressions 205/206/208 cannot be recycled as fresh holdout',()=>{
 const rows=[205,206,208,150,151,152,153,154,155,157,158,172].map(pr=>({
  ...meta(pr,'PROSPECTIVE_GITHUB','METADATA_ONLY','2026-10-21T00:00:00Z'),
  repository:'cardenaspiero255-lang/gamehub-ultra'
 }));
 const r=screenCandidates(historical(),rows);
 assert.ok(r.candidates.every(x=>x.decision==='KNOWN_HISTORICAL_EXCLUDED'));
});
test('prospective metadata after cutoff is only a holdout proposal, never a frozen or scored cohort',()=>{
 const after=new Date(Date.parse(CUTOFF)+1000).toISOString();
 const r=screenCandidates(historical(),[meta(301,'PROSPECTIVE_GITHUB','METADATA_ONLY',after)]);
 assert.equal(r.candidates[0].decision,'PROSPECTIVE_METADATA_ONLY_NOT_FROZEN');
 assert.equal(r.holdoutFrozen,false);
 assert.equal(r.historicalEvidenceAuthenticated,false);
 assert.equal(r.independenceVerified,false);
 assert.equal(r.f1,null);
});
test('reject stale, leaked or duplicate prospective candidates without counting labels',()=>{
 const after=new Date(Date.parse(CUTOFF)+1000).toISOString();
 const safe=meta(301,'PROSPECTIVE_GITHUB','METADATA_ONLY',after);
 const bad=[{...safe, predictions:[]},{...safe,oracle:'approved'}, {...safe,headSha:historical()[0].headSha}];
 for(const x of bad)assert.throws(()=>screenCandidates(historical(),[x]),/CAUSAL_PREFLIGHT_BLOCKED/);
 const result=screenCandidates(historical(),[safe,safe]);
 assert.equal(result.candidates[1].decision,'DUPLICATE_METADATA');
 const stale=screenCandidates(historical(),[meta(302,'PROSPECTIVE_GITHUB','METADATA_ONLY')]);
 assert.equal(stale.candidates[0].decision,'PRE_CUTOFF_EXCLUDED');
});
