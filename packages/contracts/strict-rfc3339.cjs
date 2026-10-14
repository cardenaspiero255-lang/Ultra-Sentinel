'use strict';
/**
 * Canonical RFC 3339 timestamp verification, including the 27 known positive UTC
 * leap seconds. No Date.parse() normalization: check calendar fields first.
 *
 * IERS Bulletin C / NIST records: https://www.nist.gov/pml/time-and-frequency-division/time-realization/leap-seconds
 * Update this allowlist when IERS announces a new leap second. Unknown future
 * leap seconds fail closed. Leap seconds at local offsets are shifted to UTC.
 *
 * Consumers MUST call this after JSON Schema validation on incident.observedAt
 * and repair-authorization.expiresAt; expiration must additionally be checked
 * with a trusted clock. This is not an authorization or cryptographic check.
 */
const TIMESTAMP=/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|([+-])(\d{2}):(\d{2}))$/;
const LEAP_DAYS=new Set([
 '1972-06-30','1972-12-31','1973-12-31','1974-12-31',
 '1975-12-31','1976-12-31','1977-12-31','1978-12-31',
 '1979-12-31','1981-06-30','1982-06-30','1983-06-30',
 '1985-06-30','1987-12-31','1989-12-31','1990-12-31',
 '1992-06-30','1993-06-30','1994-06-30','1995-12-31',
 '1997-06-30','1998-12-31','2005-12-31','2008-12-31',
 '2012-06-30','2015-06-30','2016-12-31'
]);
function isStrictRfc3339(value){
 if(typeof value!=='string')return false;
 const m=TIMESTAMP.exec(value);
 if(!m)return false;
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 const hour=Number(m[4]),minute=Number(m[5]),second=Number(m[6]);
 if(year<1||month<1||month>12||hour>23||minute>59||second>60)return false;
 const leapYear=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leapYear?29:28,31,30,31,30,31,31,30,31,30,31];
 if(day<1||day>days[month-1])return false;
 const offsetHours=m[10]===undefined?0:Number(m[10]);
 const offsetMins=m[11]===undefined?0:Number(m[11]);
 if(offsetHours>23||offsetMins>59)return false; // RFC 3339 time-numoffset, not timezone practice.
 if(second!==60)return true;
 if(year<1972)return false; // No IERS leap seconds then; Date.UTC(0..99) remaps to 1900..1999.
 // Date.UTC is used only after we validated all calendar components. Calculate
 // the real UTC instant *before* the extra second, with explicit offset.
 const offset=(m[9]==='-'?-1:1)*(offsetHours*60+offsetMins);
 const utc=Date.UTC(year,month-1,day,hour,minute,59)-offset*60_000;
 const before=new Date(utc).toISOString();
 return before.endsWith('T23:59:59.000Z')&&LEAP_DAYS.has(before.slice(0,10));
}
module.exports={isStrictRfc3339};
