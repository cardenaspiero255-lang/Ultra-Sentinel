'use strict';
const fs=require('node:fs'),path=require('node:path');
const {planRegressionBisect}=require('../packages/quality-gates/regression-investigator.cjs');
try{
 const file=process.argv[2];
 if(process.argv.length!==3||!path.isAbsolute(file))throw Error('ABSOLUTE_FILE_REQUIRED');
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<3||st.size>100000)throw Error('UNSAFE_FILE');
 process.stdout.write(JSON.stringify(planRegressionBisect(JSON.parse(fs.readFileSync(file,'utf8'))))+'\n');
}catch{process.stderr.write('REGRESSION_BISECT_INCOMPLETE_OR_INVALID\n');process.exitCode=1;}
