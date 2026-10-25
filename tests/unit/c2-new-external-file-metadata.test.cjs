'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validNewExternalFileList}=require('../../packages/quality-gates/c2-new-external-file-metadata.cjs');
const good={filename:'app/src/main/java/de/danoeh/antennapod/actionbutton/MarkAsPlayedActionButton.java',
 status:'modified',sha:'29dd23ab7e54a2a2faa58e91fc843da2f0a34198',additions:1,deletions:1,changes:2};
test('RED: genuine path from 2026 GitHub PR works, independent of bash inline regex escaping',()=>{
 assert.equal(validNewExternalFileList([good]),true);
 assert.equal(validNewExternalFileList([{...good,filename:'libraries/matrixui/src/main/kotlin/io/element/android/libraries/matrix/ui/messages/reply/InReplyToDetails.kt'}]),true);
 assert.equal(validNewExternalFileList([{...good,filename:'.github/workflows/ci.yml'}]),true);
 assert.equal(validNewExternalFileList([{...good,filename:'README.md'}]),true);
});
test('RED: different GitHub file validation attacks fail closed with no patch',()=>{
 const problems=[
  {...good,patch:'RAW_UNTRUSTED_CODE'},
  {...good,filename:'../outside/MainActivity.kt'},
  {...good,filename:'file path with spaces.kt'},
  {...good,filename:'folder/../back.kt'},
  {...good,sha:'0'.repeat(39)},
  {...good,status:'unknown'},
  {...good,additions:-1},
  {...good,changes:999},
  {...good,filename:''},
  {...good,filename:'non-ascii-ñ.kt'}
 ];
 for(const row of problems)assert.equal(validNewExternalFileList([row]),false,JSON.stringify(row));
 assert.equal(validNewExternalFileList([good,good]),false);
 assert.equal(validNewExternalFileList([]),false);
 assert.equal(validNewExternalFileList('not array'),false);
 assert.equal(validNewExternalFileList([{...good,additions:1.2}]),false);
});
