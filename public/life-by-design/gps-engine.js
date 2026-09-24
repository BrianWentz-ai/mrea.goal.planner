(function(root){
'use strict';
const E=typeof module!=='undefined'&&module.exports?require('./business-engine.js'):root.LBDBusiness;
const T=typeof module!=='undefined'&&module.exports?require('./gps-templates.js'):root.LBDGPSTemplates;
function source(business,life){
 if(!business||business.version!==4||!business.saved)throw Error('Review and save your Economic Model before building your GPS.');
 const goal=business.goalMode==='manual'?business.manualGoal:E.lifeTarget(life).value;
 if(!goal)throw Error('Your Life by Design target needs to be reviewed and saved first.');
 const fingerprint=JSON.stringify({...business,page:0,saved:null,activeGoal:goal});
 if(fingerprint!==business.saved.fingerprint)throw Error('Your Economic Model has changed. Review and save it before updating your GPS.');
 const result=E.solve(business,goal);if(result.error)throw Error(result.error);
 return {fingerprint,plan:result.plan,weeks:business.weeks};
}
function validate(input){
 if(!T.templates.some(t=>t.id===input.blueprint))throw Error('Choose your Business Blueprint.');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.start||'')||+input.start.slice(0,4)<2000||+input.start.slice(0,4)>2100)throw Error('Choose a valid starting month between 2000 and 2100.');
 if(!Number.isInteger(input.mets)||input.mets<0||input.mets>1000000)throw Error('Enter your current met database size as a whole number, including zero.');
 if(!Number.isFinite(input.returnRate)||input.returnRate<1||input.returnRate>10)throw Error('Choose an annual database return between 1% and 10%.');
 if(input.relationshipStage&&!['new','developing','mature'].includes(input.relationshipStage))throw Error('Choose your relationship development stage.');
 if(!Number.isInteger(input.minutes)||input.minutes<15||input.minutes>480)throw Error('Enter daily lead-generation time between 15 and 480 minutes.');
}
function generate(input,src){
 validate(input);const p=src.plan,template=T.templates.find(t=>t.id===input.blueprint);
 const target=E.up(p.sales/(input.returnRate/100)),gap=Math.max(0,target-input.mets),monthly=E.up(gap/12),weeklyLeads=E.up(p.sales*10/src.weeks);
 const replacements={'daily lead-generation minutes':input.minutes,'appointments needed per working week':p.weekly,'weekly lead commitment':weeklyLeads,'monthly met additions':monthly};
 const fill=text=>text.replace(/\[([^\]]+)\]/g,(match,key)=>Object.hasOwn(replacements,key)?String(replacements[key]):match);
 const priorities=[...T.shared,template].map((item,i)=>({title:item.title,strategies:item.strategies.map(s=>({id:`p${i+1}s${s.number}`,title:s.title,text:fill(s.text)}))}));
 return {version:1,templateVersion:T.version,input:{...input},blueprintName:template.name,sourceFingerprint:src.fingerprint,goal:{listings:E.up(p.sellerSigned),closings:p.sales,gci:p.gci,profit:p.profit,weeks:src.weeks,weeklyAppointments:p.weekly,weeklySellerAppointments:p.sellerWeekly,weeklyBuyerAppointments:p.buyerWeekly},database:{target,gap,monthly,existingCapacity:input.mets*input.returnRate/100,weeklyCalls:Math.max(10,E.up(input.mets*4/src.weeks))},weeklyLeads,priorities};
}
const api={source,validate,generate};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.LBDGPS=api;
})(typeof window==='undefined'?globalThis:window);
