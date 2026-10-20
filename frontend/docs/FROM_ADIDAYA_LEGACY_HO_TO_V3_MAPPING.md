# From Adidaya — Handover (HO) Legacy 2.0 → V3 Mapping

**Status:** Draft mapping untuk review, belum diterapkan ke aplikasi.  
**Stage:** 700 · HO — Handover  
**Sumber:** 15 Work Item Legacy 2.0 sebagaimana diberikan pengguna.  
**Aturan:** Format `HO<Category>-<Group 00–99>-<Sequence 01–99>`; semua approval dan penutupan di kategori **R** paling akhir; pertahankan isi, Weight, Priority, dan kode sumber; supporting documents baru ditambahkan bila dibutuhkan.

## Ringkasan

| Ukuran | Jumlah |
|---|---:|
| Work Item Legacy | 15 |
| Mapping V3 | 15 |
| Dihapus | 0 |
| Ditambah | 0 |

## Mapping lengkap (urut asli Legacy 2.0)

| Legacy Code | V3 Code (usulan) | Work (EN) | Work (ID) | Weight | Priority |
|---|---|---|---|---:|---|
| 01-01 | HOG-01-01 | Cover | Sampul | 1 | low |
| 01-02 | HOG-01-02 | Table of Contents | Daftar Isi | 1 | low |
| 01-03 | HOG-01-03 | Purpose of HO | Tujuan Serah Terima (Handover) | 2 | medium |
| 01-04 | HOG-01-04 | HO Scope & Deliverables | Lingkup & Keluaran Serah Terima | 3 | high |
| 01-05 | HOG-01-05 | Workflow Overview | Tinjauan Alur Kerja | 1 | low |
| 01-06 | HOG-01-06 | Project Understanding | Pemahaman Proyek | 2 | high |
| 02-01 | HOX-01-01 | Punchlist | Daftar Perbaikan (Punchlist) | 50 | high |
| 02-02 | HOX-01-02 | Rectification | Perbaikan / Rektifikasi | 75 | urgent |
| 03-01 | HOA-01-01 | ARS As-Built Drawing | Gambar As-Built Arsitektur | 80 | high |
| 03-02 | HOS-01-01 | STR As-Built Drawing | Gambar As-Built Struktur | 60 | high |
| 03-03 | HOM-01-01 | MEP As-Built Drawing | Gambar As-Built MEP | 60 | high |
| 04-01 | HOX-02-01 | Operation & Maintenance Manual | Manual Operasi & Pemeliharaan | 45 | high |
| 04-02 | HOX-02-02 | Warranty Docs | Dokumen Garansi | 30 | high |
| 05-01 | HOR-09-01 | Client Sign-Off | Persetujuan Klien (Sign-Off) | 63 | urgent |
| 05-02 | HOR-09-02 | Project Closure | Penutupan Proyek | 27 | high |

> Kode V3 masih usulan dan dapat disesuaikan saat standardisasi group lintas Stage. `Legacy Code` dan urutan `legacy_order` harus tetap tersedia untuk keterlacakan.

## Rekomendasi kelompok V3

| Package | Group | Fungsi | Jumlah Work Item |
|---|---|---|---:|
| HOG | 01 · General Handover Package | Cover, tujuan, scope, workflow, pemahaman | 6 |
| HOX | 01 · Punchlist & Rectification | Daftar perbaikan dan pelaksanaan perbaikan | 2 |
| HOA | 01 · Architectural As-Built | Gambar as-built arsitektur | 1 |
| HOS | 01 · Structural As-Built | Gambar as-built struktur | 1 |
| HOM | 01 · MEP As-Built | Gambar as-built MEP; dapat diperinci ke E/P nanti jika perlu | 1 |
| HOX | 02 · O&M and Warranty | Manual O&M dan dokumen garansi | 2 |
| HOR | 09 · Final Approval & Closure | Client Sign-Off dan Project Closure (selalu paling akhir) | 2 |

**Total: 15 Work Item.**

## Catatan implementasi

1. **Jangan membuat item wajib tambahan** seperti Testing & Commissioning, Asset Register, atau supporting document lain sebelum diperlukan. Data yang diberikan hanya memuat 15 Work Item di tabel.
2. **Pertahankan Work (EN), Work (ID), Weight, dan Priority apa adanya**. Angka Weight adalah angka legacy; jangan normalisasi otomatis ke persen.
3. **Jaga urutan kerja Legacy** untuk pemaparan atau urutan operasional. Tampilan dapat dikelompokkan menurut kategori V3, namun menyimpan `legacy_order` asli agar urutan tetap dapat direkonstruksi.
4. **Approval di R paling akhir**. Tidak perlu memindahkan Client Sign-Off ke X. Project Closure tetap di R sesudah Sign-Off.
5. **As-Built** saat ini berupa 1 work per A/S/M sesuai sumber; pengembangan menjadi register per lembar adalah tahap berikutnya, tanpa menghapus item induk.
6. Jangan mengubah data Stage KO–CN atau modul lain melalui migrasi HO ini.

## Contoh bentuk data minimal

```json
{
  "stage": "HO",
  "legacy_code": "05-01",
  "legacy_order": 14,
  "code": "HOR-09-01",
  "work_en": "Client Sign-Off",
  "work_id": "Persetujuan Klien (Sign-Off)",
  "weight": 63,
  "priority": "urgent",
  "mapping_status": "proposed"
}
```

## Checklist penerapan

- [ ] Periksa mapping seluruh 15 baris dengan master group V3.
- [ ] Validasi kode tidak bentrok dengan item existing di proyek terkait.
- [ ] Simpan relasi kode legacy → kode V3 dan urutan sumber.
- [ ] Preview kelompok HO sebelum migrasi.
- [ ] Terapkan setelah disetujui; jangan menghapus record atau versi lama.
