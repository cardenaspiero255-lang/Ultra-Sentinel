'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/c2-44-new-external-metadata.yml'),'utf8');
const worker=fs.readFileSync(path.join(root,'scripts/c2-new-44-metadata-worker.sh'),'utf8');
test('new 44 no-code/source workflow requires protected owner merge and green CI',()=>{
 assert.match(workflow,/github.event.repository.id == 1418338512/);
 assert.match(workflow,/github.actor_id == '322222186'/);
 assert.match(workflow,/github.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/needs.owner-one-time-introduction.outputs.introduced == 'true'/);
 assert.match(workflow,/npm run check/);
 assert.match(workflow,/C2-44-NEW-EXTERNAL-PRESEAL-20261024.json/);
 assert.match(workflow,/git diff --name-only "\$GITHUB_SHA\^1" "\$GITHUB_SHA"/);
 assert.doesNotMatch(workflow,/pull_request_target:/);
});
test('four parallel jobs sanitize GitHub file metadata and verify changed-files cardinality',()=>{
 assert.match(workflow,/xargs -P 4/);
 assert.match(workflow,/seq 0 43/);
 assert.match(worker,/gh api --paginate/);
 assert.match(worker,/jq -se 'add \| map\(\{filename,status,sha,additions,deletions,changes\}\)'/);
 assert.match(worker,/length==\$n/);
 assert.match(worker,/\.head.sha==\$head/);
 assert.match(worker,/\.base.sha==\$base/);
 assert.match(worker,/\.created_at==\$created/);
 assert.match(worker,/INCOMPLETE/);
 assert.doesNotMatch(worker,/git clone|curl|fetch_pr_patch/);
});
test('independent job confirms GitHub actor/run/artifact, no predictions, no GOLD',()=>{
 assert.match(workflow,/independent-metadata-artifact-attestor/);
 assert.match(workflow,/actions\/download-artifact@fa0a91b85d4f404e444e00e005971372dc801d16/);
 assert.match(workflow,/\.repository.id==1418338512/);
 assert.match(workflow,/\.actor.id==322222186/);
 assert.match(workflow,/\.newGoldLabels==0/);
 assert.match(workflow,/\.sourceReadAuthorized==false/);
 assert.match(workflow,/C2_44_INDEPENDENT_METADATA_ATTESTED_NO_GOLD/);
 assert.doesNotMatch(workflow,/contents:\s*write|pull-requests:\s*write/);
});

test('recovery owner introduction is explicit and malformed metadata is quarantined per PR',()=>{
 assert.match(workflow,/C2-44-NEW-EXTERNAL-RECOVERY-20261024.md/);
 assert.match(workflow,/grep -Fxq 'docs\/quality\/C2-44-NEW-EXTERNAL-RECOVERY-20261024.md'/);
 assert.match(worker,/state='INCOMPLETE'/);
 assert.match(worker,/!validPath\(f.filename\)/);
 assert.match(worker,/f.changes!==f.additions\+f.deletions/);
 assert.match(worker,/if \[\[ "\$state" != 'MATCHED' \]\]; then printf '\[\]\\n'/);
});
