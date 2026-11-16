'use strict';
// RED: admission must be implemented without invoking the target.
const pending=()=>{throw Error('JVM_ABI_ADMISSION_REFUSED');};
module.exports=Object.freeze({descriptor:pending,parameters:pending,parseJavap:pending,classify:pending});
