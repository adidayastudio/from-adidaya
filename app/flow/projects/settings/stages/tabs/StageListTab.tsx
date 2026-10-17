"use client";

import { useState, useEffect } from "react";
import { Check, X, Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";
import { SortableTable, Column } from "../../general/components/SortableTable";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { StageTemplate } from "../data";
import { fetchStageTemplates, updateStageTemplate, createStageTemplate, deleteStageTemplate } from "@/lib/api/templates";
import { ModalConfirm } from "@/shared/ui/modal";

interface Props {
    workspaceId: string;
    projectTypeId: string;
    headerContent?: React.ReactNode;
    setHeaderActions?: (node: React.ReactNode) => void;
}

// Standard weights as defined by user requirement
const STANDARD_WEIGHTS: Record<string, number> = {
    "KO": 5,      // Kickoff
    "SD": 12.5,   // Schematic Design
    "DD": 17.5,   // Design Development
    "ED": 22.5,   // Engineering Design
    "PC": 12.5,   // Procurement
    "CN": 25,     // Construction
    "HO": 5       // Handover
};

const TOTAL_WEIGHT = 100;

export default function StageListTab({ workspaceId, projectTypeId, headerContent, setHeaderActions }: Props) {
    const [stages, setStages] = useState<StageTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ... (existing loadStages useEffect)

    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [stageToDeleteId, setStageToDeleteId] = useState<string | null>(null);

    const handleResetToStandard = () => {
        setIsResetConfirmOpen(true);
    };

    const confirmReset = async () => {
        // Create a map of standard weights for quick lookup
        // We match by codeAbbr (KO, SD, etc.)

        let newStages = stages.map(stage => {
            // Find standard weight by matching the abbreviation/code part
            // Assumption: codeAbbr (e.g., 'KO') matches the keys in STANDARD_WEIGHTS
            let targetWeight = STANDARD_WEIGHTS[stage.codeAbbr || ""];

            // If codeAbbr didn't match, maybe try to match partial naming or just keep 0?
            // Fallback: If no match, set to 0 to avoid breaking the sum if possible, or keep existing?
            // "Recommended": keeping existing if not standard is risky for total sum.
            // Let's set to 0 if not part of standard set, or alert user?
            // The standard set sums to 100%. If we have extra stages, they should probably be 0.

            if (targetWeight === undefined) {
                targetWeight = 0;
            }

            return {
                ...stage,
                weightDefault: targetWeight
            };
        });

        setStages(newStages);

        // Optimistically save all
        try {
            await Promise.all(newStages.map(s => updateStageTemplate(s.id, workspaceId, {
                stageName: s.stageName,
                stageNameId: s.stageNameId,
                displayCode: `${s.codeNumber}-${s.codeAbbr}`,
                stageCode: s.codeAbbr,
                category: s.category,
                weightDefault: s.weightDefault,
                isActive: s.isActive
            })));
            setIsSuccessOpen(true);
        } catch (error) {
            console.error("Failed to reset weights", error);
            alert("Failed to save reset weights.");
        }
    };


    useEffect(() => {
        const loadStages = async () => {
            setIsLoading(true);
            try {
                if (!projectTypeId) return;
                // Fetch all stages including inactive ones to show the full master list
                const dbStages = await fetchStageTemplates(workspaceId, projectTypeId, { includeInactive: true });

                if (dbStages.length > 0) {
                    const mappedStages = dbStages.map((s: any) => {
                        // Parse displayCode "01-KO" -> num="01", abbr="KO"
                        let num = "00";
                        let abbr = "CODE";

                        if (s.displayCode && s.displayCode.includes("-")) {
                            const parts = s.displayCode.split("-");
                            num = parts[0];
                            abbr = parts.slice(1).join("-");
                        } else {
                            // Fallback
                            num = s.position ? s.position.toString().padStart(2, '0') : "00";
                            abbr = s.stageCode || "CODE";
                        }

                        return {
                            ...s,
                            // Populate UI fields
                            codeNumber: num,
                            codeAbbr: abbr,
                            // Ensure numeric weight
                            weightDefault: typeof s.weightDefault === 'number' ? s.weightDefault : parseFloat(s.weightDefault) || 0
                        };
                    });
                    setStages(mappedStages);
                } else {
                    setStages([]);
                }
            } catch (error) {
                console.error("Failed to load stages:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadStages();
    }, [workspaceId, projectTypeId]);

    const handleAddStage = async () => {
        const newPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 1;
        const newNumber = newPosition.toString().padStart(2, '0');

        // Initial Data
        const newStageData = {
            projectTypeId,
            stageCode: `NEW-${Date.now()}`,
            stageName: "New Stage",
            stageNameId: "Tahap Baru",
            displayCode: `${newNumber}-NEW`,
            category: "Design",
            position: newPosition,
            weightDefault: 0,
            isActive: true,
            lockable: true
        };

        try {
            // Optimistic Update
            const tempId = `temp-${Date.now()}`;
            const optimisticStage = {
                ...newStageData,
                id: tempId,
                workspaceId,
                codeNumber: newNumber,
                codeAbbr: "NEW",
                isActive: true
            } as any;
            setStages(prev => [...prev, optimisticStage]);

            // API Call
            const created = await createStageTemplate(workspaceId, newStageData);

            if (created) {
                // Replace temp with real data from DB
                setStages(prev => prev.map(s => s.id === tempId ? {
                    ...created,
                    codeNumber: newNumber,
                    codeAbbr: "NEW"
                } as any : s));
            } else {
                setStages(prev => prev.filter(s => s.id !== tempId));
                alert("Failed to create stage");
            }

        } catch (e) {
            console.error("Error creating stage", e);
            alert("Error creating stage");
        }
    };

    const handleSaveRow = async (item: StageTemplate) => {
        // Optimistic update locally
        const oldStage = stages.find(s => s.id === item.id);
        let stagesToSave: StageTemplate[] = [];
        let updatedStagesList = [...stages];

        // 1. Handle Weight Auto-Balancing locally first
        if (oldStage && oldStage.weightDefault !== item.weightDefault) {
            const newWeight = item.weightDefault;

            if (newWeight === TOTAL_WEIGHT) {
                updatedStagesList = updatedStagesList.map(s => ({
                    ...s,
                    weightDefault: s.id === item.id ? TOTAL_WEIGHT : 0
                }));
            } else {
                const remainingWeight = TOTAL_WEIGHT - newWeight;
                const otherStages = updatedStagesList.filter(s => s.id !== item.id);
                const countOthers = otherStages.length;
                const totalOthersCurrent = otherStages.reduce((sum, s) => sum + (s.weightDefault || 0), 0);

                const updatedOthers = otherStages.map(s => {
                    let adjustedWeight = 0;
                    if (totalOthersCurrent > 0) {
                        // Proportional redistribution
                        adjustedWeight = ((s.weightDefault || 0) / totalOthersCurrent) * remainingWeight;
                    } else if (countOthers > 0) {
                        // Even split
                        adjustedWeight = remainingWeight / countOthers;
                    }
                    return { ...s, weightDefault: parseFloat(adjustedWeight.toFixed(2)) };
                });

                updatedStagesList = updatedStagesList.map(s => {
                    if (s.id === item.id) return item;
                    const updated = updatedOthers.find(u => u.id === s.id);
                    return updated || s;
                });
            }

            // Identify all modified stages to save them
            stagesToSave = updatedStagesList.filter(s => {
                const old = stages.find(o => o.id === s.id);
                // Save if weight changed OR it's the item we edited explicitly
                return old && (old.id === item.id || old.weightDefault !== s.weightDefault);
            });

        } else {
            // No weight change, just update the single item
            updatedStagesList = updatedStagesList.map(s => s.id === item.id ? item : s);
            stagesToSave = [item];
        }

        setStages(updatedStagesList);

        // 2. Persist to Backend
        try {
            await Promise.all(stagesToSave.map(async (s) => {
                await updateStageTemplate(s.id, workspaceId, {
                    stageName: s.stageName,
                    stageNameId: s.stageNameId,
                    // Construct displayCode from the potentially edited code fields
                    displayCode: `${s.codeNumber}-${s.codeAbbr}`,
                    // Use codeAbbr as stageCode as well if preferred, or keep original stageCode?
                    // Usually codeAbbr IS the stageCode.
                    stageCode: s.codeAbbr,

                    category: s.category,
                    weightDefault: s.weightDefault,
                    isActive: s.isActive
                });
            }));
            console.log("Saved stages successfully");
        } catch (error) {
            console.error("Failed to save changes", error);
            alert("Failed to save changes. Please refresh.");
        }
    };

    const handleDelete = (id: string) => {
        setStageToDeleteId(id);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!stageToDeleteId) return;

        const previous = [...stages];
        setStages(prev => prev.filter(s => s.id !== stageToDeleteId));

        const success = await deleteStageTemplate(stageToDeleteId, workspaceId);
        if (!success) {
            setStages(previous);
            alert("Failed to delete stage");
        }
        setStageToDeleteId(null);
    };

    const handleReorder = (newStages: StageTemplate[]) => {
        const reordered = newStages.map((stage, index) => ({
            ...stage,
            position: index + 1,
            codeNumber: (index + 1).toString().padStart(2, '0') // Auto-update codeNumber? Optional.
        }));
        setStages(reordered);
    };

    const columns: Column<StageTemplate>[] = [
        {
            key: "codeAbbr",
            header: "CODE",
            width: "140px",
            sortable: true,
            render: (item, isEditing, draft, setDraft) => {
                if (isEditing) {
                    const num = draft?.codeNumber ?? item.codeNumber ?? "00";
                    const abbr = draft?.codeAbbr ?? item.codeAbbr ?? "CODE";
                    return (
                        <div className="flex gap-2 items-center">
                            <div className="w-12">
                                <Input
                                    value={num}
                                    onChange={(e) => setDraft?.({ codeNumber: e.target.value })}
                                    placeholder="00"
                                    className="font-mono text-center"
                                />
                            </div>
                            <span className="font-bold text-neutral-300">-</span>
                            <div className="w-16">
                                <Input
                                    value={abbr}
                                    onChange={(e) => setDraft?.({ codeAbbr: e.target.value })}
                                    placeholder="CODE"
                                    className="font-mono uppercase"
                                />
                            </div>
                        </div>
                    );
                }
                return <span className="font-mono text-sm font-bold text-neutral-600 bg-neutral-100 px-2 py-1 rounded">{item.codeNumber}-{item.codeAbbr}</span>;
            }
        },
        {
            key: "stageName",
            header: "NAME (EN)",
            width: "250px",
            sortable: true,
            render: (item, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <Input
                            value={draft?.stageName || ""}
                            onChange={(e) => setDraft?.({ stageName: e.target.value })}
                        />
                    );
                }
                return <span className="font-medium text-neutral-900">{item.stageName}</span>;
            }
        },
        {
            key: "stageNameId",
            header: "NAME (ID)",
            width: "250px",
            sortable: true,
            render: (item, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <Input
                            value={draft?.stageNameId || ""}
                            onChange={(e) => setDraft?.({ stageNameId: e.target.value })}
                        />
                    );
                }
                return <span className="text-neutral-500 italic">{item.stageNameId || "-"}</span>;
            }
        },
        {
            key: "category",
            header: "CATEGORY",
            width: "200px",
            render: (item: any, isEditing, draft, setDraft) => {
                const CATEGORIES = [
                    { label: "General", value: "General" },
                    { label: "Design", value: "Design" },
                    { label: "Procurement", value: "Procurement" },
                    { label: "Construction", value: "Construction" },
                    { label: "Handover", value: "Handover" }
                ];
                if (isEditing) {
                    return (
                        <Select
                            options={CATEGORIES}
                            value={draft?.category || item.category || "Design"}
                            onChange={(val) => setDraft?.({ category: val } as any)}
                        />
                    );
                }

                let colorClass = "bg-neutral-100 text-neutral-600";
                const cat = (item.category || "").toLowerCase();

                if (cat.includes('design')) colorClass = "bg-purple-50 text-purple-700 border-purple-100";
                else if (cat.includes('construct') || cat.includes('build')) colorClass = "bg-orange-50 text-orange-700 border-orange-100";
                else if (cat.includes('tender') || cat.includes('procurement')) colorClass = "bg-blue-50 text-blue-700 border-blue-100";
                else if (cat.includes('handover') || cat.includes('close')) colorClass = "bg-green-50 text-green-700 border-green-100";
                else colorClass = "bg-neutral-100 text-neutral-600 border-neutral-100"; // General / Fallback

                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${colorClass}`}>
                        {item.category || "General"}
                    </span>
                );
            }
        },
        {
            key: "weightDefault",
            header: "WEIGHT %",
            width: "120px",
            render: (item, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <div className="relative">
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={draft?.weightDefault ?? item.weightDefault ?? 0}
                                onChange={(e) => setDraft?.({ weightDefault: Number(e.target.value) })}
                                className="w-full pr-8 text-right"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">%</span>
                        </div>
                    );
                }
                return (
                    <div className="text-right font-mono text-neutral-600">
                        {(typeof item.weightDefault === 'number' ? item.weightDefault : parseFloat(item.weightDefault || "0")).toFixed(2)}%
                    </div>
                );
            }
        },
        {
            key: "actions",
            header: "",
            width: "120px",
            render: (item, isEditing, draft, setDraft, onEditStart, onSave, onCancel) => {
                if (isEditing) {
                    return (
                        <div className="flex justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); onSave?.(); }} className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors">
                                <Check className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onCancel?.(); }} className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-500 rounded-full hover:bg-neutral-200 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )
                }
                return (
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); if (onEditStart) onEditStart(item); }} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )
            }
        }
    ];

    const totalWeight = stages.reduce((sum, s) => sum + (s.weightDefault || 0), 0);
    const isWeightValid = Math.abs(totalWeight - TOTAL_WEIGHT) < 0.1;

    // Header Actions Effect
    useEffect(() => {
        if (setHeaderActions) {
            setHeaderActions(
                <div className="flex items-center gap-2 xl:gap-3">
                    <button
                        onClick={handleResetToStandard}
                        className="text-xs text-neutral-400 hover:text-neutral-600 underline mr-2"
                        title="Reset to Standard Weights"
                    >
                        Reset<span className="hidden xl:inline"> to Default</span>
                    </button>

                    <div className={`
                        flex items-center gap-2 xl:gap-3 px-3 xl:px-4 py-2 rounded-full border shadow-sm transition-colors
                        ${isWeightValid
                            ? "bg-white border-neutral-200"
                            : "bg-red-50 border-red-200"
                        }
                    `}>
                        <span className="text-[10px] xl:text-xs font-bold text-neutral-500 uppercase tracking-wider">
                            <span className="hidden xl:inline">TOTAL </span>WEIGHT
                        </span>
                        <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs xl:text-sm font-bold ${isWeightValid ? "text-neutral-900" : "text-red-600"}`}>
                                {totalWeight.toFixed(1)}%
                            </span>
                            {isWeightValid ? (
                                <Check className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-green-600" />
                            ) : (
                                <AlertTriangle className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-red-500" />
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={handleAddStage}
                        icon={<Plus className="w-4 h-4" />}
                        className="bg-brand-red hover:bg-brand-red-hover text-white shadow-sm shadow-brand-red/20 !p-0 !w-8 !h-8 xl:!w-auto xl:!px-6 xl:!h-9 rounded-full [&>span:nth-child(2)]:hidden xl:[&>span:nth-child(2)]:inline"
                    >
                        Add Stage
                    </Button>
                </div>
            );
        }
    }, [setHeaderActions, isWeightValid, totalWeight, handleResetToStandard, handleAddStage]);

    return (
        <div className="space-y-6">
            <ModalConfirm
                open={isSuccessOpen}
                onOpenChange={setIsSuccessOpen}
                title="Weights Reset Successfully"
                description="All stage weights have been reset to the standard configuration."
                confirmLabel="OK"
                status="success"
                onConfirm={() => setIsSuccessOpen(false)}
            />

            <ModalConfirm
                open={isDeleteConfirmOpen}
                onOpenChange={setIsDeleteConfirmOpen}
                title="Delete Stage"
                description="Are you sure you want to delete this stage? This is permanent."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                status="danger"
                onConfirm={confirmDelete}
            />
            <ModalConfirm
                open={isResetConfirmOpen}
                onOpenChange={setIsResetConfirmOpen}
                title="Reset to Default Weights"
                description="Are you sure you want to reset all stage weights to the standard defaults? This action will overwrite your current weight settings."
                confirmLabel="Reset Weights"
                cancelLabel="Cancel"
                status="danger"
                onConfirm={confirmReset}
            />

            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>{headerContent}</div>
            </div>

            <SortableTable
                data={stages}
                columns={columns}
                isLoading={isLoading}
                onSave={handleSaveRow}
                onReorder={handleReorder}
                emptyMessage="No stages found. Click 'Add Stage' to create one."
            />
        </div>
    );
}
