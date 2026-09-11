/* MREA-based planning engine. Source: The Millionaire Real Estate Agent,
 * 2004, figures 18-19 (p.157) and figure 34 (p.183).
 * Staffing presets, current dollar assumptions and rounding are app adaptations.
 */
(function(root){
'use strict';
const BASE={gci:180000,cos:21000,salary:20000,lead:18000,fixed:[
 ['occupancy','Office / occupancy',1500,'Workspace, rent and utilities. Brokerage desk fees belong in cost of sales.'],
 ['technology','Technology',4000,'CRM, website, software and business subscriptions.'],
 ['phone','Phone / communications',2600,'Business phone and communication services only.'],
 ['supplies','Supplies',1800,'Office supplies, postage and administrative materials.'],
 ['education','Education / dues',1800,'Training, coaching, MLS, association dues and licensing.'],
 ['equipment','Equipment',3600,'A monthly allowance for computers, devices and equipment.'],
 ['auto','Auto / insurance',6000,'Business-only vehicle and insurance costs. Do not duplicate your household budget.']
]};
const finite=(v,min=0,max=1e10)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const up=v=>v<=1e-10?0:Math.ceil(v-1e-9);
function defaults(target=100000){
 const seed=(target>0?target:100000)/.665;
 return {version:1,page:0,level:1,support:'buyer',goalMode:'life',manualGoal:100000,
 sellerCommission:10000,buyerCommission:10000,sellerShare:50,weeks:48,
 sellerSign:80,sellerClose:65,buyerSign:65,buyerClose:80,
 admin1:4000,admin2:4000,supportShare:100,buyerSplit:50,showingMode:'closing',showingFee:500,showingMonthly:3000,
 cosMode:'allowance',cosPercent:BASE.cos/BASE.gci*100,
 brokerPercent:BASE.cos/BASE.gci*100,brokerCapEnabled:false,brokerCap:21000,
 franchisePercent:0,franchiseCapEnabled:false,franchiseCap:3000,deskMonthly:0,
 referralPercent:0,referralShare:0,leadPercent:10,
 fixed:BASE.fixed.map(([id,name,cost,hint])=>({id,name,hint,monthly:cost/BASE.gci*seed/12,custom:false})),
 variable:[{id:'tc',name:'Transaction coordinator',amount:0,basis:'closing',scope:'all'},
 {id:'photos',name:'Listing photos / preparation',amount:0,basis:'signed',scope:'seller'},
 {id:'gifts',name:'Closing gifts',amount:0,basis:'closing',scope:'all'}],saved:null};
}
function validate(s,target){
 if(!finite(target,0,1e10))return 'Enter a valid annual income goal.';
 if(![1,2,3,4].includes(s.level))return 'Choose a staffing level.';
 if(!['buyer','showing'].includes(s.support))return 'Choose buyer support.';
 for(const k of ['sellerCommission','buyerCommission'])if(!finite(s[k],1,1e7))return 'Commission per side must be greater than $0.';
 for(const k of ['sellerSign','sellerClose','buyerSign','buyerClose'])if(!finite(s[k],1,100))return 'Conversion rates must be between 1% and 100%.';
 for(const k of ['sellerShare','supportShare','buyerSplit','cosPercent','brokerPercent','franchisePercent','referralPercent','referralShare','leadPercent'])if(!finite(s[k],0,100))return 'Percentages must be between 0% and 100%.';
 for(const k of ['admin1','admin2','showingFee','showingMonthly','brokerCap','franchiseCap','deskMonthly'])if(!finite(s[k]))return 'Costs must be valid, nonnegative amounts.';
 if(!finite(s.weeks,1,52))return 'Working weeks must be between 1 and 52.';
 if(!['allowance','detail'].includes(s.cosMode)||!['closing','monthly'].includes(s.showingMode))return 'Check your cost settings.';
 if(!Array.isArray(s.fixed)||!Array.isArray(s.variable)||s.fixed.length>1000||s.variable.length>1000)return 'Check your expense categories.';
 for(const x of s.fixed)if(!x||!finite(x.monthly)||typeof x.name!=='string')return 'Check your monthly operating expenses.';
 for(const x of s.variable)if(!x||!finite(x.amount)||!['all','seller','buyer'].includes(x.scope)||!['closing','signed','percent'].includes(x.basis)||(x.basis==='percent'&&x.amount>100))return 'Check your variable expenses and percentages.';
 return null;
}
function breakdown(s,gci){
 const sellerGci=gci*s.sellerShare/100,buyerGci=gci-sellerGci;
 const sellerClosed=sellerGci/s.sellerCommission,buyerClosed=buyerGci/s.buyerCommission;
 const sellerSigned=sellerClosed/(s.sellerClose/100),buyerSigned=buyerClosed/(s.buyerClose/100);
 const sellerAppointments=sellerSigned/(s.sellerSign/100),buyerAppointments=buyerSigned/(s.buyerSign/100);
 const broker=s.cosMode==='detail'?Math.min(gci*s.brokerPercent/100,s.brokerCapEnabled?s.brokerCap:Infinity):0;
 const franchise=s.cosMode==='detail'?Math.min(gci*s.franchisePercent/100,s.franchiseCapEnabled?s.franchiseCap:Infinity):0;
 const allowance=s.cosMode==='allowance'?gci*s.cosPercent/100:0;
 const desk=s.cosMode==='detail'?s.deskMonthly*12:0;
 const referrals=gci*s.referralShare/100*s.referralPercent/100;
 let support=0;
 if(s.level===4){support=s.support==='buyer'?buyerGci*s.supportShare/100*s.buyerSplit/100:
 s.showingMode==='monthly'?s.showingMonthly*12:buyerClosed*s.supportShare/100*s.showingFee;}
 const variable=s.variable.map(x=>{const g=x.scope==='seller'?sellerGci:x.scope==='buyer'?buyerGci:gci;
 const n=x.basis==='signed'?(x.scope==='seller'?sellerSigned:x.scope==='buyer'?buyerSigned:sellerSigned+buyerSigned):
 (x.scope==='seller'?sellerClosed:x.scope==='buyer'?buyerClosed:sellerClosed+buyerClosed);
 return {...x,annual:x.basis==='percent'?g*x.amount/100:n*x.amount};});
 const variableTotal=variable.reduce((a,x)=>a+x.annual,0);
 const cos=allowance+broker+franchise+desk+referrals+support+variableTotal;
 const admin=(s.level>=2?s.admin1*12:0)+(s.level>=3?s.admin2*12:0);
 const fixed=s.fixed.reduce((a,x)=>a+x.monthly*12,0),lead=gci*s.leadPercent/100;
 const opex=admin+fixed+lead,profit=gci-cos-opex;
 return {gci,sellerGci,buyerGci,sellerClosed,buyerClosed,sellerSigned,buyerSigned,sellerAppointments,buyerAppointments,
 broker,franchise,allowance,desk,referrals,support,variable,variableTotal,cos,admin,fixed,lead,opex,profit,margin:gci?profit/gci*100:0};
}
function solve(s,target){
 const error=validate(s,target);if(error)return {error};
 if(target===0)return{error:'Save your Life by Design target, or enter a goal to try this model.',missingGoal:true};
 let low=0,high=Math.max(target*2,100000),steps=0;
 while(breakdown(s,high).profit<target&&high<1e12&&steps++<60)high*=2;
 if(breakdown(s,high).profit<target)return {error:'These costs leave no workable profit. Lower the expense rates or raise commission per side.'};
 for(let i=0;i<90;i++){const mid=(low+high)/2;if(breakdown(s,mid).profit<target)low=mid;else high=mid;}
 const r=breakdown(s,high);r.target=target;
 r.sellerMonthly=up(r.sellerAppointments/12);r.buyerMonthly=up(r.buyerAppointments/12);r.monthly=r.sellerMonthly+r.buyerMonthly;
 r.sellerWeekly=up(r.sellerMonthly*12/s.weeks);r.buyerWeekly=up(r.buyerMonthly*12/s.weeks);r.weekly=r.sellerWeekly+r.buyerWeekly;
 r.sellerSales=up(r.sellerClosed);r.buyerSales=up(r.buyerClosed);r.sales=r.sellerSales+r.buyerSales;
 return r;
}
function lifeTarget(raw){
 if(!raw||raw.version!==5||!raw.handoff)return{error:'Save your life target on the final Life by Design page first.'};
 const fingerprint=JSON.stringify([raw.sections,raw.taxMode,raw.taxRate,raw.filing,raw.stateRate,raw.taxItems]);
 if(raw.handoff.fingerprint!==fingerprint)return{error:'Your life plan has changed. Save its updated target before using it here.'};
 const p=raw.handoff.annualPersonalGrossIncome;
 if(!finite(p,0.01,1e10))return{error:'The saved life target is not valid.'};
 return{value:p,taxes:raw.handoff.annualTaxReserve,savedAt:raw.handoff.savedAt};
}
const api={BASE,defaults,validate,breakdown,solve,lifeTarget};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.LBDBusiness=api;
})(typeof window==='undefined'?globalThis:window);
