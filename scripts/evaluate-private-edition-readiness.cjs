'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {assessPrivateEditionReadiness}=
 require('../packages/quality-gates/private-edition-readiness.cjs');
try{
 const file=process.argv[2];
 if(process.argv.length!==3||typeof file!=='string'||!path.isAbsolute(file))
  throw Error('ABSOLUTE_FILE_REQUIRED');
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  st.size>100000||st.size<3)throw Error('INVALID_FILE');
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 process.stdout.write(JSON.stringify(assessPrivateEditionReadiness(data))+'\n');
}catch{
 process.stderr.write('PRIVATE_READINESS_INVALID_OR_INCOMPLETE\n');
 process.exitCode=1;
}
