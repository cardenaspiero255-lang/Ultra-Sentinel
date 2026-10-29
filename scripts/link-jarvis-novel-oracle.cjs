'use strict';
/**
 * No client-supplied paths, no shell, no executable code. Called ONLY after
 * trusted workflow has run the pinned scanner, Kotlin JVM oracle, Judge and
 * rollback in one job. The receipt is consistency evidence, not authorization.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {linkPinnedNovelOracle}=
 require('../packages/investigation/pinned-novel-oracle-link.cjs');
const fail=()=>{throw Error('PINNED_NOVEL_ORACLE_LINK_BLOCKED');};
function get(root,name,max){
 const file=path.join(root,name),st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
    st.size<3||st.size>max)fail();
 const bytes=fs.readFileSync(file),txt=bytes.toString('utf8');
 if(!Buffer.from(txt,'utf8').equals(bytes)||txt.includes('\0'))fail();
 return txt;
}
function main(root){
 if(typeof root!=='string'||!path.isAbsolute(root))fail();
 const real=fs.realpathSync(root);
 const allowed=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean)
  .map(dir=>fs.realpathSync(dir));
 if(!fs.statSync(real).isDirectory()||
    !allowed.some(dir=>real.startsWith(dir+path.sep)))fail();
 const source=get(real,'original.kt',12000);
 const advisory=JSON.parse(get(real,'novel-kotlin-receipt.json',15000));
 const oracle=JSON.parse(get(real,'termux-sanitized-receipt.json',15000));
 const result=linkPinnedNovelOracle({source,advisory,oracle});
 if(result.status!=='PINNED_ADVISORY_ORACLE_RECEIPTS_CONSISTENT')fail();
 fs.writeFileSync(path.join(real,'novel-oracle-linked-receipt.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write('PINNED_JARVIS_ADVISORY_AND_ORIGINAL_JVM_RECEIPTS_LINKED\n');
}
if(require.main===module){
 try{if(process.argv.length!==3)fail();main(process.argv[2]);}
 catch{process.stderr.write('PINNED_NOVEL_ORACLE_LINK_BLOCKED\n');process.exitCode=1;}
}
module.exports={main};
