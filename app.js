/* Sky Bridge client portal — configure public credentials in config.js (never use service role keys). */
const config=window.SKYBRIDGE_CONFIG||{};
const $=s=>document.querySelector(s);
const state={client:null,user:null};
const api=config.supabaseUrl&&config.supabaseAnonKey?window.SkyBridgeDB:null;
function notify(message,error=false){const el=$('#appNotice');if(!el)return;el.textContent=message;el.style.color=error?'#ff9b9b':'#d5fb09';}
function showPortal(){const dialog=$('#portalDialog');if(!dialog)return;dialog.showModal();loadPortal();}
async function loadPortal(){
 const host=$('#portalContent');if(!host)return;
 if(!api){host.innerHTML='<p>Customer portal setup is in progress. Online applications are not yet available.</p>';return;}
 const {data:{user}}=await api.auth.getUser();state.user=user;
 if(!user){host.innerHTML='<form id="loginForm"><h3>Secure customer sign in</h3><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" minlength="8" required autocomplete="current-password"></label><button class="btn">Sign in</button><button class="btn ghost" type="button" id="signupBtn">Create account</button><a href="reset-password.html">Forgot password?</a><p id="appNotice" role="status"></p></form>';$('#loginForm').onsubmit=login;$('#signupBtn').onclick=signup;return;}
 const {data:applications,error}=await api.from('visa_applications').select('id,reference,status,destination_country,created_at').order('created_at',{ascending:false}).limit(50);
 if(error){host.innerHTML='<p>Unable to load applications. Please try again.</p>';return;}
 host.innerHTML='<div class="portal-top"><h3>My applications</h3><button id="logoutBtn" class="btn ghost" type="button">Sign out</button></div><p class="muted">Signed in as '+escapeHTML(user.email||'')+'</p><div id="applications"></div><button class="btn" id="newAppBtn">Start visa enquiry</button><p id="appNotice" role="status"></p>';
 $('#logoutBtn').onclick=async()=>{await api.auth.signOut();loadPortal()};
 $('#newAppBtn').onclick=()=>{document.querySelector('#portalDialog')?.close();document.querySelector('#destinations')?.scrollIntoView({behavior:'smooth'});};
 $('#applications').innerHTML=applications.length?applications.map(a=>'<div class="application-item"><strong>'+escapeHTML(a.reference)+'</strong><span>'+escapeHTML(a.destination_country)+' · '+escapeHTML(a.status)+'</span></div>').join(''):'<p>No applications yet.</p>';
}
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function login(e){e.preventDefault();const fd=new FormData(e.currentTarget);const {error}=await api.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error)notify(error.message,true);else loadPortal();}
async function signup(){const form=$('#loginForm'),fd=new FormData(form);if(!form.reportValidity())return;const {error}=await api.auth.signUp({email:fd.get('email'),password:fd.get('password')});notify(error?error.message:'Account request submitted. Check your email for confirmation.',!!error);}
function applicationForm(){
 $('#portalContent').innerHTML='<h3>New visa enquiry</h3><p class="muted">An enquiry is not a visa approval or official immigration submission.</p><form id="newApplication"><label>Passport nationality<input name="nationality" required maxlength="100"></label><label>Country of residence<input name="residence" required maxlength="100"></label><label>Destination country<input name="destination" required maxlength="100"></label><label>Purpose of travel<select name="purpose" required><option value="tourism">Tourism</option><option value="business">Business</option><option value="family">Family visit</option><option value="other">Other</option></select></label><label>Additional details<textarea name="notes" maxlength="2000"></textarea></label><button class="btn">Submit enquiry</button><button class="btn ghost" type="button" id="backBtn">Back</button><p id="appNotice" role="status"></p></form>';
 $('#backBtn').onclick=loadPortal;
 $('#newApplication').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const payload={user_id:state.user.id,passport_country:fd.get('nationality'),residence_country:fd.get('residence'),destination_country:fd.get('destination'),purpose:fd.get('purpose'),notes:fd.get('notes')};const {error}=await api.from('visa_applications').insert(payload);if(error)notify('Unable to save enquiry. '+error.message,true);else loadPortal();};
}
document.addEventListener('DOMContentLoaded',()=>{const open=$('#portalOpen'),close=$('#portalClose'),dialog=$('#portalDialog');if(open)open.onclick=showPortal;if(close)close.onclick=()=>dialog.close();if(dialog)dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});});
