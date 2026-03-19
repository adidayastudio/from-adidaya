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

export interface PdfSection {
    title: string;
    columns: TableColumn[];
    data: any[];
}

export interface PdfExportPayload {
    meta: {
        projectCode: string;
        projectName: string;
        documentName: string;
        periodText: string;
        generatedAt: string;
    };
    summary: SummaryCard[];
    sections: PdfSection[];
}
