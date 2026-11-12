import assert from 'node:assert/strict';
import {enquiryEmail} from '../supabase/functions/_shared/enquiry-email.mjs';
const record={reference:'SB-E-PREVIEW',category:'experience',created_at:'2026-11-12T14:30:00Z',name:'Preview <script>alert(1)</script>',email:'qa@example.com',phone:'+971 50 242 3340',service:'Burj Khalifa',message:'Hello & welcome.\nلطفاً شرایط بلیت را اعلام کنید.',details:{visit_date:'2026-11-20',quantity:2,ticket:'Standard'}};
const email=enquiryEmail(record);
assert(!email.html.includes('<script>'));assert(email.html.includes('&lt;script&gt;'));
assert(email.html.includes('Guests'));assert(email.text.includes('Guests: 2'));assert(!email.text.includes('product_id'));
assert.deepEqual(enquiryEmail(record),email,'Retry payload must stay deterministic');
console.log('PASS: HTML escaping, readable experience details and deterministic retry template');
