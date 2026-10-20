# FROM ADIDAYA — Design Development (DD) Legacy 2.0 → V3 Migration Mapping

**Status:** Draft review; belum diterapkan ke aplikasi/database.  
**Sumber:** 30 Work Item dalam 10 kelompok DD Legacy 2.0 yang diberikan pengguna.  
**Target Stage:** `300 · DD (Design Development)`; kode `DD{category}-{group:02}-{sequence:02}`.

## Aturan migrasi

- Seluruh **30** record dipertahankan dengan `Legacy Code`, `Work (EN)`, `Work (ID)`, `Weight`, `Priority` persis dari sumber. Tidak ada penghapusan atau penyesuaian nilai.
- Kode V3 adalah **usulan** dan baru final setelah review. Semua perubahan memakai mapping yang bisa ditelusuri kembali.
- Grup arsitektur mengikuti kesepakatan lintas Stage: `A-01` denah, `A-02` tampak, `A-03` potongan, `A-04` material. Group dan sequence gambar ini harus konsisten dengan SD/ED.
- `G` untuk informasi dan presentasi umum; `X` untuk scope, workflow, koordinasi, approval. Isi G/X fleksibel untuk dipindahkan saat review.
- `V` visualisasi, `B` budget, `T` time. Ringkasan dan detail biaya/jadwal bisa membaca satu sumber data, bukan wajib menyimpan data duplikat.
- Master katalog **bukan checklist wajib**. Daftar aktual hanya dibuat sesuai scope proyek. Supporting Documents dibuat bila dibutuhkan.
- Bobot (`Weight`) adalah angka Legacy apa adanya, **bukan otomatis persen progres**. Priority adalah string legacy (`low`, `medium`, `high`, `urgent`).
- `Final` dalam nama Work (ID) tetap dipertahankan persis; bukan otomatis status Approved/Issued.

## A. Full source-to-V3 mapping

| Legacy | Work (EN) | Work (ID) | Weight | Priority | Proposed V3 Code | Rationale |
|---|---|---|---:|---|---|---|
| 01-01 | Cover | Sampul | 7 | low | **DDG-01-01** | Cover / general |
| 01-02 | Table of Contents | Daftar Isi | 7 | low | **DDG-01-02** | Index |
| 01-03 | Purpose of DD | Tujuan Pengembangan Desain | 14 | medium | **DDG-01-03** | Purpose |
| 01-04 | DD Scope & Deliverables | Lingkup & Keluaran Pengembangan Desain | 18 | high | **DDX-01-01** | Scope & deliverables |
| 01-05 | Workflow Overview | Tinjauan Alur Kerja | 7 | low | **DDX-02-01** | Workflow |
| 01-06 | Project Understanding | Pemahaman Proyek | 17 | high | **DDG-02-01** | Project background |
| 02-01 | 1st Floor Plan | Denah Lantai 1 Final | 140 | high | **DDA-01-01** | Architecture plans |
| 02-02 | 2nd Floor Plan | Denah Lantai 2 Final | 140 | high | **DDA-01-02** | Architecture plans |
| 02-03 | Roof Plan | Denah Atap Final | 70 | medium | **DDA-01-03** | Architecture plans; roof plan in group 01 |
| 03-01 | Front Elevation | Tampak Depan | 61 | high | **DDA-02-01** | Architecture elevations |
| 03-02 | Back Elevation | Tampak Belakang | 61 | high | **DDA-02-02** | Architecture elevations |
| 03-03 | Left Elevation | Tampak Samping Kiri | 61 | high | **DDA-02-03** | Architecture elevations |
| 03-04 | Right Elevation | Tampak Samping Kanan | 62 | high | **DDA-02-04** | Architecture elevations |
| 04-01 | Section A | Potongan A-A | 88 | high | **DDA-03-01** | Architecture sections |
| 04-02 | Section B | Potongan B-B | 87 | high | **DDA-03-02** | Architecture sections |
| 05-01 | Floor Material | Material Lantai | 53 | high | **DDA-04-01** | Architectural materials |
| 05-02 | Wall Material | Material Dinding | 52 | high | **DDA-04-02** | Architectural materials |
| 05-03 | Ceiling Material | Material Plafond | 35 | medium | **DDA-04-03** | Architectural materials |
| 05-04 | Roof Material | Material Penutup Atap | 35 | medium | **DDA-04-04** | Architectural materials |
| 06-01 | Exterior Visualization | Visualisasi Eksterior Final | 95 | high | **DDV-01-01** | Exterior visualization |
| 06-02 | Interior Visualization | Visualisasi Interior Final | 115 | high | **DDV-02-01** | Interior visualization |
| 07-01 | ARS-STR Coordination | Koordinasi Arsitektur - Struktur | 96 | high | **DDX-03-01** | Interdisciplinary coordination |
| 07-02 | ARS-MEP Coordination | Koordinasi Arsitektur - MEP | 79 | high | **DDX-03-02** | Interdisciplinary coordination |
| 08-01 | Cost Estimation Summary | Ringkasan Estimasi Biaya | 42 | high | **DDB-01-01** | Budget summary |
| 08-02 | Cost Estimation Detail | Rincian Estimasi Biaya | 98 | high | **DDB-01-02** | Budget detail |
| 09-01 | Timeline Estimation Summary | Ringkasan Estimasi Jadwal | 42 | medium | **DDT-01-01** | Timeline summary |
| 09-02 | Timeline Estimation Detail | Rincian Estimasi Jadwal | 98 | high | **DDT-01-02** | Timeline detail |
| 10-01 | Internal Approval | Persetujuan Internal | 28 | high | **DDX-04-01** | Internal approval |
| 10-02 | Client Approval | Persetujuan Klien | 35 | urgent | **DDX-04-02** | Client approval |
| 10-03 | Notes | Catatan | 7 | low | **DDG-01-04** | General notes |

## B. Candidate V3 group register

| Package / Group | Candidate Group Name | Count | Mapped Codes |
|---|---|---:|---|
| DDG-01 | Presentation & General Notes | 4 | DDG-01-01, DDG-01-02, DDG-01-03, DDG-01-04 |
| DDG-02 | Project Understanding | 1 | DDG-02-01 |
| DDX-01 | Scope & Deliverables | 1 | DDX-01-01 |
| DDX-02 | Workflow | 1 | DDX-02-01 |
| DDX-03 | Interdisciplinary Coordination | 2 | DDX-03-01, DDX-03-02 |
| DDX-04 | Reviews & Approvals | 2 | DDX-04-01, DDX-04-02 |
| DDA-01 | Plans | 3 | DDA-01-01, DDA-01-02, DDA-01-03 |
| DDA-02 | Elevations | 4 | DDA-02-01, DDA-02-02, DDA-02-03, DDA-02-04 |
| DDA-03 | Sections | 2 | DDA-03-01, DDA-03-02 |
| DDA-04 | Materials & Finishes | 4 | DDA-04-01, DDA-04-02, DDA-04-03, DDA-04-04 |
| DDV-01 | Exterior Visualization | 1 | DDV-01-01 |
| DDV-02 | Interior Visualization | 1 | DDV-02-01 |
| DDB-01 | Cost Estimation | 2 | DDB-01-01, DDB-01-02 |
| DDT-01 | Timeline Estimation | 2 | DDT-01-01, DDT-01-02 |

## C. Summary by Category

| Category | Items |
|---|---:|
| DDG | 5 |
| DDX | 6 |
| DDA | 13 |
| DDV | 2 |
| DDB | 2 |
| DDT | 2 |

**Total: 30 Work Item**, 14 draft groups, **0 records removed**.

## D. Review decisions / open items

1. **Group DDG/DDX fleksibel.** Cover, TOC, Purpose, Notes mungkin lebih cocok menjadi struktur kompilasi paket daripada task terpisah. Untuk migrasi awal, seluruhnya tetap disimpan sebagai item.
2. **Koordinasi ARS–STR dan ARS–MEP** ditempatkan di `DDX-03`, bukan dipaksa menjadi gambar A/S/M. Jika nanti menghasilkan coordination drawing, dapat ditautkan ke Work Item ini.
3. **Material** ditempatkan di `DDA-04` sesuai usulan standar A-04. Bila ternyata khusus interior, pengguna dapat memindahkan output terkait ke DDI dengan mapping resmi.
4. **Roof Plan** sementara tetap `DDA-01-03` agar konsisten dengan SD. Jika nanti ada standar group khusus atap, lakukan revisi lintas stage yang belum terbit saja.
5. **Master Weight** mungkin memakai angka relatif dan bukan %, perlu verifikasi sebelum digunakan menghitung progress.
6. `DDV-01/02`, `DDB-01`, `DDT-01` sementara mengikuti pola SD agar mudah memantau output lintas fase.
7. Approval internal dan klien adalah Work/Decision records, bukan persetujuan otomatis saat file diunggah.

## E. Implementasi aman

- Simpan `legacy_stage=DD`, `legacy_code`, nilai asli, `proposed_v3_code` dan `mapping_status=draft`.
- Sebelum migrasi, periksa collision dengan kode yang sudah ada di proyek; **jangan overwrite**.
- Setelah disetujui, buat katalog group yang dipilih dan gunakan per proyek hanya saat relevan.
- Kunci kode yang sudah **Published** dan gunakan revision terpisah; perpindahan kategori memerlukan alias/mapping agar referensi lama tetap valid.
- Jangan membuat supporting document otomatis.

## F. Lanjutannya

Setelah DD disetujui, lakukan tahap yang sama untuk ED, PR, CN, HO agar standar drawing register tetap konsisten di seluruh 7 Stage.
