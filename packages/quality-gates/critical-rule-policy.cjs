'use strict';
const CRITICAL_RULES=Object.freeze([
 'PRIVILEGED_UNTRUSTED_CHECKOUT','POTENTIAL_HARDCODED_SECRET',
 'SPEECH_REENTRANT_RETRY','UNSCOPED_COROUTINE','POTENTIAL_PRIVATE_LOG'
]);
function isCriticalRule(rule){return CRITICAL_RULES.includes(rule);}
module.exports={isCriticalRule};
