# Project Detail revamp — implementation audit

Reference: `FROM_ADIDAYA_PROJECT_DETAIL_REVAMP_PLAN.md` and the 00–99 folder structure in the workspace root.

## Current delivery

Navigation foundation only. The full lifecycle revamp and Stage 1 acceptance criteria are not complete.

- Desktop entry points: `app/(tabs)/projects/index.tsx` and `app/project-details/[id].tsx` both use `ProjectWorkspace`.
- Compact/native entry point: `ProjectDetailContent`; Overview, Work and Documents remain direct, with Planning, Control, Reports and Activity in the existing platform context menu.
- Planning reuses existing table readers for WBS, volume, RAB and schedule. Reports reuse the saved project report reader.
- Control reuses TrackingTab; Work reuses its task-only view on all platforms.
- The 00–99 catalog is a read-only reference with search and stage drill-down. It does not relabel or modify existing project stage/task IDs.
- Existing settings editors and their desktop unsaved-change guard are preserved. Team & Access stays in settings.

## Ownership and reuse

| Area | Existing source | Treatment |
| --- | --- | --- |
| Project identity/settings | project API and setup screens | Reuse |
| Task/work and actuals | TrackingTab and projectProgress | Reuse; approval and aggregation audit pending |
| Planning | project_stages, project_wbs_items, project_volume_calcs, project_rab_versions, project_tasks | Read existing records; stage catalog displayed separately |
| Documents | DocsTab and project.meta.documents | Legacy only; private storage and revision model pending |
| Reports | project_reports and projectReports | Read existing records |
| Activity | ActivityTab | Reuse |

## Pending before completion of Stage 1

- Map legacy StageTemplate/StageTaskTemplate and project stage IDs against canonical catalog IDs. Codes alone are not a safe mapping key.
- Design and persist project-specific active scope, including permission enforcement and historical inactive entries.
- Confirm server-side tenant/project membership, storage contract and approval/baseline sources against deployed schema.
- Verify compact/native navigation and settings guards at runtime; browser not opened because repository instructions require an explicit user request.

## Subsequent gates

Documents require a private bucket contract, pending/upload/finalize operations, immutable revisions, signed downloads, file links and migration of verifiable legacy references. Do not reuse public chat upload as the document contract.

Direct input, import/export and verified progress remain later stages; this delivery introduces no database migration, production deployment, sample project records or scope activation writes.

## Legacy Planning source correction

Legacy route inspection confirmed that active RAB values are written to `projects.meta.estimateValues` and per-area overrides to `priceOverrides`; schedule writes `scheduleValues` with `start`, `duration`, and `progress`. These current saved entries are now shown separately from version-table records. No synthetic estimate tree, assumed building area or default prices are generated.

RAB version items use `qty` and join WBS titles. Schedule versions now read `project_schedule_versions` and their `project_schedule_tasks`, rather than operational tasks. Volume reads `calculated_volume` and formula parameters, falling back per exact WBS code to saved estimates/WBS quantities where no calculation exists. Stage records remain identifiable independently of the canonical catalog.

Verified with focused lint and five data-mapping tests. Live database/browser rendering has not been verified in this delivery.

## RAB V3 parity correction

The raw metadata list above was insufficient for RAB V3 parity and is superseded for the active RAB view. `lib/legacy-rab` ports the legacy WBS mapper, catalog inputs, estimate calculation and RAB V3 row adapter. Database WBS takes precedence over `meta.wbsTree` / `customWBS`, as in the legacy route. In particular, legacy zero estimate volumes fall back to WBS quantities; short estimate keys are resolved by the legacy engine. This behavior intentionally follows legacy rather than interpreting metadata entries as independent rows.

The table now provides all-work, recap, level-2 and all discipline tabs, Ballpark/Estimates/Detail modes, section hierarchy, row numbers, WBS codes, titles, unit prices, amounts, weights, subtotal and optional legacy PPN 11%. All-work totals exclude section rows. Version-table records remain separate. No production records are rewritten.

Four RAB regression cases plus five existing mapping tests pass, including the screenshot example S.1.1 (174.51 × 118377 → rounded 20657970). Browser/live-project parity still requires runtime verification; the screenshot example is a fixture, not a live database assertion.

## Editable new-app RAB spreadsheet

The new app now owns its spreadsheet UI and save handler. Local configuration comparison confirmed that legacy and new app point to the same database endpoint; copying project records into another database would duplicate this shared data.

Detail leaf cells support title, volume, unit and unit price edits, with column letters, row numbers, selected-cell formula bar, live totals/weights and explicit Save. Aggregated recaps and sections remain calculated. Save validates all changed cells and merges them into the current project's estimateValues. New exact-code values include an explicit marker so a deliberate zero does not fall back to the previous WBS quantity, and titles persist in the new app.

The save reads fresh metadata, rejects changed estimates, then conditionally updates the same metadata snapshot and requires a returned row. Other project metadata is retained. Backend permissions/errors are surfaced; failed saves keep drafts. Desktop workspace navigation and browser close/reload warn while dirty. Existing legacy clients do not interpret the new explicit-zero/title extension; new-app persistence does. This save does not rewrite WBS or volume-calculation tables.

Fourteen focused tests pass, covering rendering calculations, zero persistence, numeric validation, conflict rejection, denied saves and preservation of unrelated metadata. Live Save has not been exercised against a user's project.

## Legacy-first layout alignment: Documents, Stages, WBS and Volume

The virtual 00–99 folder catalog now belongs to Documents. Its tree shows actual document entries from project metadata regardless of uploaded/generated origin. Explicit subwork/stage codes or a recognized folder path determine location; unmapped legacy codes stay in Inbox. Normalization now retains folder fields and URLs. The existing preview, per-document context menu, bookmarks, sorting/filtering and selection remain connected. This change does not create missing generated document outputs, a private upload pipeline or revision storage.

Stages & Work now groups project_tasks by the existing project stage code, retaining legacy stage identities. WBS uses the legacy tree mapper, hierarchical ordering, bilingual labels where stored, Summary/Breakdown, search and expand/collapse. Neither area renders a data table. Buttons and search fields use pill styling.

Volume now follows the legacy two-pane calculator: WBS navigator, selected leaf, unit, running total, calculation cards, six legacy formula types, add/remove rows and Save & Apply to RAB. Stable calculation IDs make retries idempotent; deletion targets only removed record IDs. Save writes project_volume_calcs, current exact-code estimate values and exact-code WBS quantity/unit. Unlike a transaction, these writes can partially complete; errors explicitly name the incomplete synchronization and preserve edits for retry. Existing legacy short-code calculation reads remain supported, but writes do not overwrite ambiguous short-code estimate aliases. An atomic backend service remains a future improvement.

22 focused tests cover grouping, legacy calculation behavior, document classification and volume save/error sequencing. Live browser interaction and production save have not been verified; no deployment or database migration was performed.
