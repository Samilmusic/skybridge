(() => {
'use strict';
const cfg=window.SKYBRIDGE_CONFIG||{};
const api=cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'$'+Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
let role=null,apps=[],products=[],selected=null;
const note=(id,message,err=false)=>{const el=$(id);if(el){el.textContent=message;el.style.color=err?'#ff9b93':'#d5fb09'}};
async function check(){
 if(!api){note('#loginMessage','Supabase is not configured.',true);return}
 const {data:{user},error}=await api.auth.getUser();
 if(error||!user)return showLogin();
 const result=await api.from('skybridge_staff').select('role').eq('user_id',user.id).maybeSingle();
 if(result.error||!result.data){await api.auth.signOut();showLogin();note('#loginMessage','This account does not have Sky Bridge staff access.',true);return}
 role=result.data.role;$('#authSection').classList.add('hidden');$('#adminDashboard').classList.remove('hidden');$('#logout').classList.remove('hidden');
 $('#staffRole').textContent=user.email+' · '+role.replace('_',' ');
 await refreshAll();
}
function showLogin(){
 role=null;$('#authSection').classList.remove('hidden');$('#adminDashboard').classList.add('hidden');$('#logout').classList.add('hidden');
}
async function refreshAll(){await Promise.all([loadApps(),loadProducts()]);}
async function loadApps(){
 const {data,error}=await api.from('visa_applications').select('id,reference,contact_email,contact_phone,destination_country,applicant_count,price_usd,status,notes,visa_product_id,created_at').order('created_at',{ascending:false}).limit(500);
 if(error){note('#applicationsMessage',error.message,true);return}
 apps=data||[];note('#applicationsMessage',apps.length>=500?'Showing newest 500 applications. Refine your search for older cases.':'');
 const counts=['received','reviewing','documents_required','processing'].map(s=>apps.filter(a=>a.status===s).length);
 const stats=[['Applications',apps.length],['New',counts[0]],['In progress',counts[1]+counts[3]],['Documents needed',counts[2]]];
 $('#stats').innerHTML=stats.map(([label,val])=>'<div class="stat">'+esc(label)+'<strong>'+val+'</strong></div>').join('');
 renderApps();
}
function renderApps(){
 const q=$('#search').value.trim().toLowerCase(),status=$('#statusFilter').value;
 const filtered=apps.filter(a=>(!status||a.status===status)&&(!q||[a.reference,a.contact_email,a.destination_country,a.visa_product_id].some(x=>String(x||'').toLowerCase().includes(q))));
 $('#applicationRows').innerHTML=filtered.length?filtered.map(a=>'<tr><td><b>'+esc(a.reference)+'</b></td><td>'+esc(a.contact_email)+'</td><td>'+esc(a.destination_country.toUpperCase())+'</td><td>'+money(a.price_usd)+'</td><td><span class="status">'+esc(a.status.replaceAll('_',' '))+'</span></td><td><button data-id="'+esc(a.id)+'">View</button></td></tr>').join(''):'<tr><td colspan="6">No matching applications.</td></tr>';
 $('#applicationRows').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>openDetail(b.dataset.id));
}
async function openDetail(id){
 const a=apps.find(v=>v.id===id);if(!a)return;
 selected=id;$('#applicationDetail').classList.remove('hidden');
 $('#detailTitle').textContent=a.reference+' · '+a.destination_country.toUpperCase();
 $('#editStatus').value=a.status;$('#editNote').value=a.notes||'';note('#detailMessage','');
 $('#detailTravelers').textContent='Loading travelers…';$('#detailDocuments').textContent='';
 const [{data:travelers,error:travelErr},{data:documents,error:docErr}]=await Promise.all([
 api.from('visa_travelers').select('first_name,last_name,nationality,date_of_birth').eq('application_id',id),
 api.from('visa_documents').select('document_type,storage_path,traveler_index').eq('application_id',id)
 ]);
 if(travelErr)$('#detailTravelers').textContent='Travelers unavailable: '+travelErr.message;
 else $('#detailTravelers').textContent=(travelers||[]).map(t=>t.first_name+' '+t.last_name+' · '+t.nationality+' · '+t.date_of_birth).join(' | ')||'No traveler details on file.';
 if(docErr)$('#detailDocuments').textContent='Documents unavailable: '+docErr.message;
 else {const docs=documents||[];const host=$('#detailDocuments');host.replaceChildren();const title=document.createElement('p');title.textContent=docs.length+' document(s)';host.append(title);docs.forEach((d,i)=>{const b=document.createElement('button');b.className='subtle';b.style.margin='4px';b.textContent=d.document_type+' · traveler '+(d.traveler_index+1);b.onclick=()=>viewDocument(d.storage_path);host.append(b)});}
 $('#applicationDetail').scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function viewDocument(path){
 const {data,error}=await api.storage.from('skybridge-documents').createSignedUrl(path,120);
 if(error){note('#detailMessage','Unable to open document: '+error.message,true);return}
 const w=window.open(data.signedUrl,'_blank','noopener,noreferrer');if(!w)note('#detailMessage','Allow popups to open the secured file.',true);
}
async function saveCase(){
 const a=apps.find(x=>x.id===selected);if(!a)return;
 const status=$('#editStatus').value,notes=$('#editNote').value;
 const valid=['received','reviewing','documents_required','processing','approved','rejected','cancelled'];
 if(!valid.includes(status)||notes.length>2000)return note('#detailMessage','Invalid status or note length.',true);
 $('#saveCase').disabled=true;
 const {error}=await api.from('visa_applications').update({status,notes,updated_at:new Date().toISOString()}).eq('id',selected);
 $('#saveCase').disabled=false;
 if(error)return note('#detailMessage',error.message,true);
 note('#detailMessage','Case saved. Status change recorded in the audit log.');
 await loadApps();
}
async function loadProducts(){
 const {data,error}=await api.from('visa_products').select('id,destination_code,title,stay_label,price_usd,is_active').order('destination_code').order('display_order');
 if(error)return note('#catalogMessage',error.message,true);
 products=data||[];
 const host=$('#productList');host.replaceChildren();
 let current='';
 products.forEach(p=>{
  if(current!==p.destination_code){current=p.destination_code;const h=document.createElement('h3');h.textContent=current.toUpperCase();h.style.color='#d5fb09';host.append(h)}
  const row=document.createElement('div');row.className='visa-row';
  const info=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small');
  b.textContent=p.title;small.textContent=p.stay_label;info.append(b,document.createElement('br'),small);row.append(info);
  const input=document.createElement('input');input.type='number';input.min='0';input.max='100000';input.step='0.01';input.value=p.price_usd;input.setAttribute('aria-label','Price in USD for '+p.title);
  if(role!=='admin')input.disabled=true;
  row.append(input);
  if(role==='admin'){
   const btn=document.createElement('button');btn.className='primary';btn.style.padding='9px';btn.textContent='Save';
   btn.onclick=async()=>{const num=Number(input.value);if(!Number.isFinite(num)||num<0||num>100000)return note('#catalogMessage','Invalid price.',true);btn.disabled=true;const {error}=await api.from('visa_products').update({price_usd:num,updated_at:new Date().toISOString()}).eq('id',p.id);btn.disabled=false;note('#catalogMessage',error?error.message:'Updated '+p.title+' to '+money(num),!!error);};
   row.append(btn);
  }
  host.append(row);
 });
}
document.addEventListener('DOMContentLoaded',()=>{
 $('#adminLogin').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const {error}=await api.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error)note('#loginMessage',error.message,true);else check()};
 $('#logout').onclick=async()=>{await api.auth.signOut();showLogin()};
 $('#refresh').onclick=refreshAll;$('#search').oninput=renderApps;$('#statusFilter').onchange=renderApps;$('#saveCase').onclick=saveCase;
 check();
});
})();