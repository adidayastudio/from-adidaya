# FROM ADIDAYA — ED Legacy 2.0 → V3 Register Mapping

**Status:** Draft migration mapping for review; **not yet applied to the application/database**.  
**Stage:** `400 · ED — Detailed Engineering Design`  
**Source:** ED Legacy 2.0 Work list provided in conversation.  
**Scope:** Preserve all legacy records and their EN/ID titles, weights and priorities. Change only proposed category/group/sequence and associated references after approval.

## 1. Migration rules

1. The V3 code is `ED` + category + `-GG-SS`, e.g. `EDS-01-01`. Category `M` = mechanical / MEP parent, `E` = electrical, `P` = plumbing. These have distinct document namespaces.
2. Preserve **all** Work (EN), Work (ID), Weight and Priority exactly as sourced; do **not** automatically normalize weights or interpret them as percentage progress.
3. Preserve the original legacy code as `legacy_code` for traceability, and **do not reuse it as the new identity**. Existing records should have immutable database IDs.
4. All approvals and the final Notes item go in **EDR** at the **end** of the Stage. Their order remains Internal Approval → Client Approval → Notes.
5. Keep the existing legacy order **within each relevant category**, as far as technically possible. The global display order of V3 categories remains `G, X, D, A, S, M (including E/P), I, L, V, B, T, R`; so migration necessarily moves the two visualization rows from legacy architecture to V.
6. `00–09` are initial groups, expandable to `10–99`; sequences use `01–99`; rare suffixes `A/B/...` may be added. **This mapping proposes group meanings for ED only; confirm cross-stage harmonization (SD/DD/ED) before locking the global catalog.**
7. Entries that are not drawings (calculations, budget, schedules, approvals) remain mapped as Work/Deliverable records. They are **not** automatically turned into separate mandatory files or supporting-document templates.
8. Work items not needed on a specific project can be marked N/A or simply not activated. Existing legacy data must not be deleted during migration.

## 2. Proposed ED grouping

| Category | Group | Proposed meaning |
|---|---|---|
| EDG | 01 | ED general package & information |
| EDA | 00 | Architectural notes |
| EDA | 01 | Site plan, floor plans & roof plan |
| EDA | 02 | Elevations |
| EDA | 03 | Sections |
| EDA | 04 | Materials, finishes & ceilings |
| EDA | 05 | Doors, windows & schedules/keyplans |
| EDA | 06 | Architectural details, room details, stairs, lift & ramp |
| EDS | 00 | General notes, calculation & axonometry |
| EDS | 01–08 | Foundation; sloof; columns; beams; slab; roof; vertical circulation; portal/connections |
| EDM | 00 | General notes & cross-discipline MEP calculation |
| EDM | 01–02 | AC/HVAC; fire protection |
| EDE | 00–04 | Calculation & SLD; lighting; power; grounding; installation details |
| EDP | 01–04 | Clean water; dirty water; rainwater; tanks/pumps/site sanitary details |
| EDV | 01 | Exterior & interior visualization |
| EDB | 01 | Master, structural, architectural & MEP budget |
| EDT | 01 | Master, structural, architectural & MEP schedule |
| EDR | 09 | Internal approval, client approval & notes — LAST |

**Review notes:** Architectural `EDA-01` places Siteplan before floor plans, following the legacy; if the global architecture group `01` is strictly floor plans only, move Siteplan into an additional stable group during cross-stage review. The legacy Mechanical group included all plumbing diagrams/plans: these are mapped to `EDP` per the agreed convention, while MEP Calculation remains `EDM-00-02` as cross-discipline. Fire protection is retained under `EDM` pending system-specific subdivision. Structural Calculation and both visualization works remain records (even if ultimately linked to separate files).

## 3. Full record mapping

### Legacy `01` — General / introductory (6 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 01-01 | **EDG-01-01** | Cover | Sampul | 5 | low |
| 01-02 | **EDG-01-02** | Table of Contents | Daftar Isi | 4 | low |
| 01-03 | **EDG-01-03** | Purpose of ED | Tujuan Gambar Kerja | 9 | medium |
| 01-04 | **EDG-01-04** | ED Scope & Deliverables | Lingkup & Keluaran Gambar Kerja | 11 | high |
| 01-05 | **EDG-01-05** | Workflow Overview | Tinjauan Alur Kerja | 5 | low |
| 01-06 | **EDG-01-06** | Project Understanding | Pemahaman Proyek | 11 | high |

### Legacy `02-A` — Architecture & visualization (36 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 02-A-01 | **EDA-00-01** | General Notes | Catatan Umum Arsitektur | 14 | medium |
| 02-A-02 | **EDV-01-01** | Exterior Visualization | Visualisasi Eksterior | 29 | high |
| 02-A-03 | **EDV-01-02** | Interior Visualization | Visualisasi Interior | 29 | high |
| 02-A-04 | **EDA-01-01** | Siteplan | Rencana Tapak (Siteplan) | 18 | high |
| 02-A-05 | **EDA-01-02** | 1st Floor Plan | Denah Lantai 1 | 22 | high |
| 02-A-06 | **EDA-01-03** | 2nd Floor Plan | Denah Lantai 2 | 22 | high |
| 02-A-07 | **EDA-01-04** | Roof Plan | Denah Atap | 10 | medium |
| 02-A-08 | **EDA-02-01** | Front Elevation | Tampak Depan | 18 | high |
| 02-A-09 | **EDA-02-02** | Back Elevation | Tampak Belakang | 18 | high |
| 02-A-10 | **EDA-02-03** | Left Elevation | Tampak Samping Kiri | 18 | high |
| 02-A-11 | **EDA-02-04** | Right Elevation | Tampak Samping Kanan | 18 | high |
| 02-A-12 | **EDA-03-01** | Section A | Potongan A-A | 18 | high |
| 02-A-13 | **EDA-03-02** | Section B | Potongan B-B | 18 | high |
| 02-A-14 | **EDA-03-03** | Section C | Potongan C-C | 18 | high |
| 02-A-15 | **EDA-03-04** | Section D | Potongan D-D | 18 | high |
| 02-A-16 | **EDA-04-01** | 1st Floor Material Finishes | Pola Lantai Lantai 1 | 11 | medium |
| 02-A-17 | **EDA-04-02** | 2nd Floor Material Finishes | Pola Lantai Lantai 2 | 11 | medium |
| 02-A-18 | **EDA-04-03** | 1st Floor Wall Finishes | Finishing Dinding Lantai 1 | 11 | medium |
| 02-A-19 | **EDA-04-04** | 2nd Floor Wall Finishes | Finishing Dinding Lantai 2 | 11 | medium |
| 02-A-20 | **EDA-04-05** | 1st Floor Ceiling Finishes | Rencana Plafond Lantai 1 | 11 | medium |
| 02-A-21 | **EDA-04-06** | 2nd Floor Ceiling Finishes | Rencana Plafond Lantai 2 | 11 | medium |
| 02-A-22 | **EDA-04-07** | Roof Finishes | Detail Penutup Atap | 6 | medium |
| 02-A-23 | **EDA-05-01** | 1st Floor Door-Window Keyplan | Denah Kusen Lantai 1 | 9 | medium |
| 02-A-24 | **EDA-05-02** | 2nd Floor Door-Window Keyplan | Denah Kusen Lantai 2 | 9 | medium |
| 02-A-25 | **EDA-05-03** | Door Detail | Detail Pintu | 18 | high |
| 02-A-26 | **EDA-05-04** | Window Detail | Detail Jendela | 18 | high |
| 02-A-27 | **EDA-05-05** | Door-Window Detail | Detail Pintu & Jendela | 18 | high |
| 02-A-28 | **EDA-06-01** | Detail Room A | Detail Ruang A | 18 | high |
| 02-A-29 | **EDA-06-02** | Detail Room B | Detail Ruang B | 18 | high |
| 02-A-30 | **EDA-06-03** | Detail Room C | Detail Ruang C | 18 | high |
| 02-A-31 | **EDA-06-04** | Detail Room D | Detail Ruang D | 18 | high |
| 02-A-32 | **EDA-06-05** | Stair Detail | Detail Tangga | 29 | high |
| 02-A-33 | **EDA-06-06** | Elevator Detail | Detail Lift | 22 | medium |
| 02-A-34 | **EDA-06-07** | Ramp Detail | Detail Ramp | 21 | medium |
| 02-A-35 | **EDA-06-08** | Detail A | Detail Arsitektur A | 36 | high |
| 02-A-36 | **EDA-06-09** | Detail B | Detail Arsitektur B | 36 | high |

### Legacy `02-S` — Structure (23 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 02-S-01 | **EDS-00-01** | General Notes | Catatan Umum Struktur | 11 | medium |
| 02-S-02 | **EDS-00-02** | Structural Calculation | Perhitungan Struktur | 27 | high |
| 02-S-03 | **EDS-00-03** | Structural Axonometry | Aksonometri Struktur | 16 | medium |
| 02-S-04 | **EDS-01-01** | Foundation Plan | Rencana Pondasi | 35 | high |
| 02-S-05 | **EDS-01-02** | Foundation Detail | Detail Pondasi | 19 | high |
| 02-S-06 | **EDS-02-01** | Tie Beam Plan | Rencana Sloof | 35 | high |
| 02-S-07 | **EDS-02-02** | Tie Beam Detail | Detail Sloof | 19 | high |
| 02-S-08 | **EDS-03-01** | 1st Floor Column Plan | Rencana Kolom Lantai 1 | 22 | high |
| 02-S-09 | **EDS-03-02** | 2nd Floor Column Plan | Rencana Kolom Lantai 2 | 22 | high |
| 02-S-10 | **EDS-03-03** | Column Detail | Detail Kolom | 10 | high |
| 02-S-11 | **EDS-04-01** | 2nd Floor Beam Plan | Rencana Balok Lantai 2 | 22 | high |
| 02-S-12 | **EDS-04-02** | Ring Balk Plan | Rencana Ring Balk | 22 | high |
| 02-S-13 | **EDS-04-03** | Beam Detail | Detail Balok | 10 | high |
| 02-S-14 | **EDS-05-01** | 2nd Floor Plate Plan | Rencana Plat Lantai 2 | 27 | high |
| 02-S-15 | **EDS-05-02** | Roof Plate Plan | Rencana Plat Atap | 16 | medium |
| 02-S-16 | **EDS-05-03** | Floor Plate Detail | Detail Penulangan Plat | 11 | high |
| 02-S-17 | **EDS-06-01** | Roof Frame Plan | Rencana Rangka Atap | 35 | high |
| 02-S-18 | **EDS-06-02** | Roof Frame Detail | Detail Rangka Atap | 19 | high |
| 02-S-19 | **EDS-07-01** | Stair Structure Detail | Detail Struktur Tangga | 22 | high |
| 02-S-20 | **EDS-07-02** | Elevator Structure Detail | Detail Struktur Lift | 19 | medium |
| 02-S-21 | **EDS-07-03** | Ramp Structure Detail | Detail Struktur Ramp | 13 | medium |
| 02-S-22 | **EDS-08-01** | Portal Design | Desain Portal Struktur | 35 | high |
| 02-S-23 | **EDS-08-02** | Structural Detail | Detail Sambungan Struktur | 19 | high |

### Legacy `02-M` — Mechanical / legacy plumbing (13 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 02-M-01 | **EDM-00-01** | General Notes | Catatan Umum Mekanikal | 5 | medium |
| 02-M-02 | **EDM-00-02** | MEP Calculation | Perhitungan MEP | 16 | high |
| 02-M-03 | **EDP-01-01** | Clean Water Diagram (SLD) | Diagram Skematis Air Bersih | 11 | high |
| 02-M-04 | **EDP-01-02** | Clean Water Plan | Rencana Perpipaan Air Bersih | 16 | high |
| 02-M-05 | **EDP-01-03** | Clean Water Isometric | Isometrik Air Bersih | 11 | high |
| 02-M-06 | **EDP-02-01** | Dirty Water Diagram (SLD) | Diagram Skematis Air Kotor | 11 | high |
| 02-M-07 | **EDP-02-02** | Dirty Water Plan | Rencana Perpipaan Air Kotor | 16 | high |
| 02-M-08 | **EDP-02-03** | Dirty Water Isometric | Isometrik Air Kotor | 11 | high |
| 02-M-09 | **EDP-03-01** | Rain Water Plan | Rencana Perpipaan Air Hujan | 16 | high |
| 02-M-10 | **EDP-03-02** | Rain Water Isometric | Isometrik Air Hujan | 11 | high |
| 02-M-11 | **EDM-01-01** | AC/HVAC Plan | Rencana Tata Udara / AC | 22 | high |
| 02-M-12 | **EDM-01-02** | AC/HVAC Isometric | Isometrik Tata Udara / AC | 16 | high |
| 02-M-13 | **EDM-02-01** | Fire Protection Plan | Rencana Proteksi Kebakaran | 18 | high |

### Legacy `02-E` — Electrical (8 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 02-E-01 | **EDE-00-01** | Electrical Calculation | Perhitungan Beban Listrik | 27 | high |
| 02-E-02 | **EDE-00-02** | Power Diagram (SLD) | Diagram Satu Garis Listrik (SLD) | 22 | high |
| 02-E-03 | **EDE-01-01** | 1st Floor Lighting Plan | Rencana Titik Lampu Lantai 1 | 22 | high |
| 02-E-04 | **EDE-01-02** | 2nd Floor Lighting Plan | Rencana Titik Lampu Lantai 2 | 22 | high |
| 02-E-05 | **EDE-02-01** | 1st Floor Power Plan | Rencana Stop Kontak Lantai 1 | 22 | high |
| 02-E-06 | **EDE-02-02** | 2nd Floor Power Plan | Rencana Stop Kontak Lantai 2 | 22 | high |
| 02-E-07 | **EDE-03-01** | Grounding Plan | Rencana Penangkal Petir & Grounding | 22 | high |
| 02-E-08 | **EDE-04-01** | Electrical Detail | Detail Instalasi Listrik & Panel | 21 | high |

### Legacy `02-P` — Plumbing details (5 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 02-P-01 | **EDP-04-01** | Filter/Pump Detail | Detail Pompa & Filter Air | 36 | medium |
| 02-P-02 | **EDP-04-02** | Ground Tank Detail | Detail Tangki Air Bawah Tanah | 36 | medium |
| 02-P-03 | **EDP-04-03** | Septic Tank Detail | Detail Septik Tank & Biofilter | 36 | medium |
| 02-P-04 | **EDP-04-04** | Grease Trap Detail | Detail Grease Trap (Penangkap Lemak) | 36 | medium |
| 02-P-05 | **EDP-04-05** | Infiltration Well Detail | Detail Sumur Resapan | 36 | medium |

### Legacy `03` — Budget (4 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 03-01 | **EDB-01-01** | Master Budget | Rencana Anggaran Biaya Induk (RAB) | 54 | high |
| 03-02 | **EDB-01-02** | STR Budget | RAB Pekerjaan Struktur | 42 | medium |
| 03-03 | **EDB-01-03** | ARS Budget | RAB Pekerjaan Arsitektur | 42 | medium |
| 03-04 | **EDB-01-04** | MEP Budget | RAB Pekerjaan MEP | 42 | medium |

### Legacy `04` — Schedule (4 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 04-01 | **EDT-01-01** | Master Schedule | Jadwal Pelaksanaan Induk | 54 | high |
| 04-02 | **EDT-01-02** | STR Schedule | Jadwal Pekerjaan Struktur | 42 | high |
| 04-03 | **EDT-01-03** | ARS Schedule | Jadwal Pekerjaan Arsitektur | 42 | high |
| 04-04 | **EDT-01-04** | MEP Schedule | Jadwal Pekerjaan MEP | 42 | high |

### Legacy `05` — Approval & notes (3 items)

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 05-01 | **EDR-09-01** | Internal Approval | Persetujuan Internal | 18 | high |
| 05-02 | **EDR-09-02** | Client Approval | Persetujuan Klien | 22 | urgent |
| 05-03 | **EDR-09-03** | Notes | Catatan | 5 | low |

## 4. Summary & validation

- **Total source rows:** 102.
- **Total V3 mapped rows:** 102.
- **Unique V3 codes:** 102; **collisions:** 0.
- **Deleted source rows:** 0.
- **Approval items:** 3, all placed in EDR-09 and displayed last.

| V3 prefix | Record count |
|---|---:|
| EDG | 6 |
| EDA | 34 |
| EDS | 23 |
| EDM | 5 |
| EDE | 8 |
| EDP | 13 |
| EDV | 2 |
| EDB | 4 |
| EDT | 4 |
| EDR | 3 |

### Important design decisions still needing review

- Reuse the same meaning of `A-01`, `A-02`, `A-03`, `A-04`, `S-01` etc. across SD/DD/ED; review KO–DD mappings where proposed codes differ from this updated group convention.
- Keep optional fields and templates optional. In ED, **drawing register is primary**, and calculations, RAB and schedules may be linked to dedicated modules rather than duplicating data as standalone documents.
- Confirm whether `EDG-01` should be split into `EDG-00` for cover/index and `EDG-01` for purpose/scope; mapping currently preserves original sequence in one group.
- During implementation, track old↔new code aliases, attachment relations, history and revisions; **never mass-rename published files until references are audited**.
- Cross-discipline MEP work `MEP Calculation` stays as a single legacy record at EDM-00-02; avoid automatically splitting the source record into three duplicates.

## 5. Acceptance checklist

- [ ] All 102 source rows verified against Legacy 2.0
- [ ] EN/ID, weights and priorities unchanged
- [ ] All three approvals/notes in EDR, last in stage display
- [ ] M/E/P grouping and architectural/structural group semantics approved
- [ ] Old file links, project work items, references, and revisions safely retained
- [ ] Then apply migration via preview/dry-run and approve explicitly
