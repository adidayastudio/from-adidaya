export interface WBSItem {
    id: string;
    code: string;
    nameEn: string;
    nameId?: string;
    unit?: string;
    unitPrice?: number;
    children?: WBSItem[];
    indent_level?: number;
    parent_id?: string | null;
    sort_order?: number;
    level?: string;
}

export type WBSView = "SUMMARY" | "BREAKDOWN";
export type WBSMode = "BALLPARK" | "ESTIMATES" | "DETAIL";
