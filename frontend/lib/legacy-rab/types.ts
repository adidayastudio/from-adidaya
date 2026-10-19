export interface RABRowData {
 id: string; rowIdx: number; no: string; code: string; title: string;
 volume: number; unit: string; unitPrice: number; isSection?: boolean;
}
export interface ProjectV3Info {
 projectId?: string; projectName?: string; projectCode?: string;
 buildingArea?: number; buildingClass?: 'A' | 'B' | 'C' | 'D';
 rabExcludedCodes?: string[]; estimateValues?: Record<string, any>; wbsTree?: any[]; stage?: string;
}
