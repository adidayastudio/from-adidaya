import { Task } from "../types";

/**
 * STAGE HO - HANDOVER
 * Total Stage Weight: 500 (= 5.00% when divided by 100)
 * All weights stored as integers (x100 for precision)
 */

export const HO_SECTIONS = [
    { code: "HO-01", title: "General Information", weight: 10 },       // 0.10%
    { code: "HO-02", title: "Final Inspection", weight: 125 },         // 1.25%
    { code: "HO-03", title: "As-Built Drawings", weight: 200 },        // 2.00%
    { code: "HO-04", title: "Documentation", weight: 75 },             // 0.75%
    { code: "HO-05", title: "Handover Approval", weight: 90 },         // 0.90%
]; // Total: 500

export const hoTasks: Task[] = [
    // ========== HO-01: General Information (10) ==========
    { id: "ho-01-01", code: "01-01", name: "Cover", stage: "HO", sectionCode: "HO-01", weight: 1, priority: "low", schemaType: "DELIVERABLE_BASIC" },
    { id: "ho-01-02", code: "01-02", name: "Table of Contents", stage: "HO", sectionCode: "HO-01", weight: 1, priority: "low", schemaType: "DELIVERABLE_BASIC" },
    { id: "ho-01-03", code: "01-03", name: "Purpose of HO", stage: "HO", sectionCode: "HO-01", weight: 2, priority: "medium", schemaType: "DESCRIPTION_ONLY" },
    { id: "ho-01-04", code: "01-04", name: "HO Scope & Deliverables", stage: "HO", sectionCode: "HO-01", weight: 3, priority: "high", schemaType: "DESCRIPTION_ONLY" },
    { id: "ho-01-05", code: "01-05", name: "Workflow Overview", stage: "HO", sectionCode: "HO-01", weight: 1, priority: "low", schemaType: "DESCRIPTION_ONLY" },
    { id: "ho-01-06", code: "01-06", name: "Project Understanding", stage: "HO", sectionCode: "HO-01", weight: 2, priority: "high", schemaType: "DESCRIPTION_ONLY" },

    // ========== HO-02: Final Inspection (125) ==========
    { id: "ho-02-01", code: "02-01", name: "Punchlist", stage: "HO", sectionCode: "HO-02", weight: 50, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ho-02-02", code: "02-02", name: "Rectification", stage: "HO", sectionCode: "HO-02", weight: 75, priority: "urgent", schemaType: "DELIVERABLE_BASIC" },

    // ========== HO-03: As-Built Drawings (200) ==========
    { id: "ho-03-01", code: "03-01", name: "ARS As-Built Drawing", stage: "HO", sectionCode: "HO-03", weight: 80, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ho-03-02", code: "03-02", name: "STR As-Built Drawing", stage: "HO", sectionCode: "HO-03", weight: 60, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ho-03-03", code: "03-03", name: "MEP As-Built Drawing", stage: "HO", sectionCode: "HO-03", weight: 60, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== HO-04: Documentation (75) ==========
    { id: "ho-04-01", code: "04-01", name: "Operation & Maintenance Manual", stage: "HO", sectionCode: "HO-04", weight: 45, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ho-04-02", code: "04-02", name: "Warranty Docs", stage: "HO", sectionCode: "HO-04", weight: 30, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== HO-05: Handover Approval (90) ==========
    { id: "ho-05-01", code: "05-01", name: "Client Sign-Off", stage: "HO", sectionCode: "HO-05", weight: 63, priority: "urgent", schemaType: "STATUS_WITH_NOTE" },
    { id: "ho-05-02", code: "05-02", name: "Project Closure", stage: "HO", sectionCode: "HO-05", weight: 27, priority: "high", schemaType: "STATUS_WITH_NOTE" },
];
// GRAND TOTAL: 500

export function getHOTasksBySection(sectionCode: string): Task[] {
    return hoTasks.filter(t => t.sectionCode === sectionCode);
}
