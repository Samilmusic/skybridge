# Sky Bridge FZE LLC
Official website and early-stage customer portal for skybridgefze.com.

## Deploy
Static website: deploy repository root on Hostinger static hosting or any static host. No build step is required. Set index.html as entry point. Point domain DNS only after checking existing email/DNS records and enable HTTPS.

## Supabase
1. Use the existing **Sky Bridge** Supabase project.
2. Review and run supabase/schema.sql in SQL editor.
3. Enable Email authentication and configure allowed site URL / redirect URLs in Supabase Auth.
4. Copy config.example.js to config.js and set ONLY the public project URL and publishable/anon key.
5. Do not commit config.js. NEVER use service_role or secret keys in the browser.
6. Test registration, email confirmation, login, RLS isolation, application submission and logout.

## Status
- Marketing site: implemented.
- Customer authentication and initial visa enquiry: implemented in frontend; requires Supabase configuration and schema.
- Admin dashboard, payments, private document storage, verified country eligibility engine, email notifications: NOT implemented yet.
- Contact form opens a mail draft; no backend submission.
- Visa finder currently captures selection only and is NOT a visa eligibility engine.

All visa requirements must be verified from official authorities. Only offer services authorised by the company licence or licensed partners.
