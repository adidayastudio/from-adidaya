
import {
    FinanceOverviewSummary,
    AttentionItem,
    NeedAttentionItem,
    RecentActivity
} from "@/lib/types/finance-types";

export const MOCK_TEAM_SUMMARY: FinanceOverviewSummary = {
    totalPaidThisMonth: 520000000,
    outstanding: 185000000,
    reimbursePending: 24500000,
    pettyCashBalance: 15000000,
};

export const MOCK_GOODS_RECEIVED: AttentionItem[] = [
    { id: "gr1", type: "goods_received", description: "Semen Tiga Roda", quantity: "50 sak", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-14", deadline: "2026-01-16", beneficiary: "PT Bangun Jaya", beneficiaryType: "vendor", amount: 12500000 },
    { id: "gr2", type: "goods_received", description: "Besi Beton 12mm", quantity: "100 batang", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-13", deadline: "2026-01-20", beneficiary: "CV Steel Indo", beneficiaryType: "vendor", amount: 45000000 },
    { id: "gr3", type: "goods_received", description: "Cat Tembok Dulux", quantity: "20 kaleng", projectCode: "VLP", projectName: "Villa Puncak", submittedDate: "2026-01-15", deadline: "2026-01-18", beneficiary: "Toko Cat Jaya", beneficiaryType: "vendor", amount: 8500000 },
    { id: "gr4", type: "goods_received", description: "Keramik 60x60", quantity: "200 dus", projectCode: "PRG", projectName: "Proj Gunawarman", submittedDate: "2026-01-12", beneficiary: "CV Keramik Indo", beneficiaryType: "vendor", amount: 32000000 },
    { id: "gr5", type: "goods_received", description: "Pipa PVC 4 inch", quantity: "50 batang", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-10", deadline: "2026-01-14", beneficiary: "TB. Maju Jaya", beneficiaryType: "vendor", amount: 4500000 },
    { id: "gr6", type: "goods_received", description: "Pasir Beton", quantity: "10 truk", projectCode: "VLP", projectName: "Villa Puncak", submittedDate: "2026-01-11", beneficiary: "CV Material Jaya", beneficiaryType: "vendor", amount: 15000000 },
];

export const MOCK_INVOICES: AttentionItem[] = [
    { id: "inv1", type: "invoice", description: "Jasa Cor Lantai 2", quantity: "1 paket", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-12", deadline: "2026-01-19", beneficiary: "PT Contractor Pro", beneficiaryType: "vendor", amount: 85000000 },
    { id: "inv2", type: "invoice", description: "Material Listrik", quantity: "1 set", projectCode: "VLP", projectName: "Villa Puncak", submittedDate: "2026-01-10", deadline: "2026-01-17", beneficiary: "Toko Elektrik Jaya", beneficiaryType: "vendor", amount: 18500000 },
    { id: "inv3", type: "invoice", description: "Jasa Plumbing", quantity: "1 paket", projectCode: "PRG", projectName: "Proj Gunawarman", submittedDate: "2026-01-08", deadline: "2026-01-15", beneficiary: "CV Water Works", beneficiaryType: "vendor", amount: 25000000 },
    { id: "inv4", type: "invoice", description: "Sewa Scaffolding", quantity: "3 bulan", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-05", beneficiary: "PT Rental Alat", beneficiaryType: "vendor", amount: 12000000 },
];

export const MOCK_STAFF_CLAIMS: AttentionItem[] = [
    { id: "sc1", type: "staff_claim", description: "Transport ke Site Kemang", quantity: "2 trip", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-15", beneficiary: "Ahmad Fauzi", beneficiaryType: "staff", amount: 450000 },
    { id: "sc2", type: "staff_claim", description: "Makan Tim Lembur", quantity: "8 porsi", projectCode: "VLP", projectName: "Villa Puncak", submittedDate: "2026-01-14", beneficiary: "Budi Santoso", beneficiaryType: "staff", amount: 850000 },
    { id: "sc3", type: "staff_claim", description: "Parkir Meeting Client", quantity: "1x", projectCode: "PRG", projectName: "Proj Gunawarman", submittedDate: "2026-01-13", beneficiary: "Dewi Lestari", beneficiaryType: "staff", amount: 150000 },
    { id: "sc4", type: "staff_claim", description: "Bensin Survey Lokasi", quantity: "10 liter", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-12", beneficiary: "Eko Prasetyo", beneficiaryType: "staff", amount: 120000 },
    { id: "sc5", type: "staff_claim", description: "Fotokopi Dokumen", quantity: "200 lembar", projectCode: "VLP", projectName: "Villa Puncak", submittedDate: "2026-01-11", beneficiary: "Ahmad Fauzi", beneficiaryType: "staff", amount: 100000 },
    { id: "sc6", type: "staff_claim", description: "ATK Meeting", quantity: "1 set", projectCode: "PRG", projectName: "Proj Gunawarman", submittedDate: "2026-01-10", beneficiary: "Budi Santoso", beneficiaryType: "staff", amount: 250000 },
];

export const MOCK_RECENT_ACTIVITY: RecentActivity[] = [
    { id: "1", action: "Payment", description: "Paid invoice to PT Bangun Makmur", user: "Finance Admin", timestamp: "2026-01-15T10:30:00" },
    { id: "2", action: "Approval", description: "Approved reimburse request from Ahmad", user: "Manager", timestamp: "2026-01-15T09:15:00" },
    { id: "3", action: "Top Up", description: "Added Rp 5.000.000 to Kemang Project petty cash", user: "Finance Admin", timestamp: "2026-01-14T16:45:00" },
    { id: "4", action: "Purchase", description: "New purchase order: Semen 50 sak", user: "Site Manager", timestamp: "2026-01-14T14:20:00" },
];

// --- MOCK DATA FOR PERSONAL VIEW ---
export const MOCK_PERSONAL_SUMMARY = {
    myPurchases: 5,
    myReimburse: 2,
    totalSubmitted: 145750000,
    pendingApproval: 57500000,
    awaitingPayment: 85000000,
    paid: 3250000,
};

export const MOCK_MY_PURCHASES: AttentionItem[] = [
    { id: "p1", type: "goods_received", description: "Semen Tiga Roda", quantity: "50 sak", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-15", beneficiary: "PT Bangun Jaya", beneficiaryType: "vendor", amount: 12500000 },
    { id: "p2", type: "goods_received", description: "Besi Beton 12mm", quantity: "100 batang", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-14", beneficiary: "CV Steel Indo", beneficiaryType: "vendor", amount: 45000000 },
    { id: "p3", type: "invoice", description: "Material Listrik Paket", quantity: "1 set", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-12", beneficiary: "Toko Elektrik Jaya", beneficiaryType: "vendor", amount: 18500000 },
    { id: "p4", type: "staff_claim", description: "Sewa Molen 3 hari", quantity: "1 unit", projectCode: "VLP", projectName: "Villa Puncak", submittedDate: "2026-01-10", beneficiary: "CV Alat Konstruksi", beneficiaryType: "vendor", amount: 2400000 },
];

export const MOCK_MY_REIMBURSE: AttentionItem[] = [
    { id: "r1", type: "staff_claim", description: "Transport ke site", quantity: "1 trip", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-13", beneficiary: "You", beneficiaryType: "staff", amount: 450000 },
    { id: "r2", type: "staff_claim", description: "Makan siang meeting", quantity: "5 porsi", projectCode: "RKM", projectName: "Rumah Kemang", submittedDate: "2026-01-15", beneficiary: "You", beneficiaryType: "staff", amount: 850000 },
];
