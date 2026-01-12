import { useState, useCallback, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Save, Plus, RotateCcw } from "lucide-react";

import TaskSection from "@/components/flow/projects/project-detail/setup/stages/sections/TaskSection";
import TaskTable from "@/components/flow/projects/project-detail/setup/stages/sections/TaskTable";
import TaskDetailDrawer from "@/components/flow/projects/project-detail/setup/stages/TaskDetailDrawer";


import {
    fetchStageSectionTemplates,
    fetchStageTaskTemplates,
    bulkUpdateStageSections,
    bulkUpdateStageTasks,
    StageTaskTemplate,
    StageSectionTemplate
} from "@/lib/api/templates-extended";
import {
    fetchStageTemplates,
    StageTemplate // Import Type
} from "@/lib/api/templates";

import { Task, StageKey } from "@/components/flow/projects/project-detail/setup/stages/types";

// Import Initial Seed Data
import { KO_SECTIONS, koTasks } from "@/components/flow/projects/project-detail/setup/stages/data/ko";
import { SD_SECTIONS, sdTasks } from "@/components/flow/projects/project-detail/setup/stages/data/sd";
import { DD_SECTIONS, ddTasks } from "@/components/flow/projects/project-detail/setup/stages/data/dd";
import { ED_SECTIONS, edTasks } from "@/components/flow/projects/project-detail/setup/stages/data/ed";
import { PC_SECTIONS, pcTasks } from "@/components/flow/projects/project-detail/setup/stages/data/pc";
import { CN_SECTIONS, cnTasks } from "@/components/flow/projects/project-detail/setup/stages/data/cn";
import { HO_SECTIONS, hoTasks } from "@/components/flow/projects/project-detail/setup/stages/data/ho";

const SEED_DATA: Record<string, { sections: typeof KO_SECTIONS, tasks: Task[] }> = {
    "KO": { sections: KO_SECTIONS, tasks: koTasks },
    "SD": { sections: SD_SECTIONS, tasks: sdTasks },
    "DD": { sections: DD_SECTIONS, tasks: ddTasks },
    "ED": { sections: ED_SECTIONS, tasks: edTasks },
    "PC": { sections: PC_SECTIONS, tasks: pcTasks },
    "CN": { sections: CN_SECTIONS, tasks: cnTasks },
    "HO": { sections: HO_SECTIONS, tasks: hoTasks },
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

// Helper: Build Tree from Flat List, Renumber, then Flatten again
// Moved outside component to be accessible in useEffect
const recomputeHierarchy = (tasks: Task[], sectionCode: string): Task[] => {
    const rootTasks = tasks.filter(t => !t.parentId);
    // Note: Using sequenceOrder from DB if available, else index.
    // Ideally we preserve original relative order.
    // Since tasks passed here might be from DB (sorted) or UI state.

    // Fallback sort if sequenceOrder is missing (UI new tasks)
    // Actually, simple array order is sufficient if we trust the input order.

    const childMap = new Map<string, Task[]>();

    tasks.forEach(t => {
        if (t.parentId) {
            if (!childMap.has(t.parentId)) childMap.set(t.parentId, []);
            childMap.get(t.parentId)!.push(t);
        }
    });

    const result: Task[] = [];

    const traverse = (nodes: Task[], parentCode: string) => {
        nodes.forEach((node, idx) => {
            const myNum = (idx + 1).toString().padStart(2, '0');
            const newCode = `${parentCode}-${myNum}`;
            const updatedNode = { ...node, code: newCode };
            result.push(updatedNode);

            const children = childMap.get(node.id) || [];
            // Sort children
            // children.sort(...) // Assume input order is correct for now
            traverse(children, newCode);
        });
    };

    const baseCode = sectionCode;
    traverse(rootTasks, baseCode);

    return result;
};

interface Props {
    workspaceId: string;
    projectTypeId: string;
    headerContent?: React.ReactNode;
    setHeaderActions?: (node: React.ReactNode) => void;
}

export default function StageTasksTab({ workspaceId, projectTypeId, headerContent, setHeaderActions }: Props) {
    const [activeStage, setActiveStage] = useState<StageKey>("KO");
    const [activeStageId, setActiveStageId] = useState<string | null>(null); // Store UUID
    const [openSection, setOpenSection] = useState<string | null>(null);

    // State
    const [allTasks, setAllTasks] = useState<Record<string, Task[]>>({});
    const [localSections, setLocalSections] = useState<any[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const toggleSection = (code: string) => {
        setOpenSection(prev => prev === code ? null : code);
    };

    // Load Data
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setIsLoading(true);
            try {
                // 1. Resolve Stage ID from Code
                // We need to fetch all stages to find the one matching activeStage
                console.log("Loading Stages for:", { workspaceId, projectTypeId, activeStage });

                const stages = await fetchStageTemplates(workspaceId, projectTypeId);
                console.log("Fetched Stages:", stages);

                const currentStageModel = stages.find(s => s.stageCode === activeStage);

                if (!currentStageModel) {
                    console.warn(`Stage ${activeStage} not found in DB`);
                    // Fallback to DUMMY data if stage not found in DB? 
                    // Or just show empty. If we show DUMMY, we strictly can't SAVE it because we need stage_id.
                    // But maybe we can't save anyway.
                    // Let's fallback to DUMMY for visual, but Save will fail or be disabled.
                    throw new Error(`Stage ${activeStage} not found in DB`);
                }

                if (!mounted) return;
                console.log("Found Stage ID:", currentStageModel.id);
                setActiveStageId(currentStageModel.id);

                // 2. Fetch basic templates from DB using UUID
                const [dbSections, dbTasks] = await Promise.all([
                    fetchStageSectionTemplates(currentStageModel.id),
                    fetchStageTaskTemplates(currentStageModel.id)
                ]);
                console.log("DB Data:", { sections: dbSections.length, tasks: dbTasks.length });

                if (!mounted) return;

                if (dbSections.length > 0) {
                    // Map DB Sections to UI Sections
                    const uiSections = dbSections.map(s => ({
                        id: s.id, // Keep ID for updates
                        code: s.sectionCode,
                        title: s.sectionName,
                        weight: s.weightDefault,
                        sequenceOrder: s.sequenceOrder
                    }));

                    // Map DB Tasks to UI Tasks (Group by Section)
                    const groupedTasks: Record<string, Task[]> = {};
                    const uiTasks = dbTasks.map(t => {
                        const linkedSection = uiSections.find(s => s.id === t.sectionId);
                        const sCode = linkedSection ? linkedSection.code : "unknown";

                        // Find matching Seed Task to hydrate schema & config
                        // We match by Name + Section Code because DB IDs are different
                        const seedDataForStage = SEED_DATA[activeStage];
                        const matchingSeedTask = seedDataForStage?.tasks.find(
                            st => st.name === t.taskName && st.sectionCode === sCode
                        );

                        return {
                            id: t.id,
                            code: "XX-XX", // Will be recomputed
                            name: t.taskName,
                            stage: activeStage,
                            sectionCode: sCode,
                            weight: t.weightDefault,
                            priority: matchingSeedTask?.priority || "low", // Prefer seed priority if available for UI
                            parentId: t.parentId || undefined,
                            sectionId: t.sectionId,
                            schemaType: matchingSeedTask?.schemaType || "DESCRIPTION_ONLY",
                            inputConfig: matchingSeedTask?.inputConfig
                        };
                    });

                    uiTasks.forEach(task => {
                        const linkedSection = uiSections.find(s => s.id === task.sectionId);
                        const sCode = linkedSection ? linkedSection.code : task.sectionCode;
                        if (!groupedTasks[sCode]) groupedTasks[sCode] = [];
                        groupedTasks[sCode].push({ ...task, sectionCode: sCode });
                    });

                    setLocalSections(uiSections);
                    setAllTasks(groupedTasks);
                    setOpenSection(uiSections[0]?.code || null);
                } else {
                    // DB is empty, use SEED DATA
                    console.log(`Stage found (${currentStageModel.id}) but empty. Using Seed Data.`);
                    loadSeedData(activeStage, currentStageModel.id);
                }
                setIsDirty(false);

            } catch (e) {
                console.error("Failed to load stage data", e);
                // Fallback to SEED DATA (Stage not in DB)
                loadSeedData(activeStage, null);
            } finally {
                setIsLoading(false);
            }
        };

        const loadSeedData = (stageKey: string, stageId: string | null) => {
            const seed = SEED_DATA[stageKey];
            if (seed) {
                console.log(`Loading Seed Data for ${stageKey}`, seed);
                setLocalSections(seed.sections.map(s => ({
                    id: `seed-sec-${s.code}`,
                    code: s.code,
                    title: s.title,
                    weight: s.weight,
                    sequenceOrder: 0
                })));

                const grouped: Record<string, Task[]> = {};
                seed.tasks.forEach(t => {
                    const task: Task = {
                        id: `seed-task-${t.id}`,
                        code: t.code,
                        name: t.name,
                        stage: stageKey as any,
                        sectionCode: t.sectionCode,
                        weight: t.weight,
                        priority: t.priority as any || "low",
                        parentId: undefined
                    };
                    if (!grouped[t.sectionCode]) grouped[t.sectionCode] = [];
                    grouped[t.sectionCode].push(task);
                });

                setAllTasks(grouped);
                setOpenSection(seed.sections[0]?.code || null);
            } else {
                setLocalSections([]);
                setAllTasks({});
            }
        };

        load();
        return () => { mounted = false; };
    }, [activeStage, workspaceId, projectTypeId]); // Added projectTypeId



    // Derived sections is now just localSections
    const currentSections = localSections;

    const handleResetToDefault = () => {
        if (confirm("Are you sure you want to reset to default? This will overwrite your current unsaved changes.")) {
            const seed = SEED_DATA[activeStage];
            console.log("Resetting Stage:", activeStage, "Seed Found:", !!seed);

            if (seed) {
                setLocalSections(seed.sections.map(s => ({
                    id: `seed-sec-${s.code}`,
                    code: s.code,
                    title: s.title,
                    weight: s.weight,
                    sequenceOrder: 0
                })));

                const grouped: Record<string, Task[]> = {};
                seed.tasks.forEach(t => {
                    const task: Task = {
                        id: `seed-task-${t.id}`, // Ensure new ID
                        code: t.code,
                        name: t.name,
                        stage: activeStage,
                        sectionCode: t.sectionCode,
                        weight: t.weight,
                        priority: t.priority as any || "low",
                        parentId: undefined
                    };
                    if (!grouped[t.sectionCode]) grouped[t.sectionCode] = [];
                    grouped[t.sectionCode].push(task);
                });

                console.log("Resetting Tasks:", Object.keys(grouped).length, "sections populated.");
                // Log sample for KO-01
                if (grouped["KO-01"]) {
                    console.log("Reset KO-01 Tasks:", grouped["KO-01"].map(t => `${t.code}: ${t.weight}`));
                }

                setAllTasks(grouped);
                setIsDirty(true);
            }
        }
    };

    const handleSaveConfig = async () => {
        if (!activeStageId) {
            // toast.error("Cannot save: Stage not found in database."); // Assuming toast is available
            console.error("Cannot save: Stage not found in database.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Prepare Sections
            const sectionsPayload = localSections.map((s, idx) => ({
                id: (s.id.startsWith("sec-") || s.id.startsWith("seed-")) ? crypto.randomUUID() : s.id, // Handle fallback IDs
                stageId: activeStageId, // Use UUID
                sectionCode: s.code,
                sectionName: s.title,
                weightDefault: s.weight,
                sequenceOrder: idx
            }));

            // 2. Prepare Tasks
            // Re-doing Task Payload logic for correctness:
            const taskMap = new Map<string, string>(); // oldId -> newId

            // Pass 1: Assign IDs
            const tasksToSave: any[] = [];
            Object.values(allTasks).flat().forEach(t => {
                const newId = (t.id.startsWith("t-") || t.id.startsWith("task-") || t.id.startsWith("seed-")) ? crypto.randomUUID() : t.id;
                taskMap.set(t.id, newId);
                tasksToSave.push({ ...t, newId });
            });

            // Pass 2: Build Payload
            const finalTasksPayload: StageTaskTemplate[] = tasksToSave.map((t, idx) => {
                const sectionId = sectionsPayload.find(s => s.sectionCode === t.sectionCode)?.id;
                return {
                    id: t.newId,
                    stageId: activeStageId, // Use UUID
                    taskName: t.name,
                    disciplineCode: "ALL",
                    weightDefault: t.weight || 0,
                    sequenceOrder: idx, // This idx is global? No, it should be relative or global sequence. 
                    // We need correct sequence.
                    // Actually, SequenceOrder in DB is Int.
                    // We can just use the loop index if we flatten carefully or maintain order.
                    isMandatory: false,
                    parentId: t.parentId ? taskMap.get(t.parentId) : undefined, // Resolve new Parent ID
                    sectionId: sectionId
                };
            });

            await Promise.all([
                bulkUpdateStageSections(activeStageId, sectionsPayload),
                bulkUpdateStageTasks(activeStageId, finalTasksPayload)
            ]);

            setIsDirty(false);
            // toast.success("Configuration saved"); // Assuming toast is available
            console.log("Saved successfully");

            // Reload to get real IDs?
            // Optionally reload. 
            // In a real app we would merge back IDs, but reload is safer.
            // Trigger load effect by toggling a version? Or just calling load?
            // Simplest: Force reload.
            // window.location.reload(); // Too aggressive.
            // Just let the user know.

        } catch (e) {
            console.error("Save failed", e);
            // toast.error("Save failed"); // Assuming toast is available
        } finally {
            setIsLoading(false);
        }
    };

    // Header Actions Effect
    useEffect(() => {
        if (setHeaderActions) {
            setHeaderActions(
                <div className="flex items-center gap-3">
                    <div className="flex bg-neutral-100 rounded-full p-1 gap-1">
                        {STAGE_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveStage(tab.key)}
                                className={`
                                    px-3 py-1.5 text-xs font-bold rounded-full transition-all
                                    ${activeStage === tab.key
                                        ? "bg-white text-neutral-900 shadow-sm"
                                        : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"}
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="secondary"
                        onClick={handleResetToDefault}
                        icon={<RotateCcw className="w-3 h-3" />}
                        className="text-xs h-8 rounded-full"
                    >
                        Reset
                    </Button>
                    <Button
                        onClick={handleSaveConfig}
                        disabled={!isDirty || isLoading}
                        icon={isLoading ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                        className={`
                            h-8 text-xs shadow-sm transition-all rounded-full border-none
                            ${isDirty
                                ? "!bg-red-600 !hover:bg-red-700 !text-white"
                                : "!bg-neutral-300 !text-neutral-600 cursor-not-allowed"}
                        `}
                    >
                        {isLoading ? "Saving..." : "Save Config"}
                    </Button>
                </div>
            );
        }
    }, [setHeaderActions, isDirty, isLoading, handleSaveConfig, activeStage, handleResetToDefault]);


    // --- DEEP HIERARCHY LOGIC ---

    // Helper: Build Tree from Flat List, Renumber, then Flatten again
    // This is the most robust way to ensure codes are correct after arbitrary moves.
    const recomputeHierarchy = (tasks: Task[], sectionCode: string): Task[] => {
        const rootTasks = tasks.filter(t => !t.parentId).sort((a, b) => tasks.indexOf(a) - tasks.indexOf(b)); // Maintain original order for roots
        const childMap = new Map<string, Task[]>();

        tasks.forEach(t => {
            if (t.parentId) {
                if (!childMap.has(t.parentId)) childMap.set(t.parentId, []);
                childMap.get(t.parentId)!.push(t);
            }
        });

        const result: Task[] = [];

        const traverse = (nodes: Task[], parentCode: string) => {
            // Sort children by their original index to maintain relative order
            nodes.sort((a, b) => tasks.indexOf(a) - tasks.indexOf(b));

            nodes.forEach((node, idx) => {
                const myNum = (idx + 1).toString().padStart(2, '0');
                const newCode = `${parentCode}-${myNum}`;
                const updatedNode = { ...node, code: newCode };
                result.push(updatedNode);

                const children = childMap.get(node.id) || [];
                traverse(children, newCode);
            });
        };

        // Start traversal from Root
        const baseCode = sectionCode;
        traverse(rootTasks, baseCode);

        return result;
    };

    const handleAddTask = useCallback((sectionCode: string, parentId?: string, mode?: "above" | "below" | "subtask", relativeId?: string) => {
        setIsDirty(true);
        setAllTasks(prev => {
            const sectionTasks = [...(prev[sectionCode] || [])];

            let insertIndex = sectionTasks.length;
            let finalParentId = parentId;

            // Resolve placement
            if (mode === "subtask" && relativeId) {
                finalParentId = relativeId;
                // Insert after the last child of this parent
                const children = sectionTasks.filter(t => t.parentId === relativeId);
                if (children.length > 0) {
                    // Find the index of the last child
                    const lastChild = children[children.length - 1];
                    const lastChildIndex = sectionTasks.findIndex(t => t.id === lastChild.id);
                    insertIndex = lastChildIndex + 1;
                } else {
                    // No children, insert immediately after parent
                    const parentIndex = sectionTasks.findIndex(t => t.id === relativeId);
                    insertIndex = parentIndex + 1;
                }
            }
            else if ((mode === "above" || mode === "below") && relativeId) {
                const relIndex = sectionTasks.findIndex(t => t.id === relativeId);
                if (relIndex === -1) return prev; // Should not happen
                const relTask = sectionTasks[relIndex];
                finalParentId = relTask.parentId; // Inherit parent

                if (mode === "above") {
                    insertIndex = relIndex;
                } else { // mode === "below"
                    // Find all descendants of relTask to skip them
                    let i = relIndex + 1;
                    while (i < sectionTasks.length) {
                        const curr = sectionTasks[i];
                        // Check if curr is a descendant of relTask
                        // A simple way is to check if curr's parent chain includes relTask.id
                        let currentParentId = curr.parentId;
                        let isDescendant = false;
                        while (currentParentId) {
                            if (currentParentId === relTask.id) {
                                isDescendant = true;
                                break;
                            }
                            const parentTask = sectionTasks.find(t => t.id === currentParentId);
                            currentParentId = parentTask?.parentId;
                        }
                        if (!isDescendant) break; // Found next sibling or uncle
                        i++;
                    }
                    insertIndex = i;
                }
            }

            const newTask: Task = {
                id: `task-${Date.now()}`,
                code: "XX-XX", // Will be recomputed
                name: "",
                stage: activeStage,
                sectionCode: sectionCode,
                weight: 0,
                parentId: finalParentId
            };

            sectionTasks.splice(insertIndex, 0, newTask);

            // Recompute Codes
            const orderedTasks = recomputeHierarchy(sectionTasks, sectionCode);

            // Redistribute Weight? This is complex with hierarchy.
            // For now, new tasks get 0 weight. Weight distribution logic needs to be updated for hierarchy.
            // The existing redistributeTaskWeights, redistributeAfterDelete, handleWeightEdit are for flat lists.
            // They would need significant refactoring to work with hierarchical weights.
            // For this change, we'll keep new task weight at 0 and not run the old redistribution.

            return { ...prev, [sectionCode]: orderedTasks };
        });
    }, [activeStage]);



    const handleDeleteTask = useCallback((sectionCode: string, taskId: string) => {
        setIsDirty(true);
        setAllTasks(prev => {
            const sectionTasks = prev[sectionCode] || [];

            // Delete Task AND all descendants
            // Identify descendants to delete
            const toDelete = new Set<string>([taskId]);
            let added;
            do {
                added = false;
                sectionTasks.forEach(t => {
                    if (t.parentId && toDelete.has(t.parentId) && !toDelete.has(t.id)) {
                        toDelete.add(t.id);
                        added = true;
                    }
                });
            } while (added);

            const remaining = sectionTasks.filter(t => !toDelete.has(t.id));
            const reordered = recomputeHierarchy(remaining, sectionCode);

            // Weight redistribution after delete is also complex with hierarchy.
            // Skipping for now, as the old helpers are for flat lists.

            return { ...prev, [sectionCode]: reordered };
        });
        if (selectedTask?.id === taskId) setIsDrawerOpen(false);
    }, [selectedTask]);

    const handleReorderTask = useCallback((sectionCode: string, fromIndex: number, toIndex: number) => {
        setIsDirty(true);
        setAllTasks(prev => {
            let sectionTasks = [...(prev[sectionCode] || [])];

            // Get the task being moved
            const [movedTask] = sectionTasks.splice(fromIndex, 1);

            // Determine the new parentId based on the target position
            let newParentId = movedTask.parentId; // Default to current parent

            // If moving within the same parent, or to a new parent, this logic needs to be robust.
            // For now, a simple splice and recompute hierarchy will handle sibling reordering.
            // If drag-and-drop allows changing parent, this logic would need to be more complex.
            sectionTasks.splice(toIndex, 0, movedTask);

            // Recompute codes and ensure hierarchy is correct
            const reordered = recomputeHierarchy(sectionTasks, sectionCode);
            return { ...prev, [sectionCode]: reordered };
        });
    }, []);

    const handleSectionUpdate = (sectionCode: string, newTitle: string) => {
        setIsDirty(true);
        setLocalSections(prev => prev.map(s => s.code === sectionCode ? { ...s, title: newTitle } : s));
    };



    // --- STRICT WEIGHT LOGIC (SAFE REDISTRIBUTION) ---

    /**
     * Redistribute weights among siblings to match a TARGET TOTAL.
     * Rules:
     * 1. Use Float Precision (No rounding).
     * 2. Last Item Lock (Last item takes remainder).
     * 3. Proportional Distribution based on Old Weights.
     */
    const distributeRemaining = <T extends { id: string; weight?: number;[key: string]: any }>(siblings: T[], targetTotal: number): T[] => {
        if (siblings.length === 0) return [];

        // Use Number() to ensure we sum numbers, not strings
        const totalOld = siblings.reduce((sum, s) => sum + Number(s.weight || 0), 0);
        let currentSum = 0;
        const result: T[] = [];

        // Distribute to all EXCEPT the last one
        for (let i = 0; i < siblings.length - 1; i++) {
            const s = siblings[i];
            let newWeight = 0;

            if (totalOld === 0) {
                // If previous total was 0, distribute equally
                newWeight = targetTotal / siblings.length;
            } else {
                newWeight = (Number(s.weight || 0) / totalOld) * targetTotal;
            }

            // Keep Float Precision
            newWeight = Math.max(0, newWeight);
            result.push({ ...s, weight: newWeight });
            currentSum += newWeight;
        }

        // LAST ITEM LOCK
        const lastSibling = siblings[siblings.length - 1];
        let lastWeight = targetTotal - currentSum;

        // Safety Clean-up for tiny float errors
        if (lastWeight < 0 && Math.abs(lastWeight) < 0.0001) lastWeight = 0;

        // Clamp to 0
        lastWeight = Math.max(0, lastWeight);

        result.push({ ...lastSibling, weight: lastWeight });

        return result;
    };

    /**
     * Scale children weights to match a new parent total.
     */
    const scaleChildren = (children: Task[], newParentTotal: number): Task[] => {
        return distributeRemaining(children, newParentTotal);
    };

    const handleSectionWeightUpdate = (sectionCode: string, newWeight: number) => {
        setIsDirty(true);

        // Calculate Logic outside of setState to avoid side-effects and ensuring data availability
        const currentSections = localSections;
        const currentTotal = currentSections.reduce((sum, s) => sum + s.weight, 0);
        // Default to fixed total if current is 0 (shouldn't happen with seed data)
        const targetTotal = currentTotal || 10000;

        // Clamp input
        const clampedInput = Math.max(0, Math.min(newWeight, targetTotal));
        const remaining = targetTotal - clampedInput;

        const otherSections = currentSections.filter(s => s.code !== sectionCode);
        const updatedOthers = distributeRemaining(otherSections, remaining);

        const updatedSections = currentSections.map(s => {
            if (s.code === sectionCode) return { ...s, weight: clampedInput };
            const updated = updatedOthers.find(u => u.code === s.code);
            return updated || s;
        });

        // 1. Update Sections
        setLocalSections(updatedSections);

        // 2. Cascade: Scale Tasks in this Section
        setAllTasks(prev => {
            const sectionTasks = prev[sectionCode] || [];
            if (sectionTasks.length === 0) return prev;

            const scaleRecursive = (tasks: Task[], targetSectionWeight: number): Task[] => {
                let workingSet = [...tasks];

                // Pass 1: Roots (Subtasks sum to parents, roots sum to Section)
                const roots = workingSet.filter(t => !t.parentId);

                console.log("ScaleRecursive Start:", {
                    targetSectionWeight,
                    rootsCount: roots.length,
                    rootsWeights: roots.map(r => r.weight)
                });

                const scaledRoots = scaleChildren(roots, targetSectionWeight);

                console.log("Scaled Roots:", scaledRoots.map(r => r.weight));

                // Update working set with scaled roots
                scaledRoots.forEach(r => {
                    const idx = workingSet.findIndex(t => t.id === r.id);
                    if (idx !== -1) workingSet[idx] = r;
                });

                // Pass 2: Children (Recursive scaling)
                // We need to scale children of ANY task that was scaled.
                // Initially roots are scaled. Then their children...
                // Recursion is better than iterative loop here for clarity, or queue.

                let queue = [...scaledRoots];
                while (queue.length > 0) {
                    const parent = queue.shift();
                    if (!parent) continue;

                    const children = workingSet.filter(t => t.parentId === parent.id);
                    if (children.length > 0) {
                        const scaledChildren = scaleChildren(children, parent.weight || 0);
                        scaledChildren.forEach(c => {
                            const idx = workingSet.findIndex(t => t.id === c.id);
                            if (idx !== -1) workingSet[idx] = c;
                            queue.push(c);
                        });
                    }
                }

                return workingSet;
            };

            const scaledTasks = scaleRecursive(sectionTasks, clampedInput);
            return { ...prev, [sectionCode]: scaledTasks };
        });
    };

    const handleUpdateTask = useCallback((sectionCode: string, taskId: string, field: keyof Task, value: any) => {
        setIsDirty(true);
        setAllTasks(prev => {
            const sectionTasks = prev[sectionCode] || [];

            if (field === "weight") {
                const taskIndex = sectionTasks.findIndex(t => t.id === taskId);
                if (taskIndex === -1) return prev;
                const task = sectionTasks[taskIndex];

                // Robust Number conversion (Float)
                const newWeight = parseFloat(String(value)) || 0;

                // 1. Identify Siblings (tasks sharing same parent)
                const siblings = sectionTasks.filter(t => t.parentId === task.parentId);

                // 2. Determine Target Total Weight (Limit)
                let targetTotal = 0;
                if (!task.parentId) {
                    // Root Tasks -> Sum must equal Section Weight
                    const section = localSections.find(s => s.code === sectionCode);
                    targetTotal = section ? section.weight : 0;
                } else {
                    // Subtasks -> Sum must equal Parent Weight
                    const parent = sectionTasks.find(t => t.id === task.parentId);
                    targetTotal = parent ? (parent.weight || 0) : 0;
                }

                // 3. Direct Edit Flow
                // Clamp new weight to target
                const clampedWeight = Math.max(0, Math.min(newWeight, targetTotal));
                const remaining = targetTotal - clampedWeight;

                const otherSiblings = siblings.filter(t => t.id !== taskId);

                // Distribute remaining among others
                // NOTE: distributeRemaining now uses Float + Last Item Lock
                const updatedOthers = distributeRemaining(otherSiblings, remaining);

                // Merge
                let updatedTasks = [...sectionTasks];

                // Update edited task explicitly
                const selfIdx = updatedTasks.findIndex(t => t.id === taskId);
                if (selfIdx !== -1) updatedTasks[selfIdx] = { ...updatedTasks[selfIdx], weight: clampedWeight };

                // Update others
                updatedOthers.forEach(o => {
                    const idx = updatedTasks.findIndex(t => t.id === o.id);
                    if (idx !== -1) updatedTasks[idx] = o;
                });

                // 4. Cascade: Scale Subtasks of ALL modified tasks
                const modifiedIds = [taskId, ...updatedOthers.map(o => o.id)];

                const scaleChildrenRecursive = (currentTasks: Task[], parentIds: string[]) => {
                    let set = [...currentTasks];
                    let nextParentIds: string[] = [];

                    parentIds.forEach(pid => {
                        const p = set.find(t => t.id === pid);
                        if (!p) return;

                        const children = set.filter(t => t.parentId === pid);
                        if (children.length > 0) {
                            const scaled = scaleChildren(children, p.weight || 0);
                            scaled.forEach(c => {
                                const idx = set.findIndex(t => t.id === c.id);
                                if (idx !== -1) set[idx] = c;
                                nextParentIds.push(c.id);
                            });
                        }
                    });

                    if (nextParentIds.length > 0) {
                        return scaleChildrenRecursive(set, nextParentIds);
                    }
                    return set;
                };

                updatedTasks = scaleChildrenRecursive(updatedTasks, modifiedIds);

                return { ...prev, [sectionCode]: updatedTasks };
            }

            // Normal update
            const updated = sectionTasks.map(t => t.id === taskId ? { ...t, [field]: value } : t);
            return { ...prev, [sectionCode]: updated };
        });

        if (field === "name" && selectedTask?.id === taskId) {
            setSelectedTask(prevT => prevT ? ({ ...prevT, name: value }) : null);
        }
    }, [selectedTask, localSections]);

    const handleViewDetail = (task: Task) => {
        setSelectedTask(task);
        setIsDrawerOpen(true);
    };

    const renderSection = (code: string, title: string) => {
        const sectionTasks = allTasks[code] || [];
        const section = localSections.find(s => s.code === code);
        const sectionWeight = section?.weight || 0;

        return (
            <TaskSection
                key={code}
                code={code}
                title={section?.title || title}
                isOpen={openSection === code}
                onToggle={() => toggleSection(code)}
                totalWeight={sectionWeight}
                onTitleChange={(val) => handleSectionUpdate(code, val)}
                onWeightChange={(val) => handleSectionWeightUpdate(code, val)}
            >
                <TaskTable
                    tasks={sectionTasks}
                    onAddTask={(parentId, mode, relId) => handleAddTask(code, parentId, mode, relId)}
                    onUpdateTask={(id, field, val) => handleUpdateTask(code, id, field, val)}
                    onDeleteTask={(id) => handleDeleteTask(code, id)}
                    onViewDetail={handleViewDetail}
                    onReorder={(from, to) => handleReorderTask(code, from, to)}
                />
            </TaskSection>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div className="w-full md:w-auto">{headerContent}</div>
            </div>

            <div className="space-y-0 divide-y divide-neutral-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {currentSections.map(section => renderSection(section.code, section.title))}
            </div>

            <TaskDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                task={selectedTask}
                onUpdate={(id, f, v) => handleUpdateTask(selectedTask?.sectionCode || "", id, f, v)}
            />
        </div>
    );
}
