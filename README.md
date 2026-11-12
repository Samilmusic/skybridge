# Sky Bridge FZE LLC
Static marketing website, customer visa request portal and staff enquiry dashboard.

## Production publication
The production site is currently on Hostinger. Publish the public repository root, or run `python build.py` and publish the **contents** of `dist/` into the existing document root. Preserve existing domain, email DNS and HTTPS settings. A GitHub commit alone does not prove a Hostinger deployment. Confirm the production HTML contains `shared.js`, and verify `/robots.txt`, `/sitemap.xml`, `/visa-ae.html`, `/technology.html` and an actual enquiry.

`config.js` contains only the public Supabase URL and publishable key. Never add server secrets to this file, public HTML or GitHub. The Supabase browser SDK is pinned to 2.119.0 and instantiated once per page in `shared.js`.

## Backend
Use the connected Sky Bridge project: `fmgyezxxxvzhwmqlkabt`. Existing customer and visa data are preserved.
- `supabase/enquiries.sql`: website enquiries, staff-only read/status access and atomic request rate limiting.
- `supabase/visa-request.sql`: authenticated transaction saves visa request and all travelers together. Existing RLS and server-side price trigger remain in force.
- `supabase/functions/submit-enquiry`: intake endpoint; validates public API key, origin, size, input, consent, honeypot and rate limits. Saves before notifying. Request UUID prevents duplicate form retries. No open email relay; recipient is server-controlled.
- `supabase/functions/retry-enquiry-email`: authenticated administrator-only retry of pending or failed email notifications.
- The document bucket remains private. Clients use their own authenticated session.
- `website_rate_limits` intentionally has RLS and no customer policies; only server-role operations can use it.

### Resend configuration (provider delivery verified 12 November 2026)
1. Verify the Sky Bridge sending domain in Resend and add the exact DNS records Resend provides. Preserve mailbox MX records.
2. In Supabase **Edge Functions → Secrets**, set:
   - `RESEND_API_KEY`: a restricted sending API key for the verified Sky Bridge domain.
   - `RESEND_FROM_EMAIL`: e.g. `Sky Bridge <noreply@skybridgefze.com>` **only after that domain is verified**.
   - `ENQUIRY_TO_EMAIL`: `skybridgefzco@gmail.com`, or the owner's chosen inbox.
3. Submit a marked test enquiry from production; verify both the database reference and delivery in Resend/the recipient inbox.
4. Existing saved requests whose `email_status` is `not_configured` or `failed` can be retried in the staff enquiry dashboard.
5. Supabase Auth emails are a **separate configuration**: set custom SMTP host `smtp.resend.com`, port 465, username `resend`, password the Resend key, and a verified sender in Auth → Email → SMTP settings. Allow `https://skybridgefze.com/reset-password.html` in Auth redirect URLs. Test recovery and confirmation end-to-end before announcing them as verified.

No customer confirmation email is sent by the public intake endpoint; this prevents third parties using the website to send arbitrary email to visitors. A tracking reference is shown on screen. Visitor details are available only to staff in the dashboard.

### Administrator access
At implementation time `skybridge_staff` was empty, and no Auth user existed for `skybridgefzco@gmail.com`. The intended administrator must create/verify their own account. Then grant the explicitly selected user `admin` in `skybridge_staff`. Never select an account just because its name resembles the owner. No staff credentials are embedded in the website.

## Checks
Run `python tests/check-site.py` then `python build.py`.

Verified during implementation:
- Production intake rejects missing consent (400), foreign origin (403), invalid site key (401).
- Valid synthetic intake creates a reference (201); retrying the same UUID returns the same reference (200) with one stored record.
- A rolled-back database test verified visa submission plus traveler, request deduplication, future-DOB rejection, no partial record, isolation from another user and the 8/hour rate limit. No test Auth user or visa application was retained.
- Browser preview: nationality/residency carried from finder to destination page, traveler step opens, mobile menu opens/closes at 390 CSS px.
- JavaScript syntax, local asset/page links, unique IDs and canonical metadata checks passed.

## Content still requiring owner material
Do not fabricate licence numbers, staff identities, customer testimonials, performance metrics or case studies. Add the current licence/legal entity details, approved team profiles and permissioned case studies when supplied. Catalogue fees, third-party rules and exact refunds/inclusions require a written provider-confirmed quote; website copy makes this explicit.

## Deep audit and cache-safe releases
See `docs/DEEP_AUDIT_2026-11-12.md` for confirmed live functional/content findings. Production inspection found stale unversioned JavaScript alongside updated HTML. `python build.py` now runs `scripts/version-assets.py`, placing content hashes on browser JS/CSS references and generating `release.json`. Publish all changed HTML and assets together. `.htaccess` requests revalidation of entrypoints on compatible Hostinger hosting. Verify the live page references the expected versioned asset before claiming a release is active.

The notification template is shared by initial sends and staff retries in `supabase/functions/_shared/enquiry-email.mjs`; run `node tests/email-template.mjs` to check escaping, readable fields and deterministic resend payloads. Supabase deployment must include the shared module and explicitly set the function-local `deno.json` import-map path.
