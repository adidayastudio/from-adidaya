# FROM ADIDAYA — Kickoff Legacy 2.0 → V3 Migration Mapping

**Status:** Draft mapping untuk review, bukan instruksi migrasi otomatis.
**Sumber:** 30 Work Item yang diberikan pengguna dalam 8 kelompok Legacy KO 2.0.
**Standar target:** KO (Stage 100), kategori G/X/D/A/S/M/I/L/V/B/T/R; format `KOX-01-01`.

## Prinsip migrasi

1. Simpan **legacy_code, Work EN, Work ID, Weight, Priority** persis dari sumber; tambahkan `proposed_v3_code` dan `migration_action` sebagai kolom baru.
2. Semua entri legacy harus tetap dapat ditelusuri. Tidak menghapus entri duplikat atau template: cukup ubah representasinya dengan audit trail.
3. **Weight tidak diubah atau dinormalisasi** sebelum fungsi dan skala bobot legacy diverifikasi. Priority juga dipertahankan.
4. Group G/X/D fleksibel. Penomoran target di tabel ini adalah **usulan**, belum katalog final yang immutable.
5. Kode `99` pada kandidat template layout hanyalah penanda internal sementara; **tidak diterbitkan sebagai register KO V3** dan bukan keputusan menambah group 99.
6. Entri berjudul sama `Timeline Expectation` (Legacy 02-05 dan 06-01) perlu dipastikan apakah dua kejadian terpisah atau dua tampilan atas satu sumber data. Versi draft mengusulkan *link/alias* ke satu item, tetapi tidak menghapus keduanya.
7. Untuk item terbit lama, pertahankan legacy reference dan historical snapshot; kode baru berlaku saat migrasi yang disetujui.

## A. Full legacy preservation & proposed mapping

| Legacy Code | Work (EN) | Work (ID) | Weight | Priority | Proposed V3 | Treatment |
|---|---|---|---:|---|---|---|
| 01-01 | Cover | Sampul | 4 | low | KOG-01-01 | Register work/content |
| 01-02 | Table of Contents | Daftar Isi | 4 | low | KOG-01-02 | Register work/content |
| 01-03 | Purpose of Kickoff | Tujuan KO | 8 | medium | KOG-01-03 | Register work/content |
| 01-04 | Workflow Overview | Tinjauan Alur Kerja | 14 | low | KOX-02-01 | Register work/content |
| 02-01 | Project Understanding | Pemahaman Proyek | 24 | high | KOG-02-01 | Register work/content |
| 02-02 | Client Needs & Vision | Visi & Kebutuhan Klien | 42 | high | KOG-02-02 | Register work/content |
| 02-03 | Functional Requirements | Kebutuhan Fungsional | 24 | high | KOG-02-03 | Register work/content |
| 02-04 | Functional Requirements Matrix | Matriks Kebutuhan Fungsional | 24 | high | KOG-02-04 | Register work/content |
| 02-05 | Timeline Expectation | Ekspektasi Lini Waktu | 15 | medium | KOT-01-01 | Register work/content |
| 03-01 | Design Scope & Deliverables | Lingkup Kerja & Keluaran Desain | 35 | high | KOX-01-01 | Register work/content |
| 03-02 | Construction Scope & Deliverables | Lingkup Kerja & Pelaksanaan Konstruksi | 35 | high | KOX-01-02 | Register work/content |
| 03-03 | Scope Exclusions | Pengecualian Lingkup Kerja | 15 | medium | KOX-01-03 | Register work/content |
| 03-04 | Project Assumptions | Asumsi Pekerjaan Proyek | 15 | medium | KOX-01-04 | Register work/content |
| 04-01 | Single Image | Gambar Tunggal | 15 | high | — (Layout Template) | Editor preset; archive original Work record |
| 04-02 | Multiple Image | Multi Gambar Grid | 15 | medium | — (Layout Template) | Editor preset; archive original Work record |
| 04-03 | Image and Desc | Gambar & Deskripsi | 15 | high | — (Layout Template) | Editor preset; archive original Work record |
| 04-04 | Image and Point | Gambar & Poin-Poin | 15 | medium | — (Layout Template) | Editor preset; archive original Work record |
| 04-05 | Multiple Image and Desc | Multi Gambar & Deskripsi | 10 | medium | — (Layout Template) | Editor preset; archive original Work record |
| 04-06 | Full Bleed Image Overlay | Gambar Penuh Overlay | 10 | low | — (Layout Template) | Editor preset; archive original Work record |
| 05-01 | Budget Expectation | Ekspektasi Anggaran Biaya | 24 | high | KOB-01-01 | Register work/content |
| 05-02 | Building Code Check | Pemeriksaan Kode Bangunan | 40 | high | KOX-03-01 | Register work/content |
| 05-03 | Height & GSB Analysis | Analisis Tinggi & GSB | 16 | medium | KOX-03-02 | Register work/content |
| 06-01 | Timeline Expectation | Ekspektasi Lini Waktu | 15 | medium | KOT-01-01 | Link to KO T-01-01; retain legacy record |
| 06-02 | Visual Timeline Chart | Grafik Visual Timeline | 20 | high | KOT-01-02 | Register work/content |
| 06-03 | Area vs Cost Analysis | Analisis Luas vs Biaya | 15 | medium | KOB-01-02 | Register work/content |
| 07-01 | Stage Timeline | Lini Waktu Tahap | 12 | medium | KOT-01-03 | Register work/content |
| 07-02 | Milestone Definition | Penentuan Milestones | 18 | high | KOT-01-04 | Register work/content |
| 08-01 | Signoff & Approval | Persetujuan Dokumen | 4 | high | KOX-04-01 | Register work/content |
| 08-02 | Client Approval | Persetujuan Klien | 5 | urgent | KOX-04-02 | Register work/content |
| 08-03 | Notes | Catatan | 1 | low | KOG-01-04 | Register work/content |

## B. Proposed KO V3 register (unique target entries)

The following are candidate Group labels; editable for G/X/D and other groups still under review.

| Package / Group | Candidate Meaning | Proposed Code | Work EN | Work ID | Weight | Priority |
|---|---|---|---|---|---:|---|
| KOG / 01 | General Presentation & Information | KOG-01-01 | Cover | Sampul | 4 | low |
| KOG / 01 | General Presentation & Information | KOG-01-02 | Table of Contents | Daftar Isi | 4 | low |
| KOG / 01 | General Presentation & Information | KOG-01-03 | Purpose of Kickoff | Tujuan KO | 8 | medium |
| KOX / 02 | Workflow / Procedure | KOX-02-01 | Workflow Overview | Tinjauan Alur Kerja | 14 | low |
| KOG / 02 | Project & Client Brief | KOG-02-01 | Project Understanding | Pemahaman Proyek | 24 | high |
| KOG / 02 | Project & Client Brief | KOG-02-02 | Client Needs & Vision | Visi & Kebutuhan Klien | 42 | high |
| KOG / 02 | Project & Client Brief | KOG-02-03 | Functional Requirements | Kebutuhan Fungsional | 24 | high |
| KOG / 02 | Project & Client Brief | KOG-02-04 | Functional Requirements Matrix | Matriks Kebutuhan Fungsional | 24 | high |
| KOT / 01 | Timeline & Milestones | KOT-01-01 | Timeline Expectation | Ekspektasi Lini Waktu | 15 | medium |
| KOX / 01 | Scope & Deliverables | KOX-01-01 | Design Scope & Deliverables | Lingkup Kerja & Keluaran Desain | 35 | high |
| KOX / 01 | Scope & Deliverables | KOX-01-02 | Construction Scope & Deliverables | Lingkup Kerja & Pelaksanaan Konstruksi | 35 | high |
| KOX / 01 | Scope & Deliverables | KOX-01-03 | Scope Exclusions | Pengecualian Lingkup Kerja | 15 | medium |
| KOX / 01 | Scope & Deliverables | KOX-01-04 | Project Assumptions | Asumsi Pekerjaan Proyek | 15 | medium |
| KOB / 01 | Initial Budget & Feasibility | KOB-01-01 | Budget Expectation | Ekspektasi Anggaran Biaya | 24 | high |
| KOX / 03 | Site & Regulatory Constraints | KOX-03-01 | Building Code Check | Pemeriksaan Kode Bangunan | 40 | high |
| KOX / 03 | Site & Regulatory Constraints | KOX-03-02 | Height & GSB Analysis | Analisis Tinggi & GSB | 16 | medium |
| KOT / 01 | Timeline & Milestones | KOT-01-02 | Visual Timeline Chart | Grafik Visual Timeline | 20 | high |
| KOB / 01 | Initial Budget & Feasibility | KOB-01-02 | Area vs Cost Analysis | Analisis Luas vs Biaya | 15 | medium |
| KOT / 01 | Timeline & Milestones | KOT-01-03 | Stage Timeline | Lini Waktu Tahap | 12 | medium |
| KOT / 01 | Timeline & Milestones | KOT-01-04 | Milestone Definition | Penentuan Milestones | 18 | high |
| KOX / 04 | Approval & Signoff | KOX-04-01 | Signoff & Approval | Persetujuan Dokumen | 4 | high |
| KOX / 04 | Approval & Signoff | KOX-04-02 | Client Approval | Persetujuan Klien | 5 | urgent |
| KOG / 01 | General Presentation & Information | KOG-01-04 | Notes | Catatan | 1 | low |

## C. Layout preset — 6 legacy entries (retain, do not force as deliverables)

| Legacy | Layout preset (EN) | Indonesian | Legacy Weight | Legacy Priority | Suggested V3 home |
|---|---|---|---:|---|---|
| 04-01 | Single Image | Gambar Tunggal | 15 | high | Editor → Layout Presets |
| 04-02 | Multiple Image | Multi Gambar Grid | 15 | medium | Editor → Layout Presets |
| 04-03 | Image and Desc | Gambar & Deskripsi | 15 | high | Editor → Layout Presets |
| 04-04 | Image and Point | Gambar & Poin-Poin | 15 | medium | Editor → Layout Presets |
| 04-05 | Multiple Image and Desc | Multi Gambar & Deskripsi | 10 | medium | Editor → Layout Presets |
| 04-06 | Full Bleed Image Overlay | Gambar Penuh Overlay | 10 | low | Editor → Layout Presets |

## D. Pending decisions

- **Layout preset behavior:** Are those six entries selectable blocks for assembling a document, or independently trackable deliverables? Migration suggestion assumes selectable layouts; confirm before removal from active task view.
- **Timeline Expectation duplication:** Are 02-05 and 06-01 two separate content blocks? If yes, give them distinct target codes; if same underlying source, link both with one data record.
- **Scope:** Should regulatory checks (Building Code Check, Height & GSB) remain in KOX as early feasibility checks, or later move to design/permit-related package?
- **Weight meaning:** Is this score an estimate of effort, importance, or work-progress weighting? Do not compute total project percentage from it until confirmed.
- **Cover/TOC/Notes:** May eventually become automatically generated document sections; preserve as authored work initially unless confirmed otherwise.

## E. Migration implementation requirements

1. Add target fields `stage_code`, `category_code`, `group_code`, `sequence`, `v3_code`, `source_version`, `legacy_code`, `migration_status`, `content_role` without overwriting original records.
2. Create mapping with statuses `proposed`, `approved`, `migrated`, `needs_review`; keep old-to-new many-to-one links where aliases occur.
3. New V3 list shows only applicable selected items, not all category placeholders.
4. Enforce uniqueness on (project_id, v3_code) for active register records, with published revisions stored separately.
5. Run a preview/dry-run of collisions, file attachments, approval history, and links before applying migration.
6. After user review, migrate one KO package first, verify display, then extend to SD/DD/ED/PR/CN/HO using their **actual existing work data**, not synthesized content.

## F. Counts and checkpoints

- Legacy rows preserved: **30**.
- Proposed unique active register entries: **23** (30 minus 6 layout presets minus 1 proposed timeline alias).
- Layout presets preserved separately: **6**.
- Proposed linked duplicate source entry: **1** (`06-01`).
- All EN/ID titles, numerical weights, and priorities preserved in section A.

> This mapping represents only the KO legacy content shared by the user. No equivalent legacy item data was supplied here for SD, DD, ED, PR, CN, or HO.
