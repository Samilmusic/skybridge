import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'https://skybridgefze.com','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 if(origin==='https://www.skybridgefze.com')headers['Access-Control-Allow-Origin']=origin;
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Use POST'},405);
 const jwt=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!jwt)return reply({error:'Sign in required'},401);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const{data:{user},error:authError}=await db.auth.getUser(jwt);if(authError||!user)return reply({error:'Sign in required'},401);
 const{data:staff}=await db.from('skybridge_staff').select('role').eq('user_id',user.id).maybeSingle();if(staff?.role!=='admin')return reply({error:'Administrator access required'},403);
 try{
 const {id}=await req.json();if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return reply({error:'Invalid reference'},400);
 const{data:e,error}=await db.from('website_enquiries').select('*').eq('id',id).single();if(error||!e)return reply({error:'Enquiry not found'},404);
 if(e.email_status==='sent')return reply({ok:true,message:'Notification already sent.'});
 const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');if(!key||!from)return reply({error:'Add RESEND_API_KEY and RESEND_FROM_EMAIL in server secrets first.'},503);
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'enquiry/'+e.id},body:JSON.stringify({from,to:[Deno.env.get('ENQUIRY_TO_EMAIL')||'skybridgefzco@gmail.com'],reply_to:e.email,subject:'Sky Bridge '+e.reference+' · '+e.service,text:['Reference: '+e.reference,'Name: '+e.name,'Email: '+e.email,'Phone: '+e.phone,'Company: '+e.company,'Service: '+e.service,'',e.message,'',JSON.stringify(e.details),'','View and manage: https://skybridgefze.com/admin.html'].join('\n')}),signal:AbortSignal.timeout(8000)});
 const result=await response.json();await db.from('website_enquiries').update({email_status:response.ok?'sent':'failed',email_id:result.id||null,email_error:response.ok?null:'Resend HTTP '+response.status}).eq('id',id);
 return reply(response.ok?{ok:true,message:'Notification sent.'}:{error:'Email provider rejected the message. Check Resend domain verification and logs.'},response.ok?200:502);
 }catch{return reply({error:'Unable to send. Please retry.'},500);}
});
