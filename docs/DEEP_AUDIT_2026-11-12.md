# Sky Bridge — live functional and content audit

Date: 12 November 2026. Scope: production HTML and browser interactions, local source comparison, current catalogue structure and email delivery.

## Main finding: the production release is mixed by stale asset caching

All 31 HTML entrypoints checked returned HTTP 200 and matched the current repository snapshot. That does **not** prove that their interactive journeys work. The unversioned `app.js` and `visa-portal.js` URLs returned the previous source. Adding a version query returned the current files byte-for-byte. This confirms stale asset caching rather than missing revised source on the server.

Consequences observed in the production browser:

- The main visa finder still shows the short legacy lists and does not transfer nationality/residency into the application journey.
- Destination cards go to the older query-based route rather than the new standalone destination pages.
- The newer standalone destination pages depend on `data-destination`; the stale JavaScript does not read that attribute, so those landing pages cannot initialize their destination form correctly without a query parameter.
- The stale portal does not use the new atomic visa-and-travelers request function.
- Multiple Supabase Auth clients are created. The browser logs the corresponding shared-storage warning.
- The stale login UI does not show the newly implemented password recovery link.

**Prepared fix:** content-hash version keys on every local JS/CSS reference; an HTML revalidation policy in `.htaccess`; a repeatable versioning step in the build; and `release.json` to identify the expected browser assets. These frontend changes still require publication and live verification. The fact that a GitHub commit exists must not be reported as a verified Hostinger release.

## Confirmed functional problems

| Severity | Journey | Evidence and effect | Resolution |
| --- | --- | --- | --- |
| Critical | Destination landing pages | Old script ignores the destination stored in the newer HTML; the form does not initialize on the standalone route | Version browser assets; verify both standalone and legacy URL routes after deployment |
| High | Schengen consultation | Source text refers to the VEEZO report; summary shows $0 while the preceding card quotes $99; Contact us points to a local `#contact` which does not exist and the handler redirects toward destinations | New consultation route transfers context to the real enquiry form; it becomes effective when the correct JS loads |
| High | Visa finder | Legacy country lists, destination-only transfer, missing routes for Other | Current source contains the complete country list and context transfer; fix the stale script loading |
| High | Staff follow-up | `skybridge_staff` contains zero accounts at audit time | An explicitly selected, registered user must receive the intended staff role; do not invent an administrator identity |
| Medium | Travel enquiry CTA | Travel page uses an unescaped ampersand inside the service query; preselection becomes `Travel ` instead of `Travel & tourism` | Corrected the query encoding |
| Medium | Invalid or unavailable experience link | Unrecognized catalogue items can leave a loading screen with a request button that has no selected product | Added clear unavailable states and disabled submission until an experience is resolved |
| Medium | Catalogue failure | Dynamic catalogue-only experiences can remain in a loading state when the live request times out | Added an explicit failure message and a route back to available experiences |
| Low | Skip-to-content links | 13 HTML entrypoints have a skip link without its target | Added the targets and extended the link test to check fragment IDs |

## The experience catalogue is not ready to behave like a ticket shop

Production database snapshot:

- 78 published experiences.
- Only 2 experiences have active ticket options; 76 have none.
- There are 4 active ticket options in total, and 3 have no price.
- 36 product descriptions use the same generic availability text.
- 41 descriptions still contain the word “report”, including explanatory sourcing language that does not belong in customer-facing copy.
- All 78 have an empty dedicated image URL. The site therefore uses generic/category stock-image fallbacks, which are not verified photographs of those attractions.

The SKY 148 page was opened in the browser. It loads, but all three choices are price-on-request while the hero displays a starting reference price. The reference price is not an actual quote for the selected date and category. This distinction is easy to miss.

Required product information before treating an experience as a bookable offer:

1. Exact ticket category and operator-approved attraction description.
2. Verified photo and location/city.
3. Adult/child categories and any height, age or access restrictions.
4. Included access, exclusions and optional transfers/extras.
5. Available visit dates/times or an explicit request-only mode.
6. Price for the actual category/date, currency and taxes/charges.
7. Cancellation, change and no-show terms.
8. Fulfilment method and when/how the customer receives an admission ticket.

Do not manufacture these values. Until supplied and verified, show an availability request clearly rather than implying a confirmed ticket purchase.

## Content and positioning problems

### Visa services

The customer needs a destination-specific explanation of service type, entry validity versus length of stay, documents, expected review/processing stages and the fee breakdown. Generic paragraphs about confirming everything later do not explain the actual offer. Arrival cards, consultations and visas must be visibly distinguished. Current nationality hints are reference rules, not a verified immigration decision engine.

### Advertising

Separate pages exist and now contain more scope/process text, but much of it still says that deliverables will be agreed later. More paragraphs alone do not resolve the purchase decision. Each page needs a concrete service proposition, approved example work, what is delivered, what the client supplies, the working process, account ownership/reporting, support and a clear next step. Media spend must remain distinct from the management fee. Do not invent performance metrics or client logos.

### Technology and corporate services

The current descriptions are broad category summaries. They need specific use cases and approved examples: who the service is for, what operational problem is solved, the functional scope, handover and ongoing support. Corporate support in particular needs a clear definition of what the company actually undertakes and any authorised provider involved.

### Trust and company information

A contact number and address help, but they do not replace a current legal entity/licence reference, named responsible team and permissioned work examples. No registration number, team identity or testimonial should be fabricated. A branded sending address and a staffed follow-up workflow are both needed.

## Email

The original notification was plain text with an unformatted detail block. A reusable branded HTML notification has now been implemented for both initial sends and administrator retries. It includes the service category, reference, UAE timestamp, structured contact details, readable message, request-specific fields, dashboard button, Reply-To and a plain-text fallback. All customer-supplied HTML is escaped. The payload is deterministic for safe Resend retries.

A new marked preview was submitted to the production endpoint; reference `SB-E-63C40D9F9608` was recorded and email status became `sent` without an error. This confirms provider acceptance; the recipient confirms inbox delivery.

## Validation limits

- HTTP 200, static file comparison and browser interactions are distinct checks.
- No claim of a Lighthouse score, Core Web Vitals result, verified immigration eligibility or ticket availability is made.
- No real customer visa application or payment was submitted during this audit.
- No staff role was assigned to an unconfirmed identity.
- Catalogue totals describe the snapshot taken during this audit and may change as the catalogue is edited.

Raw route evidence: `docs/live-audit-2026-11-12.json`.
