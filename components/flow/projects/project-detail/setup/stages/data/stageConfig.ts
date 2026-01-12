/**
 * STAGE CONFIGURATION
 * Now imports from SSOT types - no more hardcoded duplicates
 */

import { STAGE_TEMPLATES, getStagesForProjectType, type StageTemplate, type ProjectType } from "@/types/project";

// Re-export for backward compatibility
export type { StageTemplate as StageConfig };
export { STAGE_TEMPLATES, getStagesForProjectType };

// Alias for existing code that uses old naming
export const STAGES_DESIGN_BUILD = STAGE_TEMPLATES["design-build"];
export const STAGES_DESIGN_ONLY = STAGE_TEMPLATES["design-only"];
export const STAGES_BUILD_ONLY = STAGE_TEMPLATES["build-only"];

/**
 * Get stage template by code
 */
export function getStageTemplate(code: string, projectType: ProjectType = "design-build"): StageTemplate | undefined {
    const stages = getStagesForProjectType(projectType);
    return stages.find((s) => s.code === code || s.displayCode === code);
}

/**
 * Get stage display label
 */
export function getStageLabel(code: string, projectType: ProjectType = "design-build"): string {
    const stage = getStageTemplate(code, projectType);
    return stage ? `${stage.displayCode} (${stage.name})` : code;
}

/**
 * Get all stage options for select/dropdown
 */
export function getStageOptions(projectType: ProjectType = "design-build"): { value: string; label: string }[] {
    const stages = getStagesForProjectType(projectType);
    return stages.map((s) => ({
        value: s.code,
        label: `${s.displayCode} (${s.name})`,
    }));
}
