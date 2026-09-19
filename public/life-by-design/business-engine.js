/* MREA-based planning engine. Historical starting allocations: The Millionaire
 * Real Estate Agent, figures 18-19 (p.157) and figure 34 (p.183).
 * Dollar presets and contract-stage assumptions are editable app assumptions.
 * No requests or personal data leave the browser. */
(function(root){
'use strict';
const BASE={gci:180000,cos:21000,salary:20000,lead:18000,fixed:[
 ['occupancy','Office / occupancy',1500,'Workspace, rent and utilities. Do not repeat brokerage desk fees.'],
 ['technology','Technology',4000,'CRM, website, software and business subscriptions.'],
 ['phone','Phone / communications',2600,'Business phone and communication services only.'],
 ['supplies','Supplies',1800,'Office supplies, postage and administrative materials.'],
 ['education','Education / dues',1800,'Training, coaching, MLS, association dues and licensing.'],
 ['equipment','Equipment',3600,'A budget for computers, devices and equipment.'],
 ['auto','Auto / insurance',6000,'Business-only vehicle and insurance costs. Do not duplicate your household budget.']
]};
const finite=(v,min=0,max=1e10)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const up=v=>v<=1e-10?0:Math.ceil(v-1e-9);
const budget=(s,key,calculated)=>finite(s.budgets?.[key])?s.budgets[key]:calculated;
const rate=(s,side,name)=>s[side+name]??s[name[0].toLowerCase()+name.slice(1)];
function defaults(target=100000){
 const seed=(target>0?target:100000)/.665;
 return {version:3,page:0,level:1,support:'buyer',goalMode:'life',manualGoal:100000,
 sellerCommission:10000,buyerCommission:10000,sellerPrice:0,buyerPrice:0,sellerShare:50,weeks:47,
 sellerSign:80,sellerClose:65,buyerSign:65,buyerClose:80,sellerContractClose:100,buyerContractClose:100,
 admin1:4000,admin2:4000,supportShare:100,buyerSplit:50,showingMode:'closing',showingFee:500,showingMonthly:3000,
 cosMode:'detail',cosPercent:BASE.cos/BASE.gci*100,brokerPercent:30,brokerCapEnabled:true,brokerCap:18000,
 franchisePercent:6,franchiseCapEnabled:true,franchiseCap:3000,deskMonthly:0,
 referralPercent:0,referralShare:0,sellerReferralPercent:0,sellerReferralShare:0,buyerReferralPercent:0,buyerReferralShare:0,leadPercent:10,budgets:{},actuals:{},
 fixed:BASE.fixed.map(([id,name,cost,hint])=>({id,name,hint,monthly:Math.round(cost/BASE.gci*seed/12),custom:false})),
 variable:[{id:'tc-seller',name:'Seller transaction coordinator',amount:0,basis:'closing',scope:'seller'},
 {id:'photos-seller',name:'Listing photos / preparation',amount:0,basis:'signed',scope:'seller'},
 {id:'gifts-seller',name:'Seller closing gifts',amount:0,basis:'closing',scope:'seller'},
 {id:'tc-buyer',name:'Buyer transaction coordinator',amount:0,basis:'closing',scope:'buyer'},
 {id:'gifts-buyer',name:'Buyer closing gifts',amount:0,basis:'closing',scope:'buyer'}],saved:null};
}
function validate(s,target){
 if(!finite(target,0,1e10))return 'Enter a valid annual income goal.';
 if(![1,2,3,4].includes(s.level)||!['buyer','showing'].includes(s.support))return 'Choose a staffing level and support role.';
 for(const k of ['sellerCommission','buyerCommission'])if(!finite(s[k],1,1e7))return 'Commission per side must be greater than $0.';
 for(const k of ['sellerSign','sellerClose','buyerSign','buyerClose'])if(!finite(s[k],1,100))return 'Conversion rates must be between 1% and 100%.';
 for(const k of ['sellerContractClose','buyerContractClose'])if(!finite(s[k]??100,1,100))return 'Contract-to-closing rates must be between 1% and 100%.';
 for(const k of ['sellerShare','supportShare','buyerSplit','cosPercent','brokerPercent','franchisePercent','referralPercent','referralShare','leadPercent'])if(!finite(s[k],0,100))return 'Percentages must be between 0% and 100%.';
 for(const side of ['seller','buyer'])for(const k of ['ReferralPercent','ReferralShare'])if(!finite(rate(s,side,k),0,100))return 'Referral percentages must be between 0% and 100%.';
 for(const k of ['admin1','admin2','showingFee','showingMonthly','brokerCap','franchiseCap','deskMonthly'])if(!finite(s[k]))return 'Costs must be valid, nonnegative amounts.';
 for(const k of ['sellerPrice','buyerPrice'])if(!finite(s[k]??0))return 'Sale prices must be nonnegative amounts.';
 if(!finite(s.weeks,1,52))return 'Working weeks must be between 1 and 52.';
 if(!['allowance','detail'].includes(s.cosMode)||!['closing','monthly'].includes(s.showingMode))return 'Check your cost settings.';
 if(!Array.isArray(s.fixed)||!Array.isArray(s.variable)||s.fixed.length>1000||s.variable.length>1000)return 'Check your expense categories.';
 for(const x of s.fixed)if(!x||!finite(x.monthly)||typeof x.name!=='string')return 'Check your operating expenses.';
 for(const x of s.variable)if(!x||!finite(x.amount)||!['all','seller','buyer'].includes(x.scope)||!['closing','signed','percent'].includes(x.basis)||(x.basis==='percent'&&x.amount>100)||(x.annualBudget!=null&&!finite(x.annualBudget)))return 'Check your transaction costs and percentages.';
 if(s.budgets&&(typeof s.budgets!=='object'||Array.isArray(s.budgets)||Object.values(s.budgets).some(v=>v!=null&&!finite(v))))return 'Check your expense budget overrides.';
 return null;
}
function breakdown(s,gci,closed){
 const mix=s.sellerShare/100,average=mix*s.sellerCommission+(1-mix)*s.buyerCommission;
 const units=gci/average,sellerClosed=closed?closed.seller:units*mix,buyerClosed=closed?closed.buyer:units*(1-mix);
 const sellerGci=sellerClosed*s.sellerCommission,buyerGci=buyerClosed*s.buyerCommission;
 gci=sellerGci+buyerGci;
 const sellerContracts=sellerClosed/((s.sellerContractClose??100)/100),buyerContracts=buyerClosed/((s.buyerContractClose??100)/100);
 const sellerSigned=sellerContracts/(s.sellerClose/100),buyerSigned=buyerContracts/(s.buyerClose/100);
 const sellerAppointments=sellerSigned/(s.sellerSign/100),buyerAppointments=buyerSigned/(s.buyerSign/100);
 const broker=s.cosMode==='detail'?budget(s,'broker',Math.min(gci*s.brokerPercent/100,s.brokerCapEnabled?s.brokerCap:Infinity)):0;
 const franchise=s.cosMode==='detail'?budget(s,'franchise',Math.min(gci*s.franchisePercent/100,s.franchiseCapEnabled?s.franchiseCap:Infinity)):0;
 const allowance=s.cosMode==='allowance'?gci*s.cosPercent/100:0,desk=s.cosMode==='detail'?s.deskMonthly*12:0;
 const sellerReferrals=budget(s,'sellerReferrals',sellerGci*rate(s,'seller','ReferralShare')/100*rate(s,'seller','ReferralPercent')/100);
 const buyerReferrals=budget(s,'buyerReferrals',buyerGci*rate(s,'buyer','ReferralShare')/100*rate(s,'buyer','ReferralPercent')/100);
 const referrals=sellerReferrals+buyerReferrals;
 let support=0,showingSalary=0;
 if(s.level===4){if(s.support==='buyer')support=budget(s,'support',buyerGci*s.supportShare/100*s.buyerSplit/100);
 else if(s.showingMode==='monthly')showingSalary=s.showingMonthly*12;
 else support=budget(s,'support',buyerClosed*s.supportShare/100*s.showingFee);}
 const variable=s.variable.map(x=>{const g=x.scope==='seller'?sellerGci:x.scope==='buyer'?buyerGci:gci;
 const n=x.basis==='signed'?(x.scope==='seller'?sellerSigned:x.scope==='buyer'?buyerSigned:sellerSigned+buyerSigned):(x.scope==='seller'?sellerClosed:x.scope==='buyer'?buyerClosed:sellerClosed+buyerClosed);
 const automatic=x.basis==='percent'?g*x.amount/100:n*x.amount;
 return {...x,annual:finite(x.annualBudget)?x.annualBudget:automatic,automatic};});
 const variableTotal=variable.reduce((a,x)=>a+x.annual,0),cos=allowance+broker+franchise+desk+referrals+support+variableTotal;
 const admin=(s.level>=2?s.admin1*12:0)+(s.level>=3?s.admin2*12:0);
 const fixed=s.fixed.reduce((a,x)=>a+x.monthly*12,0),lead=budget(s,'lead',gci*s.leadPercent/100);
 const opex=admin+fixed+lead+showingSalary,profit=gci-cos-opex;
 const hasVolume=(!sellerClosed||s.sellerPrice>0)&&(!buyerClosed||s.buyerPrice>0);
 const sellerVolume=sellerClosed*(s.sellerPrice||0),buyerVolume=buyerClosed*(s.buyerPrice||0);
 return {gci,sellerGci,buyerGci,sellerClosed,buyerClosed,sellerContracts,buyerContracts,sellerSigned,buyerSigned,sellerAppointments,buyerAppointments,
 broker,franchise,allowance,desk,sellerReferrals,buyerReferrals,referrals,support,showingSalary,variable,variableTotal,cos,admin,fixed,lead,opex,profit,
 margin:gci?profit/gci*100:0,sellerVolume,buyerVolume,volume:hasVolume?sellerVolume+buyerVolume:null};
}
function activities(r,s){
 for(const side of ['seller','buyer']){r[side+'Monthly']=up(r[side+'Appointments']/12);r[side+'Weekly']=up(r[side+'Appointments']/s.weeks);r[side+'Sales']=up(r[side+'Closed']);r[side+'AgreementsMonthly']=up(r[side+'Signed']/12);r[side+'ContractsMonthly']=up(r[side+'Contracts']/12);}
 r.monthly=r.sellerMonthly+r.buyerMonthly;r.weekly=r.sellerWeekly+r.buyerWeekly;r.sales=r.sellerSales+r.buyerSales;
 r.contractsMonthly=r.sellerContractsMonthly+r.buyerContractsMonthly;
 return r;
}
function solve(s,target){
 const error=validate(s,target);if(error)return {error};
 if(target===0)return{error:'Save your Life by Design target, or enter a goal to try this model.',missingGoal:true};
 let low=0,high=Math.max(target*2,100000),steps=0;
 while(breakdown(s,high).profit<target&&high<1e12&&steps++<60)high*=2;
 if(breakdown(s,high).profit<target)return{error:'These costs leave no workable profit. Lower expense rates or raise commission per side.'};
 for(let i=0;i<90;i++){const mid=(low+high)/2;if(breakdown(s,mid).profit<target)low=mid;else high=mid;}
 const r=activities(breakdown(s,high),s);r.target=target;
 // Keep the minimum (fractional) economic solution available to downstream modules.
 // The displayed commitment uses whole seller/buyer closings and recalculates costs.
 let seller=r.sellerSales,buyer=r.buyerSales,plan=breakdown(s,0,{seller,buyer}),attempts=0;
 while(plan.profit+1e-7<target&&attempts++<10000){const mix=s.sellerShare/100;if(mix===1||(mix>0&&seller/(seller+buyer||1)<mix))seller++;else buyer++;plan=breakdown(s,0,{seller,buyer});}
 if(plan.profit+1e-7<target)return{error:'A workable whole-transaction plan could not be found. Review the cost assumptions.'};
 r.plan={...activities(plan,s),target,requiredGci:r.gci,roundingCushion:plan.profit-target};
 return r;
}
function lifeTarget(raw){
 if(raw?.sections?.lifestyle?.some(x=>x.id==='lifestyle-upgrades-2'&&!x.custom&&Number(String(x.amount||0).replace(/,/g,''))>0))return{error:'The separate time-off reserve has been removed. Review and save your updated Life by Design target first.'};
 if(!raw||raw.version!==5||!raw.handoff)return{error:'Save your life target on the final Life by Design page first.'};
 const fingerprint=JSON.stringify([raw.sections,raw.taxMode,raw.taxRate,raw.filing,raw.stateRate,raw.taxItems]);
 if(raw.handoff.fingerprint!==fingerprint)return{error:'Your life plan has changed. Save its updated target before using it here.'};
 const p=raw.handoff.annualPersonalGrossIncome;
 if(!finite(p,0.01,1e10))return{error:'The saved life target is not valid.'};
 return{value:p,taxes:raw.handoff.annualTaxReserve,afterTax:raw.handoff.annualAfterTaxNeeds??p-raw.handoff.annualTaxReserve,savedAt:raw.handoff.savedAt};
}
const api={BASE,defaults,validate,breakdown,solve,lifeTarget,up};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.LBDBusiness=api;
})(typeof window==='undefined'?globalThis:window);
