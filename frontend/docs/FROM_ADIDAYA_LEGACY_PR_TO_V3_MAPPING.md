# FROM ADIDAYA — Procurement (PR) Legacy 2.0 → V3 Mapping

**Status:** Draft mapping untuk review; belum diterapkan ke database/aplikasi.  
**Stage:** 500 · PR — Procurement  
**Source:** 24 Work Item yang disampaikan pengguna dari Legacy 2.0.  
**Aturan:** Preserve seluruh Work (EN/ID), Weight, Priority, dan kode Legacy; kode baru `PR{Category}-{Group:02}-{Sequence:02}`; urutan sumber sebisa mungkin dipertahankan; seluruh Approval dan Notes masuk **R paling akhir**. Tidak membuat Supporting Documents wajib.

## Ringkasan

- Total sumber: **24** Work Item (6 + 4 + 2 + 2 + 2 + 2 + 3 + 3).
- Total mapping: **24** Work Item; **0 dihapus**, **0 digabung**.
- Kategori aktif: **G, X, A, S, M, B, R**. E/P, I, L, V, T, D belum diperlukan oleh data sumber; boleh diaktifkan kemudian.
- Urutan tampilan: G → X → A → S → M → B → R (urut Master Category berlaku; R selalu terakhir).
- Catatan istilah: Legacy menggunakan **PC** untuk Purpose/Scope, sementara kode Stage V3 adalah **PR**. Teks EN/ID dari Legacy sengaja tidak diubah dalam tabel agar migrasi tanpa kehilangan sumber.

## Mapping lengkap

| Legacy Code | V3 Code | Work (EN) | Work (ID) | Weight | Priority | Remarks |
|---|---|---|---|---:|---|---|
| 01-01 | PRG-01-01 | Cover | Sampul | 3 | low | General package |
| 01-02 | PRG-01-02 | Table of Contents | Daftar Isi | 2 | low | General package |
| 01-03 | PRG-01-03 | Purpose of PC | Tujuan Pengadaan (Procurement) | 5 | medium | Legacy `PC` retained verbatim |
| 01-04 | PRG-01-04 | PC Scope & Deliverables | Lingkup & Keluaran Pengadaan | 6 | high | Legacy `PC` retained verbatim |
| 01-05 | PRG-01-05 | Workflow Overview | Tinjauan Alur Kerja | 3 | low | General package |
| 01-06 | PRG-01-06 | Project Understanding | Pemahaman Proyek | 6 | high | General package |
| 02-01 | PRX-01-01 | Outline Material Specs | Garis Besar Spesifikasi Material | 30 | high | Cross-discipline specification overview |
| 02-02 | PRA-01-01 | Architecture Material Specs/RKS | Spesifikasi Material / RKS Arsitektur | 60 | high | Architecture-specific |
| 02-03 | PRS-01-01 | Structure Material Specs/RKS | Spesifikasi Material / RKS Struktur | 50 | high | Structure-specific |
| 02-04 | PRM-01-01 | MEP Material Specs/RKS | Spesifikasi Material / RKS MEP | 60 | high | Combined MEP specification; no forced split into M/E/P |
| 03-01 | PRX-02-01 | Material Vendor List | Daftar Pemasok / Vendor Material | 41 | high | Vendor register |
| 03-02 | PRX-02-02 | Contractor/Subcontractor List | Daftar Kontraktor / Subkontraktor | 34 | high | Vendor register |
| 04-01 | PRX-03-01 | RFQ Preparation | Persiapan Penawaran (RFQ) | 28 | high | Tender process |
| 04-02 | PRX-03-02 | RFQ Distribution | Distribusi RFQ ke Vendor | 22 | medium | Tender process |
| 05-01 | PRX-04-01 | Technical Comparison | Komparasi Teknis Penawaran | 23 | high | Technical evaluation |
| 05-02 | PRB-01-01 | Cost Comparison | Komparasi Biaya & Harga | 27 | high | Commercial comparison |
| 06-01 | PRX-05-01 | Evaluation | Evaluasi Vendor | 41 | high | Vendor evaluation |
| 06-02 | PRX-05-02 | Final Selection | Penetapan Vendor Terpilih | 34 | high | Selection decision, not final approval |
| 07-01 | PRR-01-01 | Monthly Purchases & Report (Month 1-6) | Laporan Pembelian Bulanan (Bulan 1-6) | 125 | high | Recurring report template; preserve legacy weight |
| 07-02 | PRR-02-01 | Weekly Purchases & Report (Week 1-4) | Laporan Pembelian Mingguan (Minggu 1-4) | 31 | medium | Recurring report template; preserve legacy weight |
| 07-03 | PRR-03-01 | Daily Purchases & Report | Laporan Pembelian Harian | 594 | medium | Preserve 594 without assuming weighting scale |
| 08-01 | PRR-09-01 | Internal Approval | Persetujuan Internal | 10 | high | Always end-of-stage R group |
| 08-02 | PRR-09-02 | Client Approval | Persetujuan Klien | 12 | urgent | Always end-of-stage R group |
| 08-03 | PRR-09-03 | Notes | Catatan | 3 | low | Always after approvals |

## Register hierarchy proposed for PR

```text
500 · Procurement (PR)
├── PRG · General
│   └── 01 · Package Introduction (01–06)
├── PRX · Execution & Administration
│   ├── 01 · General Material Specifications (01)
│   ├── 02 · Vendor & Contractor Register (01–02)
│   ├── 03 · RFQ Process (01–02)
│   ├── 04 · Technical Comparison (01)
│   └── 05 · Evaluation & Selection (01–02)
├── PRA · Architecture
│   └── 01 · Material Specifications / RKS (01)
├── PRS · Structure
│   └── 01 · Material Specifications / RKS (01)
├── PRM · MEP / Mechanical
│   └── 01 · Combined MEP Specifications / RKS (01)
├── PRB · Budget
│   └── 01 · Cost Comparison (01)
└── PRR · Report [ALWAYS LAST]
    ├── 01 · Monthly Purchasing Report (01)
    ├── 02 · Weekly Purchasing Report (01)
    ├── 03 · Daily Purchasing Report (01)
    └── 09 · Approval & Notes (01–03) [LAST GROUP]
```

## Review points — not automatic changes

1. **Presentation vs sorting:** Master Category order places X before A/S/M, although Legacy specification entries 02-02 through 02-04 occur immediately after 02-01. Preserve a separate `legacy_order` for accurate legacy presentation and keep `category_display_order` for standard V3 grouping. Do not silently overwrite order of existing records.
2. **PRM** is allowed for a combined MEP specification, while dedicated Electrical and Plumbing registers can use **PRE** and **PRP** only when the scope demands them.
3. **Approval records** must be last in **PRR-09**; `Final Selection` is not an Approval record and remains PRX.
4. **Periodic purchase reports**: `Month 1–6` and `Week 1–4` are legacy labels, not mandatory fixed project durations; actual occurrences can be linked as instances without duplicating master templates.
5. **Weight:** preserve original values (especially 594) and do not normalize to 100 or interpret as percentage without a separate business rule.
6. **General vs X:** Contents of G/X may be manually rearranged later; reference legacy code throughout migration.
7. **No migration has been executed.** Apply only after review/approval; maintain old-to-new mapping and immutable historical published outputs.
