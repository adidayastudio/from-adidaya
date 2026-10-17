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
    color?: "default" | "blue" | "red" | "green" | "orange" | "neutral";
}

export interface PdfSection {
    title: string;
    columns: TableColumn[];
    data: any[];
}

export interface ChartDataPoint {
    label: string;
    amount: number;
}

export interface ChartBarItem {
    label: string;
    value: number;
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
    /** Optional: trend line data for expense chart */
    trendData?: ChartDataPoint[];
    /** Optional: category breakdown for bar chart */
    categoryData?: ChartBarItem[];
}
