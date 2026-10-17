# Forma production cutover — 18 October 2026

Repository: adidayastudio/from-adidaya.

- backup/adidaya-before-forma-2026-10-18: exact pre-cutover main, 40ef3a00ed9e94531bd55fee65c38844a77003d7.
- backend/adidaya-legacy: original Next application plus user Bearer-token authentication for the frontend API proxy.
- release/forma-2026-10-18: Expo Forma UI with Adidaya data adapters, prepared as a fast-forward successor to existing main.

## Hosting order

1. Keep the existing Vercel project and its environment variables. Set its production branch to backend/adidaya-legacy and deploy that branch. Keep from-adidaya.vercel.app assigned to this project.
2. Create a separate Vercel frontend project from this repository and the release branch. Framework Other; build npm run build; output dist; root repository root.
3. Set EXPO_PUBLIC_APP_MODE=adidaya, EXPO_PUBLIC_ADIDAYA_SUPABASE_URL and EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY from the verified existing Adidaya public configuration, and ADIDAYA_BACKEND_ORIGIN=https://from-adidaya.vercel.app. Never copy service-role or private provider keys into EXPO_PUBLIC variables.
4. Check the frontend generated HTTPS URL: login, direct /home/finance reload, authenticated APIs, clock camera/location, finance reads and attachment access. Operational test writes require designated test accounts/records.
5. Once the old project is safely pinned to its backend branch and the frontend is ready, fast-forward main to the Forma release. Set frontend production branch main, deploy, then move only from.adidayastudio.id to the frontend project.

## Rollback

Keep the old backend project deployed. Move from.adidayastudio.id back to that project if necessary. The backup branch records the old UI source. A frontend rollback does not reverse database writes.

## Known acceptance limits

Finance categories and several Setup settings remain local device storage. Crew payroll adjustments and approval/notification parity still require work (see priority-modules-audit.md). Passing export and unit checks does not certify those workflows or a successful production deployment.
