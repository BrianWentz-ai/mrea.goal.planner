const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'../public/life-by-design');
const ctx={module:{exports:{}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'business-engine.js'),'utf8'),ctx);const E=ctx.module.exports;
const near=(a,b)=>assert(Math.abs(a-b)<.0001,`${a} != ${b}`);
for(const share of [0,37,100]){
 const s=E.defaults();Object.assign(s,{sellerShare:share,sellerCommission:14000,buyerCommission:8400,sellerPrice:1,buyerPrice:1});
 const r=E.solve(s,175000);assert(!r.error);const p=r.plan;
 near(p.sellerPrice,500000);near(p.buyerPrice,300000);near(p.volume,p.gci/.028);
 near(p.sellerVolume,p.sellerClosed*500000);near(p.buyerVolume,p.buyerClosed*300000);
 assert(p.profit>=175000);near(p.gci,p.cos+p.opex+175000+p.roundingCushion);
}
const js=fs.readFileSync(path.join(root,'business.js'),'utf8');
const helper=js.slice(js.indexOf('function scorecardGoals('),js.indexOf('function fourConversations('));
const c={E};vm.createContext(c);vm.runInContext(helper,c);
const p=E.solve(E.defaults(),150000).plan,g=c.scorecardGoals(p);
assert.equal(g.appointments,p.monthly);assert.equal(g.agreements,p.sellerAgreementsMonthly+p.buyerAgreementsMonthly);assert.equal(g.closings,Math.ceil(p.sellerSales/12)+Math.ceil(p.buyerSales/12));near(g.gci,p.gci/12);
const migration=js.slice(js.indexOf('function migrateVariables('),js.indexOf('try{s=restore('));
const m={E,life:{value:150000},uid:()=> 'test'};vm.createContext(m);vm.runInContext(migration,m);
const old=E.defaults();Object.assign(old,{version:3,weeks:42,sellerCommission:14000,buyerCommission:8400,sellerPrice:777,saved:{old:true},actuals:{gci:100}});const updated=m.restore(old);
assert.equal(updated.version,4);assert.equal(updated.weeks,42);assert.equal(updated.saved,null);assert.equal(updated.actuals.gci,100);near(updated.sellerPrice,500000);near(updated.buyerPrice,300000);assert.equal(updated.fixed.length,old.fixed.length);
console.log('PASS derived volume, rounded financial bridge, Four Conversations goals, and saved-plan migration');
