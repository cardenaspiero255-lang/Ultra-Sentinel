'use strict';
// Verify a text patch by reconstructing the entire HEAD file from merge-base.
// GitHub supplies commit/path provenance; the blob hash authenticates bytes
// against that metadata, not against an independent GitHub trust authority.
const {createHash}=require('node:crypto');
const SHA=/^[a-f0-9]{40}$/;
const MAX_BYTES=320000;
function sourcePath(path){
 return typeof path==='string'&&path.length>0&&path.length<=240&&
  !path.startsWith('/')&&!path.includes('..')&&!path.includes('//')&&
  /^[A-Za-z0-9_./ -]+$/.test(path);
}
function decodeDiffSource(raw,{path,blobSha}={}){
 const fail=()=>{throw Error('UNVERIFIED_PINNED_SOURCE');};
 if(!sourcePath(path)||!raw||raw.type!=='file'||raw.path!==path||
  raw.submodule_git_url||raw.target||raw.encoding!=='base64'||!SHA.test(raw.sha||'')||
  (blobSha!==undefined&&raw.sha!==blobSha)||!Number.isSafeInteger(raw.size)||
  raw.size<0||raw.size>MAX_BYTES||typeof raw.content!=='string'||raw.content.length>500000||
  !/^[A-Za-z0-9+/=\r\n]*$/.test(raw.content))fail();
 const packed=raw.content.replace(/[\r\n]/g,'');
 const bytes=Buffer.from(packed,'base64');
 if(bytes.length!==raw.size||bytes.toString('base64')!==packed||bytes.includes(0)||
  createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==raw.sha)fail();
 const text=bytes.toString('utf8');
 if(!Buffer.from(text,'utf8').equals(bytes))fail();
 return text;
}
function sourceLines(text){return text.match(/[^\n]*\n|[^\n]+$/g)||[];}
function verifyPinnedDiff(patch,before,after){
 const fail=()=>{throw Error('UNVERIFIED_DIFF_CONTENT');};
 if([patch,before,after].some(x=>typeof x!=='string'||Buffer.byteLength(x)>MAX_BYTES))fail();
 const rows=patch.split('\n');if(rows.at(-1)==='')rows.pop();
 const original=sourceLines(before),output=[];
 let cursor=0,i=0,hunks=0;
 while(i<rows.length){
  const h=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/.exec(rows[i++]);
  if(!h)fail();
  const oldCount=Number(h[2]??1),newCount=Number(h[4]??1);
  const oldStart=Number(h[1])-(oldCount?1:0),newStart=Number(h[3])-(newCount?1:0);
  if(![oldCount,newCount,oldStart,newStart].every(Number.isSafeInteger)||
   oldStart<cursor||oldStart>original.length||newStart<0||oldCount+newCount===0)fail();
  for(let j=cursor;j<oldStart;j++)output.push(original[j]);
  if(output.length!==newStart)fail();
  const oldRows=[],newRows=[];let previous=null;
  while(i<rows.length&&!rows[i].startsWith('@@ ')){
   const row=rows[i++];
   if(row==='\\ No newline at end of file'){
    if(!previous)fail();
    if(previous!=='+' )oldRows[oldRows.length-1]=oldRows.at(-1).slice(0,-1);
    if(previous!=='-' )newRows[newRows.length-1]=newRows.at(-1).slice(0,-1);
    previous=null;continue;
   }
   const kind=row[0];if(![' ','+','-'].includes(kind))fail();
   if(kind!=='+')oldRows.push(row.slice(1)+'\n');
   if(kind!=='-')newRows.push(row.slice(1)+'\n');
   previous=kind;
  }
  if(oldRows.length!==oldCount||newRows.length!==newCount||
   oldRows.some((row,j)=>row!==original[oldStart+j]))fail();
  cursor=oldStart+oldCount;for(const row of newRows)output.push(row);hunks++;
 }
 for(let j=cursor;j<original.length;j++)output.push(original[j]);
 const expected=sourceLines(after);
 if(!hunks||output.length!==expected.length||output.some((row,j)=>row!==expected[j]))fail();
 return true;
}
module.exports={verifyPinnedDiff,decodeDiffSource,sourcePath};
