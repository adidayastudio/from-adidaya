export interface TableColumn {
    id: string;
    label: string;
    width?: string;
    format?: "string" | "number" | "currency" | "date" | "initials";
    align?: "left" | "right" | "center";
}

export interface SummaryCard {
    label: string;
    value: string | number;
    format?: "currency" | "number" | "string";
    color?: "default" | "blue" | "red" | "green";
}

export interface PdfExportPayload {
    meta: {
        projectCode: string;
        projectName: string;
        documentName: string;
        periodText: string; // e.g., "Week 2 (06 Jan - 12 Jan)"
        generatedAt: string;
    };
    summary: SummaryCard[];
    columns: TableColumn[];
    data: any[]; // Raw row data
}
