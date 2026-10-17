# One-project production release

Use existing Vercel project from-adidaya; existing domains and NEXT_PUBLIC Supabase configuration remain. Main builds frontend/ (Expo) into public static assets, then Next.js compiles the original app/api handlers. UI routes rewrite to forma-index.html; /api and assets remain server/static routes. Legacy API Bearer auth uses caller identity. No new Vercel project or domain transfer is needed.

Backup: backup/adidaya-before-forma-2026-10-18 at 40ef3a00ed9e94531bd55fee65c38844a77003d7. Restore that branch to production for rollback; database writes are not reverted.

Local Setup settings and known Crew workflow gaps remain as documented in frontend/docs/priority-modules-audit.md.
