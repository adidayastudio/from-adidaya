import { KickoffDocumentData } from "./types";

export const defaultKickoffData: KickoffDocumentData = {
  // Page 1: Cover
  projectCode: "#036-PRG",
  projectName: "Precision Gym 23",
  projectLocation: "Jakarta Selatan",
  version: "v1.2025.12.07",
  stageName: "Kickoff",

  // Page 2: Purpose of Kickoff
  purposeList: [
    {
      id: "p1",
      en: "Align the initial project vision.",
      idText: "Menyelaraskan visi awal proyek.",
    },
    {
      id: "p2",
      en: "Define the scope of work and boundaries.",
      idText: "Menentukan ruang lingkup kerja dan batasannya.",
    },
    {
      id: "p3",
      en: "Establish communication rhythm and revision protocol.",
      idText: "Menetapkan ritme komunikasi dan mekanisme revisi.",
    },
    {
      id: "p4",
      en: "Confirm required documents and data for starting the design.",
      idText: "Mengonfirmasi dokumen dan data yang dibutuhkan untuk memulai desain.",
    },
  ],

  // Page 3: Project Understanding
  understandingIntroEn:
    "Precision Gym 23 is an enhanced premium fitness facility focused on improving spatial experience, refining user flow, and integrating systems more seamlessly—built upon operational insights from the previous version.",
  understandingIntroId:
    "Precision Gym 23 adalah pengembangan fasilitas kebugaran premium yang berfokus pada peningkatan pengalaman ruang, perbaikan alur pengguna, dan integrasi sistem yang lebih rapi—berdasarkan insight operasional dari versi sebelumnya.",
  understandingCards: [
    {
      id: "uc1",
      titleEn: "User Flow",
      titleId: "Alur Pengguna",
      descEn: "User movement must feel smoother and more intuitive.",
      descId: "Alur gerak pengguna harus lebih efisien dan intuitif.",
    },
    {
      id: "uc2",
      titleEn: "Ambience",
      titleId: "Suasana Ruang",
      descEn: "A more refined, focused, and character-driven ambience.",
      descId: "Suasana ruang yang lebih matang, fokus, dan berkarakter.",
    },
    {
      id: "uc3",
      titleEn: "System Integration",
      titleId: "Integrasi Sistem",
      descEn: "Training & recovery areas must function as a cohesive ecosystem.",
      descId: "Area latihan & pemulihan harus bekerja sebagai satu ekosistem.",
    },
  ],

  // Page 4: Project Goals
  goalsList: [
    {
      id: "g1",
      en: "Create equipment layout & zoning that supports performance with no bottlenecks.",
      idText: "Menghadirkan layout alat & zonasi yang mendukung performa tanpa bottleneck.",
    },
    {
      id: "g2",
      en: "Refine ambience through lighting, materials, and acoustics.",
      idText: "Menyempurnakan suasana ruang melalui pencahayaan, material, dan akustik.",
    },
    {
      id: "g3",
      en: "Integrate HVAC, plumbing, and electrical systems cleanly.",
      idText: "Mengintegrasikan sistem HVAC, pemipaan, dan elektrikal secara rapi.",
    },
    {
      id: "g4",
      en: "Strengthen Precision’s brand identity through spatial elements.",
      idText: "Memperkuat identitas brand Precision dalam setiap elemen ruang.",
    },
  ],

  // Page 5: Scope of Work
  scopeCategories: [
    {
      id: "sc1",
      name: "ARCHITECTURE",
      items: [
        {
          id: "sci1",
          titleEn: "Zoning and space planning",
          titleId: "Perencanaan pemintakatan ruang",
          checked: true,
        },
        {
          id: "sci2",
          titleEn: "Equipment layout",
          titleId: "Penataan alat",
          checked: true,
        },
        {
          id: "sci3",
          titleEn: "Visual concept",
          titleId: "Konsep visual",
          checked: true,
        },
        {
          id: "sci4",
          titleEn: "Material direction",
          titleId: "Pemilihan material",
          checked: true,
        },
      ],
    },
    {
      id: "sc2",
      name: "STRUCTURE AND MEP SYSTEMS",
      items: [
        {
          id: "sci5",
          titleEn: "Structural engineering",
          titleId: "Perhitungan dan rekayasa struktur",
          checked: true,
        },
        {
          id: "sci6",
          titleEn: "HVAC System",
          titleId: "Sistem HVAC",
          checked: true,
        },
        {
          id: "sci7",
          titleEn: "Lighting planning",
          titleId: "Perencanaan pencahayaan",
          checked: true,
        },
        {
          id: "sci8",
          titleEn: "Plumbing planning",
          titleId: "Perencanaan pemipaan",
          checked: true,
        },
      ],
    },
    {
      id: "sc3",
      name: "BRANDING",
      items: [
        {
          id: "sci9",
          titleEn: "Spatial identity",
          titleId: "Identitas visual ruang",
          checked: true,
        },
        {
          id: "sci10",
          titleEn: "Light signage and wayfinding",
          titleId: "Petunjuk arah sederhana",
          checked: true,
        },
      ],
    },
    {
      id: "sc4",
      name: "PROCUREMENT AND CONSTRUCTION",
      items: [
        {
          id: "sci11",
          titleEn: "Procurement",
          titleId: "Pengadaan dan pembelian material",
          checked: true,
        },
        {
          id: "sci12",
          titleEn: "Construction",
          titleId: "Pelaksanaan konstruksi",
          checked: true,
        },
        {
          id: "sci13",
          titleEn: "Supervision",
          titleId: "Pengawasan",
          checked: true,
        },
      ],
    },
  ],

  // Page 6: Workflow Overview
  workflowSteps: [
    {
      id: "wf1",
      stageCode: "01-KO",
      stageName: "Kick-off",
      duration: "1 w | 1 mg",
      items: [
        { id: "wfi1", titleEn: "Scope of work", titleId: "Ruang lingkup kerja" },
        { id: "wfi2", titleEn: "Initial data", titleId: "Data awal" },
      ],
    },
    {
      id: "wf2",
      stageCode: "02-SD",
      stageName: "Schematic Design",
      duration: "1-2 w | 2-3 mg",
      items: [
        { id: "wfi3", titleEn: "Initial zoning draft", titleId: "Draf zonasi awal" },
        { id: "wfi4", titleEn: "Visual concept and narrative", titleId: "Konsep visual dan narasi" },
      ],
    },
    {
      id: "wf3",
      stageCode: "03-DD",
      stageName: "Design Development",
      duration: "2-3 w | 2-3 mg",
      items: [
        { id: "wfi5", titleEn: "Final layout", titleId: "Tata ruang terpilih" },
        { id: "wfi6", titleEn: "Material and ambience detail", titleId: "Detail material dan suasana" },
      ],
    },
    {
      id: "wf4",
      stageCode: "04-ED",
      stageName: "Engineering Drawing",
      duration: "1-2 m | 1-2 bln",
      items: [
        { id: "wfi7", titleEn: "Construction drawings", titleId: "Gambar kerja konstruksi" },
      ],
    },
    {
      id: "wf5",
      stageCode: "05-PC",
      stageName: "Procurement",
      duration: "1-2 w",
      items: [
        { id: "wfi8", titleEn: "Final cost plan", titleId: "Finalisasi RAB" },
        { id: "wfi9", titleEn: "Material procurement", titleId: "Pengadaan material" },
      ],
    },
    {
      id: "wf6",
      stageCode: "06-CN",
      stageName: "Construction",
      duration: "Ongoing",
      items: [
        { id: "wfi10", titleEn: "Supervision", titleId: "Pengawasan" },
      ],
    },
    {
      id: "wf7",
      stageCode: "07-HO",
      stageName: "Handover",
      duration: "Final",
      items: [
        { id: "wfi11", titleEn: "Handover", titleId: "Serat terima" },
      ],
    },
  ],

  // Page 7: Required Data & Inputs
  requiredInputs: [
    { id: "ri1", titleEn: "Existing drawings", titleId: "Gambar kerja kondisi saat ini", checked: true },
    { id: "ri2", titleEn: "Site condition photos", titleId: "Foto kondisi aktual", checked: true },
    { id: "ri3", titleEn: "Equipment list", titleId: "Daftar alat gym", checked: true },
    { id: "ri4", titleEn: "Operational data", titleId: "Data operational", checked: true },
    { id: "ri5", titleEn: "Budget limitations", titleId: "Batasan anggaran", checked: true },
    { id: "ri6", titleEn: "Design and material preferences", titleId: "Preferensi desain dan material", checked: true },
  ],

  // Page 8: Roles & Communication
  studioRoles: [
    { id: "sr1", titleEn: "Principal Architect", titleId: "Arsitek kepala" },
    { id: "sr2", titleEn: "Project Architect", titleId: "Arsitek proyek" },
    { id: "sr3", titleEn: "Interior Designer", titleId: "Desainer interior" },
    { id: "sr4", titleEn: "Structural Engineer", titleId: "Insinyur struktur" },
  ],
  clientRoles: [
    { id: "cr1", titleEn: "Project owner", titleId: "Pemilik proyek" },
    { id: "cr2", titleEn: "Operational manager", titleId: "Manajer operasional" },
  ],
  communicationTools: "WhatsApp Group",
  meetingFrequency: "Weekly (Mingguan)",

  // Page 9: Next Steps
  nextSteps: [
    { id: "ns1", titleEn: "KO document approval", titleId: "Persetujuan dokumen KO", checked: true },
    { id: "ns2", titleEn: "Submission of existing data", titleId: "Pengiriman data kondisi saat ini", checked: false },
    { id: "ns3", titleEn: "Schedule site measurement", titleId: "Penjadwalan pengukuran lahan", checked: false },
    { id: "ns4", titleEn: "Begin SC stage", titleId: "Mulai tahap SC", checked: false },
    { id: "ns5", titleEn: "Submission of zoning draft", titleId: "Pengiriman draf zonasi ruang", checked: false },
  ],

  // Page 10 & 11: Approval
  approvalTextEn:
    "As of today, the Client hereby confirms that this document has been reviewed and approved as the final output of the corresponding project stage.\n\nShould any changes, adjustments, or additional requests arise in the future, such changes will be discussed and mutually agreed upon by both parties. These adjustments may impact the project timeline, scope, and subsequent costs, and will be formalized through a revised document or official addendum.\n\nBy signing below, both parties acknowledge their agreement and shared understanding of the contents of this document.",
  approvalTextId:
    "Pada hari ini, pihak Klien menyatakan bahwa dokumen ini telah ditinjau dan disetujui sebagai hasil akhir dari tahap yang bersangkutan.\n\nApabila di kemudian hari terdapat perubahan, penyesuaian, atau permintaan tambahan dari pihak Klien, maka perubahan tersebut akan dibahas bersama dan disepakati oleh kedua belah pihak. Perubahan tersebut dapat mempengaruhi lini waktu, ruang lingkup, serta pembiayaan pada tahap berikutnya, dan akan dituangkan dalam revisi dokumen atau adendum resmi.\n\nDengan ini, kedua belah pihak menyatakan kesepakatan dan pemahaman yang sama terhadap isi dokumen ini.",
  studioSigneeName: "Ir. Adidaya Team",
  studioSigneeRole: "Adidaya Studio",
  clientSigneeName: "Bpk. Owner Gym",
  clientSigneeRole: "Client / Pemilik Proyek",
  signDate: "2025-12-07",

  // Page 12: Notes
  notes: "Catatan koordinasi awal: Survei lapangan dijadwalkan hari Senin mendatang bersama tim MEP.",
};
