/* Sky Bridge Visa Portal — original interface; catalogue, prices and application records use the Sky Bridge Supabase project. */
(()=>{
'use strict';
const D=window.SKYBRIDGE_VISA_DATA;
const C=window.SKYBRIDGE_CONFIG||{};
const db=(C.supabaseUrl&&C.supabaseAnonKey&&window.supabase)?window.SkyBridgeDB:null;
const $=(s,root=document)=>root.querySelector(s);
const X=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={dest:null,step:0,products:[],product:null,nationality:'',residence:'',gcc:'',purpose:'tourism',travelDate:'',travelers:[{}],notes:'',user:null,app:null,loading:false};
const flag=code=>{try{return code.toUpperCase().split('').map(c=>String.fromCodePoint(127397+c.charCodeAt(0))).join('')}catch{return '🌍'}};
const countries=()=>D.countries.map(c=>'<option value="'+X(c.code)+'">'+flag(c.code)+' '+X(c.name)+'</option>').join('');
function options(selected,placeholder='Select country'){return '<option value="">'+placeholder+'</option>'+countries();}
const destByCode=code=>D.destinations.find(d=>d.code===code);
const fmt=v=>'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})+' USD';
const aed=v=>'≈ AED '+(Number(v)*3.6725).toLocaleString('en-AE',{maximumFractionDigits:2});
let catalogPromise;const withTimeout=(query)=>Promise.race([query,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Catalogue connection timed out')),9000))]);
function showError(msg){const e=$('#vpFeedback');if(e){e.textContent=msg;e.style.color='#ab251b';}}
function setLoader(on){ui.loading=on;const b=$('#vpNext');if(b){b.disabled=on;b.textContent=on?'Processing…':b.dataset.label||'Continue →';}}
async function loadCatalog(){
 if(!db)throw new Error('The catalogue is not configured.');
 if(!catalogPromise)catalogPromise=withTimeout(db.from('visa_products').select('id,destination_code,title,stay_label,entry_type,price_usd,display_order').eq('is_active',true).order('display_order')).then(({data,error})=>{if(error)throw error;return data||[]}).catch(e=>{catalogPromise=null;throw e});
 return catalogPromise;
}
function catalogError(target,retry){target.innerHTML='<p role="alert">We could not load current visa options. Please retry or contact our team.</p><button type="button" class="vp-primary" id="catalogRetry">Try again</button> <a href="https://wa.me/971502423340">WhatsApp support</a>';target.querySelector('#catalogRetry').onclick=retry;}

function defaultProduct(d){return ui.products.filter(p=>p.destination_code===d.code).sort((a,b)=>Number(a.price_usd)-Number(b.price_usd))[0]}
function allowedProducts(){
 let products=ui.products.filter(p=>p.destination_code===ui.dest.code);
 if(ui.dest.code==='om'){
   if(ui.gcc==='yes')products=products.filter(p=>['om-12a-truck','om-short-transit','om-gcc-resident'].includes(p.id));
   else if(ui.gcc==='no')products=products.filter(p=>!['om-12a-truck','om-short-transit','om-gcc-resident'].includes(p.id));
   else products=[];
 }
 if(ui.dest.code==='th' && ui.nationality){
   const arr=D.rules.thEligible.includes(ui.nationality);
   products=products.filter(p=>arr?p.id==='th-arrival-card':p.id==='th-tourist-60');
 }
 if(ui.dest.code==='id' && ui.nationality&&!D.rules.idEligible.includes(ui.nationality)){
   products=products.filter(p=>p.id==='id-arrival-card');
 }
 return products;
}
function hint(){
 if(!ui.nationality)return 'Select your passport nationality to receive more relevant options.';
 if(ui.dest.code==='tr'){
  const v=ui.nationality;const r=D.rules;
  if(r.trFree.includes(v))return 'The reference rules indicate possible visa-free entry for this nationality. Confirm current entry conditions with the Turkish authorities.';
  if(r.trConditional.includes(v))return 'Reference rules indicate a supporting Schengen, US, UK or Irish visa/residence permit may be needed. Official verification required.';
  if(!r.trStandard.includes(v))return 'Eligibility for an electronic visa is not established by this catalogue. Sky Bridge must review the documents before processing.';
 }
 if(ui.dest.code==='ru'&&!D.rules.ruEligible.includes(ui.nationality))return 'The reference eVisa nationality list does not include this passport. Ask for individual review before proceeding.';
 if(ui.dest.code==='th'&&D.rules.thEligible.includes(ui.nationality))return 'The reference catalogue offers arrival-card assistance for this nationality. An arrival card is not a visa; check official visa rules.';
 if(ui.dest.code==='id'&&!D.rules.idEligible.includes(ui.nationality))return 'The reference catalogue offers arrival-card assistance only. This does not establish visa eligibility.';
 return 'Visa requirements vary by nationality, residency and travel purpose. Eligibility is subject to official review.';
}
function layout(body){
 const container=$('#visaPortalBody');if(!container)return;
 container.innerHTML=body;
}
function baseHead(title,sub){
 return '<div class="vp-top"><div><span class="vp-kicker">SKY BRIDGE • VISA SERVICES</span><h2>'+title+'</h2><p>'+sub+'</p></div><button type="button" id="vpClose" class="vp-close" aria-label="Close">×</button></div>';
}
function steps(){
 return '<div class="vp-steps">'+['Visa','Travelers','Review','Documents'].map((label,i)=>'<div class="'+(i===ui.step?'current':i<ui.step?'done':'')+'"><span>'+(i<ui.step?'✓':i+1)+'</span>'+label+'</div>').join('')+'</div>';
}
function field(label,html){return '<label class="vp-field"><span>'+label+'</span>'+html+'</label>'}
function render(){
 if(!ui.dest)return;
 const dest=ui.dest,prod=ui.product;
 if(ui.step===0){
  const filtered=allowedProducts();
  if(!filtered.some(p=>p.id===prod?.id))ui.product=filtered[0]||null;
  const p=ui.product;
  layout(baseHead(X(dest.flag+' '+dest.name),'Choose your visa product and enter basic travel details.')+steps()+
  '<div class="vp-layout"><div class="vp-main">'+
  '<div class="vp-row">'+field('Passport nationality','<select id="vpNationality" required>'+options(ui.nationality)+'</select>')+
  field('Current country of residence','<select id="vpResidence" required>'+options(ui.residence)+'</select>')+'</div>'+
  (dest.code==='om'?field('Are you a GCC resident?','<select id="vpGCC" required><option value="">Select</option><option value="yes">Yes — GCC resident</option><option value="no">No — non-GCC resident</option></select>'):'')+
  '<div class="vp-hint">'+X(hint())+'</div>'+
  (dest.enquiryOnly?'<p class="vp-warning">Schengen assistance starts with an individual consultation. The indicative consultation fee is not a visa fee. Your consulate, appointment route, documents and final charges will be confirmed before proceeding.</p>':
  '<h3 class="vp-section-title">Available products</h3><div class="vp-products">'+(filtered.length?filtered.map(v=>'<label class="vp-product '+(v.id===p?.id?'selected':'')+'"><input type="radio" name="vpProduct" value="'+X(v.id)+'" '+(v.id===p?.id?'checked':'')+'><span><b>'+X(v.title)+'</b><small>'+X(v.stay_label)+' · '+X(v.entry_type)+'</small></span><strong>'+fmt(v.price_usd)+'<small class="sb-currency">'+aed(v.price_usd)+'</small></strong></label>').join(''):'<div class="vp-warning">Select your residence status to see available options.</div>')+'</div>')+
  '<div class="vp-row">'+field('Purpose of travel','<select id="vpPurpose"><option value="tourism">Tourism</option><option value="business">Business</option><option value="family">Family visit</option><option value="other">Other</option></select>')+
  field('Estimated departure date','<input id="vpTravelDate" type="date">')+'</div>'+
  '<div class="vp-actions"><button id="vpNext" data-label="'+(dest.enquiryOnly?'Request consultation →':'Continue to travelers →')+'" class="vp-primary">'+(dest.enquiryOnly?'Request consultation →':'Continue to travelers →')+'</button></div>'+
  '<p id="vpFeedback" role="alert"></p></div><aside class="vp-summary"><div class="vp-summary-photo" style="background-image:linear-gradient(transparent,#00211edc),url(&quot;'+X(dest.image)+'&quot;)"><span>'+dest.flag+'</span><strong>'+X(dest.name)+'</strong></div><h4>Order summary</h4><div class="vp-summary-line"><span>Service</span><b>'+X(p?.title||'Select visa')+'</b></div><div class="vp-summary-line"><span>Reference processing</span><b>'+X(dest.process)+'</b></div><div class="vp-summary-line total"><span>Price per traveler</span><b>'+fmt(p?.price_usd||0)+'<small class="sb-currency">'+aed(p?.price_usd||0)+'</small></b></div><p class="vp-small">Indicative prices in USD. AED equivalents use 3.6725 for guidance; your final quote states the payable currency, service fees, government charges and applicable taxes separately. No payment is taken here.</p></aside></div>');
  $('#vpNationality').value=ui.nationality;$('#vpResidence').value=ui.residence;
  if(dest.code==='om')$('#vpGCC').value=ui.gcc;
  $('#vpPurpose').value=ui.purpose;$('#vpTravelDate').value=ui.travelDate;$('#vpTravelDate').min=new Date().toISOString().slice(0,10);
  $('#vpNationality').onchange=e=>{ui.nationality=e.target.value;render();};
  $('#vpResidence').onchange=e=>{ui.residence=e.target.value;render();};
  if(dest.code==='om')$('#vpGCC').onchange=e=>{ui.gcc=e.target.value;render();};
  document.querySelectorAll('[name=vpProduct]').forEach(e=>e.onchange=()=>{ui.product=filtered.find(p=>p.id===e.value);render();});
  $('#vpPurpose').onchange=e=>ui.purpose=e.target.value;$('#vpTravelDate').onchange=e=>ui.travelDate=e.target.value;
  $('#vpNext').onclick=()=>{if(!ui.nationality||!ui.residence)return showError('Please select nationality and country of residence.');if(dest.enquiryOnly)return consultation();if(!ui.product)return showError('Please select a visa type.');if(ui.travelDate&&ui.travelDate<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dubai'}))return showError('Departure date cannot be in the past.');ui.travelers[0].nationality=ui.nationality;ui.step=1;render()};
 }else if(ui.step===1)renderTravelers();
 else if(ui.step===2)renderReview();
 else if(ui.step===3)renderDocuments();
 const close=$('#vpClose');if(close)close.onclick=closePortal;
}
function travelerForm(t,i){
 return '<section class="vp-traveler" data-i="'+i+'"><div class="vp-traveler-head"><h3>Traveler '+(i+1)+'</h3>'+(i?'<button class="vp-remove" type="button" data-remove="'+i+'">Remove</button>':'')+'</div><div class="vp-row">'+
 field('First name *','<input required maxlength="80" name="first_name" value="'+X(t.first_name||'')+'">')+
 field('Last name *','<input required maxlength="80" name="last_name" value="'+X(t.last_name||'')+'">')+'</div><div class="vp-row">'+
 field('Nationality *','<select required name="nationality">'+options()+'</select>')+
 field('Date of birth *','<input required type="date" name="date_of_birth" max="'+new Date().toISOString().slice(0,10)+'" value="'+X(t.date_of_birth||'')+'">')+'</div><div class="vp-row">'+
 field('Gender','<select name="gender"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>')+
 field('City of residence','<input name="city" maxlength="100" value="'+X(t.city||'')+'">')+'</div>'+
 field('Residential address','<input name="address" maxlength="250" value="'+X(t.address||'')+'">')+'</section>';
}
function saveTravelerEntries(){
 document.querySelectorAll('.vp-traveler').forEach((form,i)=>{const t=ui.travelers[i]||{};form.querySelectorAll('input,select').forEach(el=>{t[el.name]=el.value;});ui.travelers[i]=t;});
}
function renderTravelers(){
 layout(baseHead('Traveler information','Add every traveler included in this request.')+steps()+
 '<div class="vp-layout"><div class="vp-main"><div class="vp-row">'+field('Contact email *','<input type="email" required id="vpEmail" maxlength="200" value="'+X(ui.email||'')+'">')+
 field('Contact phone *','<input type="tel" required id="vpPhone" maxlength="35" value="'+X(ui.phone||'')+'">')+'</div>'+
 ui.travelers.map(travelerForm).join('')+
 '<button id="vpAddTraveler" class="vp-secondary" type="button">+ Add another traveler</button>'+
 '<div class="vp-actions"><button class="vp-secondary" type="button" id="vpBack">← Back</button><button id="vpNext" data-label="Review application →" class="vp-primary">Review application →</button></div><p id="vpFeedback" role="alert"></p></div><aside class="vp-summary"><h4>Application total</h4><div class="vp-summary-line"><span>Visa</span><b>'+X(ui.product.title)+'</b></div><div class="vp-summary-line"><span>Travelers</span><b>'+ui.travelers.length+'</b></div><div class="vp-summary-line total"><span>Subtotal</span><b>'+fmt(ui.product.price_usd*ui.travelers.length)+'</b></div><p class="vp-small">Documents are uploaded securely after the application record is created. Payment is not currently available.</p></aside></div>');
 document.querySelectorAll('.vp-traveler').forEach((form,i)=>{form.querySelector('[name=nationality]').value=ui.travelers[i].nationality||ui.nationality;form.querySelector('[name=gender]').value=ui.travelers[i].gender||'';});
 $('#vpAddTraveler').onclick=()=>{saveTravelerEntries();ui.email=$('#vpEmail').value;ui.phone=$('#vpPhone').value;if(ui.travelers.length>=10)return showError('Maximum 10 travelers per application.');ui.travelers.push({nationality:ui.nationality});render();};
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{saveTravelerEntries();ui.email=$('#vpEmail').value;ui.phone=$('#vpPhone').value;ui.travelers.splice(Number(b.dataset.remove),1);render()});
 $('#vpBack').onclick=()=>{saveTravelerEntries();ui.email=$('#vpEmail').value;ui.phone=$('#vpPhone').value;ui.step=0;render()};
 $('#vpNext').onclick=()=>{saveTravelerEntries();ui.email=$('#vpEmail').value.trim();ui.phone=$('#vpPhone').value.trim();if(!ui.email||!ui.phone||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ui.email))return showError('Enter a valid contact email and phone number.');for(let i=0;i<ui.travelers.length;i++){const t=ui.travelers[i];if(!t.first_name.trim()||!t.last_name.trim()||!t.nationality||!t.date_of_birth||t.date_of_birth>new Date().toISOString().slice(0,10))return showError('Complete all required fields for traveler '+(i+1));}ui.step=2;render()};
}
function renderReview(){
 const total=Number(ui.product.price_usd)*ui.travelers.length;
 layout(baseHead('Review your request','Confirm the details before secure submission.')+steps()+'<div class="vp-layout"><div class="vp-main"><div class="vp-review-box"><div class="vp-review-big">'+X(ui.dest.name)+' <span>'+fmt(total)+'</span></div><p>'+X(ui.product.title)+' · '+X(ui.product.stay_label)+'</p><div class="vp-summary-line"><span>Passport</span><b>'+X(ui.nationality)+'</b></div><div class="vp-summary-line"><span>Residence</span><b>'+X(ui.residence)+'</b></div><div class="vp-summary-line"><span>Applicants</span><b>'+ui.travelers.length+'</b></div><div class="vp-summary-line"><span>Contact</span><b>'+X(ui.email)+'</b></div></div><h3 class="vp-section-title">Travelers</h3>'+ui.travelers.map((t,i)=>'<p>'+(i+1)+'. '+X(t.first_name)+' '+X(t.last_name)+' — '+X(t.nationality)+'</p>').join('')+
 '<p class="vp-warning">Submitting saves your enquiry and does not charge any payment. Visa eligibility, requirements and processing times will be confirmed individually. Visa approval is not guaranteed.</p>'+
 '<label class="vp-check"><input id="vpConsent" type="checkbox"> I confirm I have permission to submit these traveler details and have read the <a href="privacy.html">privacy notice</a> and <a href="terms.html">service terms</a>.</label>'+
 '<div class="vp-actions"><button class="vp-secondary" id="vpBack" type="button">← Back</button><button class="vp-primary" id="vpNext" data-label="Submit request securely →">Submit request securely →</button></div><p id="vpFeedback" role="alert"></p></div><aside class="vp-summary"><h4>Summary</h4><div class="vp-summary-line"><span>Per traveler</span><b>'+fmt(ui.product.price_usd)+'</b></div><div class="vp-summary-line"><span>Travelers</span><b>'+ui.travelers.length+'</b></div><div class="vp-summary-line total"><span>Request value</span><b>'+fmt(total)+'</b></div><p class="vp-small">No payment is collected at this stage.</p></aside></div>');
 $('#vpBack').onclick=()=>{ui.step=1;render()};$('#vpNext').onclick=()=>{if(!$('#vpConsent').checked)return showError('Please confirm your consent.');submit()};
}
async function submit(){
 if(ui.loading)return;if(!db)return showError('Secure submissions are not configured yet.');
 setLoader(true);let user=ui.user;
 if(!user){const {data}=await db.auth.getUser();user=data?.user}
 if(!user){setLoader(false);return renderAuth()}
 try{
  const application={user_id:user.id,visa_product_id:ui.product.id,passport_country:ui.nationality,residence_country:ui.residence,destination_country:ui.dest.code,purpose:ui.purpose,contact_email:ui.email,contact_phone:ui.phone,applicant_count:ui.travelers.length,travel_date:ui.travelDate||null,notes:ui.notes||null};
  const {data:a,error}=await db.rpc('submit_visa_request',{request_id:ui.requestId,application,travelers:ui.travelers});
  if(error)throw error;
  ui.app=a;ui.user=user;
  ui.step=3;render();
 }catch(e){showError('Submission failed: '+(e.message||'Please retry.'))}finally{setLoader(false)}
}
function renderAuth(){
 layout(baseHead('Secure sign in','Create an account or sign in to save your application securely.')+steps()+
 '<div class="vp-auth-card"><p>Your selections and traveler information are retained in this browser view while you sign in.</p>'+
 field('Email','<input type="email" id="vpLoginEmail" value="'+X(ui.email||'')+'" required autocomplete="email">')+
 field('Password','<input type="password" id="vpLoginPassword" required minlength="8" autocomplete="current-password">')+
 '<div class="vp-actions"><button class="vp-primary" type="button" id="vpLogin">Sign in & submit →</button><button class="vp-secondary" type="button" id="vpSignup">Create account</button></div>'+
 '<p><a href="reset-password.html" target="_blank" rel="noopener">Forgot password? Open recovery in a new tab</a></p><p id="vpFeedback" role="status"></p><button class="vp-backlink" id="vpBack" type="button">← Return to review</button></div>');
 $('#vpBack').onclick=render;
 $('#vpLogin').onclick=async()=>{const email=$('#vpLoginEmail').value,password=$('#vpLoginPassword').value;if(!email||!password)return showError('Enter your email and password.');const {data,error}=await db.auth.signInWithPassword({email,password});if(error)return showError(error.message);ui.user=data.user;submit()};
 $('#vpSignup').onclick=async()=>{const email=$('#vpLoginEmail').value,password=$('#vpLoginPassword').value;if(!email||password.length<8)return showError('Enter an email and password of at least eight characters.');const {data,error}=await db.auth.signUp({email,password});if(error)return showError(error.message);if(data.session){ui.user=data.user;submit()}else showError('Account created. Confirm the email we sent you, then sign in to submit your application.');};
}
function renderDocuments(){
 const a=ui.app;
 layout(baseHead('Application received','Your request has been recorded. Upload available documents securely below.')+steps()+
 '<div class="vp-success"><div class="vp-success-icon">✓</div><h3>Your tracking reference</h3><strong>'+X(a.reference)+'</strong><p>Submitted request value: '+fmt(a.price_usd)+' · Status: '+X(a.status)+'</p></div>'+
 '<div class="vp-upload-grid">'+ui.travelers.map((t,i)=>'<section class="vp-traveler"><h3>'+X(t.first_name)+' '+X(t.last_name)+'</h3>'+['passport','photo','flight','hotel','supporting'].map(kind=>field(kind==='passport'?'Passport scan':kind==='photo'?'Personal photo':kind==='flight'?'Flight reservation':kind==='hotel'?'Hotel booking':'Supporting document','<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="vpUpload" data-traveler="'+i+'" data-kind="'+kind+'">')).join('')+'</section>').join('')+'</div>'+
 '<p class="vp-small">Passport scans and personal photos are recommended for each traveler; other documents may be requested later. Uploads remain private. Maximum 10 MB each.</p>'+
 '<p id="vpFeedback" role="status"></p><div class="vp-actions"><button id="vpDone" class="vp-primary">Done</button></div>');
 document.querySelectorAll('.vpUpload').forEach(input=>input.onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const allowed=['image/jpeg','image/png','image/webp','application/pdf'];if(!allowed.includes(file.type)||file.size>10485760)return showError('Use JPG, PNG, WEBP or PDF, maximum 10 MB.');const uid=ui.user.id,ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'})[file.type];const path=uid+'/'+ui.app.id+'/'+crypto.randomUUID()+'-'+input.dataset.kind+'.'+ext;input.disabled=true;const {error:uploadErr}=await db.storage.from('skybridge-documents').upload(path,file,{contentType:file.type,upsert:false});if(uploadErr){input.disabled=false;return showError(uploadErr.message)}const {error:recordErr}=await db.from('visa_documents').insert({application_id:ui.app.id,user_id:uid,traveler_index:Number(input.dataset.traveler),document_type:input.dataset.kind,storage_path:path});if(recordErr){input.disabled=false;return showError('File uploaded but record creation failed: '+recordErr.message)}input.insertAdjacentHTML('afterend','<span class="vp-file-success">✓ Uploaded securely</span>');});
 $('#vpDone').onclick=closePortal;
}
function consultation(){
 window.location.href='index.html?service='+encodeURIComponent('Visa & global mobility')+'&message='+encodeURIComponent('Schengen consultation. Passport: '+ui.nationality+'. Residence: '+ui.residence+'. Purpose: '+ui.purpose+'.')+'#contact';
}
async function openPortal(code){
 const dest=destByCode(code);if(!dest){layout(baseHead('Choose a visa destination','This destination is unavailable. Please choose an available service.')+'<p><a class="vp-primary" href="index.html#destinations">View all destinations →</a></p>');return;}
 ui.requestId=crypto.randomUUID();ui.dest=dest;document.title=dest.name+' Visa Assistance | Sky Bridge';const desc=document.querySelector('meta[name=description]');if(desc)desc.content='Compare '+dest.name+' visa assistance, indicative fees and required traveler information.';ui.step=0;ui.product=null;ui.nationality='';ui.residence='';ui.gcc='';ui.purpose='tourism';ui.travelDate='';ui.travelers=[{}];ui.app=null;ui.email='';ui.phone='';
 const params=new URLSearchParams(location.search);ui.nationality=D.countries.some(c=>c.code===params.get('passport'))?params.get('passport'):'';ui.residence=D.countries.some(c=>c.code===params.get('residence'))?params.get('residence'):'';
 const dialog=$('#visaPortalDialog');if(!dialog)return;
 if(!document.body.dataset.visaDetail){window.location.href='visa-'+encodeURIComponent(code)+'.html';return;}layout(baseHead('Loading visa services…','Retrieving the catalogue.'));
 try{ui.products=await loadCatalog();}catch{catalogError($('#visaPortalBody'),()=>openPortal(code));return;}
 if(!ui.products.length&&!dest.enquiryOnly){layout(baseHead('Services temporarily unavailable','The visa price catalogue cannot be loaded. Please try again later.'));$('#vpClose').onclick=closePortal;return}
 render();
}
function closePortal(){if(document.body.dataset.visaDetail){window.location.href='index.html#destinations';return;}const d=$('#visaPortalDialog');if(d?.open)d.close();}
async function cards(){
 const holder=$('#destinationCards');if(!holder)return;let all;try{all=await loadCatalog();}catch{catalogError(holder,cards);return;}
 holder.innerHTML=D.destinations.map(d=>{
 const entries=all.filter(p=>p.destination_code===d.code);
 const price=entries.length?Math.min(...entries.map(p=>Number(p.price_usd))):null;
 return '<article class="destination-card" style="--dest-image:url('+d.image+')"><div class="destination-shade"></div><button type="button" class="destination-arrow" data-destination="'+X(d.code)+'" aria-label="Explore '+X(d.name)+' visa services">↗</button><div class="destination-content"><span class="flag">'+d.flag+'</span><h3>'+X(d.name.toUpperCase())+'</h3><div class="destination-details"><span><small>SERVICE</small><strong>'+X(d.enquiryOnly?'Consultation':'Visa services')+'</strong></span><span><small>STAY</small><strong>'+X(d.days)+'</strong></span><span><small>FEES FROM</small><strong>'+(price!==null?fmt(price):'Request a quote')+'</strong></span></div></div></article>';
 }).join('');
 holder.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>{window.location.href="visa-"+encodeURIComponent(b.dataset.destination)+".html"});
}
document.addEventListener('DOMContentLoaded',()=>{
 const dialog=$('#visaPortalDialog');if(!dialog)return;
 if(document.body.dataset.visaDetail){const code=(new URLSearchParams(location.search).get('destination')||document.body.dataset.destination);if(code)openPortal(code);else layout(baseHead('Choose a visa destination','Select a destination from the visa catalogue.')+'<p><a class="vp-primary" href="index.html#destinations">View all destinations →</a></p>');}else dialog.addEventListener('click',e=>{if(e.target===dialog)closePortal();});
 cards();
 const hero=$('#visaForm');if(hero){
 $('#passport').innerHTML=options();$('#residency').innerHTML=options();
 $('#destination').innerHTML='<option value="">Select destination</option>'+D.destinations.map(d=>'<option value="'+X(d.code)+'">'+X(d.name)+'</option>').join('')+'<option value="other">Another destination</option>';
 hero.addEventListener('submit',e=>{e.preventDefault();const c=$('#destination').value,passport=$('#passport').value,residence=$('#residency').value;if(c==='other'){window.location.href='index.html?service='+encodeURIComponent('Visa & global mobility')+'#contact';return;}window.location.href='visa-'+encodeURIComponent(c)+'.html?'+new URLSearchParams({passport,residence});});}

 window.SkyBridgeVisa={open:openPortal};
});
})();