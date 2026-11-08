'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {blobSha,scanNovelKotlinHypotheses}=
 require('../../packages/investigation/novel-kotlin-hypotheses.cjs');

const COMMIT='f'.repeat(40);
const SOURCE='package demo\nclass Example { fun okay() = true }\n';
const PATH='app/src/main/kotlin/demo/Example.kt';
const original=()=>({expectedCommitSha:COMMIT,files:[{
 path:PATH,source:SOURCE,expectedBlobSha:blobSha(SOURCE)
}]});

test('Hunter rejects executable accessors at every intake boundary without invoking them',()=>{
 let executed=0;
 const bad=()=>{executed++;throw Error('EXECUTED_UNTRUSTED_GETTER');};
 for(const position of ['root-commit','root-files','array-element',
                       'file-path','file-source','file-blob']){
  const input=original();
  if(position==='root-commit')Object.defineProperty(input,'expectedCommitSha',{get:bad,enumerable:true});
  if(position==='root-files')Object.defineProperty(input,'files',{get:bad,enumerable:true});
  if(position==='array-element')Object.defineProperty(input.files,'0',{get:bad,enumerable:true});
  if(position==='file-path')Object.defineProperty(input.files[0],'path',{get:bad,enumerable:true});
  if(position==='file-source')Object.defineProperty(input.files[0],'source',{get:bad,enumerable:true});
  if(position==='file-blob')Object.defineProperty(input.files[0],'expectedBlobSha',{get:bad,enumerable:true});
  const result=scanNovelKotlinHypotheses(input);
  assert.equal(result.status,'BLOCKED_INPUT_CONTRACT',position);
  assert.deepEqual(result.findings,[],position);
 }
 assert.equal(executed,0,'input getters must never be invoked');
});

test('Hunter rejects Proxy traps and hidden coercion before inspecting attacker data',()=>{
 let trapped=0;
 const traps={get(){trapped++;throw Error('UNTRUSTED_PROXY_GET');},
  getPrototypeOf(){trapped++;throw Error('UNTRUSTED_PROXY_PROTOTYPE');},
  ownKeys(){trapped++;throw Error('UNTRUSTED_PROXY_KEYS');}};
 const samples=[
  new Proxy(original(),traps),
  {...original(),files:new Proxy(original().files,traps)},
  {...original(),files:[new Proxy(original().files[0],traps)]},
  {...original(),expectedCommitSha:{toString(){trapped++;return COMMIT;}}},
  {...original(),files:[{...original().files[0],
   expectedBlobSha:{toString(){trapped++;return blobSha(SOURCE);}}}]}
 ];
 for(const input of samples)
  assert.equal(scanNovelKotlinHypotheses(input).status,'BLOCKED_INPUT_CONTRACT');
 assert.equal(trapped,0,'no Proxy or conversion hooks may execute');
});

test('Hunter preserves ordinary plain-data results and refuses array extras',()=>{
 const valid=scanNovelKotlinHypotheses(original());
 assert.equal(valid.status,'NO_HYPOTHESES_FOUND_NOT_CERTIFIED');
 assert.equal(valid.sourceGitRepositoryAuthenticated,false);
 const corrupted=original();corrupted.files.extra='untrusted';
 assert.equal(scanNovelKotlinHypotheses(corrupted).status,'BLOCKED_INPUT_CONTRACT');
});
