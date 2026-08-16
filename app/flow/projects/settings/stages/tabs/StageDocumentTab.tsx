"use client";

import { useState, useEffect } from "react";
import { Save, RotateCcw } from "lucide-react";
import KickoffFormEditor from "@/components/flow/projects/project-detail/tasks/KickoffFormEditor";
import KickoffDocumentPreview from "@/components/flow/projects/project-detail/tasks/KickoffDocumentPreview";
import { defaultKickoffData } from "@/components/flow/projects/project-detail/tasks/defaultKickoffData";
import { KickoffDocumentData } from "@/components/flow/projects/project-detail/tasks/types";
import { fetchStageTemplates } from "@/lib/api/templates";
import { fetchStageSectionTemplates, fetchStageTaskTemplates } from "@/lib/api/templates-extended";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

import { KO_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/ko";
import { SD_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/sd";
import { DD_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/dd";
import { ED_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/ed";
import { PC_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/pc";
import { CN_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/cn";
import { HO_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/ho";

type StageKey = "KO" | "SD" | "DD" | "ED" | "PC" | "CN" | "HO";

const STAGE_SECTIONS_MAP: Record<StageKey, { code: string; title: string }[]> = {
    KO: KO_SECTIONS,
    SD: SD_SECTIONS,
    DD: DD_SECTIONS,
    ED: ED_SECTIONS,
    PC: PC_SECTIONS,
    CN: CN_SECTIONS,
    HO: HO_SECTIONS,
};

const STAGE_TABS: { key: StageKey; label: string }[] = [
    { key: "KO", label: "KO" },
    { key: "SD", label: "SD" },
    { key: "DD", label: "DD" },
    { key: "ED", label: "ED" },
    { key: "PC", label: "PC" },
    { key: "CN", label: "CN" },
    { key: "HO", label: "HO" },
];

const STORAGE_KEY = "doc_template_";

interface Props {
    workspaceId: string;
    projectTypeId: string;
    setHeaderActions?: (node: React.ReactNode) => void;
}

export default function StageDocumentTab({ workspaceId, projectTypeId, setHeaderActions }: Props) {
    const searchParams = useSearchParams();
    const [activeStage, setActiveStage] = useState<StageKey>("KO");
    const [activeSection, setActiveSection] = useState<string>("KO-01");
    const [activeSubTask, setActiveSubTask] = useState<string>("01-01");

    useEffect(() => {
        const stageParam = searchParams.get("stage")?.toUpperCase() as StageKey | null;
        if (stageParam && ["KO", "SD", "DD", "ED", "PC", "CN", "HO"].includes(stageParam)) {
            setActiveStage(stageParam);
            setActiveSection(`${stageParam}-01`);
        }
    }, [searchParams]);

    const [dynamicSections, setDynamicSections] = useState<{ code: string; title: string }[]>([]);
    const [dynamicTasks, setDynamicTasks] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveToast, setSaveToast] = useState(false);

    // Document template data per stage
    const [templateData, setTemplateData] = useState<KickoffDocumentData>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`${STORAGE_KEY}KO`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.projectName?.includes("Nama Proyek")) parsed.projectName = "[Project Name]";
                    if (parsed.projectLocation?.includes("Lokasi Proyek")) parsed.projectLocation = "[Project Location]";
                    return parsed;
                } catch {}
            }
        }
        return { ...defaultKickoffData };
    });

    // Fetch saved sections & tasks from Supabase DB (with fallback to seed data)
    useEffect(() => {
        let isMounted = true;
        const loadCustomStageConfig = async () => {
            if (!projectTypeId) {
                const seedSecs = STAGE_SECTIONS_MAP[activeStage] || KO_SECTIONS;
                setDynamicSections(seedSecs);
                setDynamicTasks([]);
                return;
            }
            setIsLoadingData(true);
            try {
                const stages = await fetchStageTemplates(workspaceId, projectTypeId);
                const stageModel = stages.find(s => s.stageCode === activeStage || (s as any).code === activeStage || s.stageName.toUpperCase().startsWith(activeStage));

                if (stageModel && stageModel.id) {
                    const [dbSections, dbTasks] = await Promise.all([
                        fetchStageSectionTemplates(stageModel.id),
                        fetchStageTaskTemplates(stageModel.id)
                    ]);

                    console.log("[StageDocTab] Fetched for stage:", activeStage, "stageId:", stageModel.id, "dbSections:", dbSections.length, "dbTasks:", dbTasks.length);

                    if (isMounted) {
                        const sortedSections = dbSections.length > 0 
                            ? [...dbSections].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                            : [];
                        
                        const uiSections = sortedSections.length > 0
                            ? sortedSections.map(s => ({
                                id: s.id,
                                code: s.sectionCode,
                                title: s.sectionName
                              }))
                            : (STAGE_SECTIONS_MAP[activeStage] || KO_SECTIONS);

                        // Build sectionMap strictly from dbSections ID to sectionCode
                        const sectionMap = new Map(dbSections.map(s => [s.id, s.sectionCode]));

                        let mappedTasks = dbTasks.map(t => {
                            const resolvedSectionCode = sectionMap.get(t.sectionId || "") || (t as any).sectionCode;
                            return {
                                ...t,
                                id: t.id,
                                name: t.taskName,
                                taskName: t.taskName,
                                taskNameId: (t as any).taskNameId || t.taskName,
                                sectionCode: resolvedSectionCode,
                                sectionId: t.sectionId
                            };
                        });

                        // Check if local un-saved draft exists in localStorage for immediate sync
                        if (typeof window !== "undefined") {
                            const localDraft = localStorage.getItem(`tasks_draft_${activeStage}`);
                            if (localDraft) {
                                try {
                                    const parsedDraft = JSON.parse(localDraft);
                                    if (Array.isArray(parsedDraft) && parsedDraft.length > 0) {
                                        mappedTasks = parsedDraft;
                                        console.log("[StageDocTab] Loaded un-saved draft from localStorage:", mappedTasks.length);
                                    }
                                } catch {}
                            }
                        }

                        setDynamicSections(uiSections);
                        setDynamicTasks(mappedTasks);
                        if (uiSections.length > 0 && !activeSection) {
                            setActiveSection(uiSections[0].code);
                        }
                        setIsLoadingData(false);
                        return;
                    }
                }
            } catch (e) {
                // Graceful fallback without noisy error log
            }

            // Fallback to static seed data if DB is empty or fails
            if (isMounted) {
                const seedSecs = STAGE_SECTIONS_MAP[activeStage] || KO_SECTIONS;
                setDynamicSections(seedSecs);
                setDynamicTasks([]);
                if (seedSecs.length > 0) {
                    setActiveSection(seedSecs[0].code);
                }
                setIsLoadingData(false);
            }
        };

        loadCustomStageConfig();

        if (activeStage === "KO") {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem(`${STORAGE_KEY}KO`);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed.projectName?.includes("Nama Proyek")) parsed.projectName = "[Project Name]";
                        if (parsed.projectLocation?.includes("Lokasi Proyek")) parsed.projectLocation = "[Project Location]";
                        setTemplateData(parsed);
                        return;
                    } catch {}
                }
            }
            setTemplateData({ ...defaultKickoffData });
        }

        return () => { isMounted = false; };
    }, [activeStage, workspaceId, projectTypeId]);

    const stageSections = dynamicSections.length > 0 ? dynamicSections : (STAGE_SECTIONS_MAP[activeStage] || KO_SECTIONS);

    // Handle data changes
    const handleDataChange = (newData: KickoffDocumentData) => {
        setTemplateData(newData);
        setIsDirty(true);
    };

    // Save template to localStorage
    const handleSave = () => {
        setIsSaving(true);
        try {
            localStorage.setItem(`${STORAGE_KEY}${activeStage}`, JSON.stringify(templateData));
            setIsDirty(false);
            setSaveToast(true);
            setTimeout(() => setSaveToast(false), 2000);
        } catch (e) {
            console.error("Save failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    // Reset to default
    const handleReset = () => {
        if (activeStage === "KO") {
            setTemplateData({ ...defaultKickoffData });
            localStorage.removeItem(`${STORAGE_KEY}KO`);
            setIsDirty(false);
        }
    };

    // Sync header actions
    useEffect(() => {
        if (setHeaderActions) {
            setHeaderActions(
                <div className="flex items-center gap-2">
                    {/* STAGE PILLS */}
                    <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-full">
                        {STAGE_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveStage(tab.key)}
                                className={clsx(
                                    "px-3 py-1 text-xs font-bold rounded-full transition-all",
                                    activeStage === tab.key
                                        ? "bg-brand-red text-white shadow-sm"
                                        : "text-neutral-500 hover:text-neutral-800 hover:bg-white/60"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />

                    {/* RESET */}
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-full transition-all shadow-2xs"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                    </button>

                    {/* SAVE */}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className={clsx(
                            "flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full transition-all shadow-2xs",
                            isDirty
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                        )}
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{saveToast ? "Saved ✓" : isSaving ? "Saving..." : "Save Config"}</span>
                    </button>
                </div>
            );
        }
    }, [setHeaderActions, activeStage, isDirty, isSaving, saveToast]);

    // For non-KO stages, show placeholder
    if (activeStage !== "KO") {
        return (
            <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl p-12 rounded-2xl border border-white/40 dark:border-white/10 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                    <span className="text-xl font-bold">{activeStage}</span>
                </div>
                <h4 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                    Document Template — Stage {activeStage}
                </h4>
                <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                    Template dokumen untuk stage <strong>{activeStage}</strong> akan tersedia setelah format deliverable standar ditentukan. Saat ini tersedia untuk <strong>01-KO Kickoff</strong>.
                </p>
                <button
                    onClick={() => setActiveStage("KO")}
                    className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-xs"
                >
                    Buka Template KO
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* FULL WIDTH SECTION TABS NAVIGATION (DYNAMICALLY LOADED FROM TASK TEMPLATES) */}
            <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-2 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none p-1">
                  {stageSections.map((sec) => {
                        const secNum = sec.code.replace(/^[A-Z]{2}-/, "");
                        const isActive = activeSection === sec.code;
                        return (
                            <button
                                key={sec.code}
                                onClick={() => {
                                    setActiveSection(sec.code);
                                    setActiveSubTask("");
                                }}
                                className={clsx(
                                    "shrink-0 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                                    isActive
                                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                                        : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700/80 hover:bg-blue-50/50 hover:text-blue-600 hover:border-blue-200"
                                )}
                            >
                                <span className={clsx(
                                    "font-mono text-[11px] font-black px-1.5 py-0.5 rounded-md",
                                    isActive ? "bg-white/20 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-500"
                                )}>
                                    {secNum}
                                </span>
                                <span className="whitespace-nowrap">{sec.title}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT PANEL: FORM EDITOR (COL-SPAN-5) */}
                <div className="lg:col-span-5">
                    <KickoffFormEditor
                        data={templateData}
                        onChange={handleDataChange}
                        activeSection={activeSection}
                        onSectionChange={setActiveSection}
                        onActiveTaskChange={setActiveSubTask}
                        customSections={stageSections}
                        customTasks={dynamicTasks}
                    />
                </div>

                {/* RIGHT PANEL: LIVE REPORT PREVIEW (COL-SPAN-7) */}
                <div className="lg:col-span-7">
                    <KickoffDocumentPreview
                        data={templateData}
                        activeSection={activeSection}
                        activeSubTask={activeSubTask}
                        customSections={stageSections}
                        customTasks={dynamicTasks}
                    />
                </div>
            </div>
        </div>
    );
}
