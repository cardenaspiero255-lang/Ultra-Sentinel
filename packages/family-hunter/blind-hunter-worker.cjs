'use strict';
// Run only inside the restricted Hunter namespace. The input contains source
// inventory and Git blob identifiers, never the held-out oracle or answer.
const fs = require('node:fs');
const {scanBlindElapsedWindows} = require('./blind-elapsed-window.cjs');
try {
  if (process.argv.length !== 4) throw Error('BAD_ARGUMENTS');
  const [input, output] = process.argv.slice(2);
  const data = fs.readFileSync(input);
  if (data.length > 32 * 1024 * 1024) throw Error('INVENTORY_TOO_LARGE');
  const result = scanBlindElapsedWindows(JSON.parse(data.toString('utf8')));
  if (result.status.startsWith('BLOCKED_') || result.sourceRepositoryAuthenticated !== false ||
      result.originalFunctionalOracleVerified !== false || result.remoteWrites !== false ||
      result.mergeAllowed !== false) throw Error('HUNTER_REPORT_REJECTED');
  fs.writeFileSync(output, JSON.stringify(result), {flag:'wx', mode:0o600});
  process.stdout.write(`blind_source_scan=PASS\nblind_source_count=${result.filesScanned}\n` +
    `blind_unverified_findings=${result.findings.length}\n`);
} catch (e) { process.stderr.write(`BLIND_HUNTER_BLOCKED: ${e.message}\n`); process.exitCode = 1; }
