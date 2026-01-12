"use client";

/**
 * PROJECT CONTEXT
 * Root FE state for Flow module - SSOT from Supabase
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    ReactNode,
    useCallback,
} from "react";

// Repositories
import {
    fetchProject,
    fetchProjectBySlug,
    fetchProjectStages,
    fetchProjectWBS,
    fetchRABVersions,
    fetchScheduleVersions,
} from "@/lib/flow/repositories";

// Mappers
import { buildWBSTree, type WBSNode } from "@/lib/flow/mappers/wbs-tree";

// ============================================
// TYPES
// ============================================

type ProjectRow = Awaited<ReturnType<typeof fetchProject>>;
type StageRow = Awaited<ReturnType<typeof fetchProjectStages>>[number];
type RABVersionRow = Awaited<ReturnType<typeof fetchRABVersions>>[number];
type ScheduleVersionRow = Awaited<ReturnType<typeof fetchScheduleVersions>>[number];

interface ProjectContextValue {
    // State
    isLoading: boolean;
    error: string | null;

    // Project (root SSOT)
    project: ProjectRow | null;

    // Stages
    stages: StageRow[];
    selectedStageId: string | null;
    selectStage: (id: string | null) => void;
    currentStage: StageRow | null;

    // WBS Tree
    wbsTree: WBSNode[];

    // RAB
    rabVersions: RABVersionRow[];
    currentRABVersion: RABVersionRow | null;

    // Schedule
    scheduleVersions: ScheduleVersionRow[];
    currentScheduleVersion: ScheduleVersionRow | null;

    // Helpers
    getStageByCode: (code: string) => StageRow | undefined;
    getStageByPosition: (position: number) => StageRow | undefined;

    // Refresh
    refresh: () => Promise<void>;
    refreshWBS: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface ProjectProviderProps {
    projectId: string;
    children: ReactNode;
}

export function ProjectProvider({ projectId, children }: ProjectProviderProps) {
    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data
    const [project, setProject] = useState<ProjectRow | null>(null);
    const [stages, setStages] = useState<StageRow[]>([]);
    const [wbsRaw, setWbsRaw] = useState<any[]>([]);
    const [rabVersions, setRabVersions] = useState<RABVersionRow[]>([]);
    const [scheduleVersions, setScheduleVersions] = useState<ScheduleVersionRow[]>([]);

    // Selection
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

    // Build WBS tree
    const wbsTree = useMemo(() => buildWBSTree(wbsRaw), [wbsRaw]);

    // Load all project data
    const loadProject = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // First fetch project by slug to get UUID
            const projectData = await fetchProjectBySlug(projectId);

            if (!projectData) {
                setError("Project not found");
                return;
            }

            // Use project UUID for related data
            const realProjectId = projectData.id;

            const [stagesData, wbsData, rabData, scheduleData] =
                await Promise.all([
                    fetchProjectStages(realProjectId).catch(() => []),
                    fetchProjectWBS(realProjectId).catch(() => []),
                    fetchRABVersions(realProjectId).catch(() => []),
                    fetchScheduleVersions(realProjectId).catch(() => []),
                ]);

            setProject(projectData);
            setStages(stagesData);
            setWbsRaw(wbsData);
            setRabVersions(rabData);
            setScheduleVersions(scheduleData);

            // Auto-select first active stage
            if (!selectedStageId && stagesData.length > 0) {
                const firstActive = stagesData.find((s) => s.is_active) || stagesData[0];
                setSelectedStageId(firstActive.id);
            }
        } catch (err: any) {
            setError(err?.message || "Failed to load project");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, selectedStageId]);

    // Initial load
    useEffect(() => {
        if (projectId) {
            loadProject();
        }
    }, [projectId, loadProject]);

    // Refresh WBS only
    const refreshWBS = useCallback(async () => {
        try {
            const wbsData = await fetchProjectWBS(projectId);
            setWbsRaw(wbsData);
        } catch (err) {
            console.error("Failed to refresh WBS:", err);
        }
    }, [projectId]);

    // Helpers
    const getStageByCode = useCallback(
        (code: string) => stages.find((s) => s.stage_code === code),
        [stages]
    );

    const getStageByPosition = useCallback(
        (position: number) => stages.find((s) => s.position === position),
        [stages]
    );

    const currentStage = useMemo(
        () => stages.find((s) => s.id === selectedStageId) || null,
        [stages, selectedStageId]
    );

    const currentRABVersion = useMemo(
        () => rabVersions.find((v) => !v.is_locked) || rabVersions[0] || null,
        [rabVersions]
    );

    const currentScheduleVersion = useMemo(
        () => scheduleVersions.find((v) => !v.is_locked) || scheduleVersions[0] || null,
        [scheduleVersions]
    );

    // Context value
    const value: ProjectContextValue = {
        isLoading,
        error,
        project,
        stages,
        selectedStageId,
        selectStage: setSelectedStageId,
        currentStage,
        wbsTree,
        rabVersions,
        currentRABVersion,
        scheduleVersions,
        currentScheduleVersion,
        getStageByCode,
        getStageByPosition,
        refresh: loadProject,
        refreshWBS,
    };

    return (
        <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
    );
}

// ============================================
// HOOKS
// ============================================

export function useProject() {
    const ctx = useContext(ProjectContext);
    if (!ctx) {
        throw new Error("useProject must be used within ProjectProvider");
    }
    return ctx;
}

/**
 * Hook that requires project to be loaded
 */
export function useProjectRequired() {
    const ctx = useProject();

    if (ctx.isLoading) {
        throw new Error("Project is still loading");
    }

    if (ctx.error) {
        throw new Error(ctx.error);
    }

    if (!ctx.project) {
        throw new Error("Project not found");
    }

    return {
        ...ctx,
        project: ctx.project,
    };
}

/**
 * Hook to get current stage
 */
export function useCurrentStage() {
    const { currentStage, stages, selectedStageId, selectStage } = useProject();
    return { currentStage, stages, selectedStageId, selectStage };
}

/**
 * Hook to get WBS tree
 */
export function useWBSTree() {
    const { wbsTree, refreshWBS, isLoading } = useProject();
    return { wbsTree, refreshWBS, isLoading };
}
