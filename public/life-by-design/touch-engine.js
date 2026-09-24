(function(root){
'use strict';
const VERSION='2026-09-23-balanced-touches',L=root.LBDTouchLibrary;
const GROUPS=['A & W','B & E','D & O','H & V','C & K','F & G','M & X','N & R','S & U','P & L','T & J','I & Q'];
const INTENTS=['Reconnect and understand their plans','Follow through and offer useful help','Review changing priorities','Appreciate the relationship and look ahead'];
const SEGMENTS=[['advocates','A+ — Advocates','Strong personal relationships built on trust—people who send you business.'],['strong','A — Strong relationships','They know and trust you; stay personally connected.'],['warm','B — Warm relationships','Build familiarity through useful conversations and follow-through.'],['weak','C — Current clients and familiar contacts','Current clients and people familiar with you. Routine transaction updates do not replace relationship nurture.']];
const CATEGORIES=[['Market & Neighborhood Knowledge',[['quarterly_market','Quarterly market stats — mailer'],['market_review','Neighborhood Nurtures'],['neighborhood_change','Local developments'],['decision_brief','Understanding the market']]],['Homeownership Help',[['maintenance','Seasonal checklists — mailer'],['local_resources','Local resource guides — mailer'],['home_review','Annual home-value review invitation — mailer'],['resource_delivery','Useful homeowner resources']]],['Personal Relationships',[['handwritten','Handwritten / thinking-of-you cards'],['milestone_cards','Birthday / home-anniversary / milestone cards'],['text_video','Personal video texts'],['relationship_nurture','Personal relationship notes'],['preference_reconnection','Shared-interest video texts']]],['Client Events & Community',[['quarterly_events','Quarterly local events guide — mailer'],['monthly_events','Monthly local events guide — mailer'],['community_giving','Community giving invitations'],['community_experiences','Community and lifestyle activities'],['education_experiences','Educational gatherings']]],['Seasonal Cards & Guides',[['mothers_card','Mother’s Day cards'],['fathers_card','Father’s Day cards'],['july_card','Fourth of July cards'],['fireworks','Local fireworks schedule'],['holiday_card','Year-end holiday cards']]],['Real Estate Opportunities & Results',[['buyer_opportunity','Do you know a home for this buyer? — mailer'],['seller_opportunity','Do you know a buyer for this home? — mailer'],['client_results','Real client stories']]]];
const allowed=CATEGORIES.flatMap(c=>c[1].map(x=>x[0])),date=(y,m,d)=>new Date(Date.UTC(y,m,d)).toISOString().slice(0,10),add=(d,n)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),hash=s=>Array.from(String(s)).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
function source(gps,business,life){if(!gps?.plan||!gps.saved||gps.saved.signature!==JSON.stringify([gps.plan,gps.edits]))throw Error('Review and save your GPS before building your touch plan.');const src=root.LBDGPS.source(business,life);if(gps.plan.sourceFingerprint!==src.fingerprint||gps.plan.templateVersion!==root.LBDGPSTemplates.version)throw Error('Review the Economic Model, then refresh and save your GPS.');return{signature:gps.saved.signature,gps:gps.plan};}
function defaults(){return{cadence:36,advocates:10,strong:15,warm:50,weak:25,preferences:['quarterly_market','maintenance','buyer_opportunity','seller_opportunity','handwritten','text_video','local_resources','client_results'],newsletterFrequency:'monthly',newsletterChannel:'EMAIL',events:2,eventDates:[],seed:1};}
function dates(start,count){const[y,m]=start.split('-').map(Number),first=date(y,m-1,1),last=date(y,m+11,0),span=(Date.parse(last)-Date.parse(first))/86400000;return Array.from({length:count},(_,n)=>add(first,Math.round(65+(span-80)*(n+1)/(count+1))));}
function segmentCounts(i,mets){const exact=SEGMENTS.map(([k])=>mets*i[k]/100),a=exact.map(Math.floor),remaining=mets-a.reduce((n,x)=>n+x,0),order=exact.map((v,j)=>({j,f:v-a[j]})).sort((x,y)=>y.f-x.f||x.j-y.j);for(let j=0;j<remaining;j++)a[order[j%4].j]++;return Object.fromEntries(SEGMENTS.map(([k],j)=>[k,a[j]]));}
function validate(i,mets,start){
 if(!['monthly','quarterly'].includes(i.newsletterFrequency||'monthly')||!['EMAIL','MAILER'].includes(i.newsletterChannel||'EMAIL'))throw Error('Choose a newsletter frequency and delivery method.');
 if(i.preferences?.includes('monthly_events')&&i.preferences.includes('quarterly_events'))throw Error('Choose monthly or quarterly local event guides, not both.');
 if(![36,72].includes(i.cadence))throw Error('Choose 36 or 72 touches.');
 if(!Array.isArray(i.preferences)||i.preferences.some(x=>!allowed.includes(x))||new Set(i.preferences).size!==i.preferences.length)throw Error('Select at least one content preference.');
 if(SEGMENTS.some(([k])=>!Number.isFinite(i[k])||i[k]<0||i[k]>100)||Math.abs(SEGMENTS.reduce((n,[k])=>n+i[k],0)-100)>.001)throw Error('Your estimated segment percentages must total 100%.');
 if(!Number.isInteger(mets)||mets<0)throw Error('Review the database count in your GPS.');
 if(!Number.isInteger(i.events)||i.events<0||i.events>6)throw Error('Choose zero to six client events for the year.');
 if(!Array.isArray(i.eventDates)||i.eventDates.length!==i.events)throw Error('Choose a date for every event.');
 const[y,m]=start.split('-').map(Number),first=date(y,m-1,1),last=date(y,m+11,0),sorted=[...i.eventDates].sort();
 for(let j=0;j<sorted.length;j++){const d=sorted[j];if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d||d<add(first,60)||d>add(last,-7))throw Error('Event dates need 60 days for invitations and seven days for follow-up within your plan.');if(j&&Date.parse(d)-Date.parse(sorted[j-1])<40*86400000)throw Error('Space client events at least 40 days apart.');}
}
function content(r){return{libraryId:r.id,family:r.family,title:r.title,purpose:r.execution,nextAction:r.nextAction,prerequisites:r.prerequisites,fallback:r.fallback,audience:r.audience,conditional:r.trigger!=='Scheduled',channel:r.method};}
function pool(f){return L.filter(r=>r.scope==='database-nurture'&&r.family===f&&(f!=='market_review'||r.id==='T003'));}
function generate(input,src){
 const i={newsletterFrequency:'monthly',newsletterChannel:'EMAIL',...input,eventDates:input.eventDates?.length?[...input.eventDates]:dates(src.gps.input.start,input.events)},gps=src.gps;validate(i,gps.input.mets,gps.input.start);
 const[y,m]=gps.input.start.split('-').map(Number),slots=[],monthOf=d=>(+d.slice(0,4)-y)*12+(+d.slice(5,7)-m),push=(d,x)=>{slots.push({id:'s'+slots.length,date:d,month:monthOf(d),notes:'',...x});return slots.at(-1);};
 const quarters=INTENTS.map((intent,q)=>{const start=date(y,m-1+q*3,1),end=date(y,m+q*3+2,0),days=(Date.parse(end)-Date.parse(start))/86400000+1;return{intent,start,end,groups:[...GROUPS,'Flex: Y / Z, other names and follow-up'].map((letters,j)=>({letters,week:j+1,date:add(start,Math.floor(j*days/13))}))};});
 for(let month=0;month<12;month++){
  const cm=(m-1+month)%12;if(i.newsletterFrequency==='quarterly'&&cm%3!==0)continue;
  const hasMarket=i.preferences.includes('quarterly_market'),r=L.find(r=>r.id===(cm===0&&!hasMarket?'T001':['T031','T032','T033','T034','T037','T039','T040'][hash(i.seed+':news:'+month)%7]));
  push(date(y,m-1+month,5),{...content(r),kind:'newsletter',locked:true,channel:i.newsletterChannel,title:cm===0&&!hasMarket?'Your local year in review':(i.newsletterFrequency==='monthly'?'Monthly':'Quarterly')+' community and homeowner newsletter',purpose:r.execution+' Include useful community and homeowner information.'+(hasMarket?' Keep this complementary to your separate market-stats mailer; do not repeat that report.':' Include current local market context; January reviews the prior year.')+' Combine items into one newsletter and count once.',conditional:false});
 }
 const calls=quarters.map((q,n)=>push(add(q.start,14),{kind:'quarterly',locked:true,quarter:n,end:q.end,channel:'CALL',title:'Quarter '+(n+1)+': '+q.intent,purpose:'Have a meaningful personal conversation with every met in this quarter using the DTD letter rotation. Record the next step; an unanswered attempt is not a completed conversation.',nextAction:'What has changed, and how can I help?',audience:'Every met contact',fallback:'Reschedule respectfully if not reached.'}));
 for(const[n,d]of [...i.eventDates].sort().entries()){push(add(d,-60),{kind:'event-mailer',locked:true,eventId:n+1,channel:'MAILER',title:'Event '+(n+1)+': mailed save-the-date',purpose:'Mail your confirmed event date, location and RSVP details 60 days ahead. Give people time to plan; personalize the invitation.'});const save=add(d,-28),q=quarters.findIndex(q=>save>=q.start&&save<=q.end),call=calls[q],invite={title:'Event '+(n+1)+': save the date and catch up',purpose:'Call about your confirmed event on '+d+'. Catch up personally and invite them. Include written details in the monthly newsletter rather than counting the invitation twice.',nextAction:'Can you join us, and how have things been?'};
  if(call&&!call.eventId)Object.assign(call,invite,{eventId:n+1,date:save,month:monthOf(save)});else push(save,{...invite,purpose:'Text a personal reminder of the event on '+d+'. Save the relationship conversation for your DTD2 call.',kind:'event-invite',locked:true,channel:'TEXT',eventId:n+1});
  push(add(d,-7),{kind:'event-rsvp',locked:true,eventId:n+1,channel:'CALL',title:'Event '+(n+1)+': RSVP conversation',purpose:'Confirm interest and answer questions. If they already declined, use a useful personal catch-up instead of repeating the invitation.',nextAction:'Will you be able to join us?'});
  push(d,{kind:'event',locked:true,eventId:n+1,channel:'IN PERSON',title:'Event '+(n+1)+': client appreciation gathering',purpose:'Have a meaningful personal exchange at the event. Attendance alone is not a completed conversation.',nextAction:'What has been happening since we last caught up?',fallback:'Nonattendee: replace this with a missed-you personal call after the event; never count attendance that did not happen.'});
  push(add(d,4),{kind:'event-followup',locked:true,eventId:n+1,channel:'TEXT',title:'Event '+(n+1)+': thank you and follow-through',purpose:'Thank attendees for joining the gathering and reference a shared moment. Keep transaction questions and active opportunities in your separate client/lead follow-up.',nextAction:'What did you enjoy most about the gathering?',fallback:'Nonattendee: use a relevant homeownership resource later instead. If included in the missed-you call, count one and move another useful touch to a later welcome opportunity.'});
 }
 // Recurring mail and holiday choices have real dates, before the flexible content is allocated.
 const fixed=new Set(['quarterly_market','quarterly_events','monthly_events','mothers_card','fathers_card','july_card','holiday_card','fireworks','home_review']);
 const nthSunday=(year,month,n)=>{const first=new Date(Date.UTC(year,month,1)).getUTCDay();return date(year,month,1+(7-first)%7+7*(n-1));};
 for(const family of i.preferences.filter(f=>fixed.has(f))){const r=pool(family)[0];
  for(let month=0;month<12;month++){const year=y+Math.floor((m-1+month)/12),cm=(m-1+month)%12;let d;
   if(['quarterly_market','quarterly_events'].includes(family)&&cm%3===0)d=date(year,cm,family==='quarterly_market'?20:10);
   if(family==='monthly_events')d=date(year,cm,1);
   if(family==='mothers_card'&&cm===4)d=add(nthSunday(year,4,2),-7);
   if(family==='fathers_card'&&cm===5)d=add(nthSunday(year,5,3),-10);
   if(family==='july_card'&&cm===5)d=date(year,5,22);
   if(family==='fireworks'&&cm===5)d=date(year,5,15);
   if(family==='holiday_card'&&cm===11)d=date(year,11,1);
   if(family==='home_review'&&month===6)d=date(year,cm,12);
   if(d)push(d,{...content(r),kind:'content',locked:true});
  }
 }
 const flexible=i.preferences.filter(f=>!fixed.has(f)),available=Math.max(flexible.length,i.cadence-slots.length),used=new Set(),alloc=Object.fromEntries(i.preferences.map(k=>[k,slots.filter(s=>s.family===k&&s.kind==='content').length]));
 const limits={market_review:12,buyer_opportunity:4,seller_opportunity:4};
 for(let n=0;n<available;n++){
  const families=flexible.filter(k=>alloc[k]<(limits[k]||Math.min(12,pool(k).length)));if(!families.length)break;
  families.sort((a,b)=>alloc[a]-alloc[b]||hash(i.seed+a)-hash(i.seed+b));const family=families[0],candidates=pool(family).filter(r=>!used.has(r.id)||family==='market_review'),r=candidates[hash(i.seed+':'+family+':'+alloc[family])%candidates.length];used.add(r.id);alloc[family]++;
  let best,score=-Infinity;for(let month=0;month<12;month++)for(const day of [10,15,20,25,28]){const d=date(y,m-1+month,day);if(slots.some(s=>s.kind==='content'&&s.month===month&&s.family===family))continue;if(['buyer_opportunity','seller_opportunity'].includes(family)&&slots.some(s=>s.family===family&&Math.floor(s.month/3)===Math.floor(month/3)))continue;const distance=Math.min(...slots.map(s=>Math.abs(Date.parse(s.date)-Date.parse(d))/86400000)),value=distance-slots.filter(s=>s.month===month).length*.3;if(value>score){score=value;best=d;}}
  if(!best)break;push(best,{...content(r),kind:'content',locked:false});
 }
 slots.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 return{version:VERSION,sourceSignature:src.signature,input:i,blueprint:gps.blueprintName,start:gps.input.start,mets:gps.input.mets,goal:gps.goal,databaseGrowth:gps.database.monthly,slots,quarters,calls:gps.input.mets*4,weeklyCalls:Math.max(10,Math.ceil(gps.input.mets*4/gps.goal.weeks)),segments:segmentCounts(i,gps.input.mets),counts:{total:slots.length,quarterly:4,newsletters:slots.filter(s=>s.kind==='newsletter').length,eventAdditional:slots.filter(s=>s.kind.startsWith('event')).length,content:slots.filter(s=>s.kind==='content').length},channels:Object.fromEntries(['MAILER','EMAIL','TEXT VIDEO','TEXT','CALL','IN PERSON'].map(k=>[k,slots.filter(s=>s.channel===k).length])),allocation:Object.fromEntries(i.preferences.map(k=>[k,slots.filter(s=>s.kind==='content'&&s.family===k).length]))};
}
function alternatives(p,id){const s=p.slots.find(x=>x.id===id);if(!s||s.locked)return[];return pool(s.family).filter(r=>!p.slots.some(x=>x.libraryId===r.id)).slice(0,10);}
function replace(p,id,rid){const r=alternatives(p,id).find(r=>r.id===rid);if(!r)throw Error('Choose an available alternative for this touch.');return{...p,slots:p.slots.map(s=>s.id===id?{...s,...content(r),notes:''}:s)};}
root.LBDTouch={VERSION,GROUPS,INTENTS,SEGMENTS,CATEGORIES,defaults,dates,validate,segmentCounts,source,generate,alternatives,replace};
})(typeof window==='undefined'?globalThis:window);


