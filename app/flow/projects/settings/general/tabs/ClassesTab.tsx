"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Plus, Trash2, X, Check, Loader2, Pencil, Save, GripVertical } from "lucide-react";
import { fetchClasses, createClass, updateClass, deleteClass, ClassTemplate } from "@/lib/api/templates-extended";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { SortableTable, Column } from "../components/SortableTable";

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

function AddModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (cls: any) => void }) {
    const [classCode, setClassCode] = useState("");
    const [description, setDescription] = useState("");
    const [finishLevel, setFinishLevel] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!classCode.trim()) return;
        setIsSaving(true);
        try {
            await onAdd({
                classCode: classCode.toUpperCase(),
                description,
                costMultiplierS: 0,
                costMultiplierA: 0,
                costMultiplierM: 0,
                costMultiplierI: 0,
                costMultiplierL: 0,
                finishLevel,
                sortOrder: 0,
                isActive: true,
            });
            setClassCode("");
            setDescription("");
            setFinishLevel("");
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">Add Class</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Code (e.g. A, B, C, D, E)" placeholder="e.g. A" maxLength={1} value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} />
                    <Input label="Class Name" placeholder="Luxury" value={description} onChange={(e) => setDescription(e.target.value)} />
                    <Input label="Finish Level" placeholder="High End" value={finishLevel} onChange={(e) => setFinishLevel(e.target.value)} />
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

interface Props {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function ClassesTab({ isOpen = false, onClose = () => { } }: Props) {
    const [classes, setClasses] = useState<ClassTemplate[]>([]);
    const [originalOrder, setOriginalOrder] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    // Check if order has changed
    const hasOrderChanges = JSON.stringify(classes.map(c => c.id)) !== JSON.stringify(originalOrder);

    useEffect(() => { loadClasses(); }, []);

    const loadClasses = async () => {
        setIsLoading(true);
        try {
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            const data = await fetchClasses(wsId);
            const sorted = [...data].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setClasses(sorted);
            setOriginalOrder(sorted.map(c => c.id));
        } catch (error) {
            console.error("Failed to load classes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (cls: any) => {
        try {
            await createClass(workspaceId, cls);
            await loadClasses();
        } catch (error) {
            console.error("Failed to add class:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this class?")) {
            try {
                await deleteClass(id, workspaceId);
                await loadClasses();
            } catch (error) {
                console.error("Failed to delete class:", error);
            }
        }
    };

    const handleSaveRow = async (item: ClassTemplate) => {
        try {
            await updateClass(item.id, workspaceId, {
                classCode: item.classCode,
                description: item.description,
                finishLevel: item.finishLevel,
                sortOrder: item.sortOrder
            });
            await loadClasses();
        } catch (error) {
            console.error("Failed to update class:", error);
        }
    };

    const handleReorder = (items: ClassTemplate[]) => {
        setClasses(items);
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            await Promise.all(classes.map((item, index) =>
                updateClass(item.id, workspaceId, { sortOrder: index })
            ));
            setOriginalOrder(classes.map(c => c.id));
        } catch (error) {
            console.error("Failed to save order:", error);
            await loadClasses();
        } finally {
            setIsSavingOrder(false);
        }
    };

    const columns: Column<ClassTemplate>[] = [
        {
            key: "classCode",
            header: "CODE",
            width: "100px",
            sortable: true,
            render: (cls, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-20 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm uppercase font-mono shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.classCode || ""}
                            maxLength={1}
                            onChange={(e) => setDraft?.({ classCode: e.target.value.toUpperCase() })}
                        />
                    );
                }
                return (
                    <span className="px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded font-mono font-semibold text-neutral-700 text-sm">
                        {cls.classCode}
                    </span>
                );
            }
        },
        {
            key: "description",
            header: "CLASS",
            sortable: true,
            render: (cls, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.description || ""}
                            onChange={(e) => setDraft?.({ description: e.target.value })}
                        />
                    );
                }
                return <span className="font-bold text-neutral-900 text-sm">{cls.description}</span>;
            }
        },
        {
            key: "finishLevel",
            header: "FINISH LEVEL",
            sortable: true,
            render: (cls, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.finishLevel || ""}
                            onChange={(e) => setDraft?.({ finishLevel: e.target.value })}
                        />
                    );
                }
                return <span className="text-neutral-600 text-sm">{cls.finishLevel || "-"}</span>;
            }
        },
        {
            key: "actions",
            header: "",
            width: "100px",
            render: (cls, isEditing, draft, setDraft, onEditStart, onSave, onCancel) => {
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
                            onClick={(e) => { e.stopPropagation(); if (onEditStart) onEditStart(cls); }}
                            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(cls.id); }}
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
            <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-neutral-400" />
                    <span>Drag rows to reorder. <strong>Order determines baseline multiplier sequence.</strong></span>
                </div>
                {hasOrderChanges && (
                    <Button
                        onClick={handleSaveOrder}
                        disabled={isSavingOrder}
                        icon={isSavingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        className="bg-brand-red hover:bg-brand-red-hover text-white !rounded-full px-5"
                    >
                        {isSavingOrder ? "Saving..." : "Save Order"}
                    </Button>
                )}
            </div>
            <SortableTable
                data={classes}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No classes found"
                onSave={handleSaveRow}
                onReorder={handleReorder}
            />

            <AddModal isOpen={isOpen} onClose={onClose} onAdd={handleAdd} />
        </div>
    );
}
