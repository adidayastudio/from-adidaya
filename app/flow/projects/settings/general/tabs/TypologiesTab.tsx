"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { X, Check, Loader2, Trash2, Pencil, Save, GripVertical, Plus } from "lucide-react";
import { Select } from "@/shared/ui/primitives/select/select";
import { fetchTypologies, createTypology, updateTypology, deleteTypology, Typology } from "@/lib/api/templates-extended";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { SortableTable, Column } from "../components/SortableTable";

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

function AddModal({ isOpen, onClose, onAdd, typologies }: { isOpen: boolean; onClose: () => void; onAdd: (t: any) => void; typologies: Typology[] }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [parentId, setParentId] = useState<string>("");
    const [complexityLevel, setComplexityLevel] = useState("Medium");
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!code.trim() || !name.trim()) return;
        setIsSaving(true);
        try {
            await onAdd({
                code: code.toUpperCase(),
                name,
                parentId: parentId || null,
                complexityLevel,
                linkedProjectTypes: [],
                sortOrder: 0,
                isActive: true,
            });
            setCode("");
            setName("");
            setParentId("");
            setComplexityLevel("Medium");
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">Add Typology</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Code (3 Char)" placeholder="e.g. RES" maxLength={3} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                    <div>
                        <label className="text-sm font-medium text-neutral-700 block mb-1">Parent Typology (Optional)</label>
                        <Select
                            options={[
                                { label: "None (Top Level)", value: "" },
                                ...typologies.map(t => ({ label: `${t.name} (${t.code})`, value: t.id }))
                            ]}
                            value={parentId}
                            onChange={(val) => setParentId(val)}
                        />
                    </div>
                    <Input label="Name" placeholder="Residential" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input label="Name" placeholder="Residential" value={name} onChange={(e) => setName(e.target.value)} />
                    <div>
                        <label className="text-sm font-medium text-neutral-700 block mb-1">Complexity Level</label>
                        <Select
                            options={[
                                { label: "Low", value: "Low" },
                                { label: "Medium", value: "Medium" },
                                { label: "High", value: "High" }
                            ]}
                            value={complexityLevel}
                            onChange={(val) => setComplexityLevel(val)}
                        />
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

interface FlattenedTypology extends Typology {
    parentName?: string;
    isSubtypology?: boolean;
}

function TypologyExpandedRow({
    item,
    addingSubTypologyFor,
    setAddingSubTypologyFor,
    onAddSubTypology,
    onDeleteSubTypology
}: {
    item: Typology;
    addingSubTypologyFor: string | null;
    setAddingSubTypologyFor: (id: string | null) => void;
    onAddSubTypology: (parentId: string, name: string, code: string, complexity: string) => void;
    onDeleteSubTypology: (id: string) => void;
}) {
    const subTypologies = item.subTypologies || [];
    const isAdding = addingSubTypologyFor === item.id;
    const [newSubName, setNewSubName] = useState("");
    const [newSubCode, setNewSubCode] = useState("");
    const [newSubComplexity, setNewSubComplexity] = useState("Medium");

    return (
        <div className="p-4 bg-yellow-50/50 rounded-xl relative">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">Sub-Typologies</h4>
                <button
                    className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                    onClick={(e) => { e.stopPropagation(); setAddingSubTypologyFor(isAdding ? null : item.id); }}
                >
                    <Pencil className="w-3 h-3" /> Add Sub-Typology
                </button>
            </div>

            {isAdding && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-neutral-200 shadow-sm flex items-end gap-3 animate-in fade-in">
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-neutral-500 mb-1 block">Code</label>
                        <input className="w-full px-2 py-1.5 text-sm border rounded" placeholder="APT" value={newSubCode} onChange={e => setNewSubCode(e.target.value)} maxLength={3} />
                    </div>
                    <div className="flex-[2]">
                        <label className="text-xs font-semibold text-neutral-500 mb-1 block">Name</label>
                        <input className="w-full px-2 py-1.5 text-sm border rounded" placeholder="Apartment" value={newSubName} onChange={e => setNewSubName(e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-neutral-500 mb-1 block">Complexity</label>
                        <Select
                            options={[
                                { label: "Low", value: "Low" },
                                { label: "Medium", value: "Medium" },
                                { label: "High", value: "High" }
                            ]}
                            value={newSubComplexity}
                            onChange={(val) => setNewSubComplexity(val)}
                        />
                    </div>
                    <Button
                        className="bg-brand-red text-white h-[34px]"
                        icon={<Check className="w-3 h-3" />}
                        onClick={() => onAddSubTypology(item.id, newSubName, newSubCode, newSubComplexity)}
                    >
                        Save
                    </Button>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {subTypologies.map(sub => (
                    <div key={sub.id} className="inline-flex items-center gap-2 pl-3 pr-1 py-1 bg-white border border-neutral-200 rounded-full shadow-sm hover:border-neutral-300 transition-colors group">
                        <div className="flex flex-col leading-none">
                            <span className="text-xs font-bold text-neutral-900">{sub.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">{sub.code} • {sub.complexityLevel}</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteSubTypology(sub.id); }}
                            className="w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete Sub-Typology"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                {subTypologies.length === 0 && !isAdding && (
                    <div className="text-neutral-400 text-sm italic px-2">No sub-typologies defined.</div>
                )}

                {!isAdding && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setAddingSubTypologyFor(item.id); }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-neutral-300 text-neutral-400 hover:text-neutral-600 hover:border-neutral-400 hover:bg-white transition-all"
                        title="Add Sub-Typology"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function TypologiesTab({ isOpen = false, onClose = () => { } }: Props) {
    const [typologies, setTypologies] = useState<Typology[]>([]);
    const [originalOrder, setOriginalOrder] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    // Check if order has changed
    const hasOrderChanges = JSON.stringify(typologies.map(t => t.id)) !== JSON.stringify(originalOrder);

    useEffect(() => { loadTypologies(); }, []);

    const loadTypologies = async () => {
        setIsLoading(true);
        try {
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            const data = await fetchTypologies(wsId);
            const sorted = [...data].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setTypologies(sorted);
            setOriginalOrder(sorted.map(t => t.id));
        } catch (error) {
            console.error("Failed to load typologies:", error instanceof Error ? error.message : JSON.stringify(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (item: any) => {
        try {
            await createTypology(workspaceId, item);
            await loadTypologies();
        } catch (error) {
            console.error("Failed to add typology:", error instanceof Error ? error.message : JSON.stringify(error));
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this typology?")) {
            try {
                await deleteTypology(id, workspaceId);
                await loadTypologies();
            } catch (error) {
                console.error("Failed to delete typology:", error);
            }
        }
    };

    const handleSaveRow = async (item: FlattenedTypology) => {
        try {
            await updateTypology(item.id, workspaceId, {
                code: item.code,
                name: item.name,
                complexityLevel: item.complexityLevel,
                sortOrder: item.sortOrder
            });
            await loadTypologies();
        } catch (error) {
            console.error("Failed to update typology:", error);
        }
    };

    const handleReorder = (items: Typology[]) => {
        setTypologies(items);
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            await Promise.all(typologies.map((item, index) =>
                updateTypology(item.id, workspaceId, { sortOrder: index })
            ));
            setOriginalOrder(typologies.map(t => t.id));
        } catch (error) {
            console.error("Failed to save order:", error);
            await loadTypologies();
        } finally {
            setIsSavingOrder(false);
        }
    };

    // State for managing expanded rows manually since we're using a different structure
    const [expandedTypologyId, setExpandedTypologyId] = useState<string | null>(null);
    const [addingSubTypologyFor, setAddingSubTypologyFor] = useState<string | null>(null);

    const handleAddSubTypology = async (parentId: string, name: string, code: string, complexity: string) => {
        try {
            await createTypology(workspaceId, {
                code: code.toUpperCase(),
                name,
                parentId,
                complexityLevel: complexity,
                linkedProjectTypes: [],
                sortOrder: 0,
                isActive: true
            });
            await loadTypologies();
            setAddingSubTypologyFor(null);
        } catch (error) {
            console.error("Failed to add subtypology:", error);
        }
    };

    const renderExpandedRow = (item: Typology) => (
        <TypologyExpandedRow
            item={item}
            addingSubTypologyFor={addingSubTypologyFor}
            setAddingSubTypologyFor={setAddingSubTypologyFor}
            onAddSubTypology={handleAddSubTypology}
            onDeleteSubTypology={(id) => handleDelete(id)}
        />
    );

    const columns: Column<Typology>[] = [
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
            key: "name",
            header: "TYPOLOGY",
            sortable: true,
            render: (item, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.name || ""}
                            onChange={(e) => setDraft?.({ name: e.target.value })}
                        />
                    );
                }
                // Pill styling for parent
                return (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-900 text-white text-sm font-medium shadow-sm">
                            {item.name}
                        </span>
                    </div>
                );
            }
        },
        {
            key: "subCount", // Virtual key
            header: "SUBTYPOLOGY",
            render: (item) => (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 font-medium">
                        {item.subTypologies?.length || 0} Typologies
                    </span>
                </div>
            )
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
                    <span>Drag rows to reorder. <strong>Order determines sorting in menus.</strong> Click  to manage sub-typologies.</span>
                </div>
                {hasOrderChanges && (
                    <Button
                        onClick={handleSaveOrder}
                        disabled={isSavingOrder}
                        icon={isSavingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        className="bg-brand-red hover:bg-brand-red-hover text-white !rounded-full px-5"
                    >
                        {isSavingOrder ? "Saving..." : "Save Config"}
                    </Button>
                )}
            </div>

            <SortableTable
                data={typologies}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No typologies found"
                onSave={handleSaveRow}
                onReorder={handleReorder}
                renderExpandedRow={renderExpandedRow}
                expandedRowId={expandedTypologyId}
                onExpandRow={setExpandedTypologyId}
            />

            <AddModal isOpen={isOpen} onClose={onClose} onAdd={handleAdd} typologies={typologies} />
        </div>
    );
}
