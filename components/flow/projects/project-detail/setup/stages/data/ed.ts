import { Task } from "../types";

/**
 * STAGE ED - ENGINEERING DESIGN
 * Total Stage Weight: 2250 (= 22.50% when divided by 100)
 * All weights stored as integers (x100 for precision)
 */

export const ED_SECTIONS = [
    { code: "ED-01", title: "General Information", weight: 45 },           // 0.45%
    { code: "ED-02-A", title: "Technical Drawing - Architecture", weight: 720 }, // 7.20%
    { code: "ED-02-S", title: "Technical Drawing - Structure", weight: 540 },    // 5.40%
    { code: "ED-02-M", title: "Technical Drawing - Mechanical", weight: 180 },   // 1.80%
    { code: "ED-02-E", title: "Technical Drawing - Electrical", weight: 180 },   // 1.80%
    { code: "ED-02-P", title: "Technical Drawing - Plumbing", weight: 180 },     // 1.80%
    { code: "ED-03", title: "Final Budget", weight: 180 },                        // 1.80%
    { code: "ED-04", title: "Final Schedule", weight: 180 },                      // 1.80%
    { code: "ED-05", title: "ED Approval", weight: 45 },                          // 0.45%
]; // Total: 2250 (= 22.50%)

export const edTasks: Task[] = [
    // ========== ED-01: General Information (45) ==========
    { id: "ed-01-01", code: "01-01", name: "Cover", stage: "ED", sectionCode: "ED-01", weight: 5, priority: "low", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-01-02", code: "01-02", name: "Table of Contents", stage: "ED", sectionCode: "ED-01", weight: 4, priority: "low", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-01-03", code: "01-03", name: "Purpose of ED", stage: "ED", sectionCode: "ED-01", weight: 9, priority: "medium", schemaType: "DESCRIPTION_ONLY" },
    { id: "ed-01-04", code: "01-04", name: "ED Scope & Deliverables", stage: "ED", sectionCode: "ED-01", weight: 11, priority: "high", schemaType: "DESCRIPTION_ONLY" },
    { id: "ed-01-05", code: "01-05", name: "Workflow Overview", stage: "ED", sectionCode: "ED-01", weight: 5, priority: "low", schemaType: "DESCRIPTION_ONLY" },
    { id: "ed-01-06", code: "01-06", name: "Project Understanding", stage: "ED", sectionCode: "ED-01", weight: 11, priority: "high", schemaType: "DESCRIPTION_ONLY" },
    // Section Total: 45

    // ========== ED-02-A: Architecture (720) ==========
    // A-00: General
    { id: "ed-02-a-00-01", code: "02-A-01", name: "General Notes", stage: "ED", sectionCode: "ED-02-A", weight: 14, priority: "medium", schemaType: "DESCRIPTION_ONLY" },
    { id: "ed-02-a-00-02", code: "02-A-02", name: "Exterior Visualization", stage: "ED", sectionCode: "ED-02-A", weight: 29, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-00-03", code: "02-A-03", name: "Interior Visualization", stage: "ED", sectionCode: "ED-02-A", weight: 29, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // A-01: Floor Plans
    { id: "ed-02-a-01-01", code: "02-A-04", name: "Siteplan", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-01-02", code: "02-A-05", name: "1st Floor Plan", stage: "ED", sectionCode: "ED-02-A", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-01-03", code: "02-A-06", name: "2nd Floor Plan", stage: "ED", sectionCode: "ED-02-A", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-01-04", code: "02-A-07", name: "Roof Plan", stage: "ED", sectionCode: "ED-02-A", weight: 10, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // A-02: Elevations
    { id: "ed-02-a-02-01", code: "02-A-08", name: "Front Elevation", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-02-02", code: "02-A-09", name: "Back Elevation", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-02-03", code: "02-A-10", name: "Left Elevation", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-02-04", code: "02-A-11", name: "Right Elevation", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // A-03: Sections
    { id: "ed-02-a-03-01", code: "02-A-12", name: "Section A", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-03-02", code: "02-A-13", name: "Section B", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-03-03", code: "02-A-14", name: "Section C", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-03-04", code: "02-A-15", name: "Section D", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // A-04: Material & Finishes
    { id: "ed-02-a-04-01", code: "02-A-16", name: "1st Floor Material Finishes", stage: "ED", sectionCode: "ED-02-A", weight: 11, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-04-02", code: "02-A-17", name: "2nd Floor Material Finishes", stage: "ED", sectionCode: "ED-02-A", weight: 11, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-04-03", code: "02-A-18", name: "1st Floor Wall Finishes", stage: "ED", sectionCode: "ED-02-A", weight: 11, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-04-04", code: "02-A-19", name: "2nd Floor Wall Finishes", stage: "ED", sectionCode: "ED-02-A", weight: 11, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-04-05", code: "02-A-20", name: "1st Floor Ceiling Finishes", stage: "ED", sectionCode: "ED-02-A", weight: 11, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-04-06", code: "02-A-21", name: "2nd Floor Ceiling Finishes", stage: "ED", sectionCode: "ED-02-A", weight: 11, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-04-07", code: "02-A-22", name: "Roof Finishes", stage: "ED", sectionCode: "ED-02-A", weight: 6, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // A-05: Door & Window
    { id: "ed-02-a-05-01", code: "02-A-23", name: "1st Floor Door-Window Keyplan", stage: "ED", sectionCode: "ED-02-A", weight: 9, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-05-02", code: "02-A-24", name: "2nd Floor Door-Window Keyplan", stage: "ED", sectionCode: "ED-02-A", weight: 9, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-05-03", code: "02-A-25", name: "Door Detail", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-05-04", code: "02-A-26", name: "Window Detail", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-05-05", code: "02-A-27", name: "Door-Window Detail", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // A-06: Room Detail
    { id: "ed-02-a-06-01", code: "02-A-28", name: "Detail Room A", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-06-02", code: "02-A-29", name: "Detail Room B", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-06-03", code: "02-A-30", name: "Detail Room C", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-06-04", code: "02-A-31", name: "Detail Room D", stage: "ED", sectionCode: "ED-02-A", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    // A-07: Stair & Vertical Transportation
    { id: "ed-02-a-07-01", code: "02-A-32", name: "Stair Detail", stage: "ED", sectionCode: "ED-02-A", weight: 29, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-07-02", code: "02-A-33", name: "Elevator Detail", stage: "ED", sectionCode: "ED-02-A", weight: 22, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-07-03", code: "02-A-34", name: "Ramp Detail", stage: "ED", sectionCode: "ED-02-A", weight: 21, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    // A-08: Architectural Detail
    { id: "ed-02-a-08-01", code: "02-A-35", name: "Detail A", stage: "ED", sectionCode: "ED-02-A", weight: 36, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-a-08-02", code: "02-A-36", name: "Detail B", stage: "ED", sectionCode: "ED-02-A", weight: 36, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    // Architecture Total: 720

    // ========== ED-02-S: Structure (540) ==========
    { id: "ed-02-s-00-01", code: "02-S-01", name: "General Notes", stage: "ED", sectionCode: "ED-02-S", weight: 11, priority: "medium", schemaType: "DESCRIPTION_ONLY" },
    { id: "ed-02-s-00-02", code: "02-S-02", name: "Structural Calculation", stage: "ED", sectionCode: "ED-02-S", weight: 27, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-00-03", code: "02-S-03", name: "Structural Axonometry", stage: "ED", sectionCode: "ED-02-S", weight: 16, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-s-01-01", code: "02-S-04", name: "Foundation Plan", stage: "ED", sectionCode: "ED-02-S", weight: 35, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-01-02", code: "02-S-05", name: "Foundation Detail", stage: "ED", sectionCode: "ED-02-S", weight: 19, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-s-02-01", code: "02-S-06", name: "Tie Beam Plan", stage: "ED", sectionCode: "ED-02-S", weight: 35, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-02-02", code: "02-S-07", name: "Tie Beam Detail", stage: "ED", sectionCode: "ED-02-S", weight: 19, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-s-03-01", code: "02-S-08", name: "1st Floor Column Plan", stage: "ED", sectionCode: "ED-02-S", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-03-02", code: "02-S-09", name: "2nd Floor Column Plan", stage: "ED", sectionCode: "ED-02-S", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-03-03", code: "02-S-10", name: "Column Detail", stage: "ED", sectionCode: "ED-02-S", weight: 10, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-s-04-01", code: "02-S-11", name: "2nd Floor Beam Plan", stage: "ED", sectionCode: "ED-02-S", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-04-02", code: "02-S-12", name: "Ring Balk Plan", stage: "ED", sectionCode: "ED-02-S", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-04-03", code: "02-S-13", name: "Beam Detail", stage: "ED", sectionCode: "ED-02-S", weight: 10, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-s-05-01", code: "02-S-14", name: "2nd Floor Plate Plan", stage: "ED", sectionCode: "ED-02-S", weight: 27, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-05-02", code: "02-S-15", name: "Roof Plate Plan", stage: "ED", sectionCode: "ED-02-S", weight: 16, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-05-03", code: "02-S-16", name: "Floor Plate Detail", stage: "ED", sectionCode: "ED-02-S", weight: 11, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-s-06-01", code: "02-S-17", name: "Roof Frame Plan", stage: "ED", sectionCode: "ED-02-S", weight: 35, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-06-02", code: "02-S-18", name: "Roof Frame Detail", stage: "ED", sectionCode: "ED-02-S", weight: 19, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-s-07-01", code: "02-S-19", name: "Stair Structure Detail", stage: "ED", sectionCode: "ED-02-S", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-07-02", code: "02-S-20", name: "Elevator Structure Detail", stage: "ED", sectionCode: "ED-02-S", weight: 19, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-07-03", code: "02-S-21", name: "Ramp Structure Detail", stage: "ED", sectionCode: "ED-02-S", weight: 13, priority: "medium", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-s-08-01", code: "02-S-22", name: "Portal Design", stage: "ED", sectionCode: "ED-02-S", weight: 35, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-s-08-02", code: "02-S-23", name: "Structural Detail", stage: "ED", sectionCode: "ED-02-S", weight: 19, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    // Structure Total: 540  (est)

    // ========== ED-02-M: Mechanical (180) ==========
    { id: "ed-02-m-00-01", code: "02-M-01", name: "General Notes", stage: "ED", sectionCode: "ED-02-M", weight: 5, priority: "medium", schemaType: "DESCRIPTION_ONLY" },
    { id: "ed-02-m-00-02", code: "02-M-02", name: "MEP Calculation", stage: "ED", sectionCode: "ED-02-M", weight: 16, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-m-01-01", code: "02-M-03", name: "Clean Water Diagram (SLD)", stage: "ED", sectionCode: "ED-02-M", weight: 11, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-m-01-02", code: "02-M-04", name: "Clean Water Plan", stage: "ED", sectionCode: "ED-02-M", weight: 16, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-m-01-03", code: "02-M-05", name: "Clean Water Isometric", stage: "ED", sectionCode: "ED-02-M", weight: 11, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-m-02-01", code: "02-M-06", name: "Dirty Water Diagram (SLD)", stage: "ED", sectionCode: "ED-02-M", weight: 11, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-m-02-02", code: "02-M-07", name: "Dirty Water Plan", stage: "ED", sectionCode: "ED-02-M", weight: 16, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-m-02-03", code: "02-M-08", name: "Dirty Water Isometric", stage: "ED", sectionCode: "ED-02-M", weight: 11, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-m-03-01", code: "02-M-09", name: "Rain Water Plan", stage: "ED", sectionCode: "ED-02-M", weight: 16, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-m-03-02", code: "02-M-10", name: "Rain Water Isometric", stage: "ED", sectionCode: "ED-02-M", weight: 11, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-m-04-01", code: "02-M-11", name: "AC/HVAC Plan", stage: "ED", sectionCode: "ED-02-M", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-m-04-02", code: "02-M-12", name: "AC/HVAC Isometric", stage: "ED", sectionCode: "ED-02-M", weight: 16, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-m-04-03", code: "02-M-13", name: "Fire Protection Plan", stage: "ED", sectionCode: "ED-02-M", weight: 18, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    // Mechanical Total: 180

    // ========== ED-02-E: Electrical (180) ==========
    { id: "ed-02-e-00-01", code: "02-E-01", name: "Electrical Calculation", stage: "ED", sectionCode: "ED-02-E", weight: 27, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-e-00-02", code: "02-E-02", name: "Power Diagram (SLD)", stage: "ED", sectionCode: "ED-02-E", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-e-01-01", code: "02-E-03", name: "1st Floor Lighting Plan", stage: "ED", sectionCode: "ED-02-E", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-e-01-02", code: "02-E-04", name: "2nd Floor Lighting Plan", stage: "ED", sectionCode: "ED-02-E", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-e-02-01", code: "02-E-05", name: "1st Floor Power Plan", stage: "ED", sectionCode: "ED-02-E", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-e-02-02", code: "02-E-06", name: "2nd Floor Power Plan", stage: "ED", sectionCode: "ED-02-E", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },

    { id: "ed-02-e-03-01", code: "02-E-07", name: "Grounding Plan", stage: "ED", sectionCode: "ED-02-E", weight: 22, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-e-03-02", code: "02-E-08", name: "Electrical Detail", stage: "ED", sectionCode: "ED-02-E", weight: 21, priority: "high", schemaType: "DELIVERABLE_BASIC" },
    // Electrical Total: 180

    // ========== ED-02-P: Plumbing (180) ==========
    { id: "ed-02-p-01-01", code: "02-P-01", name: "Filter/Pump Detail", stage: "ED", sectionCode: "ED-02-P", weight: 36, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-p-01-02", code: "02-P-02", name: "Ground Tank Detail", stage: "ED", sectionCode: "ED-02-P", weight: 36, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-p-01-03", code: "02-P-03", name: "Septic Tank Detail", stage: "ED", sectionCode: "ED-02-P", weight: 36, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-p-01-04", code: "02-P-04", name: "Grease Trap Detail", stage: "ED", sectionCode: "ED-02-P", weight: 36, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    { id: "ed-02-p-01-05", code: "02-P-05", name: "Infiltration Well Detail", stage: "ED", sectionCode: "ED-02-P", weight: 36, priority: "medium", schemaType: "DELIVERABLE_BASIC" },
    // Plumbing Total: 180

    // ========== ED-03: Final Budget (180) ==========
    { id: "ed-03-01", code: "03-01", name: "Master Budget", stage: "ED", sectionCode: "ED-03", weight: 54, priority: "high", schemaType: "CURRENCY_RANGE", inputConfig: { currency: "IDR" } },
    { id: "ed-03-02", code: "03-02", name: "STR Budget", stage: "ED", sectionCode: "ED-03", weight: 42, priority: "medium", schemaType: "CURRENCY_RANGE", inputConfig: { currency: "IDR" } },
    { id: "ed-03-03", code: "03-03", name: "ARS Budget", stage: "ED", sectionCode: "ED-03", weight: 42, priority: "medium", schemaType: "CURRENCY_RANGE", inputConfig: { currency: "IDR" } },
    { id: "ed-03-04", code: "03-04", name: "MEP Budget", stage: "ED", sectionCode: "ED-03", weight: 42, priority: "medium", schemaType: "CURRENCY_RANGE", inputConfig: { currency: "IDR" } },
    // Budget Total: 180

    // ========== ED-04: Final Schedule (180) ==========
    { id: "ed-04-01", code: "04-01", name: "Master Schedule", stage: "ED", sectionCode: "ED-04", weight: 54, priority: "high", schemaType: "DATE_RANGE_WITH_DURATION" },
    { id: "ed-04-02", code: "04-02", name: "STR Schedule", stage: "ED", sectionCode: "ED-04", weight: 42, priority: "high", schemaType: "DATE_RANGE_WITH_DURATION" },
    { id: "ed-04-03", code: "04-03", name: "ARS Schedule", stage: "ED", sectionCode: "ED-04", weight: 42, priority: "high", schemaType: "DATE_RANGE_WITH_DURATION" },
    { id: "ed-04-04", code: "04-04", name: "MEP Schedule", stage: "ED", sectionCode: "ED-04", weight: 42, priority: "high", schemaType: "DATE_RANGE_WITH_DURATION" },
    // Schedule Total: 180

    // ========== ED-05: ED Approval (45) ==========
    { id: "ed-05-01", code: "05-01", name: "Internal Approval", stage: "ED", sectionCode: "ED-05", weight: 18, priority: "high", schemaType: "STATUS_WITH_NOTE" },
    { id: "ed-05-02", code: "05-02", name: "Client Approval", stage: "ED", sectionCode: "ED-05", weight: 22, priority: "urgent", schemaType: "STATUS_WITH_NOTE" },
    { id: "ed-05-03", code: "05-03", name: "Notes", stage: "ED", sectionCode: "ED-05", weight: 5, priority: "low", schemaType: "DESCRIPTION_ONLY" },
    // Approval Total: 45
];
// GRAND TOTAL: 2250

export function getEDTasksBySection(sectionCode: string): Task[] {
    return edTasks.filter(t => t.sectionCode === sectionCode);
}
