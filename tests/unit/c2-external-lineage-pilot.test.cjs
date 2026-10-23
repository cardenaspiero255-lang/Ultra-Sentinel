'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {prepareSourceFreePilot}=require('../../packages/quality-gates/c2-external-lineage-pilot.cjs');
const load=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json'),'utf8'));

test('RED: preregister one original external pilot without source, truth or Core results',()=>{
 const r=prepareSourceFreePilot(load());
 assert.equal(r.schema,'c2-external-lineage-source-free-pilot/v1');
 assert.equal(r.pilot.repository,'nextcloud/talk-android');
 assert.equal(r.pilot.pr,6938);
 assert.equal(r.pilot.headSha,'26892c801d4e7fbd12fbef7dfb04e0e1ded71c34');
 assert.equal(r.pilot.baseSha,'8dcc62a077802446b93108df5ff76a6a390be3d3');
 assert.equal(r.pilot.preselectedFromOriginalFour,true);
 assert.equal(r.originalCandidates,4);
 assert.equal(r.knownHistoricalDevelopmentPrs,8);
 assert.equal(r.historicalSourceIdentities,23);
 assert.equal(r.trainingCommitShaOverlap,0);
 assert.equal(r.trainingRepositoryOverlap,0);
 assert.equal(r.trainingSourceLineageCertified,false);
 assert.equal(r.causalFamilyExclusionCertified,false);
 assert.equal(r.sourceCodeReleasePermitted,false);
 assert.equal(r.candidateSourceRead,false);
 assert.equal(r.candidatePredictionsRead,false);
 assert.equal(r.originalSourceOraclesExecuted,0);
 assert.equal(r.newGoldLabels,0);
 assert.equal(r.holdoutFrozen,false);
 assert.equal(r.precision,null);
 assert.equal(r.sssPlusCertified,false);
 assert.match(r.commitmentSha256,/^[a-f0-9]{64}$/);
 assert.equal(r.pilot.title,undefined);
 assert.equal(r.pilot.patch,undefined);
 assert.equal(r.pilot.rule,undefined);
});

test('RED: precommit rejects mutated selection, leaked source, or claimed training clearance',()=>{
 const transforms=[
  x=>{x.candidates[3].headSha='a'.repeat(40)},
  x=>{x.candidates[3].repository='other/repo'},
  x=>{x.candidates[3].createdAt='2026-10-21T01:01:01Z'},
  x=>{x.candidates[3].title='purported fix'},
  x=>{x.candidates[0].predictions=[]},
  x=>{x.trainingIndependent=true},
  x=>{x.holdoutFrozen=true},
  x=>{x.candidates.pop()}
 ];
 for(const change of transforms){
  const doc=load();change(doc);
  assert.throws(()=>prepareSourceFreePilot(doc),/C2_EXTERNAL_LINEAGE_PILOT_BLOCKED/);
 }
});

test('RED: pilot commit remains stable under manifest reordering and never reads rule outputs',()=>{
 const a=load(),b=load();b.candidates.reverse();
 const ra=prepareSourceFreePilot(a),rb=prepareSourceFreePilot(b);
 assert.equal(ra.commitmentSha256,rb.commitmentSha256);
 assert.deepEqual(ra.pilot,rb.pilot);
 const impl=fs.readFileSync(path.join(__dirname,'../../packages/quality-gates/c2-external-lineage-pilot.cjs'),'utf8');
 assert.doesNotMatch(impl,/ultra_sentinel_core|\.analyze\(|fetch\(|https?\.request/);
});

test('RED: trusted owner-main workflow only reauthenticates Git commit/tree metadata',()=>{
 const wf=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-external-lineage-pilot.yml'),'utf8');
 assert.match(wf,/github\.event_name == 'push'/);
 assert.match(wf,/github\.ref == 'refs\/heads\/main'/);
 assert.match(wf,/github\.actor == 'cardenaspiero255-lang'/);
 assert.match(wf,/ref: \$\{\{ github\.sha \}\}/);
 assert.match(wf,/git\/commits\/\$original_head/);
 assert.match(wf,/git\/commits\/\$history_sha/);
 assert.match(wf,/trainingTreeShaOverlap/);
 assert.match(wf,/scripts\/c2-external-lineage-pilot\.cjs/);
 assert.doesNotMatch(wf,/^  pull_request:/m);
 assert.doesNotMatch(wf,/\/pulls\/\$pr\/files|\/compare\/|gh pr diff|checkout.*external|candidate_predictions|contents: write/);
});
