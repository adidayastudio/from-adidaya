# FROM ADIDAYA — Schematic Design Legacy 2.0 → V3 Migration Mapping

**Status:** Draft untuk review; **belum** mengubah aplikasi atau database.  
**Sumber:** 30 work item SD Legacy 2.0 yang dikirim pengguna (kelompok 01–10).  
**Target:** Stage `200 · SD`; format `SD{category}-{group:02}-{sequence:02}` seperti `SDA-01-01`.

## Aturan dan keputusan

- Semua **30** baris Legacy disimpan, termasuk `Legacy Code`, `Work (EN)`, `Work (ID)`, `Weight`, dan `Priority` tanpa modifikasi.
- `V3 Code` berikut **usulan mapping**, bukan kode terbit final. Tidak ada item yang diam-diam diganti nama atau dibuang.
- Group arsitektur **01 = Denah/Plans**, sesuai standar yang sudah dibahas. Group `A-00` untuk daftar ruang/perhitungan luas masih **provisional**; perlu finalisasi master group arsitektur.
- Kategori **D** menampung diagram dan konsep yang belum menjadi gambar kerja A/S/M/I/L. Kategori **V** dipakai untuk output visualisasi; massing study tetap di D pada draft ini, bukan otomatis dianggap render V.
- Group **G/X/D** fleksibel dan boleh dipindah setelah review. Urutan master kategori tetap `G, X, D, A, S, M, I, L, V, B, T, R`; MEP dapat menggunakan SDM/SDE/SDP saat perlu.
- **Weight** dan **Priority** adalah atribut legacy; jangan ditafsir sebagai % progress atau dinormalisasi tanpa verifikasi makna angka.
- Output yang dipilih masuk register proyek; master bukan checklist wajib. Supporting Documents dibuat hanya saat diperlukan.

## A. Full source-to-V3 mapping

| Legacy | Work (EN) | Work (ID) | Weight | Priority | Proposed V3 Code | Mapping rationale |
|---|---|---|---:|---|---|---|
| 01-01 | Cover | Sampul | 5 | low | **SDG-01-01** | General cover |
| 01-02 | Table of Contents | Daftar Isi | 5 | low | **SDG-01-02** | General index |
| 01-03 | Purpose of SD | Tujuan Desain Skematik | 10 | medium | **SDG-01-03** | General stage purpose |
| 01-04 | SD Scope & Deliverables | Lingkup & Keluaran Desain Skematik | 13 | high | **SDX-01-01** | Scope and deliverable administration |
| 01-05 | Workflow Overview | Tinjauan Alur Kerja | 5 | low | **SDX-02-01** | Workflow |
| 01-06 | Project Understanding | Pemahaman Proyek | 12 | high | **SDG-02-01** | Project information |
| 02-01 | Room List | Daftar Ruang | 30 | high | **SDA-00-01** | Architectural space program; 00 provisional |
| 02-02 | Area Calculation | Perhitungan Luas Ruang | 30 | high | **SDA-00-02** | Architectural area program; 00 provisional |
| 02-03 | Zoning Diagram | Diagram Zonasi Ruang | 40 | high | **SDD-01-01** | Concept zoning diagram |
| 03-01 | Initial Massing | Studi Gubahan Awal | 38 | high | **SDD-02-01** | Initial massing concept |
| 03-02 | Alternative Massing | Alternatif Gubahan | 37 | medium | **SDD-02-02** | Massing alternatives |
| 03-03 | Selected Massing | Gubahan Terpilih | 50 | high | **SDD-02-03** | Selected massing concept |
| 04-01 | 1st Floor Plan | Denah Lantai 1 | 100 | high | **SDA-01-01** | Schematic architecture plan |
| 04-02 | 2nd Floor Plan | Denah Lantai 2 | 100 | high | **SDA-01-02** | Schematic architecture plan |
| 04-03 | Roof Plan | Denah Atap | 50 | medium | **SDA-01-03** | Schematic roof plan; group 01 as plan |
| 05-01 | Horizontal Circulation | Sirkulasi Horizontal | 26 | medium | **SDD-03-01** | Circulation analysis diagram |
| 05-02 | Vertical Circulation | Sirkulasi Vertikal | 26 | medium | **SDD-03-02** | Circulation analysis diagram |
| 05-03 | Service Area | Area Servis | 23 | medium | **SDD-03-03** | Service concept diagram |
| 06-01 | Design Concept | Konsep Desain | 50 | high | **SDD-04-01** | Concept narrative and diagram |
| 06-02 | Material Direction | Arah Material | 38 | medium | **SDD-04-02** | Concept material direction |
| 06-03 | Spatial Experience | Pengalaman Ruang | 37 | medium | **SDD-04-03** | Concept experience narrative |
| 07-01 | Exterior Visualization | Visualisasi Eksterior | 124 | high | **SDV-01-01** | Exterior visual output |
| 07-02 | Interior Visualization | Visualisasi Interior | 101 | high | **SDV-02-01** | Interior visual output |
| 08-01 | Cost Ballpark Summary | Ringkasan Perkiraan Biaya | 45 | high | **SDB-01-01** | Cost summary |
| 08-02 | Cost Ballpark Detail | Rincian Perkiraan Biaya | 105 | high | **SDB-01-02** | Cost detail, same source data as summary |
| 09-01 | Timeline Ballpark Summary | Ringkasan Perkiraan Lini Waktu | 38 | medium | **SDT-01-01** | Schedule summary |
| 09-02 | Timeline Ballpark Detail | Rincian Perkiraan Lini Waktu | 87 | high | **SDT-01-02** | Schedule detail, same source data as summary |
| 10-01 | Internal Approval | Persetujuan Internal | 10 | high | **SDX-03-01** | Internal workflow approval |
| 10-02 | Client Approval | Persetujuan Klien | 12 | urgent | **SDX-03-02** | Client workflow approval |
| 10-03 | Notes | Catatan | 3 | low | **SDG-01-04** | General notes |

## B. Candidate V3 group register

| Package / Group | Candidate Group Name | Item count | Work items |
|---|---|---:|---|
| SDG-01 | Presentation & General Notes | 4 | SDG-01-01, SDG-01-02, SDG-01-03, SDG-01-04 |
| SDG-02 | Project Understanding | 1 | SDG-02-01 |
| SDX-01 | Scope & Deliverables | 1 | SDX-01-01 |
| SDX-02 | Workflow | 1 | SDX-02-01 |
| SDX-03 | Reviews & Approval | 2 | SDX-03-01, SDX-03-02 |
| SDA-00 | Space Program (provisional) | 2 | SDA-00-01, SDA-00-02 |
| SDA-01 | Plans | 3 | SDA-01-01, SDA-01-02, SDA-01-03 |
| SDD-01 | Zoning | 1 | SDD-01-01 |
| SDD-02 | Massing Studies | 3 | SDD-02-01, SDD-02-02, SDD-02-03 |
| SDD-03 | Circulation & Service Analysis | 3 | SDD-03-01, SDD-03-02, SDD-03-03 |
| SDD-04 | Design Concept | 3 | SDD-04-01, SDD-04-02, SDD-04-03 |
| SDV-01 | Exterior Visualizations | 1 | SDV-01-01 |
| SDV-02 | Interior Visualizations | 1 | SDV-02-01 |
| SDB-01 | Ballpark Cost | 2 | SDB-01-01, SDB-01-02 |
| SDT-01 | Ballpark Timeline | 2 | SDT-01-01, SDT-01-02 |

## C. Contoh alur yang dituju

- **Program → zoning → massing → denah:** `SDA-00-01/02` → `SDD-01-01` → `SDD-02-01/02/03` → `SDA-01-01/02/03`. Ini adalah relasi referensi, bukan urutan pengerjaan wajib.
- **Design concept → visualizations:** `SDD-04-01/02/03` dapat menjadi dasar `SDV-01-01` dan `SDV-02-01`.
- **Cost:** `SDB-01-01` (summary) dan `SDB-01-02` (detail) sebaiknya mengambil data estimasi yang sama; dua entri tetap ada sesuai legacy.
- **Time:** `SDT-01-01` dan `SDT-01-02` sebaiknya menggunakan satu sumber jadwal dengan tampilan berbeda.
- **Approval:** `SDX-03-01` internal dan `SDX-03-02` client tetap terpisah karena aktor dan statusnya berbeda.

## D. Review yang diperlukan (jangan diasumsikan sudah diputuskan)

1. **Space Program:** apakah Room List dan Area Calculation diletakkan pada `SDA-00`, `SDG`, atau kategori baru? Mapping sekarang sementara di `SDA-00`.
2. **Roof Plan:** tetap `SDA-01-03` sebagai jenis denah, atau masuk group atap tersendiri? Perlu sinkron dengan master Architecture 00–09.
3. **Concept material direction:** sementara di `SDD-04-02`; bila berubah menjadi gambar material teknis, dapat punya output lain di A atau I tanpa menghapus konten konsep.
4. **Approvals:** tetap sebagai work item SDX atau sebagai workflow approval yang otomatis tercatat pada register (legacy record tetap dipertahankan).
5. **Presentation content:** Cover, Table of Contents, Notes bisa tetap sebagai work atau nantinya diturunkan otomatis dari document package; jangan menghapus rekam historis.
6. **Grouping lintas Stage:** standard `A-01` dan kategori teknis harus sama di SD, DD, ED. Usulan D/G/X boleh berubah.

## E. Migration safeguards

1. Jangan overwrite baris existing; simpan `legacy_code`, `legacy_stage`, seluruh teks, bobot, prioritas, file/attachment dan status lama.
2. Tambahkan `v3_code` dan `migration_status` (*proposed / approved / migrated / needs_review*).
3. Periksa collision kode per proyek, hubungan file, revision, approval, dan relasi dengan KO sebelum pindah data.
4. Preview mapping untuk disetujui, lalu migrasi SD secara bertahap. **Tidak otomatis menerbitkan dokumen atau mengubah rev lama.**
5. V3 hanya menampilkan work/deliverable yang aktif dipilih untuk proyek tersebut, bukan seluruh placeholder katalog.

## F. Checks

- Original records: **30**; mapped records: **30**; unique candidate codes: **30**.
- Kategori terpakai: G (5), X (4), A (5), D (10), V (2), B (2), T (2).
- Tidak ada legacy item yang dieliminasi atau dipindah ke layout preset dalam data SD ini.
