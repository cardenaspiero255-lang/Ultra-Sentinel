'use strict';
const fs=require('node:fs'),path=require('node:path');
const {bridge}=require('../packages/recovery/jarvis-termux-original-fix.cjs');
try {
 if(process.argv.length!==3)throw Error('ARGUMENT_COUNT');
 const root=fs.realpathSync(process.argv[2]);
 const result=bridge(root);
 fs.writeFileSync(path.join(root,'termux-sanitized-receipt.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write('PINNED_ORIGINAL_TERMUX_RED_GREEN_JUDGE_ROLLBACK_PASS\n');
} catch(e) {
 process.stderr.write('TERMUX_ORIGINAL_FIX_BRIDGE_BLOCKED: '+e.message+'\n');
 process.exitCode=1;
}
