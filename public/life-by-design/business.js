(function(){
'use strict';
const E=window.LBDBusiness,$=id=>document.getElementById(id),KEY='lifeByDesign:business:v1',LIFE='lifeByDesign:webapp:v5';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v||0);
const dec=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:1});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let life={error:'Save your Life by Design target first.'},storageOK=true,rawLife=null,s,open=new Set(['brokerage','referrals','transaction-seller','transaction-buyer','fixed','staff','conversions','four-conversations']),toastTimer;
function readLife(){try{rawLife=JSON.parse(localStorage.getItem(LIFE)||'null');life=E.lifeTarget(rawLife);}catch{life={error:'This browser cannot read your saved life plan. You can enter an annual target below.'};}}
readLife();
function migrateVariables(list){
 const out=[];
 for(const x of Array.isArray(list)?list:[]){
  if(!x||typeof x!=='object')continue;
  const base={...x,id:/^[a-zA-Z0-9_-]{1,100}$/.test(x.id)?x.id:uid(),name:String(x.name??'Custom expense').slice(0,150)};
  if(base.scope==='all'){
   out.push({...base,id:base.id+'-seller',scope:'seller'});
   out.push({...base,id:base.id+'-buyer',scope:'buyer'});
  }else out.push(base);
 }
 return out;
}
function restore(raw){
 const d=E.defaults(life.value||100000);
 if(!raw||![1,2,3,4].includes(raw.version))return d;
 const originalVersion=raw.version,v={...d,...raw,budgets:{...d.budgets,...(raw.budgets||{})},actuals:{...(raw.actuals||{})}};
 if(originalVersion===1){
  const sellerUnits=v.sellerShare/v.sellerCommission,buyerUnits=(100-v.sellerShare)/v.buyerCommission;
  v.sellerShare=sellerUnits+buyerUnits?Math.round(100*sellerUnits/(sellerUnits+buyerUnits)):50;
  if(v.cosMode==='allowance'){v.cosMode='detail';v.brokerPercent=d.brokerPercent;v.brokerCapEnabled=true;v.brokerCap=d.brokerCap;v.franchisePercent=d.franchisePercent;v.franchiseCapEnabled=true;v.franchiseCap=d.franchiseCap;v.costsMigration=true;}
 }
 if(originalVersion<3){
  v.sellerReferralPercent=Number.isFinite(raw.referralPercent)?raw.referralPercent:d.sellerReferralPercent;
  v.buyerReferralPercent=Number.isFinite(raw.referralPercent)?raw.referralPercent:d.buyerReferralPercent;
  v.sellerReferralShare=Number.isFinite(raw.referralShare)?raw.referralShare:d.sellerReferralShare;
  v.buyerReferralShare=Number.isFinite(raw.referralShare)?raw.referralShare:d.buyerReferralShare;
  v.variable=migrateVariables(raw.variable);
  v.weeks=raw.weeks===48?47:raw.weeks;
  v.version=3;v.saved=null;
 }
 v.sellerShare=Math.round(v.sellerShare);
 for(const k of Object.keys(d))if(typeof d[k]==='number'&&(!Number.isFinite(v[k])||v[k]<0))v[k]=d[k];
 if(![0,1,2].includes(v.page))v.page=0;if(!['life','manual'].includes(v.goalMode))v.goalMode='life';
 if(!Array.isArray(v.fixed)||v.fixed.length>1000)v.fixed=d.fixed;
 v.fixed=v.fixed.filter(x=>x&&typeof x==='object').map(x=>({...x,id:/^[a-zA-Z0-9_-]{1,100}$/.test(x.id)?x.id:uid(),name:String(x.name??'Custom expense').slice(0,150),hint:String(x.hint||'').slice(0,300)}));
 if(!Array.isArray(v.variable)||v.variable.length>1000)v.variable=d.variable;
 v.variable=v.variable.filter(x=>x&&typeof x==='object'&&['seller','buyer'].includes(x.scope)).map(x=>({...x,id:/^[a-zA-Z0-9_-]{1,100}$/.test(x.id)?x.id:uid(),name:String(x.name??'Custom expense').slice(0,150)}));
 for(const side of ['seller','buyer'])if(!v.variable.some(x=>x.scope===side))v.variable.push(...d.variable.filter(x=>x.scope===side));
 v.cosMode='detail';v.version=4;
 v.sellerPrice=E.estimatedPrice(v.sellerCommission);v.buyerPrice=E.estimatedPrice(v.buyerCommission);
 if(originalVersion<4)v.saved=null;
 return E.validate(v,1)?d:v;
}
try{s=restore(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{s=E.defaults(life.value||100000);storageOK=false;}
function goal(){return s.goalMode==='manual'?s.manualGoal:(life.value||0);}
function fingerprint(){return JSON.stringify({...s,page:0,saved:null,activeGoal:goal()});}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(s));storageOK=true;}catch{storageOK=false;}$('storage').hidden=storageOK;$('storage').textContent='Your browser is blocking saved data. The model still calculates. Save a backup before closing this page.';}
function toast(m){$('toast').textContent=m;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function title(n,t,p){return '<div class="card-head"><div class="eyebrow">'+esc(n)+'</div><h2>'+esc(t)+'</h2><p>'+esc(p)+'</p></div>';}
function control(key,label,help,min,max,step=1,unit='%',value=s[key],slider=true){
 const current=Number.isFinite(value)?Math.round(value*100)/100:'',top=Math.max(max,Number(value)||0);
 return '<div class="control"><div class="control-top"><label for="n-'+key+'">'+esc(label)+(help?'<small>'+esc(help)+'</small>':'')+'</label><div class="value-field">'+(unit==='$'?'<span aria-hidden="true">$</span>':'')+'<input id="n-'+key+'" type="number" inputmode="decimal" min="'+min+'" max="'+(unit==='$'?100000000:unit==='weeks'?52:100)+'" step="any" data-key="'+key+'" value="'+current+'" aria-label="'+esc(label)+'">'+(unit==='$'?'':'<span>'+esc(unit)+'</span>')+'</div></div>'+(slider?'<input type="range" aria-label="'+esc(label)+' slider" min="'+min+'" max="'+top+'" step="'+step+'" value="'+current+'" data-key="'+key+'"><div class="range-ends"><span>'+(unit==='$'?money(min):min+(unit==='%'?'%':''))+'</span><span>'+(unit==='$'?money(top):top+(unit==='%'?'%':''))+'</span></div>':'')+'</div>';
}
function accordion(id,name,body,help=''){return '<details class="accordion" data-open="'+id+'" '+(open.has(id)?'open':'')+'><summary><span>'+name+(help?'<small>'+help+'</small>':'')+'</span></summary>'+body+'</details>';}
function footer(){return '<div class="actions">'+(s.page?'<button class="btn" data-action="back">Back</button>':'<a class="btn" href="./">Life plan</a>')+'<button class="primary" data-action="next">'+(s.page===2?'Save My Economic Model':s.page===1?'See My Full Economic Model':'Continue →')+'</button></div>';}
function reviewLinks(){return '<nav class="review-links" aria-label="Review or edit your inputs"><strong>Review or edit any input</strong><a href="./">Life income target</a><button data-page="0">Business assumptions</button><button data-page="1">Cost of Sales & Fixed Operating Expenses</button></nav>';}
function goalBox(){const g=goal();return '<div class="goal-box"><div class="goal-top"><div><small>ANNUAL OWNER INCOME GOAL</small><strong>'+(g?money(g):'Set your goal')+'</strong></div><button class="text-btn" data-action="goal-edit">'+(open.has('goal')?'Close':'Change / review')+'</button></div><p>'+(s.goalMode==='manual'?'Your entered goal. Include your personal tax reserve in this amount.':life.value?'From your saved Life by Design plan, including personal taxes. We do not add them again.':esc(life.error))+'</p>'+(open.has('goal')?'<div class="goal-edit"><label class="mini-label" for="goalMode">Income target source</label><select class="select" id="goalMode"><option value="life" '+(s.goalMode==='life'?'selected':'')+'>Saved Life by Design target</option><option value="manual" '+(s.goalMode==='manual'?'selected':'')+'>Enter an annual goal</option></select>'+(s.goalMode==='manual'?control('manualGoal','Annual personal income','After business expenses, before personal taxes.',1000,500000,1000,'$',s.manualGoal,false):'<p><a href="./">Return to your life plan</a> to update and save your income target.</p>')+'</div>':'')+'</div>';}
function setup(){
 return '<div class="card">'+title('STEP 2 / ECONOMIC MODEL','Build the business that funds it.','You now know how much income you need to fund everything important to you. This step builds the economic model behind that goal—connecting annual income to GCI, volume, closings, agreements, appointments, and the weekly activity your calendar must support.')+
 '<div class="body">'+goalBox()+'<p class="callout"><strong>Outcome:</strong> by the end of Step 2 you will know what your income goal requires from your real estate business and the monthly and weekly numbers you can track.</p>'+
 '<label class="mini-label">How will your business be staffed?</label><div class="levels">'+[[1,'Just me','You handle sales and administration.'],[2,'Me + one admin','You handle sales; one admin supports paperwork, coordination, and follow-up.'],[3,'Me + two admins','You handle sales with two admins supporting transactions and operations.'],[4,'Me + buyer support','Two admins plus a buyer agent or showing specialist.']].map(([v,name,h])=>'<button class="level '+(s.level===v?'active':'')+'" data-level="'+v+'" aria-pressed="'+(s.level===v)+'"><small>LEVEL '+v+'</small><strong>'+name+'</strong><span>'+h+'</span></button>').join('')+'</div>'+
 (s.level===4?'<label class="mini-label" for="support">Your level 4 support</label><select class="select" id="support"><option value="buyer" '+(s.support==='buyer'?'selected':'')+'>Buyer agent</option><option value="showing" '+(s.support==='showing'?'selected':'')+'>Showing specialist</option></select>':'')+
 productionInputs()+'<div id="error" class="error"></div></div>'+footer()+'</div>';
}

function productionInputs(){
 return '<section class="production-inputs" aria-label="Production assumptions"><h3>Production Assumptions</h3><p class="help">Use the gross commission dollars your business earns per closed side, before splits and expenses. Estimated sales prices update with these amounts to provide reference volume.</p><div class="input-columns">'+['seller','buyer'].map(side=>'<section><h4>'+(side==='seller'?'Seller Business':'Buyer Business')+'</h4>'+control(side+'Commission',side==='seller'?'Average GCI per Closed Listing':'Average GCI per Closed Buyer','Gross commission dollars for your represented side of one closing.',500,30000,250,'$')+'<div class="estimated-price"><span>Estimated Sales Price '+(side==='seller'?'Seller':'Buyer')+'</span><strong id="'+side+'PriceEstimate">'+money(E.estimatedPrice(s[side+'Commission']))+'</strong><small>Automatic planning estimate for reference volume.</small></div></section>').join('')+'</div>'+control('sellerShare','Percent of Listings to Buyers','Share of closed transaction sides that will be listings. Buyers make up the rest. Adjust in 1% increments.',0,100,1,'%')+'<div class="mix-bar" aria-hidden="true"><span id="sellerBar"></span><span></span></div><p class="mix-label" id="mixLabel"></p></section>';
}
function activityInputs(){
 return '<section class="activity-inputs" aria-label="Activity assumptions"><h3>Make Room for Life</h3><p>Start with 52 weeks, then allow for vacation, family needs, illness, travel, and education. The starting plan allows five weeks away from regular production: <strong>47 working weeks</strong>. Count overlapping time away only once.</p>'+control('weeks','Working Weeks per Year','Fewer working weeks increases the appointments needed each week for the same annual goal.',1,52,.5,'weeks')+'<h3>Personalize Your Conversion Rates</h3><p class="help">These are editable planning examples. Your experience, skills, follow-up, and actual results matter. Use conservative projections when you are new and update them as your track record grows.</p><div class="input-columns">'+['seller','buyer'].map(side=>'<section><h4>'+(side==='seller'?'Seller Business':'Buyer Business')+'</h4>'+control(side+'Sign',side==='seller'?'Seller Appointments → Signed Listing Agreements':'Buyer Appointments → Signed Buyer Agreements','Of consultations held, how many become signed client agreements?',1,100,1,'%')+control(side+'Close',side==='seller'?'Signed Listing Agreements → Contracts':'Signed Buyer Agreements → Contracts','Of signed client agreements, how many reach a written or pending purchase contract?',1,100,1,'%')+control(side+'ContractClose',side==='seller'?'Seller Contracts → Closed Listings':'Buyer Contracts → Closed Buyers','Of written or pending contracts, how many close? 100% assumes no contract fallout.',1,100,1,'%')+'</section>').join('')+'</div><button class="text-btn" data-action="reset-conversions">Reset to planning examples</button><p class="help">Appointments needed means buyer or seller consultations actually held. These are not showings, contact attempts, or appointments that cancel.</p></section>';
}
function scorecardGoals(p){return {appointments:p.monthly,agreements:p.sellerAgreementsMonthly+p.buyerAgreementsMonthly,closings:E.up(p.sellerSales/12)+E.up(p.buyerSales/12),gci:p.gci/12};}
function fourConversations(p){
 const g=scorecardGoals(p),labels=[['appointments','Appointments needed / month','Seller + buyer consultations'],['agreements','Listings Taken & Buyer Commitments','Signed client agreements / month'],['closings','Closed Units','Seller + buyer closings / month'],['gci','GCI','Gross commission income / month']];
 return '<div class="four-scorecard" aria-label="Monthly Four Conversations goals">'+labels.map(([key,label,hint],i)=>(i===2?'<div class="value-wall"><span>WALL OF VALUE</span></div>':'')+'<section class="scorecard-metric"><h4>'+label+'</h4><p>'+hint+'</p><div class="scorecard-goal"><small>MONTHLY GOAL</small><strong>'+(key==='gci'?money(g[key]):g[key])+'</strong></div></section>').join('')+'</div><p class="scorecard-note">Monthly activity goals round each side up to a whole unit. GCI is the annual plan divided by 12. These are planning goals; actual-results tracking comes in the next step.</p>';
}

function monthlyFixed(){return s.fixed.reduce((a,x)=>a+x.monthly,0);}
function fixedRows(){return '<div class="expense-columns"><span>Category</span><span>Monthly</span><span>Yearly</span></div>'+s.fixed.map(x=>{
 const annual=x.monthly*12;
 return '<div class="expense fixed-expense"><div class="expense-copy">'+(x.custom?'<input class="custom-name" aria-label="Expense name" data-name="'+esc(x.id)+'" maxlength="150" value="'+esc(x.name)+'">':'<strong>'+esc(x.name)+'</strong>')+'<p class="help">'+esc(x.hint)+'</p></div><label class="value-field linked"><span>$</span><input type="number" inputmode="decimal" min="0" step="any" data-fixed-monthly="'+esc(x.id)+'" value="'+Math.round(x.monthly*100)/100+'" aria-label="'+esc(x.name)+' per month"></label><label class="value-field linked"><span>$</span><input type="number" inputmode="decimal" min="0" step="any" data-fixed-annual="'+esc(x.id)+'" value="'+Math.round(annual*100)/100+'" aria-label="'+esc(x.name)+' per year"></label>'+(x.custom?'<button class="remove" data-delete-fixed="'+esc(x.id)+'" aria-label="Remove '+esc(x.name)+'">&times;</button>':'<span></span>')+'</div>';
 }).join('')+'<button class="text-btn" data-action="add-fixed">+ Add a fixed operating expense</button>';
}
function variableSideRows(side){
 const label=side==='seller'?'Seller':'Buyer',rows=s.variable.filter(x=>x.scope===side);
 return '<div class="transaction-side"><h4>'+label+' transaction costs</h4><p class="help">Costs that occur because you take or close '+label.toLowerCase()+' business. Use per closing, per signed agreement, or % of that side\'s GCI.</p>'+rows.map(x=>'<div class="expense"><div class="expense-top"><div><input class="custom-name" aria-label="Transaction expense name" maxlength="150" data-vname="'+esc(x.id)+'" value="'+esc(x.name)+'"></div><label class="value-field"><span>'+(x.basis==='percent'?'%':'$')+'</span><input type="number" inputmode="decimal" min="0" step="any" data-variable="'+esc(x.id)+'" value="'+Math.round(x.amount*100)/100+'" aria-label="'+esc(x.name)+' amount"></label></div><div class="expense-options two"><select data-vbasis="'+esc(x.id)+'" aria-label="'+esc(x.name)+' basis">'+[['closing','Per closing'],['signed','Per signed agreement'],['percent','% of GCI']].map(([v,l])=>'<option value="'+v+'" '+(x.basis===v?'selected':'')+'>'+l+'</option>').join('')+'</select><button class="remove" data-delete-variable="'+esc(x.id)+'" aria-label="Remove '+esc(x.name)+'">&times;</button></div></div>').join('')+'<button class="text-btn" data-add-variable="'+side+'">+ Add a '+label.toLowerCase()+' transaction cost</button></div>';
}
function cap(kind,label){return '<label class="checkbox"><input id="'+kind+'CapEnabled" type="checkbox" '+(s[kind+'CapEnabled']?'checked':'')+'> '+(kind==='broker'?'My brokerage caps company dollar':'My franchise / royalty fee has a separate cap')+'</label>'+(s[kind+'CapEnabled']?control(kind+'Cap',label,'Full cap-year total for your business.',0,50000,500,'$',s[kind+'Cap'],false):'');}
function brokerMarkup(){
 return control('brokerPercent','Average Split with Your Broker','Broker share of GCI before the separate franchise fee and other costs.',0,100,1,'%')+'<div class="split-pair" id="splitLabel"></div>'+cap('broker','Company-Dollar Cap per Year')+
 control('franchisePercent','Franchise / Royalty Fee','Separate percentage of GCI. Enter 0% if none applies.',0,20,.25,'%')+cap('franchise','Franchise / Royalty Cap per Year')+
 control('deskMonthly','Broker Desk / Fixed Fee','Recurring broker fee. Do not repeat office costs in Fixed Operating Expenses.',0,2000,25,'$');
}
function referralMarkup(){
 return '<p class="help">Referral fees are compensation paid to another brokerage or agent for referred business. They are separate from transaction-processing costs.</p><div class="two-col">'+
 '<div><h4>Seller referrals</h4>'+control('sellerReferralPercent','Referral Fee %','Percentage paid on referred listing-side GCI.',0,50,1,'%')+control('sellerReferralShare','Listing GCI Subject to Referral Fees','Percentage of listing-side GCI expected to be referral business.',0,100,1,'%')+'</div>'+
 '<div><h4>Buyer referrals</h4>'+control('buyerReferralPercent','Referral Fee %','Percentage paid on referred buyer-side GCI.',0,50,1,'%')+control('buyerReferralShare','Buyer GCI Subject to Referral Fees','Percentage of buyer-side GCI expected to be referral business.',0,100,1,'%')+'</div></div>';
}
function staffMarkup(){
 let staff=s.level>=2?control('admin1','Admin 1 / month','Fully loaded pay, employer taxes and benefits.',0,10000,100,'$')+(s.level>=3?control('admin2','Admin 2 / month','Fully loaded monthly cost for the second person.',0,10000,100,'$'):''):'<p class="help">No salaried admin is included in the solo model.</p>';
 if(s.level===4)staff+=s.support==='buyer'?control('buyerSplit','Buyer Agent Compensation','Percentage of gross buyer GCI assigned to the buyer agent.',0,100,1,'%')+control('supportShare','Buyer Business Assigned to Support','Share of buyer business assigned to the buyer agent.',0,100,1,'%'):('<label class="mini-label" for="showingMode">How will you pay showing support?</label><select class="select" id="showingMode"><option value="closing" '+(s.showingMode==='closing'?'selected':'')+'>Per assisted buyer closing</option><option value="monthly" '+(s.showingMode==='monthly'?'selected':'')+'>Fixed monthly cost</option></select>'+(s.showingMode==='closing'?control('showingFee','Showing Support / Buyer Closing','Amount paid per assisted buyer closing.',0,3000,50,'$'):control('showingMonthly','Showing Support / Month','Fully loaded recurring monthly cost.',0,10000,100,'$')));
 return staff;
}
function modelSummaryBox(r){
 if(r.error)return '<div class="callout">'+esc(r.error)+'</div>';
 const p=r.plan||r;
 return '<section class="econ-summary">'+[['Annual GCI',money(p.gci)],['Annual business expenses',money(p.cos+p.opex)],['Closings needed / year',p.sales],['Appointments needed / month',p.monthly],['Appointments needed / week',p.weekly]].map(([label,value])=>'<div><small>'+label+'</small><strong>'+value+'</strong></div>').join('')+'</section>';
}
function costPage(){
 return '<div class="card">'+title('STEP 2 / ECONOMIC MODEL','Build the Economics Behind Your Income Goal','Now define what it costs to produce the business. Cost of Sales and Fixed Operating Expenses are separated so the model stays congruent with a true real estate P&L.')+
 '<div class="body"><div id="error" class="error"></div>'+
 '<h3>Cost of Sales</h3><p class="help">Costs caused directly by producing or closing business. These rise or fall with production and are deducted before operating expenses.</p>'+
 accordion('brokerage','Brokerage Agreement & Fees',brokerMarkup(),'Company dollar, royalty/franchise fees, caps and broker fixed fees.')+
 accordion('referrals','Referral Fees',referralMarkup(),'Separate seller and buyer referral assumptions. Open by default.')+
 accordion('transaction-seller','Seller Transaction Costs',variableSideRows('seller'),'Per-transaction costs tied to listings and seller closings. Open by default.')+
 accordion('transaction-buyer','Buyer Transaction Costs',variableSideRows('buyer'),'Per-transaction costs tied to buyer agreements and closings. Open by default.')+
 (s.level===4&&s.support==='buyer'?accordion('buyer-support','Buyer Agent Cost of Sales',staffMarkup(),'Buyer-agent compensation is treated as Cost of Sales.'):'')+
 '<h3>Fixed Operating Expenses</h3><p class="callout"><strong>Recommended starting amounts are auto-calculated using proven real-estate business-planning benchmarks.</strong> The goal is to invest enough to support production and growth without allowing expenses to erode profitability. Adjust any category to reflect how you actually operate your business.</p>'+
 control('overhead','Fixed Operating Expense Budget','Change this total to proportionally rebalance the recommended categories below, or edit any monthly/yearly category directly.',0,12000,100,'$',monthlyFixed())+
 accordion('fixed','Fixed Business Expense Categories',fixedRows(),'Monthly and yearly stay linked; edit either number.')+
 control('leadPercent','Lead Generation Budget','Percent of GCI invested in marketing and prospecting. This is an operating expense in the model.',0,30,.5,'%')+
 (s.level>=2&&!(s.level===4&&s.support==='buyer')?accordion('staff','Staffing & Compensation — Level '+s.level,staffMarkup(),'Administrative payroll is an operating expense.'):'')+
 '<section class="save-target"><h3>Your Economic Model at a Glance</h3><p>These are the basics your current assumptions produce before you open the full Economic Model.</p><div id="costSummary"></div></section>'+
 '</div>'+footer()+'</div>';
}
function appointmentPage(){
 return '<div class="card">'+title('STEP 2 / YOUR ECONOMIC MODEL','Turn Your Business Goal into an Action Plan','Adjust your production and activity assumptions first. Your Economic Model and Four Conversations goals update below as you work.')+
 '<div class="body"><div id="error" class="error" role="alert"></div><section id="modelInputs">'+goalBox()+productionInputs()+activityInputs()+'</section>'+
 '<section id="modelResults" class="model-results"><div class="results-heading"><div class="eyebrow">YOUR RESULTS</div><h3>Your Economic Model for Your Business Goal</h3><p>Your income goal becomes a revenue target, then a plan for Seller Business and Buyer Business.</p></div><div id="economicOutputs"></div><div id="pipeline"></div>'+accordion('calculation-details','Show the calculation details','<div id="calculationDetails"></div>')+
 '<div id="outcomeSummary"></div><section class="action-plan"><h3>Your Action Plan</h3><div id="bottomSummary"></div><p class="calendar-reminder"><strong>Your calendar should reflect your goals.</strong> Reserve time each working week for the appointments and follow-up your plan needs.</p></section>'+
 '<section class="scorecard-section"><div class="eyebrow">THE FOUR CONVERSATIONS</div><h3>Your Monthly Business Goals</h3><p class="help">Keep these four numbers in view. Appointments and signed commitments lead to closings and gross commission income.</p><div id="fourConversations"></div></section></section>'+
 '<div id="savedNote" class="save-note"></div>'+reviewLinks()+'<section class="next-stage" id="nextStage" hidden><h3>Your Economic Model Is Saved</h3><p>Your income, production, Four Conversations goals and appointment targets are ready for the next business-planning module.</p><button class="btn" data-action="backup">Download My Plan Backup</button></section></div>'+footer()+'</div>';
}
function go(page){s.page=Math.max(0,Math.min(2,page));persist();render();window.scrollTo({top:0,behavior:'auto'});}
function saveModel(){
 const r=E.solve(s,goal()),p=r.plan||r;if(r.error){toast(r.error);return;}
 s.saved={fingerprint:fingerprint(),savedAt:new Date().toISOString(),source:s.goalMode,annualIncomeGoal:goal(),annualAfterTaxGoal:s.goalMode==='life'?life.afterTax||null:null,annualGci:p.gci,annualCostOfSales:p.cos,annualOperatingExpenses:p.opex,profitMargin:p.margin,annualClosings:p.sales,annualVolume:p.volume,sellerAgreements:p.sellerSigned,buyerAgreements:p.buyerSigned,sellerContracts:p.sellerContracts,buyerContracts:p.buyerContracts,totalAppointmentsPerMonth:p.monthly,totalAppointmentsPerWeek:p.weekly,workingWeeks:s.weeks,monthlyFourConversations:scorecardGoals(p),estimatedSellerPrice:p.sellerPrice,estimatedBuyerPrice:p.buyerPrice};
 persist();numbers();toast(storageOK?'Your Economic Model is saved.':'Saving failed. Enable browser storage or download a backup.');return storageOK;
}
function next(){if(s.page===0&&!(goal()>0)){open.add('goal');render();toast('Use a saved Life by Design target or enter an annual goal.');return;}const r=E.solve(s,goal());if(r.error){toast(r.error);return;}if(s.page===0)go(1);else if(s.page===1)go(2);else if(saveModel())$('nextStage')?.scrollIntoView({block:'center',behavior:'smooth'});}
function sync(key,value,el){document.querySelectorAll('[data-key="'+key+'"]').forEach(x=>{if(x===el)return;if(x.type==='range'&&Number.isFinite(value)&&value>Number(x.max))x.max=value;x.value=Number.isFinite(value)?(x.type==='range'?value:Math.round(value*100)/100):'';});}
function numbers(){
 const r=E.solve(s,goal()),p=r.plan||r;
 if($('error'))$('error').textContent=r.error||'';
 for(const side of ['seller','buyer'])if($(side+'PriceEstimate'))$(side+'PriceEstimate').textContent=Number.isFinite(s[side+'Commission'])?money(E.estimatedPrice(s[side+'Commission'])):'Check commission';
 if($('mixLabel'))$('mixLabel').textContent=Number.isFinite(s.sellerShare)?dec(s.sellerShare)+'% Listings / '+dec(100-s.sellerShare)+'% Buyers':'Enter a listing share';
 if($('sellerBar'))$('sellerBar').style.width=Math.max(0,Math.min(100,s.sellerShare||0))+'%';
 if($('splitLabel'))$('splitLabel').textContent='You keep '+dec(100-s.brokerPercent)+'% | Broker receives '+dec(s.brokerPercent)+'%';
 const goalDisplay=document.querySelector('.goal-top strong');if(goalDisplay)goalDisplay.textContent=goal()?money(goal()):'Set your goal';
 $('aside').innerHTML='';
 $('dockTarget').textContent=['Business assumptions','Business investment costs','Review and save'][s.page];
 if($('modelResults'))$('modelResults').hidden=!!r.error;
 if($('costSummary'))$('costSummary').innerHTML=modelSummaryBox(r);
 if(r.error){if($('nextStage'))$('nextStage').hidden=true;if($('savedNote'))$('savedNote').textContent='Correct the inputs above to calculate and save your model.';return;}
 if($('economicOutputs')){
  const rows=[['Owner income goal, including tax reserve',goal()],['+ Cost of Sales',p.cos],['+ Fixed & operating expenses',p.opex]];
  if(p.roundingCushion>.005)rows.push(['+ Income above goal from whole closings',p.roundingCushion]);
  rows.push(['= Planned annual GCI',p.gci]);
  $('economicOutputs').innerHTML=rows.map(([label,value],i)=>'<div class="money-line '+(i===rows.length-1?'total':'')+'"><span>'+label+'</span><strong>'+money(value)+'</strong></div>').join('')+'<p class="help">Whole-closing commitments may produce income above your goal. Estimated owner profit margin: <strong>'+dec(p.margin)+'%</strong>.</p>';
 }
 if($('pipeline'))$('pipeline').innerHTML='<div class="pipeline">'+['seller','buyer'].map(side=>'<section><h3>'+(side==='seller'?'Seller Business':'Buyer Business')+'</h3>'+[
 ['Annual GCI',money(p[side+'Gci'])],['Closed units needed / year',p[side+'Sales']],['Signed agreements needed / year',E.up(p[side+'Signed'])],['Appointments needed / year',E.up(p[side+'Appointments'])],['Appointments needed / month',p[side+'Monthly']],['Appointments needed / week',p[side+'Weekly']]].map(([label,value],i)=>'<div class="pipe-row '+(i>0?'key-outcome':'')+'"><span>'+label+'</span><strong>'+value+'</strong></div>').join('')+'<div class="conversion-note"><strong>Your conversion assumptions</strong><span>Appointments → agreements: '+dec(s[side+'Sign'])+'%</span><span>Agreements → contracts: '+dec(s[side+'Close'])+'%</span><span>Contracts → closings: '+dec(s[side+'ContractClose'])+'%</span></div></section>').join('')+'</div>';
 if($('calculationDetails'))$('calculationDetails').innerHTML='<p>The model first finds the GCI that covers your income goal and business costs. Your listing/buyer share and average GCI per closed side determine the units needed. Whole-unit commitments round up, and costs are recalculated for that plan.</p><div class="detail-columns">'+['seller','buyer'].map(side=>'<section><h4>'+(side==='seller'?'Seller Business':'Buyer Business')+'</h4>'+[
 ['Selected share of closed units',dec(side==='seller'?s.sellerShare:100-s.sellerShare)+'%'],['Average GCI per closed side',money(s[side+'Commission'])],['Estimated Sales Price '+(side==='seller'?'Seller':'Buyer'),money(p[side+'Price'])],['Estimated annual closed volume',money(p[side+'Volume'])],['Contracts needed / year',E.up(p[side+'Contracts'])]].map(([label,value])=>'<div class="detail-row"><span>'+label+'</span><strong>'+value+'</strong></div>').join('')+'</section>').join('')+'</div><p>Closings divided by the contract-to-closing rate gives contracts needed. Contracts divided by the agreement-to-contract rate gives agreements needed. Agreements divided by the appointment-to-agreement rate gives appointments needed.</p><p>Monthly appointments divide each side’s annual appointment need by 12; weekly appointments divide it by '+dec(s.weeks)+' working weeks. Round each side up for practical commitments. Estimated volume uses the automatically estimated sale prices and planned closed units; it is a reference, not a market valuation.</p>';
 if($('outcomeSummary')){
  const hasAfter=s.goalMode==='life'&&Number.isFinite(life.afterTax);
  $('outcomeSummary').innerHTML='<section class="outcome-box"><div class="eyebrow">THE BUSINESS THAT FUNDS YOUR LIFE</div><p>To fund your <strong>'+money(goal())+' owner income goal before personal taxes</strong>'+(hasAfter?' and <strong>'+money(life.afterTax)+' in after-tax life needs</strong>':'')+', plan for <strong>'+p.sales+' closed units</strong> ('+p.sellerSales+' seller + '+p.buyerSales+' buyer), <strong>'+money(p.gci)+' in annual GCI</strong>, and approximately <strong>'+money(p.volume)+' in estimated closed volume</strong>.</p><p>Your planned owner income after business expenses is '+money(p.profit)+', before personal taxes. The resulting profit margin is '+dec(p.margin)+'%. These projections depend on the assumptions you entered above.</p></section>';
 }
 if($('fourConversations'))$('fourConversations').innerHTML=fourConversations(p);
 if($('bottomSummary'))$('bottomSummary').innerHTML=modelSummaryBox(p);
 if($('nextStage'))$('nextStage').hidden=!(s.saved?.fingerprint===fingerprint()&&storageOK);
 if($('savedNote'))$('savedNote').textContent=s.saved?.fingerprint===fingerprint()?(storageOK?'Economic Model saved in this browser.':'Model set for this session. Save a backup before closing.'):'Save your model when the assumptions reflect the business you intend to run.';
}
function render(){
 document.querySelectorAll('details[data-open]').forEach(el=>{if(el.open)open.add(el.dataset.open);else open.delete(el.dataset.open);});
 document.body.classList.toggle('after-setup',s.page!==0);const y=window.scrollY;$('stage').innerHTML=s.page===0?setup():s.page===1?costPage():appointmentPage();
 document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.page)===s.page);b.setAttribute('aria-current',Number(b.dataset.page)===s.page?'step':'false');});
 $('dockNext').textContent=s.page===2?'Save Model':s.page===1?'See Full Model':'Continue';numbers();window.scrollTo(0,y);
}
$('stage').addEventListener('input',e=>{
 const el=e.target;
 if(el.dataset.key){
  const k=el.dataset.key,v=el.value===''?NaN:Number(el.value);
  if(k==='overhead'){if(Number.isFinite(v)&&v>=0){const before=monthlyFixed(),base=E.BASE.fixed.reduce((a,x)=>a+x[2],0);s.fixed.forEach((x,i)=>{x.monthly=before?x.monthly/before*v:(i<E.BASE.fixed.length?E.BASE.fixed[i][2]/base*v:0);});}else{toast('Operating budget must be a nonnegative amount.');return;}}
  else s[k]=k==='sellerShare'&&Number.isFinite(v)?Math.round(v):v;
  if(k==='sellerCommission'||k==='buyerCommission'){const side=k.startsWith('seller')?'seller':'buyer';s[side+'Price']=E.estimatedPrice(v);}
  sync(k,k==='sellerShare'?s[k]:v,el);
  if(k==='overhead')document.querySelectorAll('[data-fixed-monthly],[data-fixed-annual]').forEach(input=>{const x=s.fixed.find(x=>x.id===(input.dataset.fixedMonthly||input.dataset.fixedAnnual));if(x)input.value=Math.round(x.monthly*(input.dataset.fixedAnnual?12:1)*100)/100;});
  persist();numbers();return;
 }
 if(el.dataset.fixedMonthly){const x=s.fixed.find(x=>x.id===el.dataset.fixedMonthly);if(x)x.monthly=el.value===''?0:Number(el.value);persist();numbers();const annual=el.closest('.fixed-expense')?.querySelector('[data-fixed-annual]');if(annual)annual.value=Math.round(x.monthly*12*100)/100;sync('overhead',monthlyFixed(),el);return;}
 if(el.dataset.fixedAnnual){const x=s.fixed.find(x=>x.id===el.dataset.fixedAnnual);if(x)x.monthly=(el.value===''?0:Number(el.value))/12;persist();numbers();const monthly=el.closest('.fixed-expense')?.querySelector('[data-fixed-monthly]');if(monthly)monthly.value=Math.round(x.monthly*100)/100;sync('overhead',monthlyFixed(),el);return;}
 if(el.dataset.variable){const x=s.variable.find(x=>x.id===el.dataset.variable);if(x)x.amount=el.value===''?0:Number(el.value);}
 if(el.dataset.name){const x=s.fixed.find(x=>x.id===el.dataset.name);if(x)x.name=el.value;}
 if(el.dataset.vname){const x=s.variable.find(x=>x.id===el.dataset.vname);if(x)x.name=el.value;}
 persist();numbers();
});
$('stage').addEventListener('change',e=>{
 const el=e.target;
 if(['goalMode','support','showingMode'].includes(el.id)){s[el.id]=el.value;persist();render();}
 if(['brokerCapEnabled','franchiseCapEnabled'].includes(el.id)){s[el.id]=el.checked;persist();render();}
 if(el.dataset.vbasis){const x=s.variable.find(x=>x.id===el.dataset.vbasis);if(x)x.basis=el.value;persist();render();}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.page!==undefined)return go(Number(b.dataset.page));
 if(b.dataset.level){s.level=Number(b.dataset.level);persist();return render();}
 if(b.dataset.deleteFixed){s.fixed=s.fixed.filter(x=>x.id!==b.dataset.deleteFixed);persist();return render();}
 if(b.dataset.deleteVariable){s.variable=s.variable.filter(x=>x.id!==b.dataset.deleteVariable);persist();return render();}
 if(b.dataset.addVariable){s.variable.push({id:'v-'+uid(),name:'',amount:0,basis:'closing',scope:b.dataset.addVariable});open.add('transaction-'+b.dataset.addVariable);persist();render();document.querySelector('[data-vname="'+s.variable.at(-1).id+'"]')?.focus();return;}
 switch(b.dataset.action){
  case'backup':$('export').click();break;case'next':next();break;case'back':go(s.page-1);break;case'setup':go(0);break;
  case'goal-edit':open.has('goal')?open.delete('goal'):open.add('goal');render();break;
  case'add-fixed':s.fixed.push({id:'f-'+uid(),name:'',hint:'A recurring business cost.',monthly:0,custom:true});open.add('fixed');persist();render();document.querySelector('[data-name="'+s.fixed.at(-1).id+'"]')?.focus();break;
  case'reset-conversions':s.sellerSign=80;s.sellerClose=65;s.buyerSign=65;s.buyerClose=80;s.sellerContractClose=100;s.buyerContractClose=100;persist();render();break;
 }
});
$('dockNext').addEventListener('click',next);
$('export').addEventListener('click',()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify({version:1,type:'life-and-business-backup',life:rawLife,business:s},null,2)],{type:'application/json'}));a.href=u;a.download='life-and-business-by-design.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);toast('Your backup file is ready.');});
window.addEventListener('storage',e=>{if(e.key===LIFE){readLife();render();}});
window.addEventListener('focus',()=>{readLife();numbers();});
if(window.visualViewport)visualViewport.addEventListener('resize',()=>document.body.classList.toggle('keyboard-open',window.innerHeight-visualViewport.height>150));
if(location.hash==='#appointments')s.page=2;
if(window.__LBD_TEST__)window.__BUSINESS={getState:()=>s,getGoal:goal,go,render};
persist();render();
})();