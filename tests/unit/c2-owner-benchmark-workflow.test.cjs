'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-owner-observed-benchmark.yml'),'utf8');
const step=yaml.split('node --experimental-permission \\')[1]?.split('> "$RUNNER_TEMP/c2-owner-benchmark.json"')[0];
test('Node read-permission flags precede the benchmark script',()=>{
 assert.ok(step,'missing owner benchmark node command');
 const script=step.indexOf('"$GITHUB_WORKSPACE/scripts/evaluate-c2-owner-observed.cjs" \\');
 const flags=step.indexOf('--allow-fs-read="$root/kotlin/c2-kotlin-source-witness.json"');
 assert.ok(flags>=0&&script>flags,'all Node flags must precede the main module path');
 assert.doesNotMatch(step.slice(0,script),/\n\s*\x22\$root\/kotlin\/c2-kotlin-source-witness\.json\x22/);
});
test('Kotlin original witness is an argument exactly once after the executable',()=>{
 const script=step.indexOf('"$GITHUB_WORKSPACE/scripts/evaluate-c2-owner-observed.cjs" \\');
 const after=step.slice(script);
 assert.match(after,/"\$root\/news\/c2-owner-news-witness\.json" \\\n\s*"\$root\/kotlin\/c2-kotlin-source-witness\.json" \\/);
 assert.equal((after.match(/"\$root\/kotlin\/c2-kotlin-source-witness\.json"/g)||[]).length,1);
});
