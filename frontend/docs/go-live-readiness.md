# Adidaya web go-live readiness — 16 October 2026

Current update: the code fixes and preserved-backend routing are prepared; see vercel-release.md for the current deployment steps and remaining acceptance. The findings below are the original audit baseline, not a claim that every item is still unfixed.

Decision: HOLD full production replacement pending hosted acceptance. A hosted staging release is the next useful step. No live domain, database schema, production data or hosting configuration was changed during this audit.

## Verified now
- Production web export succeeds.
- 15 focused tests pass (backend isolation, role normalization, location, disabled Forma notification senders, report data, editor callbacks, attachment parsing).
- Vercel configuration targets dist and SPA fallback.
- Actual users have visually reviewed desktop/tablet/mobile UI locally. This does not verify all business workflows.

## Release blockers

| Priority | Finding and evidence | Required resolution |
| --- | --- | --- |
| P0 | Existing Next API backend is absent from the Expo static export. lib/api/resources.ts calls https://from.adidayastudio.id/api/resources/merge. Replacing that domain with this SPA makes that route serve HTML rather than the API. 49 legacy API routes were inventoried, but their required dependencies have not been fully mapped. | Keep the old backend on a dedicated origin or deploy required APIs alongside the new frontend. Enumerate actual callers and verify auth, CORS and error responses. Never send /api requests to SPA fallback. |
| P0 | Complete permission/approval parity is unverified. Some capability reads use Adidaya tables, but copied module logic still has its own role gates. | Compare UI actions, mutation authorization and RLS with Adidaya for staff, finance, manager/approver, admin. Test prohibited actions as well as permitted ones. |
| P0 | NotificationsMasterDetail merges synthetic purchasing/reimbursement notifications and announcements with user-specific DB notifications. Disabling Forma notification writers alone did not make the inbox equivalent to Adidaya. | Use the legacy notification records and recipients as the inbox source; verify unread counts, read state, realtime and destination links. |
| P0 | Real attendance write consistency is not verified. lib/api/attendance.ts writes logs, sessions and records separately and retries Forma-shaped payloads on errors. | Verify clock-in/out, multiple sessions, duplicate clicks, permissions, timezone, camera/GPS and partial-failure recovery against Adidaya data; do not assume export success proves attendance correctness. |
| P1 | Several copied setups still use AsyncStorage (finance categories, approval matrix, bank accounts and notification rules). Project docs still initialize from demo document lists. Not every mock-named file is a problem: some provide types only. | Audit active runtime paths. Persist operational settings to the authoritative Adidaya tables or disable those settings until migrated. Remove visible demo/fallback documents. |
| P1 | Previous read-only schema probe reported announcements absent (15 October); not revalidated against an authenticated account in this audit. | Prepare appropriate schema/RLS or explicitly disable announcement creation for launch. Never present unsupported publishing as successful. |
| P1 | Report editing was ported locally; only Daily Report has the agreed UI template. Other types, real saves, uploads and print output remain manually unverified. | Validate one real report end to end and each report type included at launch. PDF uses browser Save as PDF, different from the old server renderer. |
| P1 | Repository is not type-clean. Most recent available type log has 417 diagnostics, including copied editor missing types; this is not the original 403 baseline anymore. | Classify new vs inherited diagnostics and fix release-related errors. Expo export does not perform a complete TypeScript check. |

## Minimum acceptance on hosted HTTPS staging

Use dedicated test records/accounts; do not send real notifications or approve/pay real requests during acceptance.

- Login/logout, refresh session, direct deep links, role changes and access rejection.
- Tasks/actions/projects: read, create, update, assignment and attachments; confirm persistence after reload on another account/device.
- Finance: purchasing and reimbursement, multi-file receipts/proofs, approval/rejection/revision, finance/payment actions and download access. Confirm same amounts/statuses/recipient rules as live.
- Clock: location denied/allowed, camera, in/out, multiple sessions and timezone; confirm authoritative DB records.
- Notifications: only expected recipients, counts/read state/realtime and working links.
- Reports: edit/save/reopen, content preservation, uploads and PDF; Daily template reviewed first.
- Chat/resources/crew/people: test the workflows actually needed on day one or leave them on the old app.
- Desktop, iPad and mobile: navigation, overlays, keyboard, scroll, file download, return/reload.

## Deployment and rollback

1. Deploy the candidate as a separate hosting project using its own root directory, npm run build and dist. Keep the current production project intact.
2. Set production public Supabase environment values; keep service-role/private AI keys out of EXPO_PUBLIC variables. Configure auth redirects, any backend origin, HTTPS and storage policies.
3. Test the hosting-generated preview URL. Check a deep-link refresh, /api behavior, asset MIME, file upload and camera/location over HTTPS.
4. Resolve the P0 items above; explicitly disable/defer unfinished modules instead of exposing working-looking placeholders.
5. Keep the old deployment available as the rollback target. Record the exact release versions and routing/backend plan before switching the live domain.
6. Switch the domain only after acceptance. Recheck login, finance reads, attendance and downloads immediately. Roll back the frontend if those fail; frontend rollback does not undo database writes.

Recommended scope for speed: retain the old backend and move the UI only after core login/permissions, finance, clock and notifications pass. Optional announcement/AI/report-type expansion should not delay a core release if clearly disabled or left on the old app.
