import { Task } from "../types";

/**
 * STAGE PC - PROCUREMENT
 * Total Stage Weight: 1250 (= 12.50% when divided by 100)
 * All weights stored as integers (x100 for precision)
 */

export const PC_SECTIONS = [
    { code: "PC-01", title: "General Information", weight: 25 },           // 0.25%
    { code: "PC-02", title: "Vendor List", weight: 75 },                   // 0.75%
    { code: "PC-03", title: "Material Specification", weight: 200 },       // 2.00%
    { code: "PC-04", title: "Request for Quotation", weight: 50 },         // 0.50%
    { code: "PC-05", title: "Quotation Comparison", weight: 50 },          // 0.50%
    { code: "PC-06", title: "Vendor Selection", weight: 75 },              // 0.75%
    { code: "PC-07", title: "Purchases and Cashflow Report", weight: 750 }, // 7.50%
    { code: "PC-08", title: "Procurement Approval", weight: 25 },          // 0.25%
]; // Total: 1250

export const pcTasks: Task[] = [
    // ========== PC-01: General Information (25) ==========
    { id: "pc-01-01", code: "01-01", name: "Cover", stage: "PC", sectionCode: "PC-01", weight: 3, priority: "low", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-01-02", code: "01-02", name: "Table of Contents", stage: "PC", sectionCode: "PC-01", weight: 2, priority: "low", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-01-03", code: "01-03", name: "Purpose of PC", stage: "PC", sectionCode: "PC-01", weight: 5, priority: "medium", schemaType: "DESCRIPTION_ONLY" },
    { id: "pc-01-04", code: "01-04", name: "PC Scope & Deliverables", stage: "PC", sectionCode: "PC-01", weight: 6, priority: "high", schemaType: "DESCRIPTION_ONLY" },
    { id: "pc-01-05", code: "01-05", name: "Workflow Overview", stage: "PC", sectionCode: "PC-01", weight: 3, priority: "low", schemaType: "DESCRIPTION_ONLY" },
    { id: "pc-01-06", code: "01-06", name: "Project Understanding", stage: "PC", sectionCode: "PC-01", weight: 6, priority: "high", schemaType: "DESCRIPTION_ONLY" },

    // ========== PC-02: Vendor List (75) ==========
    { id: "pc-02-01", code: "02-01", name: "Material Vendor List", stage: "PC", sectionCode: "PC-02", weight: 41, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-02-02", code: "02-02", name: "Contractor/Subcontractor List", stage: "PC", sectionCode: "PC-02", weight: 34, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== PC-03: Material Specification (200) ==========
    { id: "pc-03-01", code: "03-01", name: "Outline Material Specs", stage: "PC", sectionCode: "PC-03", weight: 30, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-03-02", code: "03-02", name: "Architecture Material Specs/RKS", stage: "PC", sectionCode: "PC-03", weight: 60, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-03-03", code: "03-03", name: "Structure Material Specs/RKS", stage: "PC", sectionCode: "PC-03", weight: 50, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-03-04", code: "03-04", name: "MEP Material Specs/RKS", stage: "PC", sectionCode: "PC-03", weight: 60, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== PC-04: Request for Quotation (50) ==========
    { id: "pc-04-01", code: "04-01", name: "RFQ Preparation", stage: "PC", sectionCode: "PC-04", weight: 28, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-04-02", code: "04-02", name: "RFQ Distribution", stage: "PC", sectionCode: "PC-04", weight: 22, priority: "medium", schemaType: "STATUS_WITH_NOTE" },

    // ========== PC-05: Quotation Comparison (50) ==========
    { id: "pc-05-01", code: "05-01", name: "Technical Comparison", stage: "PC", sectionCode: "PC-05", weight: 23, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-05-02", code: "05-02", name: "Cost Comparison", stage: "PC", sectionCode: "PC-05", weight: 27, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== PC-06: Vendor Selection (75) ==========
    { id: "pc-06-01", code: "06-01", name: "Evaluation", stage: "PC", sectionCode: "PC-06", weight: 41, priority: "high", schemaType: "STATUS_WITH_NOTE" },
    { id: "pc-06-02", code: "06-02", name: "Final Selection", stage: "PC", sectionCode: "PC-06", weight: 34, priority: "high", schemaType: "STATUS_WITH_NOTE" },

    // ========== PC-07: Purchases and Cashflow Report (750) ==========
    { id: "pc-07-01", code: "07-01", name: "Monthly Purchases & Report (Month 1-6)", stage: "PC", sectionCode: "PC-07", weight: 125, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-07-02", code: "07-02", name: "Weekly Purchases & Report (Week 1-4)", stage: "PC", sectionCode: "PC-07", weight: 31, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "pc-07-03", code: "07-03", name: "Daily Purchases & Report", stage: "PC", sectionCode: "PC-07", weight: 594, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // ========== PC-08: Procurement Approval (25) ==========
    { id: "pc-08-01", code: "08-01", name: "Internal Approval", stage: "PC", sectionCode: "PC-08", weight: 10, priority: "high", schemaType: "STATUS_WITH_NOTE" },
    { id: "pc-08-02", code: "08-02", name: "Client Approval", stage: "PC", sectionCode: "PC-08", weight: 12, priority: "urgent", schemaType: "STATUS_WITH_NOTE" },
    { id: "pc-08-03", code: "08-03", name: "Notes", stage: "PC", sectionCode: "PC-08", weight: 3, priority: "low", schemaType: "DESCRIPTION_ONLY" },
];
// GRAND TOTAL: 1250

export function getPCTasksBySection(sectionCode: string): Task[] {
    return pcTasks.filter(t => t.sectionCode === sectionCode);
}
