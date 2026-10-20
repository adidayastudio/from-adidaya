# Project Register 3.0

Updated: 21 October 2026.

## Source and version naming

The supplied `FROM_ADIDAYA_MASTER_REGISTER_V3.md` is preserved in this directory. Its internal heading still says V2/V1. The user explicitly identifies this implementation as Version 3.0; previous application screens remain Legacy 2.0. The separate Adidaya Legacy application remains Legacy 1.0.

The earlier 10-stage 00–99 master plan remains available for historical reference, not the active V3 structure.

## Active structure

Project → Stage → Category/Package → Group → Item.

- KO, SD, DD, ED, PR, CN, HO. Default initial stage: KO. Users choose SD/DD/ED themselves; priority does not auto-select ED.
- G, X, D, A, S, M, I, L, V, B, T, R in fixed display order.
- MEP is one parent category. Mechanical M, Electrical E, Plumbing P have separate package code namespaces; the parent never creates an additional EDM namespace.
- Conventional group labels are master proposals. G/X/D start without fixed groups. Project-specific groups can be added through 99.
- Supplied KO master applies automatically once per project on register load. Later project edits and exclusions remain local to the project. Other stages await their actual master data.
- Codes are generated per stage/category/group, with zero-padded sequence 01–99. The record UUID remains permanent.

## Screens

Project workspace Stages, Tasks & Deliverables and Documents share the V3 register and stage/category hierarchy.

- Stages: Legacy 2.0 accordion/table layout with Code, Work (EN), Work (ID), Weight, Priority, add above/below, subtasks, move up/down, recoverable exclusion, CSV/XLS/PDF export, save and stage revision history. Current V3 codes follow sibling order after insertions and moves; descendant prefixes follow their parent. UUIDs and published snapshots remain stable, and previous codes are retained as aliases. Task headings use KOG-01, direct subtasks KOG-01-01, and deeper subtasks extend the full parent code.
- Tasks & Deliverables: edit work status, file link, notes and module reference; publish approved items and create revisions.
- Documents: show issued versions, previous issues and original file links. An in-progress revision does not replace the latest published record.
- Version selector switches these screens to Legacy 2.0 without migrating records.
- Activity, WBS tracking, Volume, RAB and Schedule are retained. Budget/Time/Report register items can reference those modules without duplicating their calculations.

## Data and limitations

V3 uses `projects.meta.projectRegisterV3` only. Existing legacy metadata and tables are not imported, cleared or rewritten. Saves read fresh metadata, check the register baseline and use compare-and-set against project metadata to prevent conflicting overwrite.

Published revisions preserve code/title/revision/link/notes at issuance. They do **not** copy or freeze remote PDF/DWG content or calculation module data. Use revision-specific source links. Actual managed file storage and module snapshot integration remain separate work.

This is the desktop project workspace integration. Existing standalone/mobile screens remain available and retain their previous layout. No schema migration or automatic upload is performed.

Approval is currently a register status chosen by the project user; no separate approver routing, permissions workflow, notifications or signature collection is implemented.

## Verification

Targeted model/API tests cover stage/category order, empty register behavior, sequence allocation/exhaustion, custom groups, revision history, publish checks, legacy preservation and conflict handling. Browser interaction is not run automatically under repository instructions.

## KO / SD / DD master revision — 21 October 2026

Only KO, SD and DD were updated. Their supplied Legacy 2.0 mappings define content and within-category order. The latest direct user instruction overrides older mapping suggestions: Approval, Internal Approval, Client Approval, Signoff and Notes belong in R, group 99, at the end. G/X/D retain their mapping rationale; A/V/B/T follow the supplied stage mappings. Numeric weights and priorities are preserved without normalization.

Master version 2 is reconciled once per project for these stages. Existing items match by legacy source or recognized old code/title, retain their UUID and customized content, and receive updated category/code/order with old code aliases. Published snapshots keep their original codes and files. A collision or ambiguous match stops initialization without overwriting or merging records. No other stage is reclassified. KO layout presets and the existing timeline alias remain preserved.

New master sources: `constants/projectStageMastersV3.json` and the supplied SD/DD mapping files copied into this docs directory. `constants/projectKOMasterV3.json` remains the KO compatibility source.


## ED, PR, CN and HO master completion

The supplied Legacy 2.0 mapping files are imported as source data: ED 102, PR 24, CN 18, HO 15 work items. All seven stages now initialize from master automatically (242 unique work items total). Each source row preserves its EN/ID title, weight, priority and legacy code/order. Existing project fields, identities and published snapshots remain intact; ambiguous matches and code collisions stop import safely.

Approval/sign-off/Notes use the final R-99 task; HO Project Closure follows Client Sign-Off. CN has no supplied approvals, and none are generated. Monthly/weekly/daily reports remain recurring templates; no fixed number of report files is created. Combined MEP records remain combined.

Stage transitions reuse the planning component and replace header contents before paint. The stage selector uses a fixed width and a static selected state to avoid spring/measurement jitter; other segmented controls retain their existing behavior. Scroll position and temporary search/expanded state reset on stage change.


## Inline Deliverables and Legacy-style Documents

Deliverables now renders category → task → work rows as one expandable tree, with the same 960px content cap, 24px outer padding and 18px cards as Stages. Search and expand/collapse operate across the tree. Adding a deliverable stays inline; editing opens the existing editor. Category navigation and the intermediate Browse Master page are removed.

Documents uses the Legacy folder-row presentation (blue folder icons and horizontal dividers), with all seven V3 stages as folders, followed by category/task folders. Only issued snapshots count as documents; empty folders remain visible and excluded work with publication history remains available. Versions and file links retain the existing behavior. The standard header toolbar provides search, expand/collapse, stage filtering and document sorting. Its add action opens Deliverables, where documents are prepared and published. Legacy 2.0 screens and storage are unchanged.
