const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),ctx={};vm.createContext(ctx);for(const f of ['business-engine.js','gps-templates.js','gps-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/life-by-design',f),'utf8'),ctx);const E=ctx.LBDBusiness,G=ctx.LBDGPS,T=ctx.LBDGPSTemplates;
const b=E.defaults();b.goalMode='manual';b.manualGoal=150000;b.saved={fingerprint:JSON.stringify({...b,page:0,saved:null,activeGoal:150000})};
const src=G.source(b,null),input={blueprint:T.templates[0].id,start:'2026-09',mets:100,returnRate:5,minutes:90};
assert.equal(E.defaults().sellerContractClose,90);assert.equal(E.defaults().buyerContractClose,90);
for(const t of T.templates){const p=G.generate({...input,blueprint:t.id},src);assert.equal(p.priorities.length,3);assert(p.priorities.every(x=>x.strategies.length===5));assert(!p.priorities.flatMap(x=>x.strategies.map(s=>s.text)).join(' ').match(/\[[^\]]+\]/));assert.equal(p.goal.gci,p.goal.profit+src.plan.cos+src.plan.opex);assert.equal(p.goal.listings,Math.ceil(src.plan.sellerSigned));assert.equal(p.weeklyLeads,Math.ceil(src.plan.sales*10/src.weeks));}
const zero=G.generate({...input,mets:0},src),full=G.generate({...input,mets:100000},src);assert.equal(zero.database.existingCapacity,0);assert.equal(full.database.monthly,0);assert(full.database.weeklyCalls>10);
const mature=G.generate({...input,returnRate:10},src);assert.equal(mature.database.existingCapacity,10);assert.equal(mature.database.target,Math.ceil(src.plan.sales/.1));
assert.throws(()=>G.source({...b,weeks:40},null),/changed/);assert.throws(()=>G.source({...b,saved:null},null),/save/);assert.throws(()=>G.source({...b,goalMode:'life'},null),/Life/);
for(const bad of [{mets:-1},{mets:1.1},{returnRate:0},{blueprint:''},{start:'2026-13'},{minutes:NaN}])assert.throws(()=>G.generate({...input,...bad},src));
console.log('PASS all ten GPS templates, financial handoff, database/lead targets, invalid input and stale-model rejection');


