// Public enquiry intake with application-level API-key checking, validation, deduplication and atomic rate limits.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const env=(key:string)=>Deno.env.get(key)||'';
const publicKeys=()=>{try{return Object.values(JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}')) as string[]}catch{return []}};
const key=()=>{try{return JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default||env('SUPABASE_SERVICE_ROLE_KEY')}catch{return env('SUPABASE_SERVICE_ROLE_KEY')}};
const origins=['https://skybridgefze.com','https://www.skybridgefze.com'];
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Vary':'Origin','Access-Control-Allow-Headers':'apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
 if(origins.includes(origin))headers['Access-Control-Allow-Origin']=origin;
 const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.includes(origin))return respond({error:'This origin is not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({error:'Use POST.'},405);
 // New publishable keys are not JWTs. Verify the apikey here instead of the legacy JWT gateway.
 const provided=req.headers.get('apikey');
 const allowedKeys=[...publicKeys(),env('SUPABASE_ANON_KEY'),'sb_publishable_dogMCcI5U_JQ6IOfIqwhWA_oWFaUD5E'].filter(Boolean);
 if(!provided||!allowedKeys.includes(provided))return respond({error:'Invalid site key.'},401);
 if(Number(req.headers.get('content-length')||0)>16384)return respond({error:'Request too large.'},413);
 try{
 const raw=await req.text();if(raw.length>16384)return respond({error:'Request too large.'},413);
 const b=JSON.parse(raw);if(b.website)return respond({error:'Unable to accept this request.'},400);
 const data={id:text(b.request_id,36),category:text(b.category,30),name:text(b.name,120),email:text(b.email,250).toLowerCase(),phone:text(b.phone,35),company:text(b.company,120),service:text(b.service,160),message:text(b.message,3000),details:{} as Record<string,unknown>};
 if(!uuid.test(data.id)||!['general','advertising','experience','consultation','technology'].includes(data.category)||data.name.length<2||!/^\S+@\S+\.\S+$/.test(data.email)||data.message.length<10||!data.service||b.consent!==true)return respond({error:'Check your name, email, service, message and privacy consent.'},400);
 if(data.category==='experience'){
 const d=b.details||{};const quantity=Number(d.quantity);const visit=text(d.visit_date,10);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(!Number.isInteger(quantity)||quantity<1||quantity>20||!/^\d{4}-\d{2}-\d{2}$/.test(visit)||visit<today)return respond({error:'Select a valid future visit date and 1–20 guests.'},400);
 data.details={product_id:text(d.product_id,120),ticket:text(d.ticket,160),visit_date:visit,quantity};
 }
 const db=createClient(env('SUPABASE_URL'),key(),{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:previous,error:lookupError}=await db.from('website_enquiries').select('reference,email').eq('id',data.id).maybeSingle();
 if(lookupError)throw lookupError;
 if(previous){if(previous.email!==data.email)return respond({error:'Start a new enquiry.'},409);return respond({ok:true,reference:previous.reference});}
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+':'+env('SUPABASE_URL')));
 const bucket=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const {data:allowed,error:rateError}=await db.rpc('website_allow_request',{bucket});
 if(rateError)throw rateError;if(!allowed)return respond({error:'Too many requests. Please call or WhatsApp +971 50 242 3340.'},429);
 const {data:saved,error}=await db.from('website_enquiries').insert(data).select('reference').single();
 if(error){if(error.code==='23505'){const {data:existing}=await db.from('website_enquiries').select('reference,email').eq('id',data.id).single();if(existing?.email===data.email)return respond({ok:true,reference:existing.reference});}throw error;}
 let emailStatus='not_configured',emailId:null|string=null,emailError:null|string=null;
 const resend=env('RESEND_API_KEY'),from=env('RESEND_FROM_EMAIL');
 if(resend&&from){
 try{
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json','Idempotency-Key':'enquiry/'+data.id},body:JSON.stringify({from,to:[env('ENQUIRY_TO_EMAIL')||'skybridgefzco@gmail.com'],reply_to:data.email,subject:'Sky Bridge '+saved.reference+' · '+data.service,text:['Reference: '+saved.reference,'Name: '+data.name,'Email: '+data.email,'Phone: '+data.phone,'Company: '+data.company,'Service: '+data.service,'',data.message,'',JSON.stringify(data.details),'','View and manage: https://skybridgefze.com/admin.html'].join('\n')}),signal:AbortSignal.timeout(8000)});
 const result=await response.json();emailStatus=response.ok?'sent':'failed';emailId=result.id||null;emailError=response.ok?null:'Resend HTTP '+response.status;
 }catch{emailStatus='failed';emailError='Email service timeout or network failure';}
 }
 await db.from('website_enquiries').update({email_status:emailStatus,email_id:emailId,email_error:emailError}).eq('id',data.id);
 return respond({ok:true,reference:saved.reference},201);
 }catch(err){console.error('Enquiry intake failed',err instanceof Error?err.name:'backend_error');return respond({error:'Unable to save the request. Please retry or contact us by phone.'},500);}
});
