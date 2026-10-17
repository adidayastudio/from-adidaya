# Adidaya preview implementation status

Forma has been duplicated into this isolated Expo candidate. Original forma and from-adidaya folders remain unchanged. Production has not been switched.

## Implemented
- One Adidaya Supabase client, isolated auth cache, sign-in only, no backend or organization switching.
- Real Adidaya organization resolution; no fabricated tenant IDs or automatic membership writes.
- Adidaya branding, legacy route aliases, copied Forma modules and native components.
- Dedicated project/task/action queries preserve legacy rows without tenant IDs.
- Shared cached location for app entry and Clock; attendance reminders remain disabled. Real photo and location are required for attendance.

## Verification
- Web export succeeds. Eight focused tests pass.
- Typecheck: 402 diagnostics versus 403 inherited from Forma; zero new diagnostics. The candidate is not globally type-clean.
- Read-only schema probes: 16 of 17 core tables accessible to schema requests. Announcements table is missing. Anonymous access exposes no matching Adidaya tenant; authenticated organization resolution still requires verification.
- HTTP checks cover static route fallback and bundle delivery only; they do not verify authenticated rendering or data writes.

## Remaining before cutover
- Sign in with an existing Adidaya account and verify organization/workspace, roles, actual data and module parity.
- Validate Clock camera/location and attendance writes on target devices.
- Audit and connect required legacy Next API services (49 inventoried endpoints); preserving the old backend does not automatically integrate those APIs. Private AI credentials were not copied.
- Prepare an announcements migration with appropriate access policies, then verify publishing, targeting and read state. No database schema or records were changed during this phase.
- Verify finance approvals, uploads, reports, chat/realtime and role boundaries using appropriate test accounts.
- Review desktop, tablet, mobile and native behavior before choosing deployment and rollback procedures.

## Commands
Run npm run preview to serve the exported candidate at http://localhost:8082 without opening a browser. Run npm run build after source changes. npm run web starts Expo web development on port 8082. npm run test:adidaya runs the focused tests; npm run audit:schema performs read-only schema checks.

Original app remains at port 3000. Source snapshots and hash manifests are in the sibling migration-snapshots directory. Local environment values are intentionally excluded from those snapshots.

## Adidaya business-rule alignment
Role codes now preserve the legacy Adidaya role taxonomy with staff fallback. Shared access helpers were copied from Adidaya, and the capability hook reads organization_role_permissions by the Adidaya user_roles code. Announcement authoring uses can_manage_people when configured, with the legacy people-management role fallback; Adidaya has no announcement-specific policy yet. Notification inbox reads current-user rows and legacy category/description fields. Forma client broadcasts, local pushes and browser schedulers are disabled; existing database triggers remain unchanged. Full approval/access parity across every copied module still requires a module-by-module audit; this change does not claim that audit is complete.

## Reports content migration
The Reports screen now uses the 23 report definitions from the legacy Adidaya overview and reads project_reports joined with projects. It supports overview counts, type filtering, text search, record selection, and recursive structured-content display; no maintenance mock records are used. Creating/editing now uses the local React report editor described below. No report records were created or modified during verification. Focused tests cover pagination, legacy/JSON content and query failures; authenticated real-data and PDF verification remains manual.

## Direct report editor
The local Adidaya editor renders as React components inside the Reports page, sharing its existing Supabase client and session. No editor iframe, external page or token-message bridge is used. When editing, the 360px list panel becomes the form and the right panel becomes the original live preview. Scoped styles keep the document editor isolated from React Native Web styles. Save reloads Reports, cancel returns to the list, and PDF uses browser print/Save as PDF. Native editing remains unsupported. Build and 13 focused tests pass; real authenticated writes and visual print verification require manual checking.

## Daily Report design template
Daily Report alone now uses the shared HeaderCircleButton and SegmentedControl components, desktop header/title metrics and a 360px form pane. The native web header is rendered in the normal application layout; only document/form styles remain scoped. Header actions are back, PDF and save. Section filters and document language stay in the left header, with the live preview in the right pane. Other report types retain their current controls pending review of this template. Authenticated writes and visual review are not automated.

## Finance attachment recovery
Reimbursement reads now include the same reimbursement_invoices relation as legacy Adidaya. Related and legacy receipt fields are merged and deduplicated; comma-separated legacy receipt paths are preserved. A shared normalizer handles arrays, JSON, object paths and proof lists. The web Documents & Proofs card shows every receipt/proof as a separate selectable row, with loading/unavailable states rather than a multi-option Alert unsupported by web. Failed signing no longer produces a fabricated public URL. Fifteen focused tests and the production export pass; authenticated download checks require a real request with attachments.

## Release repair checkpoint — 16 October 2026
The authoritative current release notes are vercel-release.md and release-verification.json. Notification sources/read state, Finance authority/payment parity, preserved-backend API routing and the legacy Clock write path were repaired. The backend origin is configured as https://from-adidaya.vercel.app. Its auth-helper patch is prepared in the old Next checkout, with its pre-change file saved under migration-snapshots/backend-auth-patch. Hosted backend deployment and authenticated staging acceptance are still pending; no domain switch or database migration was performed. The latest full typecheck has 397 inherited diagnostics versus the original 403, with zero additional diagnostics after normalized comparison. Twenty-five focused tests and the web export pass.
