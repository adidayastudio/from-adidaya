import { Task } from "../types";

/**
 * STAGE DD - DESIGN DEVELOPMENT
 * Total Stage Weight: 1750 (= 17.50% when divided by 100)
 * All weights stored as integers (x100 for precision)
 */

export const DD_SECTIONS = [
    { code: "DD-01", title: "General Information", weight: 70 },           // 0.70%
    { code: "DD-02", title: "Final Floor Plans", weight: 350 },            // 3.50%
    { code: "DD-03", title: "Elevations", weight: 245 },                   // 2.45%
    { code: "DD-04", title: "Sections", weight: 175 },                     // 1.75%
    { code: "DD-05", title: "Material & Finishes", weight: 175 },          // 1.75%
    { code: "DD-06", title: "Interior/Exterior Design", weight: 210 },     // 2.10%
    { code: "DD-07", title: "Design Coordination", weight: 175 },          // 1.75%
    { code: "DD-08", title: "Budget Estimation", weight: 140 },            // 1.40%
    { code: "DD-09", title: "Timeline Estimation", weight: 140 },          // 1.40%
    { code: "DD-10", title: "Design Development Approval", weight: 70 },   // 0.70%
]; // Total: 1750

export const ddTasks: Task[] = [
    // ========== DD-01: General Information (70) ==========
    { id: "dd-01-01", code: "01-01", name: "Cover", stage: "DD", sectionCode: "DD-01", weight: 7, priority: "low" },
    { id: "dd-01-02", code: "01-02", name: "Table of Contents", stage: "DD", sectionCode: "DD-01", weight: 7, priority: "low" },
    { id: "dd-01-03", code: "01-03", name: "Purpose of DD", stage: "DD", sectionCode: "DD-01", weight: 14, priority: "medium" },
    { id: "dd-01-04", code: "01-04", name: "DD Scope & Deliverables", stage: "DD", sectionCode: "DD-01", weight: 18, priority: "high" },
    { id: "dd-01-05", code: "01-05", name: "Workflow Overview", stage: "DD", sectionCode: "DD-01", weight: 7, priority: "low" },
    { id: "dd-01-06", code: "01-06", name: "Project Understanding", stage: "DD", sectionCode: "DD-01", weight: 17, priority: "high" },

    // ========== DD-02: Final Floor Plans (350) ==========
    { id: "dd-02-01", code: "02-01", name: "1st Floor Plan", stage: "DD", sectionCode: "DD-02", weight: 140, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-02-02", code: "02-02", name: "2nd Floor Plan", stage: "DD", sectionCode: "DD-02", weight: 140, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-02-03", code: "02-03", name: "Roof Plan", stage: "DD", sectionCode: "DD-02", weight: 70, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // ========== DD-03: Elevations (245) ==========
    { id: "dd-03-01", code: "03-01", name: "Front Elevation", stage: "DD", sectionCode: "DD-03", weight: 61, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-03-02", code: "03-02", name: "Back Elevation", stage: "DD", sectionCode: "DD-03", weight: 61, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-03-03", code: "03-03", name: "Left Elevation", stage: "DD", sectionCode: "DD-03", weight: 61, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-03-04", code: "03-04", name: "Right Elevation", stage: "DD", sectionCode: "DD-03", weight: 62, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== DD-04: Sections (175) ==========
    { id: "dd-04-01", code: "04-01", name: "Section A", stage: "DD", sectionCode: "DD-04", weight: 88, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-04-02", code: "04-02", name: "Section B", stage: "DD", sectionCode: "DD-04", weight: 87, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== DD-05: Material & Finishes (175) ==========
    { id: "dd-05-01", code: "05-01", name: "Floor Material", stage: "DD", sectionCode: "DD-05", weight: 53, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-05-02", code: "05-02", name: "Wall Material", stage: "DD", sectionCode: "DD-05", weight: 52, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-05-03", code: "05-03", name: "Ceiling Material", stage: "DD", sectionCode: "DD-05", weight: 35, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-05-04", code: "05-04", name: "Roof Material", stage: "DD", sectionCode: "DD-05", weight: 35, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // ========== DD-06: Interior/Exterior Design (210) ==========
    { id: "dd-06-01", code: "06-01", name: "Exterior Visualization", stage: "DD", sectionCode: "DD-06", weight: 95, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "dd-06-02", code: "06-02", name: "Interior Visualization", stage: "DD", sectionCode: "DD-06", weight: 115, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== DD-07: Design Coordination (175) ==========
    { id: "dd-07-01", code: "07-01", name: "ARS-STR Coordination", stage: "DD", sectionCode: "DD-07", weight: 96, priority: "high", schemaType: "STATUS_WITH_NOTE" },
    { id: "dd-07-02", code: "07-02", name: "ARS-MEP Coordination", stage: "DD", sectionCode: "DD-07", weight: 79, priority: "high", schemaType: "STATUS_WITH_NOTE" },

    // ========== DD-08: Budget Estimation (140) ==========
    { id: "dd-08-01", code: "08-01", name: "Cost Estimation Summary", stage: "DD", sectionCode: "DD-08", weight: 42, priority: "high", schemaType: "CURRENCY_RANGE", inputConfig: { currency: "IDR" } },
    { id: "dd-08-02", code: "08-02", name: "Cost Estimation Detail", stage: "DD", sectionCode: "DD-08", weight: 98, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== DD-09: Timeline Estimation (140) ==========
    { id: "dd-09-01", code: "09-01", name: "Timeline Estimation Summary", stage: "DD", sectionCode: "DD-09", weight: 42, priority: "medium", schemaType: "DATE_RANGE_WITH_DURATION" },
    { id: "dd-09-02", code: "09-02", name: "Timeline Estimation Detail", stage: "DD", sectionCode: "DD-09", weight: 98, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== DD-10: Design Development Approval (70) ==========
    { id: "dd-10-01", code: "10-01", name: "Internal Approval", stage: "DD", sectionCode: "DD-10", weight: 28, priority: "high", schemaType: "STATUS_WITH_NOTE" },
    { id: "dd-10-02", code: "10-02", name: "Client Approval", stage: "DD", sectionCode: "DD-10", weight: 35, priority: "urgent", schemaType: "STATUS_WITH_NOTE" },
    { id: "dd-10-03", code: "10-03", name: "Notes", stage: "DD", sectionCode: "DD-10", weight: 7, priority: "low", schemaType: "DESCRIPTION_ONLY" },
];
// GRAND TOTAL: 1750

export function getDDTasksBySection(sectionCode: string): Task[] {
    return ddTasks.filter(t => t.sectionCode === sectionCode);
}
