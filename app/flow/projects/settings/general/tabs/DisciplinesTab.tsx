"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Trash2, X, Check, Loader2, Pencil, Save, GripVertical } from "lucide-react";
import { fetchDisciplines, createDiscipline, updateDiscipline, deleteDiscipline, Discipline } from "@/lib/api/templates-extended";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { SortableTable, Column } from "../components/SortableTable";

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

function AddModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (d: any) => void }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [nameId, setNameId] = useState("");
    const [color, setColor] = useState("bg-purple-200");
    const [isSaving, setIsSaving] = useState(false);

    // Pastel colors
    const colors = [
        "bg-red-200", "bg-orange-200", "bg-amber-200",
        "bg-yellow-200", "bg-lime-200", "bg-green-200",
        "bg-emerald-200", "bg-teal-200", "bg-cyan-200",
        "bg-sky-200", "bg-blue-200", "bg-indigo-200",
        "bg-violet-200", "bg-purple-200", "bg-fuchsia-200",
        "bg-pink-200", "bg-rose-200", "bg-stone-200"
    ];

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!code.trim() || !name.trim()) return;
        setIsSaving(true);
        try {
            await onAdd({
                code: code.toUpperCase(),
                nameEn: name,
                // @ts-ignore: Adding extended field
                nameId: nameId,
                color,
                sortOrder: 0,
                isActive: true,
            });
            setCode("");
            setName("");
            setNameId("");
            setColor("bg-purple-200");
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">Add Discipline</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Code (3 Char)" placeholder="e.g. ARC" maxLength={3} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                    <Input label="Name (English)" placeholder="Architecture" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input label="Name (Indonesia)" placeholder="Arsitektur" value={nameId} onChange={(e) => setNameId(e.target.value)} />
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-neutral-700">Color Tag</label>
                        <div className="flex flex-wrap gap-2">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    className={`w-6 h-6 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-1 ring-neutral-900' : ''}`}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>
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

export default function DisciplinesTab({ isOpen = false, onClose = () => { } }: Props) {
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [originalOrder, setOriginalOrder] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    // Check if order has changed
    const hasOrderChanges = JSON.stringify(disciplines.map(d => d.id)) !== JSON.stringify(originalOrder);

    useEffect(() => { loadDisciplines(); }, []);

    const loadDisciplines = async () => {
        setIsLoading(true);
        try {
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            const data = await fetchDisciplines(wsId);
            // Sort by sortOrder before setting
            const sorted = [...data].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setDisciplines(sorted);
            setOriginalOrder(sorted.map(d => d.id));
        } catch (error) {
            console.error("Failed to load disciplines:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (item: any) => {
        try {
            await createDiscipline(workspaceId, item);
            await loadDisciplines();
        } catch (error) {
            console.error("Failed to add discipline:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this discipline?")) {
            try {
                await deleteDiscipline(id, workspaceId);
                await loadDisciplines();
            } catch (error) {
                console.error("Failed to delete discipline:", error);
            }
        }
    };

    const handleSaveRow = async (item: Discipline) => {
        try {
            await updateDiscipline(item.id, workspaceId, {
                code: item.code,
                nameEn: item.nameEn,
                // @ts-ignore
                nameId: item.nameId,
                color: item.color,
                sortOrder: item.sortOrder
            });
            await loadDisciplines();
        } catch (error) {
            console.error("Failed to update discipline:", error);
        }
    };

    const handleReorder = (items: Discipline[]) => {
        // Only update UI - don't save yet
        setDisciplines(items);
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            // Update sortOrder for each item based on new index
            await Promise.all(disciplines.map((item, index) =>
                updateDiscipline(item.id, workspaceId, { sortOrder: index })
            ));
            // Update original order to match current
            setOriginalOrder(disciplines.map(d => d.id));
        } catch (error) {
            console.error("Failed to save order:", error);
            // Reload to revert on error
            await loadDisciplines();
        } finally {
            setIsSavingOrder(false);
        }
    };

    const columns: Column<Discipline>[] = [
        {
            key: "code",
            header: "CODE",
            width: "100px",
            sortable: true,
            render: (item, isEditing, draft, setDraft) => {
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
                        {item.code}
                    </span>
                );
            }
        },
        {
            key: "nameEn",
            header: "NAME (EN)",
            sortable: true,
            render: (item, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.nameEn || ""}
                            onChange={(e) => setDraft?.({ nameEn: e.target.value })}
                        />
                    );
                }
                return <span className="font-bold text-neutral-900 text-sm">{item.nameEn}</span>;
            }
        },
        {
            key: "nameId",
            header: "NAME (ID)",
            sortable: true,
            render: (item: any, isEditing, draft: any, setDraft) => { // using any for item/draft as nameId isn't on interface yet
                if (isEditing) {
                    return (
                        <input
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.nameId || ""}
                            onChange={(e) => setDraft?.({ nameId: e.target.value })}
                        />
                    );
                }
                return <span className="font-medium text-neutral-600 text-sm">{item.nameId || "-"}</span>;
            }
        },
        {
            key: "color",
            header: "COLOR TAG",
            width: "120px",
            render: (item, isEditing, draft, setDraft) => {
                const colors = [
                    "bg-red-200", "bg-orange-200", "bg-amber-200",
                    "bg-yellow-200", "bg-lime-200", "bg-green-200",
                    "bg-emerald-200", "bg-teal-200", "bg-cyan-200",
                    "bg-sky-200", "bg-blue-200", "bg-indigo-200",
                    "bg-violet-200", "bg-purple-200", "bg-fuchsia-200",
                    "bg-pink-200", "bg-rose-200", "bg-stone-200"
                ];

                if (isEditing) {
                    return (
                        <div className="flex flex-wrap gap-1.5 w-64">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    className={`w-5 h-5 rounded-full ${c} ${draft?.color === c ? 'ring-2 ring-offset-1 ring-neutral-400' : 'hover:ring-2 hover:ring-offset-1 hover:ring-neutral-200'} transition-all`}
                                    onClick={() => setDraft?.({ color: c })}
                                />
                            ))}
                        </div>
                    );
                }
                return <div className={`w-6 h-6 rounded-full ${item.color} shadow-sm border border-black/5`} />;
            }
        },
        {
            key: "actions",
            header: "",
            width: "100px",
            render: (item, isEditing, draft, setDraft, onEditStart, onSave, onCancel) => {
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
                            onClick={(e) => { e.stopPropagation(); if (onEditStart) onEditStart(item); }}
                            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
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
                    <span>Drag rows to reorder. <strong>This order determines WBS discipline sequence.</strong></span>
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
                data={disciplines}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No disciplines found"
                onSave={handleSaveRow}
                onReorder={handleReorder}
            />

            <AddModal isOpen={isOpen} onClose={onClose} onAdd={handleAdd} />
        </div>
    );
}
