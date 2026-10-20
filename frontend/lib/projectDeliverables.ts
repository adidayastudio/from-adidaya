import { ALL_STAGE_DATA, StageAbbreviation } from './legacy-stages/data';
import { supabase } from './supabase';

export interface StageInfo {
    id: StageAbbreviation;
    code: string; // e.g. '01-KO'
    name: string; // e.g. 'Kickoff'
    fullName: string; // e.g. '01-KO Kickoff'
    color: string;
    sections: { code: string; title: string; weight: number }[];
    tasks: { id: string; code: string; name: string; nameId?: string; sectionCode: string; weight: number; priority?: string }[];
}

export const STAGE_DEFINITIONS: { id: StageAbbreviation; code: string; name: string; color: string }[] = [
    { id: 'KO', code: '01-KO', name: 'Kickoff', color: '#10B981' },
    { id: 'SD', code: '02-SD', name: 'Schematic Design', color: '#3B82F6' },
    { id: 'DD', code: '03-DD', name: 'Detailed Design', color: '#8B5CF6' },
    { id: 'ED', code: '04-ED', name: 'Engineering Design', color: '#F59E0B' },
    { id: 'PC', code: '05-PC', name: 'Procurement', color: '#EC4899' },
    { id: 'CN', code: '06-CN', name: 'Construction', color: '#EF4444' },
    { id: 'HO', code: '07-HO', name: 'Handover', color: '#06B6D4' },
];

export function getProjectStageList(projectMeta: any): StageInfo[] {
    const customLayouts = projectMeta?.stageWorkLayouts || {};

    return STAGE_DEFINITIONS.map(def => {
        const source = ALL_STAGE_DATA[def.id] || { sections: [], tasks: [] };
        const savedLayout = customLayouts[def.id] || customLayouts[def.code];

        const sections = savedLayout?.sections?.length ? savedLayout.sections : source.sections;
        const tasks = savedLayout?.tasks?.length ? savedLayout.tasks : source.tasks;

        return {
            id: def.id,
            code: def.code,
            name: def.name,
            fullName: `${def.code} ${def.name}`,
            color: def.color,
            sections,
            tasks,
        };
    });
}

export interface DeliverablesProgress {
    overallPercent: number;
    readyStagesCount: number;
    totalStagesCount: number;
    completedItemsCount: number;
    totalItemsCount: number;
    activeStageCode: string;
    stageProgress: Record<string, {
        total: number;
        completed: number;
        percent: number;
        isReady: boolean;
        subDeliverableStatus: Record<string, boolean>; // sectionCode -> isCompleted
    }>;
}

export function calculateDeliverablesProgress(
    stages: StageInfo[],
    deliverablesData: Record<string, any> = {}
): DeliverablesProgress {
    let totalItems = 0;
    let completedItems = 0;
    let readyStages = 0;
    const stageProgress: DeliverablesProgress['stageProgress'] = {};
    let activeStageCode = '01-KO';

    stages.forEach((stage, sIdx) => {
        const stageData = deliverablesData[stage.code] || deliverablesData[stage.id] || {};
        const completedTaskIds = new Set(stageData.completedTasks || []);

        const subDeliverableStatus: Record<string, boolean> = {};

        // A section is completed if marked explicitly or if all its tasks are completed
        stage.sections.forEach(sec => {
            const secTasks = stage.tasks.filter(t => t.sectionCode === sec.code);
            const isCompleted = stageData.completedSections?.[sec.code] ||
                (secTasks.length > 0 && secTasks.every(t => completedTaskIds.has(t.id || t.code)));
            subDeliverableStatus[sec.code] = !!isCompleted;
        });

        const totalSections = stage.sections.length;
        const completedSections = Object.values(subDeliverableStatus).filter(Boolean).length;
        const percent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
        const isReady = percent === 100;

        if (isReady) readyStages += 1;
        totalItems += totalSections;
        completedItems += completedSections;

        stageProgress[stage.code] = {
            total: totalSections,
            completed: completedSections,
            percent,
            isReady,
            subDeliverableStatus
        };

        // Pick first incomplete stage as active stage
        if (!isReady && activeStageCode === '01-KO' && sIdx > 0) {
            activeStageCode = stage.code;
        }
    });

    const overallPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
        overallPercent,
        readyStagesCount: readyStages,
        totalStagesCount: stages.length,
        completedItemsCount: completedItems,
        totalItemsCount: totalItems,
        activeStageCode,
        stageProgress
    };
}

export async function saveStageDeliverableData(
    projectId: string,
    stageCode: string,
    data: {
        completedSections?: Record<string, boolean>;
        completedTasks?: string[];
        pageContent?: Record<string, any>;
        tableOfContents?: any[];
    }
): Promise<any> {
    const { data: current, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (error) throw error;
    const meta = current?.meta || {};

    const existingDeliverables = meta.stageDeliverables || {};
    const existingStageData = existingDeliverables[stageCode] || {};

    const nextMeta = {
        ...meta,
        stageDeliverables: {
            ...existingDeliverables,
            [stageCode]: {
                ...existingStageData,
                ...data,
                completedSections: {
                    ...(existingStageData.completedSections || {}),
                    ...(data.completedSections || {})
                },
                completedTasks: Array.from(new Set([
                    ...(existingStageData.completedTasks || []),
                    ...(data.completedTasks || [])
                ])),
                pageContent: {
                    ...(existingStageData.pageContent || {}),
                    ...(data.pageContent || {})
                },
                lastSavedAt: new Date().toISOString()
            }
        }
    };

    const { data: saved, error: updateError } = await supabase
        .from('projects')
        .update({ meta: nextMeta })
        .eq('id', projectId)
        .select('meta')
        .single();

    if (updateError || !saved) {
        throw new Error(updateError?.message || 'Failed to save deliverable data');
    }

    return saved.meta;
}
