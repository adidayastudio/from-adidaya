# FROM ADIDAYA — CN Legacy 2.0 → V3 Mapping

**Stage:** 600 · CN — Construction  
**Status:** Draft mapping untuk review; belum diterapkan ke aplikasi.  
**Source:** 18 Work Item dari daftar Legacy 2.0 yang diberikan pengguna.  

## Aturan

- Pertahankan semua 18 record legacy, Work EN, Work ID, Weight, Priority, dan kode lama.
- Kode V3: `CN` + kategori + `-GG-SS`, dengan `GG` group dua digit dan `SS` sequence dua digit.
- Urutan kategori: G, X, D, A, S, M (dengan E/P untuk MEP bila ada), I, L, V, B, T, R.
- Sedapat mungkin pertahankan urutan asli dalam setiap kelompok; pengelompokan lintas kategori mengikuti susunan V3.
- **Seluruh approval (jika nantinya ada) wajib di R dan menjadi bagian paling akhir.** Data CN yang diberikan belum memuat approval.
- Group `00–09` sebagai awal, bisa diperluas sampai `99`. Kode usulan di bawah belum final.
- `Monthly/Weekly/Daily Progress Report` diperlakukan sebagai *jenis laporan berulang* (periode/record), bukan jumlah dokumen tetap. Keterangan `(Month 1–6)` dan `(Week 1–4)` tetap tersimpan seperti sumber.
- Weight adalah nilai Legacy, **tidak dinormalisasi** dan tidak otomatis dianggap persentase progress.

## Ringkasan

| Category | Count | Isi |
|---|---:|---|
| CNG | 6 | Sampul, daftar isi, tujuan, scope, workflow, project understanding |
| CNX | 6 | Site setup, temporary utilities, workers setup, inspections |
| CNA | 1 | Architectural shop drawing |
| CNS | 1 | Structural shop drawing |
| CNM | 1 | MEP shop drawing gabungan |
| CNR | 3 | Monthly, weekly, daily progress report |
| **Total** | **18** | **Semua item Legacy dipertahankan** |

## Mapping detail

| Legacy Code | V3 Code (Proposed) | Work (EN) | Work (ID) | Weight | Priority | Notes |
|---|---|---|---|---:|---|---|
| 01-01 | CNG-01-01 | Cover | Sampul | 5 | low | General/package |
| 01-02 | CNG-01-02 | Table of Contents | Daftar Isi | 5 | low | General/package |
| 01-03 | CNG-01-03 | Purpose of CN | Tujuan Konstruksi (Construction) | 10 | medium | General/package |
| 01-04 | CNG-01-04 | CN Scope & Deliverables | Lingkup & Keluaran Konstruksi | 13 | high | General/package; tetap dekat item pembuka |
| 01-05 | CNG-01-05 | Workflow Overview | Tinjauan Alur Kerja | 5 | low | General/package |
| 01-06 | CNG-01-06 | Project Understanding | Pemahaman Proyek | 12 | high | General/package |
| 02-01 | CNX-01-01 | Site Setup | Persiapan Lokasi | 80 | high | Mobilisasi/persiapan |
| 02-02 | CNX-01-02 | Temporary Utilities | Utilitas Sementara | 60 | high | Mobilisasi/persiapan |
| 02-03 | CNX-01-03 | Workers Setup | Pengaturan Pekerja | 60 | medium | Mobilisasi/persiapan |
| 03-01 | CNR-01-01 | Monthly Progress Report (Month 1-6) | Laporan Progres Bulanan (Bulan 1-6) | 250 | high | Recurring report; pertahankan keterangan periode Legacy |
| 03-02 | CNR-02-01 | Weekly Progress Report (Week 1-4) | Laporan Progres Mingguan (Minggu 1-4) | 63 | high | Recurring report; pertahankan keterangan periode Legacy |
| 03-03 | CNR-03-01 | Daily Progress Report | Laporan Progres Harian | 1187 | medium | Recurring report; Weight asli 1187 |
| 04-01 | CNA-01-01 | ARS Shop Drawing | Shop Drawing Arsitektur | 100 | high | Architectural shop drawing; detail nomor sheet nanti menurut drawing register |
| 04-02 | CNS-01-01 | STR Shop Drawing | Shop Drawing Struktur | 75 | high | Structural shop drawing; detail nomor sheet nanti menurut drawing register |
| 04-03 | CNM-01-01 | MEP Shop Drawing | Shop Drawing MEP | 75 | high | Gabungan MEP sesuai Legacy; jika dipisah kemudian gunakan CNM/CNE/CNP tanpa menggandakan item |
| 05-01 | CNX-02-01 | Material Inspection | Inspeksi Material | 150 | high | Checklist/inspection register |
| 05-02 | CNX-02-02 | Work Inspection | Inspeksi Pekerjaan | 250 | urgent | Checklist/inspection register |
| 05-03 | CNX-02-03 | HSE Inspection | Inspeksi K3 (HSE) | 100 | high | Checklist/inspection register |

## Register V3 — urutan tampilan menurut kategori

1. **CNG — General**: CNG-01-01 sampai CNG-01-06.
2. **CNX — Execution / Administration**: CNX-01-01 sampai CNX-01-03 (Site Setup); CNX-02-01 sampai CNX-02-03 (Inspection).
3. **CNA — Architecture**: CNA-01-01 (ARS Shop Drawing).
4. **CNS — Structure**: CNS-01-01 (STR Shop Drawing).
5. **CNM — MEP / Mechanical**: CNM-01-01 (MEP Shop Drawing, gabungan).
6. **CNR — Report**: CNR-01-01 Monthly; CNR-02-01 Weekly; CNR-03-01 Daily. **Approval, jika kelak ada, ditempatkan setelah laporan di R.**

**Catatan urutan:** Dalam Legacy 2.0, laporan berada sebelum shop drawings dan inspeksi. Dalam tampilan V3, kategori R memang berada paling akhir sesuai urutan kategori yang telah ditetapkan. `legacy_order` harus disimpan agar tampilan lama dan audit tetap bisa direkonstruksi. Urutan internal setiap kelompok tidak diubah.

## Hal yang belum ditentukan (jangan diasumsikan)

- Apakah `CNG-01` akan dibagi menjadi cover/general notes/scope menjadi group terpisah; sementara disimpan satu group sesuai sumber.
- Apakah `CNX-02` Inspection nantinya membutuhkan kategori mutu/Q tersendiri; **belum ditambahkan**.
- Apakah Shop Drawing dibuat sebagai satu Work Item per discipline atau register per lembar. Legacy hanya memberi satu entri per discipline; saat implementasi bisa menjadi parent register dan memuat banyak sheet.
- Tidak ada data approval, schedule atau cost monitoring CN di sumber yang dikirim; **jangan generate Work Item fiktif**.

## Panduan implementasi

1. Simpan `legacy_code`, `legacy_order`, `work_en`, `work_id`, `weight`, dan `priority` tanpa perubahan.
2. Tambahkan `v3_code`, `stage=CN`, `category`, `group`, dan `sequence` sebagai hasil mapping (sementara).
3. Validasi tidak ada duplikasi `v3_code` dalam proyek/Stage yang sama.
4. Jangan menghapus record lama atau mempublikasikan ulang dokumen otomatis.
5. Konfirmasi mapping sebelum mengganti master catalog atau mengubah data aplikasi.
