export interface StageTemplate {
    id: string;
    workspaceId: string;
    projectTypeId: string;
    codeNumber: string; // e.g. "01"
    codeAbbr: string;   // e.g. "KO"
    stageName: string; // EN
    stageNameId: string; // ID
    category: "Design" | "Tender" | "Construction" | "Handover";
    position: number;
    weightDefault: number;
    isActive: boolean;
    description?: string;
    rules?: any;
    createdAt?: string;
    updatedAt?: string;
}

export const DUMMY_STAGES: StageTemplate[] = [
    {
        id: "1",
        workspaceId: "ws-01",
        projectTypeId: "pt-01",
        codeNumber: "01",
        codeAbbr: "KO",
        stageName: "Kickoff",
        stageNameId: "Kickoff",
        category: "Design",
        position: 1,
        weightDefault: 5,
        isActive: true
    },
    {
        id: "2",
        workspaceId: "ws-01",
        projectTypeId: "pt-01",
        codeNumber: "02",
        codeAbbr: "SD",
        stageName: "Schematic Design",
        stageNameId: "Desain Skematik",
        category: "Design",
        position: 2,
        weightDefault: 15,
        isActive: true
    },
    {
        id: "3",
        workspaceId: "ws-01",
        projectTypeId: "pt-01",
        codeNumber: "03",
        codeAbbr: "DD",
        stageName: "Design Development",
        stageNameId: "Pengembangan Desain",
        category: "Design",
        position: 3,
        weightDefault: 20,
        isActive: true
    },
    {
        id: "7",
        workspaceId: "ws-01",
        projectTypeId: "pt-01",
        codeNumber: "04",
        codeAbbr: "ED",
        stageName: "Engineering Design",
        stageNameId: "Desain Teknis",
        category: "Design",
        position: 4,
        weightDefault: 15,
        isActive: true
    },
    {
        id: "4",
        workspaceId: "ws-01",
        projectTypeId: "pt-01",
        codeNumber: "05",
        codeAbbr: "PC",
        stageName: "Procurement",
        stageNameId: "Pengadaan",
        category: "Tender",
        position: 5,
        weightDefault: 10,
        isActive: true
    },
    {
        id: "5",
        workspaceId: "ws-01",
        projectTypeId: "pt-01",
        codeNumber: "06",
        codeAbbr: "CN",
        stageName: "Construction",
        stageNameId: "Konstruksi",
        category: "Construction",
        position: 6,
        weightDefault: 30,
        isActive: true
    },
    {
        id: "6",
        workspaceId: "ws-01",
        projectTypeId: "pt-01",
        codeNumber: "07",
        codeAbbr: "HO",
        stageName: "Handover",
        stageNameId: "Serah Terima",
        category: "Handover",
        position: 7,
        weightDefault: 5,
        isActive: true
    }
];
