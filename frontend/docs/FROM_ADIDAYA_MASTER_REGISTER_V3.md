# FROM ADIDAYA — Project Stages & Master Register V2

**Tanggal:** 21 Oktober 2026  
**Status:** Standar struktur dan kode disepakati; isi kelompok/register adalah **draft untuk review**.  
**Menggantikan rancangan katalog 10 Stage / 00–99** pada `project-stages-document-master-plan.md` sebagai arah desain V2. **Tidak otomatis memigrasikan** data lama, mengubah kode file terbit, atau mengaktifkan semua dokumen.

---

## 1. Tujuan dan prinsip

1. Fokus V1 adalah **Drawing & Deliverable Register yang langsung dapat dipakai**, bukan mengharuskan setiap proyek mengisi katalog dokumen lengkap.
2. Struktur navigasi: **Project → Stage → Category/Package → Group → Item**. Group boleh tampil sebagai expand/collapse.
3. **Master Group** adalah aturan/katalog yang dapat dipilih; **Project Register** hanya berisi item yang benar-benar dibutuhkan proyek.
4. Kode bersifat ringkas, konsisten, dan tidak menggandakan angka Stage dengan singkatan Stage.
5. Gambar, volume, BOQ, RAB, jadwal, dan laporan dapat saling **ditautkan**; tidak perlu menduplikasi data.
6. **Supporting Documents belum dibuat sebagai katalog wajib**. Tambahkan jika ada kebutuhan nyata, bisa ditautkan ke item/paket.
7. Kelompok gambar konvensional A/S/M/E/P/I/L dipertahankan maknanya lintas Stage; kategori G/X/D boleh diatur ulang oleh pengguna.
8. **Draft tidak sama dengan terbit**. Revisi dan riwayat file tidak boleh menghilangkan rujukan yang sudah dipakai.

## 2. Stage utama (final)

| Stage ID | Prefix | Stage | Fungsi |
|---|---|---|---|
| 100 | **KO** | Kickoff | Brief, informasi tapak, penawaran, kontrak, setup dan rencana awal |
| 200 | **SD** | Schematic Design | Konsep dan alternatif desain |
| 300 | **DD** | Design Development | Pengembangan desain dan koordinasi sistem |
| 400 | **ED** | Detailed Engineering Design | Gambar kerja, perhitungan, volume, RAB dan baseline |
| 500 | **PR** | Procurement | Paket pengadaan, evaluasi vendor, pemesanan |
| 600 | **CN** | Construction | Shop drawing, pelaksanaan, pengukuran, kontrol |
| 700 | **HO** | Handover | As-built, closeout dan serah terima |

**Penting:** `100–700` adalah ID Stage / urutan navigasi. **Tidak ada kewajiban membuat kode 101–799**. Kode dokumen menggunakan prefix dua huruf (`KO`, `SD`, dst.), bukan `400-EDS-...`.

## 3. Master Category — urutan V1 dikunci (final)

| Order | Code | Category | Fungsi |
|---:|:---:|---|---|
| 01 | **G** | General | General info, cover, informasi paket |
| 02 | **X** | Execution / Administration | Execution plan, qualification, instruction, checklist, register, workflow administratif |
| 03 | **D** | Diagram / Concept | Diagram, ide, brainstorming non-gambar kerja dan non-A/S/M/I/L |
| 04 | **A** | Architecture | Arsitektur |
| 05 | **S** | Structure | Struktur |
| 06 | **M** | MEP / Mechanical | **M** sebagai induk MEP **sekaligus** kode gambar Mechanical |
| 07 | **I** | Interior | Interior |
| 08 | **L** | Landscape | Lanskap / hardscape |
| 09 | **V** | Visualization | Render, animasi, video, presentasi visual |
| 10 | **B** | Budget | Quantity, BOQ, RAB, cost |
| 11 | **T** | Time | Timeline, schedule, milestone |
| 12 | **R** | Report | Laporan, evaluasi, progress, review |

**Khusus MEP:** tampil sebagai satu induk/folder pada urutan ke-06, dengan paket berkode **M (Mechanical), E (Electrical), P (Plumbing)**. Contoh pada ED: `EDM`, `EDE`, `EDP`. `EDM` sekaligus penamaan induk MEP dan kode Mechanical; folder induk tidak boleh membuat item dengan nomor yang bertabrakan dengan Mechanical. E/P adalah subkategori MEP, **bukan dua kategori utama baru** yang menggeser urutan 01–12.

**Ekstensi:** kategori lain boleh ditambahkan saat diperlukan; jangan mengubah arti/kode yang sudah diterbitkan. Penambahan di luar daftar V1 membutuhkan penetapan urutan tampilan dan aturan migrasi yang eksplisit. G/X/D punya pengelompokan dan posisi item fleksibel, sedangkan standar gambar konvensional stabil.

## 4. Format kode dokumen (final)

**`[STAGE:2][CATEGORY:1]-[GROUP:2]-[SEQUENCE:2][SUFFIX?]`**

Contoh: `EDS-01-01` = ED (Detailed Engineering Design) + S (Structure) + 01 (Foundation) + 01 (lembar/item pertama).

| Bagian | Ketentuan | Contoh |
|---|---|---|
| Stage | 2 huruf, dari KO/SD/DD/ED/PR/CN/HO | `ED` |
| Category | 1 huruf, termasuk M/E/P dalam MEP | `S` |
| Group | `00–99`; **hanya 00–09 disiapkan dahulu** | `01` |
| Sequence / halaman | `01–99`, mulai ulang di setiap Stage + Category + Group | `01` |
| Suffix opsional | Huruf A, B, C dst. bila benar-benar dibutuhkan | `EDS-01-12A` |
| Revision | **Metadata terpisah**, tidak disisipkan dalam nomor inti | `Rev 00`, `Rev 01` |

- `EDS-01-01`, `EDS-01-02`, `EDS-02-01` adalah tiga item berbeda.
- `EDS-01-12A`, `EDS-01-12B` bisa digunakan untuk halaman sisipan/varian; **jangan** dipakai sebagai pengganti revision.
- Tiap kombinasi Stage + Category + Group menyediakan 99 nomor sequence; tersedia maksimal **9.900 slot dasar per Stage/Category** untuk 100 group × 99 sequence, sebelum suffix. Itu kapasitas format, **bukan target jumlah item**.
- Kode unik dalam lingkup proyek; identitas internal tetap memakai ID database permanen.
- Jika master group berubah label, nomor/kode item **yang sudah published tidak diubah diam-diam**.
- Contoh output: `KOG-01-01` (Project Information), `KOT-01-01` (Initial Timeline), `SDA-01-01` (Schematic Floor Plan), `EDS-01-01` (Foundation Layout), `EDE-01-01` (Electrical Layout), `EDP-01-01` (Plumbing Layout), `EDB-01-01` (Quantity Takeoff), `CNR-01-01` (Daily Report).

## 5. Master Group 00–09 — rancangan awal, belum disetujui per item

> Tabel ini **bukan daftar file wajib**. Semua dapat diawali hanya dengan Group yang digunakan. Urutan group konvensional dirancang stabil lintas Stage; judul setiap dokumen/lembar tetap fleksibel. `00` biasanya informasi umum/register pada paket gambar, tapi keberadaannya tidak wajib.

| Group | A — Architecture | S — Structure | M — Mechanical | E — Electrical | P — Plumbing |
|:---:|---|---|---|---|---|
| 00 | General / Index | General / Notes | General / Index | General / Index | General / Index |
| 01 | Denah / Floor Plan | Fondasi | HVAC / Mechanical Plan | Lighting Plan | Water Supply Plan |
| 02 | Tampak / Elevation | Sloof / Ground Beam | Ventilation / Air Distribution | Power & Outlet Plan | Wastewater Plan |
| 03 | Potongan / Section | Kolom | Equipment Layout | Single-Line Diagram | Drainage / Stormwater |
| 04 | Material / Finishes | Balok | Ducting / Piping | Panel / Distribution | Pump / Tank System |
| 05 | Door & Window | Pelat | Mechanical Schematic | ELV / ICT / Security | Plumbing Riser / Schematic |
| 06 | Roof & Ceiling | Atap | Mechanical Details | Grounding / Lightning | Plumbing Details |
| 07 | Wet Area / Detail Plan | Tangga / Vertical Structure | Equipment Schedule | Electrical Details | Fixture Schedule |
| 08 | Construction Details | Sambungan & Detail Khusus | Controls / Integration | Electrical Schedule | Specialty Systems |
| 09 | Other Architectural | Struktur Lain | Other Mechanical | Other Electrical | Other Plumbing |

**Catatan MEP:** daftar M/E/P adalah usulan untuk review selanjutnya, bukan keputusan final tentang cakupan setiap sistem; teknologi, proteksi kebakaran, dan specialist systems dapat diklasifikasi nanti saat proyek nyata memerlukannya. Jangan memaksa semua item MEP masuk ke Mechanical.

| Group | I — Interior | L — Landscape | V — Visualization |
|:---:|---|---|---|
| 00 | General / Index | General / Index | Visualization Index |
| 01 | Interior Layout | Site / Landscape Plan | Exterior Render |
| 02 | Floor Finishes | Hardscape | Interior Render |
| 03 | Reflected Ceiling | Softscape / Planting | Aerial / Site Visualization |
| 04 | Interior Elevations | Grading / Levels | Diagrammatic 3D |
| 05 | Interior Sections | Landscape Details | Animation / Walkthrough |
| 06 | Furniture / Millwork | Irrigation | Video Presentation |
| 07 | Fixture / Equipment | Site Furniture | 3D Model Deliverables |
| 08 | Interior Details | Landscape Schedule | Visual Presentation Boards |
| 09 | Other Interior | Other Landscape | Other Visualization |

Untuk **B/T/R**, fungsi tiap Group masih rancangan agar modul Volume, BOQ, RAB, Jadwal dan Report tidak terpecah menjadi banyak file yang diisi manual:

| Group | B — Budget | T — Time | R — Report |
|:---:|---|---|---|
| 00 | Basis / Register | Basis / Register | Report Register |
| 01 | Quantity Takeoff / Volume | Initial / Master Schedule | Daily Report |
| 02 | BOQ | Design Schedule | Weekly Report |
| 03 | RAB / Cost Estimate | Procurement Schedule | Monthly Report |
| 04 | Unit Rates / Analysis | Construction Schedule | Design Review |
| 05 | Cost Comparison | Lookahead Schedule | Coordination Report |
| 06 | Change / Variation Cost | Milestones | Quality / Inspection Report |
| 07 | Cost Control / Forecast | Schedule Update | Cost / Schedule Report |
| 08 | Payment / Final Account | Recovery Plan | Completion Report |
| 09 | Other Budget | Other Time | Other Report |

**G/X/D:** sengaja **tidak dipatok Group 00–09** sekarang. Pengguna dapat mengatur judul, pengelompokan, dan memindah item sesuai kebutuhan. Perubahan terhadap item yang sudah diterbitkan harus mempertahankan rujukan/riwayat.

## 6. Draft contoh Project Register per Stage (tidak wajib diaktifkan seluruhnya)

> Ini contoh **item nyata** yang bisa dimasukkan per proyek, **bukan semua jenis dokumen yang diwajibkan** dan **bukan definisi final master group**. Nomor kelompok G/X/D hanya placeholder dan dapat dipindahkan. Porsi non-drawing tetap masuk ke Deliverable Register dengan format kode yang sama.

### 100 · KO — Kickoff

| Contoh kode | Item / output |
|---|---|
| KOG-01-01 | Project General Information |
| KOX-01-01 | Project Inquiry / Client Brief |
| KOX-02-01 | Site Survey & Existing Data |
| KOX-03-01 | Feasibility & Scope |
| KOX-04-01 | Fee Proposal / Scope of Services |
| KOX-05-01 | Contract / SPK |
| KOX-06-01 | Project Setup / Responsibility |
| KOB-01-01 | Initial Budget Estimate |
| KOT-01-01 | Initial Project Timeline |
| KOR-04-01 | Kickoff Meeting / Decision Notes |

### 200 · SD — Schematic Design

| Contoh kode | Item / output |
|---|---|
| SDG-01-01 | Schematic Package Information |
| SDD-01-01 | Concept / Bubble Diagram |
| SDA-01-01 | Schematic Floor Plan |
| SDA-02-01 | Schematic Elevation |
| SDA-03-01 | Schematic Section |
| SDS-01-01 | Preliminary Structural Scheme (bila perlu) |
| SDM-01-01 | Preliminary Mechanical Scheme (bila perlu) |
| SDE-01-01 | Preliminary Electrical Scheme (bila perlu) |
| SDP-01-01 | Preliminary Plumbing Scheme (bila perlu) |
| SDI-01-01 | Interior Concept Layout |
| SDL-01-01 | Landscape Concept Plan |
| SDV-01-01 | Exterior Concept Render |
| SDB-03-01 | Preliminary Cost Estimate |
| SDT-02-01 | Schematic Design Schedule |
| SDR-04-01 | Schematic Design Review |

### 300 · DD — Design Development

| Contoh kode | Item / output |
|---|---|
| DDG-01-01 | Design Development Package |
| DDA-01-01 | Developed Floor Plan |
| DDA-02-01 | Developed Elevation |
| DDA-03-01 | Developed Section |
| DDA-04-01 | Material / Finish Development |
| DDS-01-01 | Foundation / Structural Scheme Development |
| DDM-01-01 | Mechanical System Development |
| DDE-01-01 | Electrical System Development |
| DDP-01-01 | Plumbing System Development |
| DDI-01-01 | Interior Development Layout |
| DDL-01-01 | Landscape Development Layout |
| DDV-02-01 | Interior Design Render |
| DDB-03-01 | Updated Cost Estimate |
| DDT-02-01 | Updated Design Schedule |
| DDR-05-01 | Design Coordination Report |

### 400 · ED — Detailed Engineering Design

| Contoh kode | Item / output |
|---|---|
| EDG-01-01 | DED Package Information |
| EDA-01-01 | Architectural Floor Plan |
| EDA-02-01 | Architectural Elevation |
| EDA-03-01 | Architectural Section |
| EDA-04-01 | Material / Finishing Plan |
| EDS-01-01 | Foundation Layout |
| EDS-01-02 | Foundation Detail |
| EDS-02-01 | Sloof / Ground Beam Layout |
| EDS-03-01 | Column Layout |
| EDS-04-01 | Beam Layout |
| EDS-05-01 | Slab Layout |
| EDM-01-01 | Mechanical / HVAC Layout |
| EDE-01-01 | Lighting Plan |
| EDE-02-01 | Power / Outlet Plan |
| EDP-01-01 | Water Supply Layout |
| EDP-02-01 | Wastewater Layout |
| EDI-01-01 | Interior Layout |
| EDL-01-01 | Landscape Plan |
| EDV-01-01 | Final Exterior Render (jika diserahkan) |
| EDB-01-01 | Quantity Takeoff (link modul Volume) |
| EDB-02-01 | BOQ (link data BOQ) |
| EDB-03-01 | RAB (link modul Budget) |
| EDT-04-01 | Construction Baseline Schedule |
| EDR-05-01 | DED Coordination Report |

### 500 · PR — Procurement

| Contoh kode | Item / output |
|---|---|
| PRG-01-01 | Procurement Package Information |
| PRX-01-01 | Procurement Package Register |
| PRX-02-01 | Vendor Qualification |
| PRX-03-01 | RFQ / Tender Package |
| PRX-04-01 | Technical / Material Submittal |
| PRX-05-01 | PO / Subcontract Record |
| PRB-05-01 | Vendor Quotation Comparison |
| PRB-07-01 | Procurement Cost Control |
| PRT-03-01 | Procurement / Delivery Schedule |
| PRR-05-01 | Evaluation / Approval Report |

### 600 · CN — Construction

| Contoh kode | Item / output |
|---|---|
| CNG-01-01 | Construction Package Information |
| CNX-01-01 | Mobilization / Site Execution Plan |
| CNX-02-01 | Method Statement / Work Instruction |
| CNX-03-01 | RFI / Site Instruction Register |
| CNS-01-01 | Foundation Shop Drawing |
| CNA-01-01 | Architectural Shop Drawing |
| CNM-01-01 | Mechanical Shop Drawing |
| CNE-01-01 | Electrical Shop Drawing |
| CNP-01-01 | Plumbing Shop Drawing |
| CNI-01-01 | Interior Shop Drawing |
| CNL-01-01 | Landscape Shop Drawing |
| CNB-01-01 | Installed Quantity / Opname |
| CNB-07-01 | Cost Control / Forecast |
| CNT-04-01 | Construction Schedule |
| CNT-05-01 | Lookahead Schedule |
| CNR-01-01 | Daily Progress Report |
| CNR-02-01 | Weekly Progress Report |
| CNR-03-01 | Monthly Progress Report |
| CNR-06-01 | Quality / Inspection Report |

### 700 · HO — Handover

| Contoh kode | Item / output |
|---|---|
| HOG-01-01 | Handover Package Information |
| HOA-01-01 | Architectural As-Built Floor Plan |
| HOS-01-01 | Structural As-Built Foundation Plan |
| HOM-01-01 | Mechanical As-Built Layout |
| HOE-01-01 | Electrical As-Built Lighting Plan |
| HOP-01-01 | Plumbing As-Built Water Supply Plan |
| HOI-01-01 | Interior As-Built Layout |
| HOL-01-01 | Landscape As-Built Plan |
| HOX-01-01 | Handover Checklist |
| HOX-02-01 | Operation & Maintenance Documents |
| HOX-03-01 | Asset / Warranty Register |
| HOX-04-01 | BAST / Acceptance Record |
| HOB-08-01 | Final Account |
| HOT-06-01 | Warranty / Defect Period Timeline |
| HOR-08-01 | Final Completion Report |

## 7. UX dan input minimum

**Pengguna cukup memilih Stage → Category → Group dan mengetik Title**. Sistem membuat kode dan sequence berikutnya secara otomatis.

**Kolom register V1 yang direkomendasikan:** Code, Title, Status, Revision, File/Link. Opsional/expand: PIC, Deadline, Area/Level, Description, Drawing Type, Group, Discipline, related task, volume/BOQ item, approval, notes.

- Kategori/group yang tidak digunakan tidak perlu muncul sebagai daftar dokumen kosong.
- Group bisa expand/collapse; urutkan berdasarkan master group, lalu sequence numerik dan suffix alfabet.
- Bisa menambah Group 10–99 kapan pun diperlukan.
- Tombol **Add Drawing / Add Deliverable**, **Link Existing File**, serta **Create Revision** dibedakan.
- Nomor dokumen ditentukan oleh register, bukan nama file upload semata.
- Registrasi item tidak otomatis membuat PDF/DWG, RAB, atau laporan.
- Pada layar sebuah package (misalnya EDS), UI boleh menampilkan `01-01`; kode lengkap `EDS-01-01` digunakan pada title block, register global, export dan referensi lintas modul.

## 8. Aturan data, status dan migrasi

- Identitas database: `record_id` permanen (UUID); `project_id`, `stage_code`, `category_code`, `group_code`, `sequence`, `suffix`, `display_code` tersimpan sebagai atribut.
- `group_code` dan `sequence` diperlakukan sebagai **string zero-padded** supaya `01` tidak berubah menjadi `1`.
- Unique constraint konseptual: `project_id + display_code` untuk item aktif/terbit (serta kebijakan reservasi kode yang pernah digunakan). Revision disimpan pada tabel/riwayat terpisah.
- Status minimal: Not Started, Draft, In Progress, In Review, Approved, Published, Superseded (status final dapat disesuaikan dengan aplikasi).
- Published revision menyimpan snapshot/versi lampiran; edit berikutnya harus membuat revision baru.
- Relasi gambar → volume → BOQ → RAB → progress ditautkan secara eksplisit, tidak mengandalkan parsing nama file.
- **Migrasi dari katalog lama 00–99/10 Stage tidak otomatis**. Lakukan mapping/audit record lama, pertahankan kode dan riwayat terbit, serta alokasikan alias atau legacy-code bila diperlukan.
- Implementasi aktual di repository (termasuk `constants/projectDocumentCatalog.json`) perlu diperbarui **setelah** draft ini disetujui, bukan diasumsikan sudah berubah.

## 9. Keputusan final vs yang masih terbuka

### Sudah disepakati

- [x] 7 Stage: KO, SD, DD, ED, PR, CN, HO.
- [x] 12 kategori utama dalam urutan G, X, D, A, S, M, I, L, V, B, T, R.
- [x] MEP adalah kategori induk yang memuat M (Mechanical), E (Electrical), P (Plumbing); kode `EDM`, `EDE`, `EDP`.
- [x] Format `EDS-01-01`: Stage + Category, Group dua digit, Sequence dua digit.
- [x] Group awal `00–09`, dapat berkembang `10–99`; sequence `01–99` per group.
- [x] Suffix huruf opsional untuk kebutuhan jarang, misalnya `EDS-01-12A`.
- [x] G/X/D fleksibel; standar disiplin gambar konvensional konsisten.
- [x] V1 fokus register yang digunakan; supporting documents dibuat hanya saat diperlukan.

### Masih draft / perlu review

- [ ] Finalisasi **Group 00–09 untuk A, S, M, E, P, I, L** berdasarkan praktik gambar studio.
- [ ] Finalisasi Group V, B, T, R agar tidak menduplikasi data modul.
- [ ] Susun G/X/D per Stage dari kebutuhan proyek nyata; jangan dipatok global dulu.
- [ ] Perjelas item lintas disiplin (fire protection, ELV, lift, civil/geotechnical): masuk group existing atau perlu category baru.
- [ ] Tetapkan aturan penggabungan/split sheet, perubahan kode setelah terbit, dan suffix.
- [ ] Uji pada proyek nyata sebelum migrasi master catalog lama.

---

**Ringkasan satu kalimat:** Gunakan **7 Stage + 12 kategori urut + register aktif berbasis `EDS-01-01`**, dengan master group konvensional yang stabil tetapi kategori administratif G/X/D fleksibel; jangan menghasilkan kewajiban dokumen yang belum diperlukan.
