/* Shared contact details. Stored locally; no contact data is transmitted here. */
(()=>{
'use strict';
const KEY='lifeByDesign:profile:v1';
const empty=()=>({version:1,name:'',email:'',phone:'',emailMarketing:false,textMarketing:false});
function clean(p){return {...empty(),name:String(p?.name||'').trim().slice(0,100),email:String(p?.email||'').trim().slice(0,254),phone:String(p?.phone||'').trim().slice(0,40),emailMarketing:p?.emailMarketing===true,textMarketing:p?.textMarketing===true,updatedAt:String(p?.updatedAt||'').slice(0,40)};}
let value=empty();try{value=clean(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{}
const valid=p=>!!p.name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email);
function save(p){localStorage.setItem(KEY,JSON.stringify(p));value=p;refresh();}
window.LBDProfile={get:()=>({...value}),valid:()=>valid(value),restore:p=>{save(clean(p));if(home&&!valid(value))open(true);else close();},reset:()=>{localStorage.removeItem(KEY);value=empty();refresh();if(home)open(true);}};
const home=!!document.getElementById('stage');
const css=document.createElement('link');css.rel='stylesheet';css.href='profile.css?v=20260921contact1';document.head.append(css);
const section=document.createElement('section');section.className='contact-panel';section.id='contactPanel';
section.innerHTML=`<div class="contact-heading"><div><div class="contact-kicker">YOUR PERSONAL PLAN</div><h2>Make this plan yours</h2></div><button type="button" id="contactEdit">Edit contact details</button></div><p id="contactSummary"></p><form id="contactForm"><p>Personalize your plan and choose where we’ll email your completed workbook.</p><div class="contact-fields"><label>Full name <span>(required)</span><input name="name" autocomplete="name" maxlength="100" required></label><label>Email <span>(required)</span><input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>Phone <span>(optional)</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label></div><fieldset><legend>Optional updates from Brian Wentz</legend><label class="contact-choice"><input type="checkbox" name="emailMarketing"> I’d also like marketing emails from Brian Wentz. I can unsubscribe at any time.</label><label class="contact-choice"><input type="checkbox" name="textMarketing"> I’d also like marketing texts from Brian Wentz at the number above. Message frequency varies; message and data rates may apply. Reply STOP to opt out.</label><p class="contact-small">These choices are optional and are not required to receive your plan. Selecting them does not enroll you or send messages yet.</p></fieldset><p class="contact-small">Your details stay in this browser until email delivery is connected. This does not create an account. Backups may contain your contact details.</p><p id="contactError" role="alert"></p><div class="contact-buttons"><button type="submit" class="contact-primary" id="contactSave">Start My Plan</button><button type="button" id="contactCancel">Cancel</button></div></form>`;
const main=document.querySelector('main');if(!main)return;
if(home){document.querySelector('.intro').after(section);}else{main.append(section);}
const form=section.querySelector('form'),summary=document.getElementById('contactSummary'),error=document.getElementById('contactError');
const edit=document.getElementById('contactEdit'),cancel=document.getElementById('contactCancel');
function refresh(){summary.textContent=valid(value)?`${value.name} · ${value.email}${value.phone?' · '+value.phone:''}`:'Add your name and email to personalize your workbook.';document.querySelectorAll('[data-plan-name]').forEach(el=>{el.textContent=value.name||'__________________________';});}
function open(required=false){for(const name of ['name','email','phone'])form.elements[name].value=value[name];for(const name of ['emailMarketing','textMarketing'])form.elements[name].checked=value[name];form.hidden=false;summary.hidden=true;edit.hidden=true;cancel.hidden=required;error.textContent='';document.getElementById('contactSave').textContent=required?'Start My Plan':'Save Contact Details';if(required)document.body.classList.add('contact-required');}
function close(){form.hidden=true;summary.hidden=false;edit.hidden=false;document.body.classList.remove('contact-required');refresh();}
edit.onclick=()=>open();cancel.onclick=close;
form.elements.phone.addEventListener('input',()=>form.elements.phone.setCustomValidity(''));
form.elements.textMarketing.addEventListener('change',()=>form.elements.phone.setCustomValidity(''));
form.onsubmit=e=>{e.preventDefault();error.textContent='';const p=clean(Object.fromEntries(new FormData(form)));p.emailMarketing=form.elements.emailMarketing.checked;p.textMarketing=form.elements.textMarketing.checked;
 if(!valid(p)){error.textContent='Enter your name and a valid email address.';return;}
 if(p.textMarketing&&p.phone.replace(/\D/g,'').length<7){form.elements.phone.setCustomValidity('Enter a phone number to choose marketing texts, or leave that choice unchecked.');form.elements.phone.reportValidity();return;}
 p.updatedAt=new Date().toISOString();try{save(p);const starting=document.body.classList.contains('contact-required');close();if(starting){document.getElementById('stage')?.scrollIntoView({block:'start'});document.querySelector('#stage h2')?.focus();}}catch{error.textContent='Your browser could not save these details. Allow site storage and try again. Nothing was submitted.';}
};
const header=document.querySelector('header .header-inner,header .header');if(header){const button=document.createElement('button');button.type='button';button.className='contact-header-button';button.textContent='My Contact Details';button.onclick=()=>{open();section.scrollIntoView({block:'start'});form.elements.name.focus();};header.append(button);}
refresh();if(home&&!valid(value))open(true);else close();
})();
