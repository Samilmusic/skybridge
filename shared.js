/* One authenticated client per page; public configuration contains no server secrets. */
(()=>{'use strict';const c=window.SKYBRIDGE_CONFIG||{};
window.SkyBridgeDB=(c.supabaseUrl&&c.supabaseAnonKey&&window.supabase)?window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey):null;
window.SkyBridge={
 async enquiry(payload){
 const response=await fetch(c.supabaseUrl+'/functions/v1/submit-enquiry',{method:'POST',headers:{'Content-Type':'application/json',apikey:c.supabaseAnonKey},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Unable to send. Please retry or call +971 50 242 3340.');return data;
 },
 bind(form,category){if(!form)return;form.dataset.requestId=crypto.randomUUID();
 form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const result=form.querySelector('[role=status]'),button=form.querySelector('[type=submit]');const value=k=>form.querySelector('[name="'+k+'"],#'+k)?.value.trim()||'';button.disabled=true;const label=button.textContent;button.textContent='Sending…';result.textContent='';
 try{const data=await window.SkyBridge.enquiry({request_id:form.dataset.requestId,category,name:value('name'),email:value('email'),phone:value('phone'),company:value('company'),service:value('service')||value('interest')||category,message:value('goals')||value('message'),website:value('website'),consent:!!form.querySelector('[name=consent]')?.checked});result.textContent='Request received. Your reference: '+data.reference+'. Keep this reference when contacting us. No payment has been taken.';form.reset();form.dataset.requestId=crypto.randomUUID();result.focus();}catch(err){result.textContent=err.name==='TimeoutError'?'The connection timed out. Retry using this form; your request will not be duplicated.':err.message;}finally{button.disabled=false;button.textContent=label;}});
 }
};
document.addEventListener('DOMContentLoaded',()=>{
 const menu=document.querySelector('#mobileMenu'),toggle=document.querySelector('#menuToggle');if(menu&&toggle){toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));menu.hidden=!open;};menu.querySelectorAll('a').forEach(a=>a.onclick=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false')});document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;toggle.setAttribute('aria-expanded','false')}})}
 window.SkyBridge.bind(document.querySelector('#contactForm'),'general');window.SkyBridge.bind(document.querySelector('#f'),'advertising');
 const params=new URLSearchParams(location.search);const interest=document.querySelector('#interest');if(interest&&[...interest.options].some(o=>o.value===params.get('service')))interest.value=params.get('service');const message=document.querySelector('#message');if(message&&params.get('message'))message.value=params.get('message').slice(0,3000);const s=params.get('service');const select=document.querySelector('select[name=service]');if(select&&s&&[...select.options].some(o=>o.value===s))select.value=s;
 document.querySelectorAll('.sb-year').forEach(e=>e.textContent=new Date().getFullYear());
});})();
