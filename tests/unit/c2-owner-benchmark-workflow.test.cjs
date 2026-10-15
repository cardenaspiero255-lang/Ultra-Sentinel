'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-owner-observed-benchmark.yml'),'utf8');
const section=yaml.split('node --experimental-permission')[1]?.split('> "$RUNNER_TEMP/c2-owner-benchmark.json"')[0];
const lines=section?.split('\n').map(s=>s.trim())??[];
function findLine(prefix){return lines.findIndex(s=>s.startsWith(prefix));}
const scriptPrefix='"$GITHUB_WORKSPACE/scripts/evaluate-c2-owner-observed.cjs"';
const kotlinFlag='--allow-fs-read="$root/kotlin/c2-kotlin-source-witness.json"';
const kotlinArg='"$root/kotlin/c2-kotlin-source-witness.json"';
test('Node read-permission flags precede the benchmark entrypoint',()=>{
 assert.ok(section,'missing owner benchmark node command');
 const script=findLine(scriptPrefix),flags=findLine(kotlinFlag);
 assert.ok(script>=0 && flags>=0 && flags<script,
  'fourth evidence permission must be before module entrypoint');
 assert.equal(lines.filter(s=>s.startsWith(scriptPrefix)).length,1);
});
test('Fourth original Kotlin witness is an argument once after executable',()=>{
 const script=findLine(scriptPrefix),arg=findLine(kotlinArg);
 assert.ok(script>=0&&arg>script,'Kotlin evidence must be an argument after entrypoint');
 assert.equal(lines.filter(s=>s.startsWith(kotlinArg)).length,1);
 assert.ok(lines.some(s=>s.startsWith('"$root/news/c2-owner-news-witness.json"')),
  'third witness argument is still required');
});
