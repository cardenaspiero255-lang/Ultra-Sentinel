'use strict';
/* No checkout mutation, PR execution, network, approval or write operations. */
const {runMutationLab}=require('../packages/quality-gates/mutation-lab.cjs');
function main(){
 const result=runMutationLab();
 process.stdout.write(JSON.stringify(result)+'\n');
 if(result.failed>0)process.exitCode=1;
 return result;
}
if(require.main===module)main();
module.exports={main};
