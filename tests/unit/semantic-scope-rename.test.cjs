'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/architecture.yml'), 'utf8');
const scope = workflow.match(/git diff --name-only[^\n]+/)[0];
const patterns = workflow.match(/case "\$path" in\n([\s\S]*?)\n\s*esac/)[1];

function requiredForMove(from, to) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-scope-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  try {
    git('init', '-q');
    git('config', 'user.name', 'Scope Test');
    git('config', 'user.email', 'scope@example.invalid');
    fs.mkdirSync(path.dirname(path.join(dir, from)), { recursive: true });
    fs.writeFileSync(path.join(dir, from), 'identical content for rename detection\n');
    git('add', '.');
    git('commit', '-qm', 'base');
    const base = git('rev-parse', 'HEAD');
    fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true });
    git('mv', from, to);
    git('commit', '-qm', 'move');
    const head = git('rev-parse', 'HEAD');
    const script = `set -euo pipefail\nPR_BASE=$1 PR_HEAD=$2 RUNNER_TEMP=$3\n${scope}\nrequired=false\nwhile IFS= read -r -d '' path; do\ncase "$path" in\n${patterns}\nesac\ndone < "$RUNNER_TEMP/c2-semantic-changed-paths"\nprintf '%s' "$required"`;
    return execFileSync('bash', ['-c', script, 'scope', base, head, dir], { cwd: dir, encoding: 'utf8' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('semantic gate detects renames into and out of its scope', () => {
  assert.equal(requiredForMove('packages/kotlin-semantic/probe.kt', 'unrelated/probe.kt'), 'true');
  assert.equal(requiredForMove('unrelated/probe.kt', 'packages/kotlin-semantic/probe.kt'), 'true');
  assert.equal(requiredForMove('unrelated/probe.kt', 'other/probe.kt'), 'false');
});
