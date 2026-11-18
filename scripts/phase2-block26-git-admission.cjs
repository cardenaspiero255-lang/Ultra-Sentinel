#!/usr/bin/env node
'use strict';

const { readFileSync } = require('node:fs');
const { planMetadataCandidates } = require('./phase2-kotlin-api-v8-candidate-pool.cjs');
const { validateFreeze } = require('./phase2-kotlin-api-v11-metadata.cjs');
const exclusions = require('../docs/quality/PHASE2-BLOCK26-V11-POSTSCOUT-EXCLUSIONS.json');

async function main() {
  // Standard input contains repositories and pinnedTrees keyed by full_name.
  const { repositories, pinnedTrees } = JSON.parse(readFileSync(0, 'utf8'));
  const result = await planMetadataCandidates(
    repositories,
    new Set(exclusions.repositories.map(repository => repository.toLowerCase())),
    new Set(exclusions.blobShas),
    repository => Object.hasOwn(pinnedTrees, repository.full_name) ? pinnedTrees[repository.full_name] : null,
    validateFreeze().selector,
  );
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ planMetadataCandidates });
