// Report catalog copied from from-adidaya report overview.
export const ADIDAYA_REPORT_TYPES = [
  {
    "type": "daily",
    "title": "Daily Progress Report",
    "description": "Laporan harian volume fisik, tenaga kerja, cuaca & shift kerja.",
    "clusterLabel": "Progress & Schedule"
  },
  {
    "type": "weekly",
    "title": "Weekly Progress Report",
    "description": "Rekapitulasi progres mingguan, pencapaian milestone & grafik.",
    "clusterLabel": "Progress & Schedule"
  },
  {
    "type": "monthly",
    "title": "Monthly Progress Report",
    "description": "Konsolidasi progres bulanan, performa & approval manajemen.",
    "clusterLabel": "Progress & Schedule"
  },
  {
    "type": "schedule",
    "title": "Schedule & S-Curve Report",
    "description": "Timeline umum, Gantt Chart, Kurva-S rencana vs realisasi.",
    "clusterLabel": "Progress & Schedule"
  },
  {
    "type": "cost",
    "title": "Cost & Budget Report",
    "description": "Perbandingan RAB (Ballpark/Estimate/Detail) vs Realisasi & CPI.",
    "clusterLabel": "Cost & Resources"
  },
  {
    "type": "manpower",
    "title": "Manpower & Payroll Report",
    "description": "Data crew, tukang, presensi harian, mandays & rekap gaji.",
    "clusterLabel": "Cost & Resources"
  },
  {
    "type": "procurement",
    "title": "Procurement & Stock Report",
    "description": "Pemesanan PO material/alat/jasa, mutasi & stock opname.",
    "clusterLabel": "Cost & Resources"
  },
  {
    "type": "finance",
    "title": "Finance Register",
    "description": "Pencatatan transaksi kas/bank, jurnal, piutang-hutang & rekonsiliasi.",
    "clusterLabel": "Cost & Resources"
  },
  {
    "type": "resources",
    "title": "Equipment & Asset Register",
    "description": "Inventarisasi alat berat, log operasi HM, servis & demobilisasi.",
    "clusterLabel": "Cost & Resources"
  },
  {
    "type": "quality",
    "title": "Quality (QA/QC) Report",
    "description": "Inspection request, checklist, test result, defect & NCR log.",
    "clusterLabel": "Quality, HSE & Risk"
  },
  {
    "type": "safety",
    "title": "Safety (HSE/K3) Report",
    "description": "Safety induction, toolbox meeting, incident log, PTW & LTI hours.",
    "clusterLabel": "Quality, HSE & Risk"
  },
  {
    "type": "issue_risk",
    "title": "Issue & Risk Register",
    "description": "Risk matrix, dampak, prioritas, PIC & tindakan mitigasi.",
    "clusterLabel": "Quality, HSE & Risk"
  },
  {
    "type": "doc_control",
    "title": "Document Control Report",
    "description": "Shop drawing, MAR, RFI, transmittal, BAST & approval status.",
    "clusterLabel": "Governance & Change"
  },
  {
    "type": "change_order",
    "title": "Change & Claim (VO/CO) Report",
    "description": "Variation order, site instruction, cost & time extension impact.",
    "clusterLabel": "Governance & Change"
  },
  {
    "type": "executive",
    "title": "Executive Summary Report",
    "description": "High-level progress, budget health, key issues & C-level photo summary.",
    "clusterLabel": "Governance & Change"
  },
  {
    "type": "site_survey",
    "title": "Site Survey & Assessment Report",
    "description": "Survei topografi, geoteknik, titik BM & elevasi, dan temuan kendala site.",
    "clusterLabel": "Site Ops & Formal"
  },
  {
    "type": "mom",
    "title": "Minute of Meeting (MOM)",
    "description": "Risalah rapat koordinasi, pembahasan agenda, keputusan & action items.",
    "clusterLabel": "Site Ops & Formal"
  },
  {
    "type": "field_notice",
    "title": "Field Notice & Memo (NOT)",
    "description": "Surat instruksi dinas lapangan, notice perbaikan, dan tanggapan formal.",
    "clusterLabel": "Site Ops & Formal"
  },
  {
    "type": "punch_list",
    "title": "Punch List & Handover Report",
    "description": "Daftar defect BAST I & II per area, repair tracking & verifikasi.",
    "clusterLabel": "Site Ops & Formal"
  },
  {
    "type": "commissioning",
    "title": "Commissioning & Testing Report",
    "description": "Pengujian sistem MEP, genset, fire alarm, functional test & sertifikasi.",
    "clusterLabel": "Site Ops & Formal"
  },
  {
    "type": "environmental",
    "title": "Environmental & Waste Report",
    "description": "Pengelolaan limbah B3/non-B3, pemantauan kebisingan, debu & AMDAL.",
    "clusterLabel": "Site Ops & Formal"
  },
  {
    "type": "people_register",
    "title": "People & HR Register (PPL)",
    "description": "Register personel tim proyek, struktur organisasi, sertifikasi SKA & presensi.",
    "clusterLabel": "Site Ops & Formal"
  },
  {
    "type": "clock_attendance",
    "title": "Clock & Attendance Register (CLK)",
    "description": "Log presensi jam kerja, toleransi keterlambatan, lembur & persetujuan supervisor.",
    "clusterLabel": "Site Ops & Formal"
  }
] as const;
