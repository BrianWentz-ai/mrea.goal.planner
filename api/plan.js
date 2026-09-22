import calendarModule from '../lib/calendar.cjs';
import {calendarGuideBase64} from '../lib/calendar-guide.js';
import {createHash} from 'node:crypto';
import {workbook,validatePlan,WORKBOOK_VERSION} from '../lib/workbook.js';
const attempts=new Map();
export function createHandler({env=process.env,fetcher=fetch,makePdf=workbook}={}){return async(req,res)=>{
 const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return reply(405,{error:'Use the plan delivery form.'});
 if(req.headers.origin && !['https://mrea-goal-planner.vercel.app',...(env.VERCEL_URL?['https://'+env.VERCEL_URL]:[]),...(env.NODE_ENV!=='production'?['http://127.0.0.1:4184','http://127.0.0.1:4186']:[])].includes(req.headers.origin))return reply(403,{error:'Open the delivery form from Life by Design.'});
 let data;try{data=typeof req.body==='string'?JSON.parse(req.body):req.body;validatePlan(data);}catch(e){return reply(400,{error:e instanceof TypeError?'Review and save each step before sending.':e.message});}
 const action=new URL(req.url,'http://localhost').searchParams.get('action');
 if(!['preview','package','send'].includes(action))return reply(400,{error:'Choose preview or send.'});
 if(action==='send'&&!env.RESEND_API_KEY)return reply(503,{error:'Email delivery is being connected. You can download your PDF now.'});
 const now=Date.now();for(const[k,v]of attempts)if(now-v.start>3600000)attempts.delete(k);
 const rateKey=createHash('sha256').update(String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown')).digest('hex');
 const bucket=attempts.get(rateKey)||{start:now,count:0};if(bucket.count>=20)return reply(429,{error:'Please try again in an hour.'});bucket.count++;attempts.set(rateKey,bucket);
 try{
 const pdf=await makePdf(data);
 // Older open tabs may omit calendar settings; use the saved planning period.
 if(!data.calendar){const start=data.gps.plan.input.start;const [year,month]=start.split('-').map(Number);data={...data,calendar:{start:start+'-01',end:new Date(Date.UTC(year,month+11,0)).toISOString().slice(0,10),timeZone:'America/New_York',excludeDates:''}};}
 let cal;try{cal=calendarModule.calendar(data);}catch(e){return reply(400,{error:e.message});}
 const attachments=[{filename:'My-Business-Plan.pdf',content:pdf.toString('base64'),type:'application/pdf'},{filename:'My-Timeblocked-Schedule.ics',content:Buffer.from(cal.content).toString('base64'),type:'text/calendar'},{filename:'Calendar-Import-Guide.pdf',content:calendarGuideBase64,type:'application/pdf'}];
 if(action==='package')return reply(200,{preview:true,sent:false,to:data.profile.email,subject:'Your Life By Design Business Plan',body:'Your complete business plan, timeblocked calendar, and calendar import instructions are attached.',calendarEvents:cal.count,attachments});
 if(action==='preview'){res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="My-Business-Plan.pdf"');return res.end(pdf);}
 const email=data.profile.email.trim().toLowerCase();
 const id=createHash('sha256').update(JSON.stringify([WORKBOOK_VERSION,'Your Life By Design Business Plan',email,data.business.saved,data.gps.saved,data.touch.saved,data.schedule,data.calendar,data.profile.name])).digest('hex');
 const result=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(25000),headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'plan-'+id},body:JSON.stringify({from:'Life by Design <plans@brianwentz.com>',reply_to:'brian@brianwentz.com',to:[email],subject:'Your Life By Design Business Plan',text:'Your personalized business planning workbook is attached. It includes your Economic Model, GPS, touch calendar, weekly routine and planning worksheets. Your timeblocked calendar for Google or Apple Calendar and a PDF import guide are also attached. Keep this copy for your records.\n\nLife by Design | The Ascending Agent',html:'<div style="font-family:Arial;color:#0e2433;max-width:600px;margin:auto;padding:32px"><h1>Your business plan is ready.</h1><p>Your personalized workbook is attached, including your Economic Model, GPS, touch calendar, weekly routine and planning worksheets.</p><p>Your timeblocked calendar file and step-by-step Google and Apple Calendar import guide are also attached.</p><p>Give your goals a place on your calendar, then use your worksheets to review your progress.</p><p style="color:#23765f">Life by Design | The Ascending Agent</p></div>',attachments:attachments.map(({filename,content})=>({filename,content}))})});
 if(!result.ok)return reply(502,{error:'The email service could not accept your plan. Please retry or download your PDF.'});
 return reply(200,{accepted:true});
 }catch{return reply(502,{error:'Delivery could not finish. Please retry; duplicate requests are protected. You can also download your PDF.'});}
 };}
export default createHandler();

