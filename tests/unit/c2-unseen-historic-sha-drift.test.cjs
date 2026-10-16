'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-first-measure.yml'),'utf8');
test('unseen evaluation is tied to SHA-frozen historical PR heads, not current mutable head',()=>{
 assert.match(yaml,/38842931678/);
 assert.match(yaml,/dce263a427b05c2fcb4fa2c52509ed6a82964772fe9c4f0bd526230c77809a59/);
 assert.match(yaml,/df2bd33416d652480e51994784e511fbcb7ede12/);
 assert.match(yaml,/gh api "\/repos\/\$repo\/compare\/\$base\.\.\.\$head"/);
 assert.doesNotMatch(yaml,/\.head\.sha == \$head/);
 assert.doesNotMatch(yaml,/\.changed_files == \$count/);
 assert.match(yaml,/\.merge_base_commit\.sha == \$base/);
 assert.match(yaml,/\.commits\[-1\]\.sha == \$head/);
});
test('current PR repository/owner remains verified without treating current revision as frozen',()=>{
 assert.match(yaml,/\.head\.repo\.id == 1375408706/);
 assert.match(yaml,/\.base\.repo\.id == 1375408706/);
 assert.match(yaml,/\.head\.repo\.owner\.id == 322222186/);
 assert.match(yaml,/\.base\.repo\.owner\.id == 322222186/);
 assert.match(yaml,/sourceKind == "FROZEN_TARGET_FILE_DIFF"/);
 assert.match(yaml,/wholePrCoverage == false/);
 assert.match(yaml,/tripleSPlusCertified == false/);
});
