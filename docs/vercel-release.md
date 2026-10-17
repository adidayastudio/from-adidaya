# Prepared Vercel release

Two projects are intentional. Keep the current Next application as the backend and deploy the Expo frontend separately. Do not replace the old project's source with the static export.

## Existing backend project

- Retained URL: https://from-adidaya.vercel.app
- Checkout: ../from-adidaya
- Prepared change: utils/supabase/server.ts accepts a user Bearer token from the new frontend proxy, while retaining cookie login for the current Next UI.
- No service-role key is sent to the new frontend or browser.
- Deploy this backend patch before staging API acceptance. The hosted backend has only been checked with read-only GET: root 200, resources merge route 405 for GET (expected for a POST endpoint). Authenticated mutations were not executed.
- Keep its current private/server environment variables and default .vercel.app domain.

## New frontend project

The adidaya-preview directory is currently a separate source folder with no Git repository. Publish it to a separate repository or deliberately add it as a separate project root in a monorepo; do not overwrite the backend checkout. Repository/project creation and deployment have not been performed.

- Framework preset: Other (Expo export)
- Build: npm run build
- Output directory: dist
- Functions: api/[...path].js plus server/backend-proxy.cjs
- Source-controlled routing: vercel.json routes APIs to a Node function before SPA fallback.

Set these environment values in the new Vercel project:

| Name | Value |
| --- | --- |
| EXPO_PUBLIC_APP_MODE | adidaya |
| EXPO_PUBLIC_ADIDAYA_SUPABASE_URL | Existing Adidaya public project URL |
| EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY | Existing Adidaya public anon/publishable key |
| ADIDAYA_BACKEND_ORIGIN | https://from-adidaya.vercel.app |
| EXPO_PUBLIC_ADIDAYA_TENANT_ID | Optional verified Adidaya org UUID |
| EXPO_PUBLIC_ADIDAYA_WORKSPACE_ID | Optional verified workspace UUID |

ADIDAYA_BACKEND_ORIGIN is server-only. Never set service-role keys or private AI keys in EXPO_PUBLIC variables. EXPO_PUBLIC_LEGACY_API_URL is obsolete for the Reports editor; that editor runs locally in the frontend.

## What was repaired for release

- Notifications come exclusively from current-user notification rows, with realtime refresh, per-row read state, no fabricated transaction events and no automatic mark-all-read on opening the inbox. Desktop/mobile/native sheets use the same source. Home badge uses the actual unread count.
- Legacy notification links map to new in-app routes; external URLs are not automatically opened.
- Role-based Finance team visibility and mutations follow Adidaya role codes; a browser-stored approval matrix cannot confer authority.
- Purchasing payment preserves the old request-only accounting behavior, includes cumulative paid_amount/proofs, detects concurrent changes and does not invent balance/ledger writes. Reimbursement keeps full-payment behavior without assuming a nonexistent paid_amount column.
- Clock uses the old Adidaya write implementation, checks caller identity and required evidence, blocks simultaneous local submissions, and reports critical write failure. A copied undefined overtime constant was fixed. Cross-tab/database transaction atomicity is not claimed.
- Demo project documents and demo payment-source fallbacks were removed. Company bank options read actual Funding Sources; their editing remains in Funding Sources rather than a browser-only setup screen.
- Consolidation controls require a real cloud table and the Finance role; unsupported browser-only consolidation cannot be silently used.
- Announcement publishing propagates failed uploads/inserts and only updates the local published list after remote success.

## Remaining acceptance

1. Deploy the backend patch and the new frontend to a generated staging URL.
2. Verify login/auth refresh, API authentication, permitted/forbidden role actions, a controlled Finance workflow, Clock in/out, actual attachments and notification read/realtime behavior using test records/accounts.
3. Announcement schema is still absent in the Adidaya database. Enabling it requires a reviewed migration and suitable RLS; the copied permissive Forma migration must not be applied blindly. No database migration was run in this session.
4. Daily Report is the reviewed design template candidate; other report types still need visual/workflow acceptance. General AI requires server-side provider configuration; no private keys were copied.
5. Repository still has inherited type errors; latest full check is documented in release-verification.json. Expo export and focused tests pass; they do not replace authenticated end-to-end testing.
6. Keep both deployments available. Only after acceptance move from.adidayastudio.id to the new frontend project; leave from-adidaya.vercel.app on the backend project. A frontend rollback cannot undo user/database writes.
