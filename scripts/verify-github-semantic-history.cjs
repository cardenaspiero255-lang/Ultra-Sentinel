#!/usr/bin/env node
'use strict';
// Read-only verification of a single, pinned historical GitHub Actions run.
const {verifyPinnedGithubSemanticHistory}=
 require('../packages/investigation/github-semantic-history-verifier.cjs');
async function main(){
 if(process.argv.length!==4)throw Error('SEMANTIC_HISTORY_EVIDENCE_REJECTED');
 const result=await verifyPinnedGithubSemanticHistory({
  directory:process.argv[2],archivePath:process.argv[3]});
 process.stdout.write(JSON.stringify(result)+'\n');
}
main().catch(()=>{process.stderr.write('SEMANTIC_HISTORY_EVIDENCE_REJECTED\n');process.exitCode=1;});
