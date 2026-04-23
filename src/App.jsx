import { useState } from "react";

const SOLO_OPEX_SUGGESTIONS = [
  { key: "leadGen",   label: "Lead Generation",   suggested: 12, min: 5,  max: 25, hint: "MREA benchmark: 12%" },
  { key: "marketing", label: "Marketing & Signs",  suggested: 5,  min: 2,  max: 12, hint: "Suggested: 3–6%" },
  { key: "techTools", label: "Tech & Tools",       suggested: 3,  min: 1,  max: 8,  hint: "CRM, IDX, showing software" },
  { key: "adminMisc", label: "Admin & Misc",       suggested: 5,  min: 2,  max: 10, hint: "Postage, printing, dues" },
];

const C = {
  red: "#CC0000", darkRed: "#a00000",
  sell: "#1d4ed8", sellLight: "#eff6ff",
  buy: "#15803d",  buyLight: "#f0fdf4",
  gray: "#6b7280", border: "#e5e7eb",
  light: "#f3f4f6", text: "#111827", sub: "#374151",
};

const fmt$ = (n) => {
  if (!isFinite(n) || isNaN(n)) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
};

const r1 = (n) => (isFinite(n) ? n.toFixed(1) : "0.0");
const rc = (n) => (isFinite(n) ? Math.ceil(n) : 0);
const ceil1 = (n) => (isFinite(n) ? Math.ceil(n * 10) / 10 : 0);

const Card = ({ children, top, style = {} }) => (
  <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderTop:`3px solid ${top||C.red}`, borderRadius:"8px", padding:"16px 18px", marginBottom:"14px", ...style }}>
    {children}
  </div>
);

const SecTitle = ({ children }) => (
  <div style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"0.13em", textTransform:"uppercase", color:C.gray, marginBottom:"11px" }}>{children}</div>
);

const StatRow = ({ label, value, bold, color, indent, sub }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${C.light}`, paddingLeft: indent?14:0 }}>
    <span style={{ fontSize: sub?"11px":"12px", color: sub?C.gray:C.sub, fontWeight: bold?"700":"400", fontStyle: sub?"italic":"normal" }}>{label}</span>
    <span style={{ fontSize: bold?"15px":"13px", fontWeight: bold?"700":"600", color: color||C.text, fontFamily:"monospace" }}>{value}</span>
  </div>
);

const Slider = ({ label, value, min, max, step, onChange, format, suffix, hint }) => {
  const disp = format === "$" ? `$${Math.round(value).toLocaleString()}` : `${value}${suffix||""}`;
  return (
    <div style={{ marginBottom:"14px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"2px" }}>
        <label style={{ fontSize:"12px", color:C.gray, fontWeight:"500" }}>{label}</label>
        <span style={{ fontSize:"13px", fontWeight:"700", color:C.text, fontFamily:"monospace" }}>{disp}</span>
      </div>
      {hint && <div style={{ fontSize:"10px", color:"#9ca3af", marginBottom:"4px", fontStyle:"italic" }}>{hint}</div>}
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{ width:"100%", accentColor:C.red, cursor:"pointer" }} />
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:"1px" }}>
        <span style={{ fontSize:"10px", color:"#d1d5db" }}>{format==="$" ? `$${Number(min).toLocaleString()}` : `${min}${suffix||""}`}</span>
        <span style={{ fontSize:"10px", color:"#d1d5db" }}>{format==="$" ? `$${Number(max).toLocaleString()}` : `${max}${suffix||""}`}</span>
      </div>
    </div>
  );
};

const FunnelStep = ({ label, value, color, isLast }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
    <div style={{ background:color, color:"#fff", borderRadius:"6px", padding:"9px 12px", textAlign:"center", width:"100%" }}>
      <div style={{ fontSize:"22px", fontWeight:"800", fontFamily:"monospace", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:"10px", marginTop:"3px", opacity:0.9, fontWeight:"600" }}>{label}</div>
    </div>
    {!isLast && <div style={{ fontSize:"14px", color:"#d1d5db", margin:"3px 0" }}>▼</div>}
  </div>
);

const WeeklyStat = ({ label, value, color, bg }) => (
  <div style={{ background:bg||C.light, borderRadius:"8px", padding:"12px 8px", textAlign:"center" }}>
    <div style={{ fontSize:"26px", fontWeight:"900", color:color||C.text, fontFamily:"monospace", lineHeight:1 }}>{value}</div>
    <div style={{ fontSize:"10px", color:C.gray, marginTop:"4px", fontWeight:"600" }}>{label}</div>
  </div>
);

export default function App() {
  const [incomeGoal,    setIncomeGoal]    = useState(75000);
  const [sellerPct,     setSellerPct]     = useState(50);
  const [avgCommission, setAvgCommission] = useState(8000);
  const [capAmount,     setCapAmount]     = useState(18000);
  const [royaltyPct,    setRoyaltyPct]    = useState(6);
  const [eAndO,         setEAndO]         = useState(1200);
  const [opex, setOpex] = useState({ leadGen:12, marketing:5, techTools:3, adminMisc:5 });
  const setO = (k) => (v) => setOpex(p => ({ ...p, [k]: v }));

  const buyerPct = 100 - sellerPct;
  const A2G = 0.75;
  const G2C = 0.75;

  const opexPct = Object.values(opex).reduce((a,b)=>a+b,0) / 100;
  const safeNet = Math.max(0.01, 1 - opexPct);
  const royFactor = Math.min(royaltyPct, 6) / 100;
  const agentAfterKWNeeded = incomeGoal / safeNet;
  const agentGrossNeeded   = (agentAfterKWNeeded + capAmount + eAndO) / (1 - royFactor);
  const gciNeeded          = agentGrossNeeded;

  const sellGCI  = gciNeeded * (sellerPct / 100);
  const buyGCI   = gciNeeded * (buyerPct  / 100);

  const ac = Math.max(1, avgCommission);
  const sellClosed = sellGCI / ac;
  const buyClosed  = buyGCI  / ac;
  const totalClosed = sellClosed + buyClosed;

  const sellAgreements  = sellClosed  / G2C;
  const sellAppts       = sellAgreements  / A2G;
  const buyAgreements   = buyClosed   / G2C;
  const buyAppts        = buyAgreements   / A2G;
  const totalAppts      = sellAppts + buyAppts;

  const sellApptWk  = sellAppts / 52;
  const buyApptWk   = buyAppts  / 52;
  const totalApptWk = totalAppts / 52;
  const totalApptMo = totalAppts / 12;

  const royaltyAmt    = agentGrossNeeded * royFactor;
  const agentAfterKW  = agentGrossNeeded - capAmount - royaltyAmt - eAndO;
  const totalOpexAmt  = agentAfterKW * opexPct;
  const netIncome     = agentAfterKW - totalOpexAmt;
  const netPct        = agentAfterKW > 0 ? (netIncome / agentAfterKW) * 100 : 0;
  const health        = netPct >= 30
    ? { label:"Healthy", color:"#16a34a" }
    : netPct >= 15
    ? { label:"Watch", color:"#d97706" }
    : { label:"Rebuild", color:C.red };

  return (
    <div style={{ fontFamily:"'Inter','Helvetica Neue',sans-serif", background:"#f7f7f5", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input[type=range] { -webkit-appearance:none; appearance:none; height:4px; border-radius:2px; background:#e5e7eb; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#CC0000; cursor:pointer; border:2px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.2); }
      `}</style>

      <div style={{ background:C.red, padding:"15px 24px", borderBottom:`4px solid ${C.darkRed}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", maxWidth:"1140px", margin:"0 auto" }}>
          <div style={{ width:"38px", height:"38px", background:"#fff", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:"16px", fontWeight:"900", color:C.red }}>KW</span>
          </div>
          <div>
            <div style={{ fontSize:"19px", fontWeight:"900", color:"#fff", letterSpacing:"-0.02em" }}>MREA Goal Planner</div>
            <div style={{ fontSize:"10px", color:"rgba(255,255,255,.75)", letterSpacing:"0.1em", textTransform:"uppercase" }}>Solo Agent · Income Goal → Weekly Appointments</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:"1140px", margin:"0 auto", padding:"18px 16px" }}>
        <Card top={C.red} style={{ marginBottom:"18px" }}>
          <SecTitle>🎯 Your Goal & Business Mix</SecTitle>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"24px" }}>
            <Slider label="Net Income Goal" value={incomeGoal} min={25000} max={500000} step={5000} onChange={setIncomeGoal} format="$" hint="Take-home after all expenses" />
            <Slider label="Seller Side % of Business" value={sellerPct} min={0} max={100} step={5} onChange={setSellerPct} suffix="%" hint={`Buyer side auto-set to ${buyerPct}%`} />
            <Slider label="Avg Commission Per Side" value={avgCommission} min={1000} max={50000} step={500} onChange={setAvgCommission} format="$" hint="Your avg commission per closed side" />
          </div>
        </Card>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px", alignItems:"start" }}>

          <div>
            <div style={{ background:C.sell, color:"#fff", borderRadius:"8px 8px 0 0", padding:"10px 16px", fontSize:"11px", fontWeight:"800", letterSpacing:"0.12em", textTransform:"uppercase" }}>
              🏡 Seller Side · {sellerPct}%
            </div>
            <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 8px 8px", padding:"16px 18px", marginBottom:"14px" }}>
              <div style={{ textAlign:"center", paddingBottom:"12px", borderBottom:`1px solid ${C.border}`, marginBottom:"14px" }}>
                <div style={{ fontSize:"11px", color:C.gray, marginBottom:"3px" }}>Seller GCI Needed</div>
                <div style={{ fontSize:"32px", fontWeight:"900", color:C.sell, fontFamily:"monospace" }}>{fmt$(sellGCI)}</div>
              </div>
              <SecTitle>Listing Funnel</SecTitle>
              <FunnelStep label="Closed Listing Sides" value={r1(sellClosed)} color={C.sell} />
              <FunnelStep label="Listing Agreements Needed" value={r1(sellAgreements)} color="#2563eb" />
              <FunnelStep label="Listing Appointments Needed" value={r1(sellAppts)} color="#60a5fa" isLast />
              <div style={{ marginTop:"14px", background:C.sellLight, borderRadius:"8px", padding:"12px" }}>
                <div style={{ fontSize:"10px", color:C.sell, fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Weekly Cadence</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                  <span style={{ fontSize:"12px", color:C.sub }}>Listing Appts / Week</span>
                  <span style={{ fontSize:"24px", fontWeight:"900", color:C.sell, fontFamily:"monospace" }}>{ceil1(sellApptWk)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:"12px", color:C.sub }}>Listing Appts / Month</span>
                  <span style={{ fontSize:"18px", fontWeight:"700", color:C.sell, fontFamily:"monospace" }}>{rc(sellAppts/12)}</span>
                </div>
              </div>
              <div style={{ marginTop:"10px", background:C.light, borderRadius:"6px", padding:"8px 10px" }}>
                <div style={{ fontSize:"10px", color:C.gray, marginBottom:"3px", fontWeight:"600" }}>Conversion Assumptions</div>
                <div style={{ fontSize:"11px", color:C.sub }}>Appointment → Listing Agreement: <strong>75%</strong></div>
                <div style={{ fontSize:"11px", color:C.sub }}>Listing Agreement → Closed: <strong>75%</strong></div>
              </div>
            </div>
          </div>

          <div>
            <Card top={C.red} style={{ textAlign:"center" }}>
              <SecTitle>📊 GCI Needed to Hit Your Goal</SecTitle>
              <div style={{ fontSize:"40px", fontWeight:"900", color:C.red, fontFamily:"monospace", letterSpacing:"-0.02em", lineHeight:1 }}>{fmt$(gciNeeded)}</div>
              <div style={{ fontSize:"11px", color:C.gray, marginTop:"6px" }}>Gross Commission Income Required</div>
            </Card>

            <Card top="#111827">
              <SecTitle>📅 Appointments You Need Each Week</SecTitle>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"12px" }}>
                <WeeklyStat label="Listing Appts / Wk" value={ceil1(sellApptWk)} color={C.sell} bg={C.sellLight} />
                <WeeklyStat label="Buyer Appts / Wk"   value={ceil1(buyApptWk)}  color={C.buy}  bg={C.buyLight}  />
              </div>
              <div style={{ background:"#111827", borderRadius:"10px", padding:"16px", textAlign:"center" }}>
                <div style={{ fontSize:"10px", color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"4px" }}>Total Appointments Per Week</div>
                <div style={{ fontSize:"52px", fontWeight:"900", color:"#fff", fontFamily:"monospace", letterSpacing:"-0.02em", lineHeight:1 }}>{ceil1(totalApptWk)}</div>
                <div style={{ fontSize:"13px", color:"#9ca3af", marginTop:"8px" }}>{rc(totalApptMo)} appts / month · {rc(totalAppts)} / year</div>
              </div>
            </Card>

            <Card top="#374151">
              <SecTitle>💵 Income Waterfall</SecTitle>
              <StatRow label="GCI Required"              value={fmt$(gciNeeded)}     bold />
              <StatRow label="Cap to KW"                  value={`(${fmt$(capAmount)})`}   indent color={C.gray} />
              <StatRow label={`Royalty (${royaltyPct}%)`} value={`(${fmt$(royaltyAmt)})`}  indent color={C.gray} />
              <StatRow label="E&O / Fees"                 value={`(${fmt$(eAndO)})`}        indent color={C.gray} />
              <StatRow label="Agent Net After KW"         value={fmt$(agentAfterKW)}   bold />
              <StatRow label={`Operating Expenses (${(opexPct*100).toFixed(0)}%)`} value={`(${fmt$(totalOpexAmt)})`} indent color={C.red} />
              <div style={{ height:"6px" }} />
              <StatRow label="NET INCOME" value={fmt$(netIncome)} bold color={netIncome>=0?"#16a34a":C.red} />
              <div style={{ marginTop:"10px", textAlign:"center" }}>
                <span style={{ fontSize:"11px", fontWeight:"700", color:health.color, background:`${health.color}18`, padding:"3px 14px", borderRadius:"20px", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                  ● {health.label} · {r1(netPct)}% Net Margin
                </span>
              </div>
            </Card>

            <Card top={C.gray}>
              <SecTitle>🏢 KW Splits</SecTitle>
              <Slider label="Cap Amount"   value={capAmount}  min={0}   max={36000} step={500} onChange={setCapAmount}  format="$" />
              <Slider label="Royalty Rate" value={royaltyPct} min={0}   max={6}     step={0.5} onChange={setRoyaltyPct} suffix="%" hint="Capped at 6% of agent gross" />
              <Slider label="E&O / Fees"   value={eAndO}      min={0}   max={5000}  step={100} onChange={setEAndO}      format="$" />
            </Card>
          </div>

          <div>
            <div style={{ background:C.buy, color:"#fff", borderRadius:"8px 8px 0 0", padding:"10px 16px", fontSize:"11px", fontWeight:"800", letterSpacing:"0.12em", textTransform:"uppercase" }}>
              🔑 Buyer Side · {buyerPct}%
            </div>
            <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 8px 8px", padding:"16px 18px", marginBottom:"14px" }}>
              <div style={{ textAlign:"center", paddingBottom:"12px", borderBottom:`1px solid ${C.border}`, marginBottom:"14px" }}>
                <div style={{ fontSize:"11px", color:C.gray, marginBottom:"3px" }}>Buyer GCI Needed</div>
                <div style={{ fontSize:"32px", fontWeight:"900", color:C.buy, fontFamily:"monospace" }}>{fmt$(buyGCI)}</div>
              </div>
              <SecTitle>Buyer Funnel</SecTitle>
              <FunnelStep label="Closed Buyer Sides" value={r1(buyClosed)} color={C.buy} />
              <FunnelStep label="Buyer Agreements Needed" value={r1(buyAgreements)} color="#16a34a" />
              <FunnelStep label="Buyer Consultations Needed" value={r1(buyAppts)} color="#4ade80" isLast />
              <div style={{ marginTop:"14px", background:C.buyLight, borderRadius:"8px", padding:"12px" }}>
                <div style={{ fontSize:"10px", color:C.buy, fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Weekly Cadence</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                  <span style={{ fontSize:"12px", color:C.sub }}>Buyer Appts / Week</span>
                  <span style={{ fontSize:"24px", fontWeight:"900", color:C.buy, fontFamily:"monospace" }}>{ceil1(buyApptWk)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:"12px", color:C.sub }}>Buyer Appts / Month</span>
                  <span style={{ fontSize:"18px", fontWeight:"700", color:C.buy, fontFamily:"monospace" }}>{rc(buyAppts/12)}</span>
                </div>
              </div>
              <div style={{ marginTop:"10px", background:C.light, borderRadius:"6px", padding:"8px 10px" }}>
                <div style={{ fontSize:"10px", color:C.gray, marginBottom:"3px", fontWeight:"600" }}>Conversion Assumptions</div>
                <div style={{ fontSize:"11px", color:C.sub }}>Appointment → Buyer Agreement: <strong>75%</strong></div>
                <div style={{ fontSize:"11px", color:C.sub }}>Buyer Agreement → Closed: <strong>75%</strong></div>
              </div>
            </div>

            <Card top={C.gray}>
              <SecTitle>📊 Solo Agent Operating Expenses</SecTitle>
              <div style={{ background:"#fef9c3", borderRadius:"6px", padding:"8px 10px", marginBottom:"12px", fontSize:"11px", color:"#92400e" }}>
                💡 Pre-set to MREA benchmarks for new/solo agents.
              </div>
              {SOLO_OPEX_SUGGESTIONS.map(item => (
                <Slider key={item.key} label={item.label} value={opex[item.key]}
                  min={item.min} max={item.max} step={1} onChange={setO(item.key)} suffix="%" hint={item.hint} />
              ))}
              <div style={{ borderTop:`2px solid ${C.border}`, marginTop:"6px", paddingTop:"8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"12px", fontWeight:"700", color:C.sub }}>Total OpEx</span>
                <span style={{ fontSize:"14px", fontWeight:"800", color: (opexPct*100)<=30?"#16a34a":C.red, fontFamily:"monospace" }}>
                  {(opexPct*100).toFixed(0)}% {(opexPct*100)<=30?"✓":"⚠ Over 30%"}
                </span>
              </div>
            </Card>
          </div>
        </div>

        <Card top={C.red}>
          <SecTitle>📋 Annual Production Summary</SecTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"10px" }}>
            {[
              { label:"Total GCI Needed",     value: fmt$(gciNeeded),              color: C.red  },
              { label:"Total Closed Sides",   value: r1(totalClosed),              color: C.text },
              { label:"Seller Sides Closed",  value: r1(sellClosed),               color: C.sell },
              { label:"Buyer Sides Closed",   value: r1(buyClosed),                color: C.buy  },
              { label:"Total Agreements",     value: rc(sellAgreements+buyAgreements), color: C.text },
              { label:"Total Annual Appts",   value: rc(totalAppts),               color: C.text },
            ].map(item => (
              <div key={item.label} style={{ background:C.light, borderRadius:"8px", padding:"12px 8px", textAlign:"center" }}>
                <div style={{ fontSize:"22px", fontWeight:"900", color:item.color, fontFamily:"monospace", lineHeight:1 }}>{item.value}</div>
                <div style={{ fontSize:"10px", color:C.gray, marginTop:"5px", fontWeight:"600" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ textAlign:"center", padding:"14px", fontSize:"10px", color:"#9ca3af" }}>
        Millionaire Real Estate Agent Economic Model · Keller Williams · 75% Appt→Agreement · 75% Agreement→Close
      </div>
    </div>
  );
}
