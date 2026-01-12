"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Project, ProjectStage, WBSItem, RABVersion, ScheduleVersion } from "@/types/project";
import {
    fetchProject,
    fetchProjectStages,
    fetchProjectWBS,
    fetchRABVersions,
    fetchScheduleVersions,
} from "@/lib/api/projects";

// ============================================
// CONTEXT TYPES
// ============================================

interface ProjectContextValue {
    // Project
    project: Project | null;
    isLoading: boolean;
    error: string | null;

    // Stages
    stages: ProjectStage[];
    selectedStageId: string | null;
    setSelectedStageId: (id: string | null) => void;
    currentStage: ProjectStage | null;

    // WBS
    wbsTree: WBSItem[];
    refreshWBS: () => Promise<void>;

    // RAB
    rabVersions: RABVersion[];
    currentRABVersion: RABVersion | null;

    // Schedule
    scheduleVersions: ScheduleVersion[];
    currentScheduleVersion: ScheduleVersion | null;

    // Helpers
    getStageByCode: (code: string) => ProjectStage | undefined;
    getStageByPosition: (position: number) => ProjectStage | undefined;
    refresh: () => Promise<void>;
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
    const [project, setProject] = useState<Project | null>(null);
    const [stages, setStages] = useState<ProjectStage[]>([]);
    const [wbsTree, setWbsTree] = useState<WBSItem[]>([]);
    const [rabVersions, setRabVersions] = useState<RABVersion[]>([]);
    const [scheduleVersions, setScheduleVersions] = useState<ScheduleVersion[]>([]);
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load project data
    const loadProject = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [projectData, stagesData, wbsData, rabData, scheduleData] = await Promise.all([
                fetchProject(projectId),
                fetchProjectStages(projectId),
                fetchProjectWBS(projectId),
                fetchRABVersions(projectId),
                fetchScheduleVersions(projectId),
            ]);

            if (!projectData) {
                setError("Project not found");
                return;
            }

            setProject(projectData);
            setStages(stagesData);
            setWbsTree(wbsData);
            setRabVersions(rabData);
            setScheduleVersions(scheduleData);

            // Set first active stage as selected
            const firstActive = stagesData.find((s) => s.isActive);
            if (firstActive && !selectedStageId) {
                setSelectedStageId(firstActive.id);
            }
        } catch (err) {
            setError("Failed to load project");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            loadProject();
        }
    }, [projectId]);

    // Refresh WBS only
    const refreshWBS = async () => {
        const wbsData = await fetchProjectWBS(projectId);
        setWbsTree(wbsData);
    };

    // Full refresh
    const refresh = async () => {
        await loadProject();
    };

    // Helpers
    const getStageByCode = (code: string) =>
        stages.find((s) => s.stageCode === code);

    const getStageByPosition = (position: number) =>
        stages.find((s) => s.position === position);

    const currentStage = selectedStageId
        ? stages.find((s) => s.id === selectedStageId) || null
        : null;

    const currentRABVersion = rabVersions.find((v) => !v.isLocked) || rabVersions[0] || null;
    const currentScheduleVersion = scheduleVersions.find((v) => !v.isLocked) || scheduleVersions[0] || null;

    const value: ProjectContextValue = {
        project,
        isLoading,
        error,
        stages,
        selectedStageId,
        setSelectedStageId,
        currentStage,
        wbsTree,
        refreshWBS,
        rabVersions,
        currentRABVersion,
        scheduleVersions,
        currentScheduleVersion,
        getStageByCode,
        getStageByPosition,
        refresh,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

// ============================================
// HOOKS
// ============================================

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error("useProject must be used within a ProjectProvider");
    }
    return context;
}

export function useProjectRequired() {
    const context = useProject();
    if (!context.project) {
        throw new Error("Project is not loaded");
    }
    return {
        ...context,
        project: context.project,
    };
}
