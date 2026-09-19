const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'../public/life-by-design');
function load(file){const c={module:{exports:{}},console};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);return c.module.exports;}
const E=load('business-engine.js'),T=load('app.js');let passed=0;
function test(name,f){f();passed++;console.log('PASS '+name)}
const close=(a,b,t=.01)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
test('2026 single standard deduction and first bracket',()=>{const x=T.taxAtIncome(30000);close(x.se,30000*.9235*.153);close(x.federal,(30000-x.se/2-16100)*.1)});
test('2026 joint standard deduction',()=>close(T.taxAtIncome(32200,'joint').federal,0));
test('Social Security cap and Medicare thresholds',()=>{const x=T.taxAtIncome(300000);close(x.se,184500*.124+300000*.9235*.029);close(x.additionalMedicare,(300000*.9235-200000)*.009)});
test('Tax gross-up returns requested after-tax needs',()=>{for(const filing of ['single','joint'])for(const needs of [0,1000,40000,200000,1000000])for(const state of [0,5,20]){const x=T.solveGross(needs,filing,state);close(x.gross-x.tax,needs)}});
test('Invalid tax assumptions rejected',()=>{assert.throws(()=>T.taxAtIncome(-1));assert.throws(()=>T.taxAtIncome(1000,'other'));assert.throws(()=>T.taxAtIncome(1000,'single',21))});
test('Independent company dollar and royalty caps',()=>{const s=E.defaults();let r=E.breakdown(s,25000);close(r.broker,7500);close(r.franchise,1500);r=E.breakdown(s,60000);close(r.broker,18000);close(r.franchise,3000);r=E.breakdown(s,500000);close(r.broker,18000);close(r.franchise,3000)});
test('Uncapped fees and zero cap',()=>{const s=E.defaults();s.brokerCapEnabled=false;s.franchiseCapEnabled=false;let r=E.breakdown(s,200000);close(r.broker,60000);close(r.franchise,12000);s.brokerCapEnabled=true;s.brokerCap=0;close(E.breakdown(s,200000).broker,0)});
test('Transaction mix with different commissions',()=>{const s=E.defaults();s.sellerShare=60;s.sellerCommission=12000;s.buyerCommission=8000;const r=E.breakdown(s,104000);close(r.sellerClosed,6);close(r.buyerClosed,4);close(r.sellerGci,72000);close(r.buyerGci,32000)});
test('0% and 100% listing mix',()=>{for(const share of [0,100]){const s=E.defaults();s.sellerShare=share;const r=E.solve(s,100000);assert(!r.error);assert.equal(share===0?r.sellerWeekly:r.buyerWeekly,0);close(r.sellerGci+r.buyerGci,r.gci);close(r.profit,100000)}});
test('All staffing and cap combinations balance',()=>{for(const level of [1,2,3,4])for(const support of ['buyer','showing'])for(const cap of [false,true]){const s=E.defaults();s.level=level;s.support=support;s.brokerCapEnabled=cap;const r=E.solve(s,175000);assert(!r.error);close(r.gci-r.cos-r.opex,175000)}});
test('Weekly targets derive from annual appointments, not rounded months',()=>{const s=E.defaults();s.weeks=48;const r=E.solve(s,150000);assert.equal(r.sellerWeekly,Math.ceil(r.sellerAppointments/48));s.weeks=40;assert(E.solve(s,150000).weekly>=r.weekly)});
test('Impossible cost model rejected',()=>{const s=E.defaults();s.brokerCapEnabled=false;s.brokerPercent=100;assert(E.solve(s,100000).error)});
test('Stored goal rejects stale life target',()=>{assert(E.lifeTarget({version:5,handoff:{annualPersonalGrossIncome:100000,fingerprint:'old'}}).error)});
console.log(`${passed} model test groups passed`);
