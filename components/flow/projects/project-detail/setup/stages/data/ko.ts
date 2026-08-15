import { Task } from "../types";

/**
 * STAGE KO - KICKOFF
 * Total Stage Weight: 500 (= 5.00% when divided by 100)
 * All weights stored as integers (x100 for precision)
 * Display: divide by 100 to get percentage
 */

export const KO_SECTIONS = [
  { code: "KO-01", title: "General Information", weight: 30 },       // 0.30%
  { code: "KO-02", title: "Client Brief & Objectives", weight: 120 }, // 1.20%
  { code: "KO-03", title: "Scope of Work Definition", weight: 100 },  // 1.00%
  { code: "KO-04", title: "Site Data Collection", weight: 80 },       // 0.80%
  { code: "KO-05", title: "Regulation & Zoning Check", weight: 80 },  // 0.80%
  { code: "KO-06", title: "Initial Budget Range", weight: 50 },       // 0.50%
  { code: "KO-07", title: "Project Schedule Draft", weight: 30 },     // 0.30%
  { code: "KO-08", title: "Kickoff Approval", weight: 10 },           // 0.10%
];  // Total: 500 (= 5.00%)

export const koTasks: Task[] = [
  // ========== KO-01: General Information (30) ==========
  { id: "ko-01-01", code: "01-01", name: "Cover", nameId: "Sampul", stage: "KO", sectionCode: "KO-01", weight: 4, priority: "low" },
  { id: "ko-01-02", code: "01-02", name: "Table of Contents", nameId: "Daftar Isi", stage: "KO", sectionCode: "KO-01", weight: 4, priority: "low" },
  { id: "ko-01-03", code: "01-03", name: "Purpose of Kickoff", nameId: "Tujuan KO", stage: "KO", sectionCode: "KO-01", weight: 8, priority: "medium" },
  { id: "ko-01-04", code: "01-04", name: "Workflow Overview", nameId: "Tinjauan Alur Kerja", stage: "KO", sectionCode: "KO-01", weight: 14, priority: "low" },
  // Section Total: 30

  // ========== KO-02: Client Brief & Objectives (120) ==========
  { id: "ko-02-01", code: "02-01", name: "Project Understanding", nameId: "Pemahaman Proyek", stage: "KO", sectionCode: "KO-02", weight: 24, priority: "high" },
  { id: "ko-02-02", code: "02-02", name: "Client Needs & Vision", nameId: "Visi & Kebutuhan Klien", stage: "KO", sectionCode: "KO-02", weight: 42, priority: "high" },
  { id: "ko-02-03", code: "02-03", name: "Functional Requirements", nameId: "Kebutuhan Fungsional", stage: "KO", sectionCode: "KO-02", weight: 24, priority: "high" },
  { id: "ko-02-04", code: "02-04", name: "Budget Expectation", nameId: "Ekspektasi Anggaran", stage: "KO", sectionCode: "KO-02", weight: 15, priority: "medium", schemaType: "CURRENCY_RANGE", inputConfig: { currency: "IDR" } },
  { id: "ko-02-05", code: "02-05", name: "Timeline Expectation", nameId: "Ekspektasi Lini Waktu", stage: "KO", sectionCode: "KO-02", weight: 15, priority: "medium", schemaType: "DATE_RANGE_WITH_DURATION" },
  // Section Total: 120

  // ========== KO-03: Scope of Work Definition (100) ==========
  { id: "ko-03-01", code: "03-01", name: "Kickoff Scope & Deliverables", nameId: "Ruang Lingkup dan Keluaran KO", stage: "KO", sectionCode: "KO-03", weight: 20, priority: "high" },
  { id: "ko-03-02", code: "03-02", name: "Design Scope", nameId: "Lingkup Desain", stage: "KO", sectionCode: "KO-03", weight: 30, priority: "high" },
  { id: "ko-03-03", code: "03-03", name: "Construction Scope", nameId: "Lingkup Konstruksi", stage: "KO", sectionCode: "KO-03", weight: 30, priority: "high" },
  { id: "ko-03-04", code: "03-04", name: "Exclusions & Assumptions", nameId: "Pengecualian & Asumsi", stage: "KO", sectionCode: "KO-03", weight: 20, priority: "medium" },
  // Section Total: 100

  // ========== KO-04: Site Data Collection (80) ==========
  { id: "ko-04-01", code: "04-01", name: "Site Photos and Videos", nameId: "Foto dan Video Tapak", stage: "KO", sectionCode: "KO-04", weight: 32, priority: "high", schemaType: "DELIVERABLE_BASIC", inputConfig: { allowedExtensions: [".jpg", ".png", ".mp4"] } },
  { id: "ko-04-02", code: "04-02", name: "Existing Drawings", nameId: "Gambar Kerja Eksisting", stage: "KO", sectionCode: "KO-04", weight: 16, priority: "medium", schemaType: "DELIVERABLE_BASIC", inputConfig: { allowedExtensions: [".dwg", ".pdf"] } },
  { id: "ko-04-03", code: "04-03", name: "Measurement & Verification", nameId: "Pengukuran & Verifikasi", stage: "KO", sectionCode: "KO-04", weight: 32, priority: "high" },
  // Section Total: 80

  // ========== KO-05: Regulation & Zoning Check (80) ==========
  { id: "ko-05-01", code: "05-01", name: "Zoning Regulation", nameId: "Peraturan Tata Kota", stage: "KO", sectionCode: "KO-05", weight: 24, priority: "high", schemaType: "DELIVERABLE_BASIC" },
  { id: "ko-05-02", code: "05-02", name: "Building Code Check", nameId: "Pemeriksaan Kode Bangunan", stage: "KO", sectionCode: "KO-05", weight: 40, priority: "high" },
  { id: "ko-05-03", code: "05-03", name: "Height & GSB Analysis", nameId: "Analisis Tinggi & GSB", stage: "KO", sectionCode: "KO-05", weight: 16, priority: "medium" },
  // Section Total: 80

  // ========== KO-06: Initial Budget Range (50) ==========
  { id: "ko-06-01", code: "06-01", name: "Design Fee", nameId: "Biaya Desain", stage: "KO", sectionCode: "KO-06", weight: 15, priority: "medium", schemaType: "CURRENCY_RANGE", inputConfig: { currency: "IDR" } },
  { id: "ko-06-02", code: "06-02", name: "Construction Cost Benchmark", nameId: "Patokan Biaya Konstruksi", stage: "KO", sectionCode: "KO-06", weight: 20, priority: "high", schemaType: "DESCRIPTION_ONLY", inputData: { description: "Use External Estimator: /flow/rab" } },
  { id: "ko-06-03", code: "06-03", name: "Area vs Cost Analysis", nameId: "Analisis Luas vs Biaya", stage: "KO", sectionCode: "KO-06", weight: 15, priority: "medium" },
  // Section Total: 50

  // ========== KO-07: Project Schedule Draft (30) ==========
  { id: "ko-07-01", code: "07-01", name: "Stage Timeline", nameId: "Lini Waktu Tahap", stage: "KO", sectionCode: "KO-07", weight: 12, priority: "medium" },
  { id: "ko-07-02", code: "07-02", name: "Milestone Definition", nameId: "Penentuan Milestones", stage: "KO", sectionCode: "KO-07", weight: 18, priority: "high" },
  // Section Total: 30

  // ========== KO-08: Kickoff Approval (10) ==========
  { id: "ko-08-01", code: "08-01", name: "Internal Approval", nameId: "Persetujuan Internal", stage: "KO", sectionCode: "KO-08", weight: 4, priority: "high" },
  { id: "ko-08-02", code: "08-02", name: "Client Approval", nameId: "Persetujuan Klien", stage: "KO", sectionCode: "KO-08", weight: 5, priority: "urgent" },
  { id: "ko-08-03", code: "08-03", name: "Notes", nameId: "Catatan", stage: "KO", sectionCode: "KO-08", weight: 1, priority: "low" },
  // Section Total: 10
];
// GRAND TOTAL: 500 (= 5.00% of project)

export function getKOTasksBySection(sectionCode: string): Task[] {
  return koTasks.filter(t => t.sectionCode === sectionCode);
}
