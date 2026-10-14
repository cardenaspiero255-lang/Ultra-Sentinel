'use strict';
/**
 * Strict RFC3339 timestamp validation. No Date.parse normalization.
 * Consumers MUST call this on observedAt/expiresAt after schema validation;
 * expiry also requires comparison with a trusted current clock.
 */
const TIMESTAMP=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/;
function isStrictRfc3339(value){
 if(typeof value!=='string')return false;
 const m=TIMESTAMP.exec(value);
 if(!m)return false;
 const [,y,mo,d,h,mi,s,,zone,,oh,om]=m;
 const year=Number(y),month=Number(mo),day=Number(d);
 if(year<1||month<1||month>12||Number(h)>23||Number(mi)>59||Number(s)>59)return false;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 if(day<1||day>days[month-1])return false;
 if(zone!=='Z'&&(Number(oh)>14||Number(om)>59||(Number(oh)===14&&Number(om)!==0)))return false;
 return true;
}
module.exports={isStrictRfc3339};
