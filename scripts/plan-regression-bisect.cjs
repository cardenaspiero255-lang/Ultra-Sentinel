'use strict';
const fs=require('node:fs'),path=require('node:path');
const {planRegressionBisect,planRegressionFromGit}=require('../packages/quality-gates/regression-investigator.cjs');
try{
 const file=process.argv[2];
 if(![3,4].includes(process.argv.length)||!path.isAbsolute(file))throw Error('ABSOLUTE_FILE_REQUIRED');
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<3||st.size>100000)throw Error('UNSAFE_FILE');
 const input=JSON.parse(fs.readFileSync(file,'utf8'));
 const result=process.argv.length===4?planRegressionFromGit({directory:process.argv[3],input}):planRegressionBisect(input);
 process.stdout.write(JSON.stringify(result)+'\n');
}catch{process.stderr.write('REGRESSION_BISECT_INCOMPLETE_OR_INVALID\n');process.exitCode=1;}
