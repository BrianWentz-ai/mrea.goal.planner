import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import '../public/life-by-design/business-engine.js';
import '../public/life-by-design/gps-templates.js';
import '../public/life-by-design/gps-engine.js';
import '../public/life-by-design/touch-library.js';
import '../public/life-by-design/touch-engine.js';
const E=globalThis.LBDBusiness;
export const WORKBOOK_VERSION='2026-09-22-v3-calendar';
const requireThat=(ok,msg)=>{if(!ok)throw new Error(msg);};
export function validatePlan(data){
 requireThat(data&&JSON.stringify(data).length<700000,'This plan is too large to send.');
 const originalCount=data.schedule?.blocks?.length;
 if(Array.isArray(data.schedule?.blocks))data={...data,schedule:{...data.schedule,blocks:data.schedule.blocks.flatMap(b=>Array.isArray(b.days)&&b.days.length?b.days.map(day=>({...b,...b.dayTimes?.[day],days:[day]})):[b])}};
 const {profile,life,business,gps,touch,schedule}=data;
 requireThat(profile&&typeof profile.name==='string'&&profile.name.trim()&&profile.name.length<=100,'Add your name first.');
 requireThat(typeof profile.email==='string'&&profile.email.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(profile.email),'Enter a valid delivery email.');
 const src=globalThis.LBDGPS.source(business,life);
 requireThat(gps?.saved?.signature===JSON.stringify([gps?.plan,gps?.edits])&&gps?.plan?.sourceFingerprint===src.fingerprint&&gps?.plan?.templateVersion===globalThis.LBDGPSTemplates.version,'Refresh and save your GPS before sending.');
 globalThis.LBDGPS.validate(gps.plan.input);
 requireThat(touch?.saved?.signature===JSON.stringify([touch?.plan,touch?.edits])&&touch?.plan?.sourceSignature===gps.saved.signature&&touch?.plan?.version===globalThis.LBDTouch.VERSION,'Refresh and save your touch plan before sending.');
 requireThat(Array.isArray(touch.plan.slots)&&[36,72].includes(touch.plan.slots.length),'Review your complete touch calendar.');
 requireThat(schedule?.savedAt&&schedule.sourceKey===gps.saved.signature&&Array.isArray(schedule.blocks)&&originalCount<=420,'Save your current weekly routine before sending.');
 const active=schedule.blocks.filter(b=>b.enabled),minute=t=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)?Number(t.slice(0,2))*60+Number(t.slice(3)):NaN;
 for(const b of active){requireThat(typeof b.name==='string'&&b.name.length<=100&&b.days?.length&&b.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6),'Review your weekly routine blocks.');let a=minute(b.start),z=minute(b.end);requireThat(a>=0&&z<=1440&&z>a&&a%15===0&&z%15===0,'Resolve invalid times in your routine.');for(const d of b.days){requireThat(!schedule.off?.includes(d),'Resolve routine blocks on a day off.');for(const o of active)if(o!==b&&o.days.includes(d))requireThat(!(a<minute(o.end)&&minute(o.start)<z),'Resolve overlapping routine blocks before sending.');}}
 requireThat(gps.plan.priorities?.length===3,'Review your GPS priorities.');
 for(const p of gps.plan.priorities){requireThat(p.strategies?.length===5,'Review your GPS strategies.');for(const s of p.strategies)requireThat(typeof(gps.edits[s.id]??s.text)==='string'&&(gps.edits[s.id]??s.text).length<=4000,'A GPS strategy is too long.');}
 return {...data,src};
}
export async function workbook(raw){
 const d=validatePlan(raw),p=d.src.plan,g=d.gps.plan,t=d.touch.plan;
 const pdf=await PDFDocument.create();pdf.setTitle('My Complete Business Plan');pdf.setAuthor('The Ascending Agent');
 const normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),title=await pdf.embedFont(StandardFonts.TimesRoman);
 const color=h=>rgb(parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4),16)/255),ink=color('0e2433'),green=color('23765f'),muted=color('64747c'),soft=color('edf4ef'),gold=color('c7a44b');
 const clean=s=>String(s??'').replace(/\*\*/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/→/g,' to ').replace(/[^\x20-\x7e\xa0-\xff\n]/g,' ');
 let page,y=0,section='';
 const draw=(s,x,yy,size=10,font=normal,c=ink)=>page.drawText(clean(s),{x,y:792-yy-size,size,font,color:c});
 function newPage(name){section=name.replace(/(?: \/ continued)+$/,'');page=pdf.addPage([612,792]);page.drawRectangle({x:42,y:733,width:30,height:30,color:ink});draw('L',51,27,23,title,gold);draw('Life by Design',84,29,12,bold);draw('THE ASCENDING AGENT',84,48,7,normal,muted);draw(name.toUpperCase(),48,82,9,bold,green);y=106;}
 function lines(s,width=516,size=11,font=normal){const result=[];for(const para of clean(s).split('\n')){let line='';for(const word of para.split(/\s+/)){if(font.widthOfTextAtSize((line?line+' ':'')+word,size)>width&&line){result.push(line);line='';}if(font.widthOfTextAtSize(word,size)>width){for(const ch of word){if(font.widthOfTextAtSize(line+ch,size)>width){result.push(line);line='';}line+=ch;}}else line+=(line?' ':'')+word;}result.push(line);}return result;}
 function room(h){if(y+h>719)newPage(section+' / continued');}
 function paragraph(s,size=11,font=normal,c=ink){for(const l of lines(s,516,size,font)){room(size*1.35);draw(l,48,y,size,font,c);y+=size*1.35;}y+=6;}
 function heading(s){paragraph(s,23,title);y+=4;}
 function row(label,value){const ls=lines(label,286,10),vs=lines(value,200,10,bold),h=Math.max(ls.length,vs.length)*15+17;room(h);ls.forEach((v,i)=>draw(v,58,y+7+i*15,10));vs.forEach((v,i)=>draw(v,354,y+7+i*15,10,bold));y+=h;page.drawLine({start:{x:48,y:792-y},end:{x:564,y:792-y},thickness:.5,color:soft});}
 function table(headers,rows,widths){
  const start=48;
  function cells(values,isHeader=false){const all=values.map((v,i)=>lines(v,widths[i]-16,10,isHeader?bold:normal)),h=Math.max(...all.map(a=>a.length))*13.5+12;
   if(y+h>719){newPage(section+' / continued');if(!isHeader)cells(headers,true);}
   if(isHeader)page.drawRectangle({x:start,y:792-y-h,width:516,height:h,color:soft});
   let x=start;all.forEach((a,i)=>{a.forEach((v,j)=>draw(v,x+8,y+6+j*13.5,10,isHeader?bold:normal,isHeader?green:ink));x+=widths[i];});y+=h;
   page.drawLine({start:{x:start,y:792-y},end:{x:564,y:792-y},thickness:.5,color:soft});
  }cells(headers,true);rows.forEach(r=>cells(r));y+=8;
 }
 function touchParts(x){return [[x.date+' | '+x.channel+' | '+x.title,11,bold,green],[x.purpose,10,normal,ink],...(x.nextAction?[['Conversation starter: '+x.nextAction,10,normal,ink]]:[]),...(x.prerequisites?[['Use when: '+x.prerequisites,10,normal,muted]]:[]),...(x.fallback?[['Alternative: '+x.fallback,10,normal,muted]]:[]),...(x.notes?[['My notes: '+x.notes,10,normal,ink]]:[])];}
 function partHeight(parts){return parts.reduce((h,[s,size,font])=>h+lines(s,516,size,font).length*size*1.35+6,0);}
 function hero(label,value,detail){room(100);page.drawRectangle({x:48,y:792-y-100,width:516,height:100,color:ink});draw(label,65,y+13,9,bold,gold);draw(value,65,y+35,30,bold,rgb(1,1,1));draw(detail,65,y+78,10,normal,rgb(.8,.86,.86));y+=121;}
 const money=n=>'$'+Math.round(Number(n)||0).toLocaleString('en-US'),n=x=>Math.ceil(x).toLocaleString('en-US');
 newPage('01 / My Life by Design');heading('Build a business that funds your life by design.');paragraph('Prepared for '+d.profile.name,14,bold);paragraph(d.profile.email,10,normal,muted);paragraph('12-month plan beginning '+g.input.start+' | '+g.blueprintName,10);const life=E.lifeTarget(d.life);if(life.error){paragraph('Your Economic Model uses a manually entered owner income goal. No saved Life by Design breakdown was supplied.');hero('OWNER INCOME GOAL',money(d.business.manualGoal),'Before personal taxes');}else{hero('ANNUAL LIFE BY DESIGN TARGET',money(life.value),money(life.value/12)+' per month, including the tax reserve');const labels={foundation:'Living expenses',security:'Safety + freedom',lifestyle:'Lifestyle',impact:'Giving',future:'Future goals'};for(const [key,label]of Object.entries(labels)){let a=(d.life.sections[key]||[]).reduce((sum,x)=>sum+Number(String(x.amount||0).replace(/,/g,''))*(x.frequency==='annual'?1:12),0);row(label,money(a/12)+' / month | '+money(a)+' / year');}row('Tax reserve',money(life.taxes/12)+' / month | '+money(life.taxes)+' / year');paragraph('Planning estimates only. Confirm tax assumptions with your tax professional.',10,normal,muted);}
 row('Business goal',money(p.gci)+' GCI | '+n(p.sales)+' closings');paragraph(d.src.weeks+' working weeks in your Economic Model',10,normal,muted);
 newPage('02 / Economic Model');heading('Your Economic Model for Your Business Goal');row('Owner income before personal taxes',money(p.profit));row('Cost of sales',money(p.cos));row('Operating expenses',money(p.opex));row('Annual gross commission income',money(p.gci));row('Estimated volume',money(p.volume));y+=12;table(['Production needed','Seller Business','Buyer Business'],[['Closed units needed','Sales'],['Contracts needed','Contracts'],['Signed agreements needed','Signed'],['Appointments needed / year','Appointments'],['Appointments needed / month','Monthly'],['Appointments needed / working week','Weekly']].map(([label,key])=>[label,n(p['seller'+key]),n(p['buyer'+key])]),[256,130,130]);paragraph('Monthly goals are rounded planning targets, not a seasonal forecast.',10,normal,muted);
 newPage('03 / GPS Business Plan');heading('Your Custom GPS');paragraph('Take '+g.goal.listings+' listings and close '+g.goal.closings+' total units for '+money(g.goal.gci)+' GCI and '+money(g.goal.profit)+' owner profit before personal taxes.');for(const [i,pr]of g.priorities.entries()){room(100);paragraph('PRIORITY '+(i+1),9,bold,green);paragraph(pr.title,18,title);for(const [j,s]of pr.strategies.entries()){paragraph((j+1)+'. '+s.title,11,bold);paragraph(d.gps.edits[s.id]??s.text,10);}}paragraph('Met database: '+g.input.mets+' | Goal: '+g.database.target+' | Add '+g.database.monthly+' mets per month',10,bold,green);
 newPage('04 / Database Touch Plan');heading('Your '+t.input.cadence+'-Touch Relationship Plan');paragraph(t.mets+' met contacts | Starts '+t.start);paragraph('Four personal calls to every met each year, using the DTD2 rotation. Honor each contact\'s communication preferences.');table(['DTD2 group',...t.quarters.map((q,i)=>'Quarter '+(i+1))],t.quarters[0].groups.map((group,j)=>[j===12?'Flex: Y / Z, other names and follow-up':group.letters,...t.quarters.map(q=>q.groups[j].date)]),[156,90,90,90,90]);
 newPage('04 / Touch Calendar');heading('Your relationship touch calendar');
 for(let month=0;month<12;month++){
  const slots=t.slots.filter(s=>s.month===month);if(!slots.length)continue;
  const first=touchParts({...slots[0],...d.touch.edits[slots[0].id]});room(Math.min(550,partHeight(first)+36));
  const [year,startMonth]=t.start.split('-').map(Number);const monthLabel=new Date(Date.UTC(year,startMonth-1+month,1)).toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
  paragraph(monthLabel,17,title,green);
  for(const slot of slots){const x={...slot,...d.touch.edits[slot.id]},parts=touchParts(x);room(Math.min(580,partHeight(parts)+8));for(const args of parts)paragraph(...args);y+=6;}
 }
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];const clock=s=>{let[h,m]=s.split(':').map(Number);return(h%12||12)+':'+String(m).padStart(2,'0')+' '+(h<12?'AM':'PM');};newPage('05 / Weekly Business Routine');heading('Give your goals a place on the calendar.');paragraph(g.goal.weeklyAppointments+' appointment slots needed per working week. Move placeholders as actual appointments are scheduled.');for(let i=0;i<7;i++){room(70);paragraph(days[i]+(d.schedule.off.includes(i)?' - Day off':''),16,title);const blocks=d.schedule.blocks.filter(b=>b.enabled&&b.days.includes(i)).sort((a,b)=>a.start.localeCompare(b.start));for(const b of blocks)row(clock(b.start)+' - '+clock(b.end),b.name);if(!blocks.length)paragraph('No scheduled blocks.',10,normal,muted);}if(d.schedule.personal)paragraph('Personal commitments: '+d.schedule.personal,10);
 newPage('06 / Annual and Monthly 4-1-1');heading('Your annual and monthly goals');paragraph('Month: __________________________');
 table(['Goal category','Annual goal','Monthly goal'],[
 ['Leads generated',n(p.sales*10),n(p.sales*10/12)],
 ['Listings / signed agreements',n(p.sellerSigned+p.buyerSigned),E.up(p.sellerSigned/d.src.weeks)+E.up(p.buyerSigned/d.src.weeks)],
 ['Contracts written',n(p.sellerContracts+p.buyerContracts),p.sellerContractsMonthly+p.buyerContractsMonthly],
 ['Contracts closed',n(p.sales),E.up(p.sellerSales/d.src.weeks)+E.up(p.buyerSales/d.src.weeks)],
 ['Money / GCI',money(p.gci),money(p.gci/12)],
 ['People','________________','________________'],['Systems and tools','________________','________________'],['Personal education','________________','________________']], [236,140,140]);
 paragraph('Monthly figures are planning averages; choose priorities from your GPS.',10,normal,muted);paragraph('My three monthly priorities',17,title);for(let i=1;i<=3;i++){row('Priority '+i,'________________________');y+=20;}
 newPage('07 / Weekly 4-1-1 Commitments');heading('Turn priorities into commitments.');paragraph('Month: __________________________');paragraph('Use your GPS priorities and weekly routine to decide what to complete each week.');
 for(let i=1;i<=5;i++){paragraph('Week '+i,12,bold,green);for(let j=0;j<2;j++){page.drawLine({start:{x:48,y:792-y-18},end:{x:564,y:792-y-18},thickness:.5,color:muted});y+=27;}y+=12;}
 newPage('08 / Weekly Four Conversations');heading('Know your goal. See your progress.');paragraph('Week / dates: __________________________');const rows=[['Appointments',p.weekly],['Listings + buyer commitments',E.up(p.sellerSigned/d.src.weeks)+E.up(p.buyerSigned/d.src.weeks)],['Closed units',E.up(p.sellerSales/d.src.weeks)+E.up(p.buyerSales/d.src.weeks)],['GCI',money(p.gci/d.src.weeks)]];const xx=[48,258,328,408,494];for(let i=0;i<5;i++)draw(['Weekly result','Goal','Actual','% of goal','GAP'][i],xx[i],y,10,bold,green);y+=32;for(const r of rows){draw(r[0],48,y,10);draw(String(r[1]),258,y,10,bold);for(let i=2;i<5;i++)draw('________',xx[i],y,10,normal,muted);y+= sixty();}paragraph('Percent of Goal = Actual / Goal x 100. GAP = Goal - Actual. A negative gap means ahead of goal. For a zero goal, write N/A.',10,normal,muted);paragraph('What will I adjust next week?',18,title);row('','________________________________');
 function sixty(){return 60;}
 for(const [i,pg]of pdf.getPages().entries()){page=pg;draw('Life by Design | '+d.profile.name,48,756,8,normal,muted);draw((i+1)+' / '+pdf.getPageCount(),520,756,8,normal,muted);}
 return Buffer.from(await pdf.save());
}
