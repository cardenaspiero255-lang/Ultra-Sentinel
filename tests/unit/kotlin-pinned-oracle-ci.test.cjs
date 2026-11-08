'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const workflows=[
 'real-kotlin-cross-file-functional-judge.yml',
 'jarvis-original-voice-functional-judge.yml',
 'jarvis-termux-original-fix.yml'
];
const root=path.resolve(__dirname,'../../.github/workflows');
const digest='0352c0a45bd22f80f6b26e485cd04da8047baa5de54865281fb9f89a4a7bcf2a';
for(const file of workflows){
 test(file+' provisions a verified compiler before use without weakening guardrails',()=>{
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const java=source.indexOf('uses: actions/setup-java@dded0888837ed1f317902acf8a20df0ad188d165');
  const version=source.indexOf("java-version: '21'",java);
  const download=source.indexOf('/repos/JetBrains/kotlin/releases/assets/198150667');
  const checksum=source.indexOf(digest,download);
  const unpack=source.indexOf('unzip -q',checksum);
  const addPath=source.indexOf('GITHUB_PATH',unpack);
  const use=source.indexOf('command -v kotlinc');
  assert.ok(java>=0&&version>java&&version<download,'pinned JDK 21 before compiler download');
  assert.ok(download>=0&&checksum>download&&unpack>checksum&&addPath>unpack&&use>addPath,
   'verify the pinned compiler archive before unpacking, exporting and use');
  const downloadStep=source.slice(source.lastIndexOf('      - name:',download),
   source.indexOf('      - name:',download));
  assert.match(downloadStep,/set -euo pipefail/);
  assert.match(downloadStep,/GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(downloadStep,/sha256sum/);
  assert.match(downloadStep,/test -x .*kotlinc\/bin\/kotlinc/);
  assert.match(source,/contents: read/);
  assert.match(source,/persist-credentials: false/);
  assert.match(source,/github\.event\.repository\.id == 1418338512/);
  assert.match(source,/github\.event\.pull_request\.user\.login == 'cardenaspiero255-lang'/);
  assert.match(source,/sysctl -n kernel\.apparmor_restrict_unprivileged_userns\)" = 1/);
  assert.match(source,/apparmor_parser -r/);
  assert.match(source,/bubblewrap/);
 });
}
