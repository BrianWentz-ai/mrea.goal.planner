(function(root){
'use strict';
const VERSION='2026-09-20-test-v1';
const GROUPS=['A & W','B & E','D & O','H & V','C & K','F & G','M & X','N & R','S & U','P & L','T & J','I & Q'];
const INTENTS=['Relationship Reset','Value Calibration','Opportunity Awareness','Advocacy / Referral'];
const THEMES=['Goals and plans for the year','A useful local resource','Home care and seasonal needs','What matters in your neighborhood','Understanding your property options','Midyear plans and priorities','Local people and community connections','Planning a future move','Preparing for the next season','Homeownership questions answered','Gratitude and personal connection','Looking ahead together'];
const SEGMENTS=[['advocates','A+ — Advocates','Deep trust, active referrers and a strong personal connection. Thank them personally and offer thoughtful introductions.'],['strong','A — Strong relationships','High trust; likely to refer when asked appropriately. Connect the topic to their goals and interests.'],['warm','B — Warm relationships','They know you, but the relationship is still developing. Ask useful questions and follow through on what you learn.'],['weak','C — Familiar contacts','They may remember you, but you have little recent conversation history. Reintroduce your connection and discover what would be useful.']];
const date=(year,month,day)=>new Date(Date.UTC(year,month,day)).toISOString().slice(0,10);
function source(gps,business,life){
 if(!gps?.plan||!gps.saved||gps.saved.signature!==JSON.stringify([gps.plan,gps.edits]))throw Error('Review and save your GPS before building your touch plan.');
 const src=root.LBDGPS.source(business,life);
 if(gps.plan.sourceFingerprint!==src.fingerprint||gps.plan.templateVersion!==root.LBDGPSTemplates.version)throw Error('Your GPS needs refreshed targets. Review the Economic Model, then refresh and save your GPS.');
 return {signature:gps.saved.signature,gps:gps.plan};
}
function defaults(){return {cadence:36,segmented:false,advocates:0,strong:0,warm:0,weak:0,channels:['email'],events:0,callMinutes:10,workdays:5};}
function validate(input,mets){
 if(![36,72].includes(input.cadence))throw Error('Choose 36 or 72 touches.');
 if(!Array.isArray(input.channels)||!input.channels.length||new Set(input.channels).size!==input.channels.length||input.channels.some(c=>!['email','mail','text'].includes(c)))throw Error('Choose at least one way to deliver your regular touches.');
 for(const [key] of SEGMENTS)if(!Number.isInteger(input[key])||input[key]<0||input[key]>1000000)throw Error('Enter whole, non-negative segment counts.');
 if(input.segmented&&SEGMENTS.reduce((n,[key])=>n+input[key],0)!==mets)throw Error('Your segment counts must add up to the '+mets+' mets saved in your GPS.');
 if(!Number.isInteger(input.events)||input.events<0||input.events>12)throw Error('Enter between 0 and 12 existing events for the year.');
 if(!Number.isFinite(input.callMinutes)||input.callMinutes<1||input.callMinutes>60)throw Error('Allow 1–60 minutes per planned call.');
 if(!Number.isInteger(input.workdays)||input.workdays<1||input.workdays>7)throw Error('Choose 1–7 planned workdays per week.');
}
function generate(input,src){
 const gps=src.gps,mets=gps.input.mets;validate(input,mets);const [y,m]=gps.input.start.split('-').map(Number),perMonth=input.cadence/12,slots=[];let channelIndex=0;
 for(let month=0;month<12;month++)for(let i=0;i<perMonth;i++){
  const call=month%3===0&&i===0,quarter=Math.floor(month/3),day=perMonth===3?[5,15,25][i]:[3,8,13,18,23,28][i],channel=call?'call':input.channels[channelIndex++%input.channels.length];
  slots.push({id:'m'+month+'t'+i,month,quarter,date:date(y,m-1+month,call?1:day),end:call?date(y,m+month+2,0):null,channel,title:call?INTENTS[quarter]+' call':THEMES[month]+(i%2?' — share a useful resource':' — invite a personal response'),purpose:call?['Reconnect, ask what has changed, and record a useful next step.','Learn which information or support matters to this person.','Explore upcoming needs and offer relevant help or introductions.','Thank them for the relationship and invite an appropriate introduction.'][quarter]:'Relate this topic to what you know about the person. Offer one useful takeaway and a natural reason to respond.',audience:'Every met contact',notes:''});
 }
 // Existing events replace ordinary slots; they never increase the annual count.
 for(let i=0;i<input.events;i++){const month=Math.floor(i*12/input.events),slot=slots.filter(s=>s.month===month&&s.channel!=='call').at(-1);slot.channel='event';slot.title='Existing client or community event';slot.purpose='Invite contacts for whom the event is relevant. For everyone else, substitute a useful personal update in this same slot. Count it once, not as an extra touch.';}
 const calls=mets*4,weeklyCalls=Math.max(10,Math.ceil(calls/gps.goal.weeks));
 const prep={email:30,mail:60,text:mets*2,event:120};
 const annualMinutes=calls*input.callMinutes+slots.filter(s=>s.channel!=='call').reduce((n,s)=>n+prep[s.channel],0);
 const quarters=INTENTS.map((intent,q)=>{const start=date(y,m-1+q*3,1),end=date(y,m+q*3+2,0),days=(Date.parse(end)-Date.parse(start))/86400000+1;return {intent,start,end,groups:[...GROUPS,'Flex: Y / Z, other names and follow-up'].map((letters,i)=>({letters,week:i+1,date:new Date(Date.parse(start)+Math.floor(i*days/13)*86400000).toISOString().slice(0,10)}))};});
 return {version:VERSION,sourceSignature:src.signature,input:{...input},blueprint:gps.blueprintName,start:gps.input.start,mets,goal:gps.goal,databaseGrowth:gps.database.monthly,slots,quarters,calls,weeklyCalls,annualMinutes,weeklyHours:annualMinutes/gps.goal.weeks/60,availableHours:gps.input.minutes*input.workdays/60,counts:{calls:4,regular:slots.filter(s=>!['call','event'].includes(s.channel)).length,events:input.events,total:slots.length}};
}
root.LBDTouch={VERSION,GROUPS,INTENTS,SEGMENTS,defaults,validate,source,generate};
})(typeof window==='undefined'?globalThis:window);
