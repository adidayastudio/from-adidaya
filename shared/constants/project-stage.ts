/**
 * PROJECT STAGE CONSTANTS (SSOT)
 * Re-exports from unified types for backward compatibility
 */

import { STAGE_TEMPLATES, type StageCode } from "@/types/project";

export type ProjectStage = Lowercase<StageCode>;

// For backward compatibility with existing code using lowercase
export const PROJECT_STAGE_ORDER: Record<ProjectStage, number> = {
  ko: 1,
  sd: 2,
  dd: 3,
  ed: 4,
  pc: 5,
  cn: 6,
  ho: 7,
};

export const PROJECT_STAGE_LABEL: Record<ProjectStage, string> = {
  ko: "01—Kick Off (KO)",
  sd: "02—Schematic Design (SD)",
  dd: "03—Design Development (DD)",
  ed: "04—Engineering Design (ED)",
  pc: "05—Procurement (PC)",
  cn: "06—Construction (CN)",
  ho: "07—Hand Over (HO)",
};

export const PROJECT_STAGE_LABEL_SHORT: Record<ProjectStage, string> = {
  ko: "01-KO",
  sd: "02-SD",
  dd: "03-DD",
  ed: "04-ED",
  pc: "05-PC",
  cn: "06-CN",
  ho: "07-HO",
};

// Array format for iteration
export const PROJECT_STAGES = STAGE_TEMPLATES["design-build"].map((s) => ({
  key: s.code.toLowerCase() as ProjectStage,
  label: s.name,
  displayCode: s.displayCode,
}));

// Helper to convert between formats
export function stageCodeToLower(code: string): ProjectStage {
  return code.toLowerCase().replace(/^\d+-/, "") as ProjectStage;
}

export function stageCodeToDisplay(code: ProjectStage): string {
  return PROJECT_STAGE_LABEL_SHORT[code] || code.toUpperCase();
}