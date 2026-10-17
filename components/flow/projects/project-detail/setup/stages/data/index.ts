// Re-export all stage data for convenience
export * from "./stageConfig";
export * from "./ko";
export * from "./sd";
export * from "./dd";
export * from "./ed";
export * from "./pc";
export * from "./cn";
export * from "./ho";

// Combined helper to get tasks for any stage/section
import { koTasks, KO_SECTIONS } from "./ko";
import { sdTasks, SD_SECTIONS } from "./sd";
import { ddTasks, DD_SECTIONS } from "./dd";
import { edTasks, ED_SECTIONS } from "./ed";
import { pcTasks, PC_SECTIONS } from "./pc";
import { cnTasks, CN_SECTIONS } from "./cn";
import { hoTasks, HO_SECTIONS } from "./ho";

export const ALL_STAGE_DATA = {
    KO: { tasks: koTasks, sections: KO_SECTIONS },
    SD: { tasks: sdTasks, sections: SD_SECTIONS },
    DD: { tasks: ddTasks, sections: DD_SECTIONS },
    ED: { tasks: edTasks, sections: ED_SECTIONS },
    PC: { tasks: pcTasks, sections: PC_SECTIONS },
    CN: { tasks: cnTasks, sections: CN_SECTIONS },
    HO: { tasks: hoTasks, sections: HO_SECTIONS },
};

export type StageAbbreviation = keyof typeof ALL_STAGE_DATA;

export function getTasksForStage(stage: StageAbbreviation) {
    return ALL_STAGE_DATA[stage]?.tasks || [];
}

export function getSectionsForStage(stage: StageAbbreviation) {
    return ALL_STAGE_DATA[stage]?.sections || [];
}
