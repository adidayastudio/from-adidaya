"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { X, Check, Loader2, Trash2, Pencil, Plus } from "lucide-react";
import { fetchProjectTypes, createProjectType, updateProjectType, deleteProjectType, ProjectTypeTemplate, fetchDefaultWorkspaceId, StageTemplate } from "@/lib/api/templates";
import { SortableTable, Column } from "../components/SortableTable";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

function AddTypeModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (type: any) => void }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!code.trim() || !name.trim()) return;
        setIsSaving(true);
        try {
            await onAdd({
                projectTypeId: crypto.randomUUID(),
                code: code.toUpperCase(),
                name,
                description,
                isActive: true,
                icon: "Building2",
                color: "bg-blue-500"
            });
            setCode("");
            setName("");
            setDescription("");
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">Add Scope</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Code (3 Char)" placeholder="e.g. BLD" maxLength={3} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                    <Input label="Scope Name" placeholder="Build Only" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input label="Description (Optional)" placeholder="Construction only scope" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} onClick={handleSubmit} disabled={isSaving} className="bg-brand-red hover:bg-brand-red-hover text-white">
                        {isSaving ? "Adding..." : "Add"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Extended interface to include current stages for buffering
interface ScopeTypeWithStages extends ProjectTypeTemplate {
    stageCount?: number;
    currentStages?: StageTemplate[]; // Active stages
}

interface Props {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function ScopeTypesTab({ isOpen = false, onClose = () => { } }: Props) {
    const [types, setTypes] = useState<ScopeTypeWithStages[]>([]);
    const [allStages, setAllStages] = useState<StageTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            const [typesData, stagesData] = await Promise.all([
                fetchProjectTypes(wsId),
                supabase.from('stage_templates').select('*').eq('workspace_id', wsId).order('position')
            ]);

            // Map raw DB response to StageTemplate
            const stages: StageTemplate[] = (stagesData.data || []).map((row: any) => ({
                id: row.id,
                workspaceId: row.workspace_id,
                projectTypeId: row.project_type_id,
                stageCode: row.stage_code,
                stageName: row.stage_name,
                stageNameId: row.stage_name_id,
                displayCode: row.display_code,
                position: row.position,
                weightDefault: parseFloat(row.weight_default),
                isActive: row.is_active,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));

            // Enrich types with active stages
            const enrichedTypes = typesData.map(t => {
                const typeStages = stages.filter(s => s.projectTypeId === t.projectTypeId);
                const activeStages = typeStages.filter(s => s.isActive);
                return {
                    ...t,
                    stageCount: activeStages.length,
                    currentStages: activeStages // Needed for initial state
                };
            });

            setTypes(enrichedTypes);
            setAllStages(stages);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddType = async (newType: any) => {
        try {
            await createProjectType(workspaceId, newType);
            await loadData();
        } catch (error) {
            console.error("Failed to add type:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this scope type?")) {
            try {
                await deleteProjectType(id, workspaceId);
                await loadData();
            } catch (error) {
                console.error("Failed to delete type:", error);
            }
        }
    };

    const handleSaveRow = async (item: ScopeTypeWithStages) => {
        try {
            // 1. Update project type details
            await updateProjectType(item.projectTypeId, workspaceId, {
                code: item.code,
                name: item.name,
                description: item.description
            });

            // 2. Sync stages (Buffered Edits)
            if (item.currentStages) {
                const typeStages = allStages.filter(s => s.projectTypeId === item.projectTypeId);
                const newActiveIds = new Set(item.currentStages.map(s => s.id));

                // Find stages that changed status
                const updates = typeStages.map(stage => {
                    const shouldBeActive = newActiveIds.has(stage.id);
                    if (stage.isActive !== shouldBeActive) {
                        return supabase.from('stage_templates').update({ is_active: shouldBeActive }).eq('id', stage.id);
                    }
                    return null;
                }).filter(Boolean);

                if (updates.length > 0) {
                    await Promise.all(updates);
                }
            }

            await loadData();
        } catch (error) {
            console.error("Failed to update type:", error);
        }
    };

    // Helper to toggle stage in DRAFT state
    const toggleStageDraft = (
        stage: StageTemplate,
        isActive: boolean,
        draft: Partial<ScopeTypeWithStages>,
        setDraft: (val: Partial<ScopeTypeWithStages>) => void,
        originalItem: ScopeTypeWithStages
    ) => {
        // Use draft.currentStages if it exists, otherwise use originalItem.currentStages
        const currentActive = draft.currentStages || originalItem.currentStages || [];

        let newActive;
        if (isActive) {
            // Add if not present
            if (!currentActive.find(s => s.id === stage.id)) {
                newActive = [...currentActive, stage];
            } else {
                newActive = currentActive;
            }
        } else {
            // Remove
            newActive = currentActive.filter(s => s.id !== stage.id);
        }

        setDraft({ currentStages: newActive });
    };

    const [addingStageForType, setAddingStageForType] = useState<string | null>(null);

    const renderExpandedRow = (
        type: ScopeTypeWithStages,
        isEditing?: boolean,
        draft?: Partial<ScopeTypeWithStages>,
        setDraft?: (val: Partial<ScopeTypeWithStages>) => void
    ) => {
        // Determine which stages to show: Draft or Persisted
        const activeStages = (isEditing && draft?.currentStages)
            ? draft.currentStages
            : (type.currentStages || []);

        const typeAllStages = allStages.filter(s => s.projectTypeId === type.projectTypeId);
        // Inactive list for the "Add" popover - show ALL available stages that are not currently active
        const availableStages = typeAllStages.filter(s => !activeStages.some(active => active.id === s.id));

        const isAdding = addingStageForType === type.projectTypeId;

        if (!isEditing && activeStages.length === 0) {
            return <div className="p-4 text-center text-neutral-500 italic">No stages defined. Enable Edit Mode to add stages.</div>;
        }

        return (
            <div className="p-4 bg-yellow-50/50 rounded-xl relative">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">Included Stages</h4>

                    {/* Only allow adding if Editing */}
                    {isEditing && (
                        <div className="relative">
                            <button
                                className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); setAddingStageForType(isAdding ? null : type.projectTypeId); }}
                            >
                                <Plus className="w-3 h-3" /> Add Stage
                            </button>

                            {isAdding && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-neutral-100 z-10 overflow-hidden">
                                    <div className="p-3 border-b border-neutral-100 bg-neutral-50">
                                        <h5 className="text-xs font-bold text-neutral-700 uppercase">Select Stage to Add</h5>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {availableStages.length === 0 ? (
                                            <div className="p-3 text-xs text-neutral-400 italic text-center">All stages included</div>
                                        ) : (
                                            availableStages.map(stage => (
                                                <button
                                                    key={stage.id}
                                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-neutral-700 flex items-center justify-between group"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (setDraft) toggleStageDraft(stage, true, draft || {}, setDraft, type);
                                                    }}
                                                >
                                                    <span>{stage.stageName}</span>
                                                    <span className="text-[10px] text-neutral-400 font-mono group-hover:text-blue-500">{stage.stageCode}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-neutral-100 bg-neutral-50 text-center">
                                        <button
                                            className="text-xs text-neutral-500 hover:text-neutral-800"
                                            onClick={(e) => { e.stopPropagation(); setAddingStageForType(null); }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )}
                            {isAdding && (
                                <div className="fixed inset-0 z-0" onClick={(e) => { e.stopPropagation(); setAddingStageForType(null); }} />
                            )}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeStages.map(stage => (
                        <div key={stage.id} className="flex items-center gap-3 p-3 bg-white border border-neutral-100 rounded-lg shadow-sm group hover:border-red-100 transition-colors">
                            <div className="flex flex-col flex-1">
                                <span className="text-sm font-medium text-neutral-900">{stage.stageName}</span>
                                <span className="text-xs text-neutral-500 font-mono">{stage.displayCode || stage.stageCode}</span>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (setDraft) toggleStageDraft(stage, false, draft || {}, setDraft, type);
                                    }}
                                    className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Remove Stage"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    {activeStages.length === 0 && (
                        <div className="col-span-full py-4 text-center text-sm text-neutral-400 border-2 border-dashed border-neutral-200 rounded-lg">
                            No stages included.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const columns: Column<ScopeTypeWithStages>[] = [
        {
            key: "code",
            header: "CODE",
            width: "100px",
            sortable: true,
            render: (type, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-20 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm uppercase font-mono shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.code || ""}
                            maxLength={3}
                            onChange={(e) => setDraft?.({ code: e.target.value.toUpperCase() })}
                        />
                    );
                }
                return (
                    <span className="px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded font-mono font-semibold text-neutral-700 text-sm">
                        {type.code || "-"}
                    </span>
                );
            }
        },
        {
            key: "name",
            header: "SCOPE TYPE",
            sortable: true,
            render: (type, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.name || ""}
                            onChange={(e) => setDraft?.({ name: e.target.value })}
                        />
                    );
                }
                return <span className="font-bold text-neutral-900 text-sm">{type.name}</span>;
            }
        },
        {
            key: "stageCount",
            header: "APPLICABLE STAGES",
            sortable: true,
            render: (type) => (
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-bold uppercase tracking-wide">
                        {type.stageCount ? `${type.stageCount} Stages` : "No Stages"}
                    </span>
                </div>
            )
        },
        {
            key: "actions",
            header: "",
            width: "100px",
            render: (type, isEditing, draft, setDraft, onEditStart, onSave, onCancel) => {
                if (isEditing) {
                    return (
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onSave?.(); }}
                                className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                                title="Save"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
                                className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-500 rounded-full hover:bg-neutral-200 transition-colors"
                                title="Cancel"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )
                }
                return (
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); if (onEditStart) onEditStart(type); }}
                            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(type.projectTypeId); }}
                            className="p-2 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )
            }
        }
    ];

    return (
        <div className="space-y-4">
            <SortableTable
                data={types}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No scope types found"
                onSave={handleSaveRow}
                renderExpandedRow={renderExpandedRow}
            />

            <AddTypeModal isOpen={isOpen} onClose={onClose} onAdd={handleAddType} />
        </div>
    );
}

