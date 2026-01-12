import { Task } from "../types";

/**
 * STAGE SD - SCHEMATIC DESIGN
 * Total Stage Weight: 1250 (= 12.50% when divided by 100)
 * All weights stored as integers (x100 for precision)
 */

export const SD_SECTIONS = [
    { code: "SD-01", title: "General Information", weight: 50 },       // 0.50%
    { code: "SD-02", title: "Space Program & Zoning", weight: 100 },   // 1.00%
    { code: "SD-03", title: "Massing Study", weight: 125 },            // 1.25%
    { code: "SD-04", title: "Schematic Floor Plan", weight: 250 },     // 2.50%
    { code: "SD-05", title: "Circulation & Access", weight: 75 },      // 0.75%
    { code: "SD-06", title: "Concept Narrative", weight: 125 },        // 1.25%
    { code: "SD-07", title: "Visualization", weight: 225 },            // 2.25%
    { code: "SD-08", title: "Budget Ballpark", weight: 150 },          // 1.50%
    { code: "SD-09", title: "Timeline Ballpark", weight: 125 },        // 1.25%
    { code: "SD-10", title: "Schematic Design Approval", weight: 25 }, // 0.25%
]; // Total: 1250

export const sdTasks: Task[] = [
    // ========== SD-01: General Information (50) ==========
    { id: "sd-01-01", code: "01-01", name: "Cover", stage: "SD", sectionCode: "SD-01", weight: 5, priority: "low" },
    { id: "sd-01-02", code: "01-02", name: "Table of Contents", stage: "SD", sectionCode: "SD-01", weight: 5, priority: "low" },
    { id: "sd-01-03", code: "01-03", name: "Purpose of SD", stage: "SD", sectionCode: "SD-01", weight: 10, priority: "medium" },
    { id: "sd-01-04", code: "01-04", name: "SD Scope & Deliverables", stage: "SD", sectionCode: "SD-01", weight: 13, priority: "high" },
    { id: "sd-01-05", code: "01-05", name: "Workflow Overview", stage: "SD", sectionCode: "SD-01", weight: 5, priority: "low" },
    { id: "sd-01-06", code: "01-06", name: "Project Understanding", stage: "SD", sectionCode: "SD-01", weight: 12, priority: "high" },

    // ========== SD-02: Space Program & Zoning (100) ==========
    { id: "sd-02-01", code: "02-01", name: "Room List", stage: "SD", sectionCode: "SD-02", weight: 30, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-02-02", code: "02-02", name: "Area Calculation", stage: "SD", sectionCode: "SD-02", weight: 30, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-02-03", code: "02-03", name: "Zoning Diagram", stage: "SD", sectionCode: "SD-02", weight: 40, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== SD-03: Massing Study (125) ==========
    { id: "sd-03-01", code: "03-01", name: "Initial Massing", stage: "SD", sectionCode: "SD-03", weight: 38, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-03-02", code: "03-02", name: "Alternative Massing", stage: "SD", sectionCode: "SD-03", weight: 37, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-03-03", code: "03-03", name: "Selected Massing", stage: "SD", sectionCode: "SD-03", weight: 50, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== SD-04: Schematic Floor Plan (250) ==========
    { id: "sd-04-01", code: "04-01", name: "1st Floor Plan", stage: "SD", sectionCode: "SD-04", weight: 100, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-04-02", code: "04-02", name: "2nd Floor Plan", stage: "SD", sectionCode: "SD-04", weight: 100, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-04-03", code: "04-03", name: "Roof Plan", stage: "SD", sectionCode: "SD-04", weight: 50, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // ========== SD-05: Circulation & Access (75) ==========
    { id: "sd-05-01", code: "05-01", name: "Horizontal Circulation", stage: "SD", sectionCode: "SD-05", weight: 26, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-05-02", code: "05-02", name: "Vertical Circulation", stage: "SD", sectionCode: "SD-05", weight: 26, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-05-03", code: "05-03", name: "Service Area", stage: "SD", sectionCode: "SD-05", weight: 23, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // ========== SD-06: Concept Narrative (125) ==========
    { id: "sd-06-01", code: "06-01", name: "Design Concept", stage: "SD", sectionCode: "SD-06", weight: 50, priority: "high", schemaType: "DESCRIPTION_ONLY" },
    { id: "sd-06-02", code: "06-02", name: "Material Direction", stage: "SD", sectionCode: "SD-06", weight: 38, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "sd-06-03", code: "06-03", name: "Spatial Experience", stage: "SD", sectionCode: "SD-06", weight: 37, priority: "medium", schemaType: "DESCRIPTION_ONLY" },

    // ========== SD-07: Visualization (225) ==========
    { id: "sd-07-01", code: "07-01", name: "Exterior Visualization", stage: "SD", sectionCode: "SD-07", weight: 124, priority: "high", schemaType: "DELIVERABLE_BASIC", inputConfig: { allowedExtensions: [".jpg", ".png"] } },
    { id: "sd-07-02", code: "07-02", name: "Interior Visualization", stage: "SD", sectionCode: "SD-07", weight: 101, priority: "high", schemaType: "DELIVERABLE_BASIC", inputConfig: { allowedExtensions: [".jpg", ".png"] } },

    // ========== SD-08: Budget Ballpark (150) ==========
    { id: "sd-08-01", code: "08-01", name: "Cost Ballpark Summary", stage: "SD", sectionCode: "SD-08", weight: 45, priority: "high", schemaType: "CURRENCY_RANGE", inputConfig: { currency: "IDR" } },
    { id: "sd-08-02", code: "08-02", name: "Cost Ballpark Detail", stage: "SD", sectionCode: "SD-08", weight: 105, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== SD-09: Timeline Ballpark (125) ==========
    { id: "sd-09-01", code: "09-01", name: "Timeline Ballpark Summary", stage: "SD", sectionCode: "SD-09", weight: 38, priority: "medium", schemaType: "DATE_RANGE_WITH_DURATION" },
    { id: "sd-09-02", code: "09-02", name: "Timeline Ballpark Detail", stage: "SD", sectionCode: "SD-09", weight: 87, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // ========== SD-10: Schematic Design Approval (25) ==========
    { id: "sd-10-01", code: "10-01", name: "Internal Approval", stage: "SD", sectionCode: "SD-10", weight: 10, priority: "high", schemaType: "STATUS_WITH_NOTE" },
    { id: "sd-10-02", code: "10-02", name: "Client Approval", stage: "SD", sectionCode: "SD-10", weight: 12, priority: "urgent", schemaType: "STATUS_WITH_NOTE" },
    { id: "sd-10-03", code: "10-03", name: "Notes", stage: "SD", sectionCode: "SD-10", weight: 3, priority: "low", schemaType: "DESCRIPTION_ONLY" },
];
// GRAND TOTAL: 1250

export function getSDTasksBySection(sectionCode: string): Task[] {
    return sdTasks.filter(t => t.sectionCode === sectionCode);
}
