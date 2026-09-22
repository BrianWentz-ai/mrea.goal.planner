const crypto=require('crypto');
const esc=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
function utc(date,time,zone){
 const desired=Date.parse(date+'T'+time+':00Z');let guess=desired;
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let n=0;n<4;n++){const p=Object.fromEntries(fmt.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);if(actual===desired)return new Date(guess);guess+=desired-actual;}
 throw Error('A scheduled time falls in a daylight-saving clock change. Adjust that time before exporting.');
}
function fold(line){let out='',part='',size=0;for(const ch of line){const n=Buffer.byteLength(ch);if(size+n>75){out+=part+'\r\n';part=' ';size=1;}part+=ch;size+=n;}return out+part;}
function calendar(data){
 const o=data.calendar||{},start=o.start,end=o.end,zone=o.timeZone;
 const date=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!date(start)||!date(end)||end<start||(Date.parse(end)-Date.parse(start))/86400000>366)throw Error('Choose a calendar period of no more than one year.');
 try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format();}catch{throw Error('Choose a valid calendar time zone.');}
 if(!zone)throw Error('Choose your calendar time zone.');
 const excluded=new Set(String(o.excludeDates||'').split(/[\s,]+/).filter(Boolean));for(const d of excluded)if(!date(d))throw Error('Use YYYY-MM-DD for each date to skip.');
 const blocks=data.schedule.blocks.filter(b=>b.enabled),out=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//The Ascending Agent//Life by Design//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Life by Design Timeblocks','X-WR-TIMEZONE:'+esc(zone)];
 let count=0;
 for(let day=Date.parse(start);day<=Date.parse(end);day+=86400000){const d=new Date(day),iso=d.toISOString().slice(0,10),weekday=(d.getUTCDay()+6)%7;if(excluded.has(iso)||data.schedule.off?.includes(weekday))continue;
  for(const original of blocks.filter(b=>b.days.includes(weekday))){const b={...original,...original.dayTimes?.[weekday]};
   const uid=crypto.createHash('sha256').update(JSON.stringify([data.profile.email,b.id,iso])).digest('hex').slice(0,32)+'@life-by-design';
   out.push('BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(utc(iso,b.start,zone)),'DTEND:'+stamp(utc(iso,b.end,zone)),'SUMMARY:'+esc(b.name),'DESCRIPTION:'+esc('Life by Design planning block. '+(b.help||'')+' Move appointments when confirmed. This is an imported copy, not a synced feed.'),'CLASS:PRIVATE','TRANSP:OPAQUE','END:VEVENT');count++;
  }
 }
 if(!count)throw Error('There are no scheduled blocks in the selected dates.');
 out.push('END:VCALENDAR');return {content:out.map(fold).join('\r\n')+'\r\n',count};
}
module.exports={calendar,utc};
