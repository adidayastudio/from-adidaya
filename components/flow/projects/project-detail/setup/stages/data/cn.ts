import { Task } from "../types";

/**
 * STAGE CN - CONSTRUCTION
 * Total Stage Weight: 2500 (= 25.00% when divided by 100)
 * All weights stored as integers (x100 for precision)
 */

export const CN_SECTIONS = [
    { code: "CN-01", title: "General Information", weight: 50 },       // 0.50%
    { code: "CN-02", title: "Mobilization", weight: 200 },             // 2.00%
    { code: "CN-03", title: "Progress Monitoring", weight: 1500 },     // 15.00%
    { code: "CN-04", title: "Shop Drawing Review", weight: 250 },      // 2.50%
    { code: "CN-05", title: "Quality Control", weight: 500 },          // 5.00%
]; // Total: 2500

export const cnTasks: Task[] = [
    // ========== CN-01: General Information (50) ==========
    { id: "cn-01-01", code: "01-01", name: "Cover", stage: "CN", sectionCode: "CN-01", weight: 5, priority: "low", schemaType: "DELIVERABLE_BASIC" },
    { id: "cn-01-02", code: "01-02", name: "Table of Contents", stage: "CN", sectionCode: "CN-01", weight: 5, priority: "low", schemaType: "DELIVERABLE_BASIC" },
    { id: "cn-01-03", code: "01-03", name: "Purpose of CN", stage: "CN", sectionCode: "CN-01", weight: 10, priority: "medium", schemaType: "DESCRIPTION_ONLY" },
    { id: "cn-01-04", code: "01-04", name: "CN Scope & Deliverables", stage: "CN", sectionCode: "CN-01", weight: 13, priority: "high", schemaType: "DESCRIPTION_ONLY" },
    { id: "cn-01-05", code: "01-05", name: "Workflow Overview", stage: "CN", sectionCode: "CN-01", weight: 5, priority: "low", schemaType: "DESCRIPTION_ONLY" },
    { id: "cn-01-06", code: "01-06", name: "Project Understanding", stage: "CN", sectionCode: "CN-01", weight: 12, priority: "high", schemaType: "DESCRIPTION_ONLY" },

    // ========== CN-02: Mobilization (200) ==========
    { id: "cn-02-01", code: "02-01", name: "Site Setup", stage: "CN", sectionCode: "CN-02", weight: 80, priority: "high", schemaType: "STATUS_WITH_NOTE" },
    { id: "cn-02-02", code: "02-02", name: "Temporary Utilities", stage: "CN", sectionCode: "CN-02", weight: 60, priority: "high", schemaType: "STATUS_WITH_NOTE" },
    { id: "cn-02-03", code: "02-03", name: "Workers Setup", stage: "CN", sectionCode: "CN-02", weight: 60, priority: "medium", schemaType: "STATUS_WITH_NOTE" },

    // ========== CN-03: Progress Monitoring (1500) ==========
    { id: "cn-03-01", code: "03-01", name: "Monthly Progress Report (Month 1-6)", stage: "CN", sectionCode: "CN-03", weight: 250, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "cn-03-02", code: "03-02", name: "Weekly Progress Report (Week 1-4)", stage: "CN", sectionCode: "CN-03", weight: 63, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "cn-03-03", code: "03-03", name: "Daily Progress Report", stage: "CN", sectionCode: "CN-03", weight: 1187, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // ========== CN-04: Shop Drawing Review (250) ==========
    { id: "cn-04-01", code: "04-01", name: "ARS Shop Drawing", stage: "CN", sectionCode: "CN-04", weight: 100, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "cn-04-02", code: "04-02", name: "STR Shop Drawing", stage: "CN", sectionCode: "CN-04", weight: 75, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "cn-04-03", code: "04-03", name: "MEP Shop Drawing", stage: "CN", sectionCode: "CN-04", weight: 75, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== CN-05: Quality Control (500) ==========
    { id: "cn-05-01", code: "05-01", name: "Material Inspection", stage: "CN", sectionCode: "CN-05", weight: 150, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "cn-05-02", code: "05-02", name: "Work Inspection", stage: "CN", sectionCode: "CN-05", weight: 250, priority: "urgent", schemaType: "DELIVERABLE_BASIC" },
    { id: "cn-05-03", code: "05-03", name: "HSE Inspection", stage: "CN", sectionCode: "CN-05", weight: 100, priority: "high", schemaType: "DELIVERABLE_BASIC" },
];
// GRAND TOTAL: 2500

export function getCNTasksBySection(sectionCode: string): Task[] {
    return cnTasks.filter(t => t.sectionCode === sectionCode);
}
