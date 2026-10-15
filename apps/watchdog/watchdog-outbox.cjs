'use strict';
// Local operator utility: inspect a pending, sanitized outbox and acknowledge
// only AFTER a separate durable notification service confirms delivery.
const {checkedState,pendingDigest,acknowledgeDelivery}=
 require('./watchdog-run-once.cjs');
function inspect(filename){
 const data=checkedState(filename);
 if(!data)throw Error('WATCHDOG_CHECKPOINT_MISSING');
 const pending=data.pendingAlerts;
 return Object.freeze({status:pending.length?'PENDING_ALERT_DELIVERY_REQUIRED':'NO_PENDING_ALERTS',
  pendingAlerts:pending,pendingDigest:pending.length?pendingDigest(pending):null,
  deliveryVerified:false,monitor24x7Deployed:false});
}
if(require.main===module){
 const stateFile=process.env.ULTRA_SENTINEL_WATCHDOG_STATE_FILE;
 try{
  const action=process.argv[2]||'inspect';
  if(action==='inspect')process.stdout.write(JSON.stringify(inspect(stateFile))+'\n');
  else if(action==='ack'){
   const digest=process.argv[3];
   const receipt=acknowledgeDelivery(stateFile,digest);
   process.stdout.write(JSON.stringify(receipt)+'\n');
  }else throw Error('INVALID_WATCHDOG_ACTION');
 }catch(e){
  const known=new Set(['WATCHDOG_CHECKPOINT_MISSING','NO_PENDING_ALERTS',
   'INVALID_DELIVERY_RECEIPT','DELIVERY_RECEIPT_MISMATCH',
   'STATE_DIRECTORY_UNAVAILABLE','STATE_DIRECTORY_UNSAFE',
   'STATE_FILE_UNSAFE','STATE_CORRUPTED','STATE_SCHEMA_MISMATCH',
   'INVALID_WATCHDOG_ACTION','WATCHDOG_ALREADY_RUNNING_OR_RECOVERY_REQUIRED']);
  process.stderr.write('WATCHDOG_OPERATOR_BLOCKED: '+
   (known.has(e?.message)?e.message:'INVALID_STATE_OR_INPUT')+'\n');
  process.exitCode=1;
 }
}
module.exports={inspect};
