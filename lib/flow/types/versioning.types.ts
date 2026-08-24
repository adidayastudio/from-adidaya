export type ModuleType = "wbs" | "volume" | "rab" | "schedule";
export type WBSStage = "BALLPARK" | "ESTIMATES" | "DETAIL";

export type ProjectVersion = {
  id: string;
  projectId: string;
  moduleType: ModuleType;
  stage: WBSStage;
  versionCode: string; // e.g. "v1.0", "v2.0"
  name: string; // e.g. "Initial Baseline", "Approved Client", "Internal Revision"
  description?: string;
  sourceVersionId?: string | null;
  sourceVersionCode?: string | null;
  sourceVersionName?: string | null;
  treeData?: any[];
  metaData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type StageSummary = {
  stage: WBSStage;
  activeVersion?: ProjectVersion;
  availableVersions: ProjectVersion[];
  itemCount: number;
  totalCost: number;
  pricePerSqm?: number;
};
