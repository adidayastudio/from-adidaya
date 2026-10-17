export type QuickView = "all" | "documentation" | "templates" | "references" | "recent" | "favorite";

export type Department = "ALL" | "AID" | "SMP" | "UDL" | "HFR" | "PCC" | "RBD";

export const DOCUMENTATION_TYPES = ["SOP", "WORKFLOW", "GUIDELINE", "POLICY", "STANDARD", "CHECKLIST"] as const;
export const TEMPLATE_TYPES = ["TEMPLATE_PPT", "TEMPLATE_RAB", "TEMPLATE_DRAWING", "TEMPLATE_CONTRACT", "TEMPLATE_REPORT"] as const;
export const REFERENCE_TYPES = ["VIDEO", "PHOTO", "DESIGN_REF", "MATERIAL_CATALOG", "VENDOR_LIST", "PRICE_REF"] as const;

export type KnowledgeType = typeof DOCUMENTATION_TYPES[number] | typeof TEMPLATE_TYPES[number] | typeof REFERENCE_TYPES[number];

export const DEPARTMENT_OPTIONS: { value: Department; label: string }[] = [
    { value: "ALL", label: "All Departments" },
    { value: "AID", label: "Architecture, Interior, and Design" },
    { value: "SMP", label: "Structure and MEP Engineering" },
    { value: "UDL", label: "Urban Design and Landscape" },
    { value: "HFR", label: "Human Capital, Finance, and Resources" },
    { value: "PCC", label: "Procurement and Construction" },
    { value: "RBD", label: "Research and Business Development" },
];

export const DEPT_LABEL: Record<string, string> = {
    AID: "Architecture, Interior, and Design",
    SMP: "Structure and MEP Engineering",
    UDL: "Urban Design and Landscape",
    HFR: "Human Capital, Finance, and Resources",
    PCC: "Procurement and Construction",
    RBD: "Research and Business Development",
};

export const TYPE_LABEL: Record<string, string> = {
    SOP: "SOP",
    WORKFLOW: "Workflow",
    GUIDELINE: "Guideline",
    POLICY: "Policy",
    STANDARD: "Standard",
    CHECKLIST: "Checklist",
    TEMPLATE_PPT: "PPT Template",
    TEMPLATE_RAB: "RAB Template",
    TEMPLATE_DRAWING: "Drawing Template",
    TEMPLATE_CONTRACT: "Contract Template",
    TEMPLATE_REPORT: "Report Template",
    VIDEO: "Video",
    PHOTO: "Photo",
    DESIGN_REF: "Design Ref",
    MATERIAL_CATALOG: "Material Catalog",
    VENDOR_LIST: "Vendor List",
    PRICE_REF: "Price Ref",
};

export function getTypeLabel(type: string): string {
    return TYPE_LABEL[type] || type;
}

export function getTypeOptions(quickView: QuickView): { value: KnowledgeType | "ALL"; label: string }[] {
    const options: { value: KnowledgeType | "ALL"; label: string }[] = [{ value: "ALL", label: "All Types" }];

    if (quickView === "all" || quickView === "recent" || quickView === "favorite") {
        DOCUMENTATION_TYPES.forEach(t => options.push({ value: t, label: getTypeLabel(t) }));
        TEMPLATE_TYPES.forEach(t => options.push({ value: t, label: getTypeLabel(t) }));
        REFERENCE_TYPES.forEach(t => options.push({ value: t, label: getTypeLabel(t) }));
    } else if (quickView === "documentation") {
        DOCUMENTATION_TYPES.forEach(t => options.push({ value: t, label: getTypeLabel(t) }));
    } else if (quickView === "templates") {
        TEMPLATE_TYPES.forEach(t => options.push({ value: t, label: getTypeLabel(t) }));
    } else if (quickView === "references") {
        REFERENCE_TYPES.forEach(t => options.push({ value: t, label: getTypeLabel(t) }));
    }

    return options;
}

export type SortOptionValue = "name-asc" | "name-desc" | "date-desc" | "date-asc";

export const SORT_OPTIONS: { value: SortOptionValue; label: string }[] = [
    { value: "name-asc", label: "Name (A to Z)" },
    { value: "name-desc", label: "Name (Z to A)" },
    { value: "date-desc", label: "Newest First" },
    { value: "date-asc", label: "Oldest First" },
];
