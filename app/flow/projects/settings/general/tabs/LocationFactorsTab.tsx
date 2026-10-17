"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Trash2, X, Check, Loader2, Pencil } from "lucide-react";
import { fetchLocationFactors, createLocationFactor, updateLocationFactor, deleteLocationFactor, LocationFactor } from "@/lib/api/templates-extended";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { SortableTable, Column } from "../components/SortableTable";

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

function AddModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (loc: any) => void }) {
    const [code, setCode] = useState("");
    const [province, setProvince] = useState("");
    const [city, setCity] = useState("");
    const [regionalFactor, setRegionalFactor] = useState("1.0");
    const [difficultyFactor, setDifficultyFactor] = useState("1.0");
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!code.trim() || !province.trim()) return;
        setIsSaving(true);
        try {
            await onAdd({
                code: code.toUpperCase(),
                province,
                city,
                regionalFactor: parseFloat(regionalFactor),
                difficultyFactor: parseFloat(difficultyFactor),
                isActive: true,
            });
            setCode("");
            setProvince("");
            setCity("");
            setRegionalFactor("1.0");
            setDifficultyFactor("1.0");
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">Add Location</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Code (3 Char)" placeholder="e.g. JKT" maxLength={3} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                    <Input label="Province" placeholder="DKI Jakarta" value={province} onChange={(e) => setProvince(e.target.value)} />
                    <Input label="City" placeholder="Jakarta Selatan" value={city} onChange={(e) => setCity(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Regional Factor" type="number" step="0.01" value={regionalFactor} onChange={(e) => setRegionalFactor(e.target.value)} />
                        <Input label="Difficulty Factor" type="number" step="0.01" value={difficultyFactor} onChange={(e) => setDifficultyFactor(e.target.value)} />
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

export default function LocationFactorsTab({ isOpen = false, onClose = () => { } }: Props) {
    const [locations, setLocations] = useState<LocationFactor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    useEffect(() => { loadLocations(); }, []);

    const loadLocations = async () => {
        setIsLoading(true);
        try {
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            const data = await fetchLocationFactors(wsId);
            setLocations(data);
        } catch (error) {
            console.error("Failed to load location factors:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (loc: any) => {
        try {
            await createLocationFactor(workspaceId, loc);
            await loadLocations();
        } catch (error) {
            console.error("Failed to add location:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this location factor?")) {
            try {
                await deleteLocationFactor(id, workspaceId);
                await loadLocations();
            } catch (error) {
                console.error("Failed to delete location:", error);
            }
        }
    };

    const handleSaveRow = async (item: LocationFactor) => {
        try {
            await updateLocationFactor(item.id, workspaceId, {
                code: item.code,
                province: item.province,
                city: item.city,
                regionalFactor: item.regionalFactor,
                difficultyFactor: item.difficultyFactor
            });
            await loadLocations();
        } catch (error) {
            console.error("Failed to update location:", error);
        }
    };

    const columns: Column<LocationFactor>[] = [
        {
            key: "code",
            header: "CODE",
            width: "100px",
            sortable: true,
            render: (loc, isEditing, draft, setDraft) => {
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
                        {loc.code || "-"}
                    </span>
                );
            }
        },
        {
            key: "province",
            header: "PROVINCE",
            sortable: true,
            render: (loc, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.province || ""}
                            onChange={(e) => setDraft?.({ province: e.target.value })}
                        />
                    );
                }
                return <span className="font-bold text-neutral-900 text-sm">{loc.province}</span>;
            }
        },
        {
            key: "city",
            header: "CITY",
            sortable: true,
            render: (loc, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.city || ""}
                            onChange={(e) => setDraft?.({ city: e.target.value })}
                        />
                    );
                }
                return <span className="text-neutral-600 text-sm">{loc.city || "-"}</span>;
            }
        },
        {
            key: "regionalFactor",
            header: "REG. FACTOR",
            width: "120px",
            sortable: true,
            render: (loc, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            type="number" step="0.01"
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.regionalFactor || 0}
                            onChange={(e) => setDraft?.({ regionalFactor: parseFloat(e.target.value) })}
                        />
                    );
                }
                return <span className="font-mono text-neutral-700 font-medium">{loc.regionalFactor.toFixed(2)}</span>;
            }
        },
        {
            key: "difficultyFactor",
            header: "DIFF. FACTOR",
            width: "120px",
            sortable: true,
            render: (loc, isEditing, draft, setDraft) => {
                if (isEditing) {
                    return (
                        <input
                            type="number" step="0.01"
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                            value={draft?.difficultyFactor || 0}
                            onChange={(e) => setDraft?.({ difficultyFactor: parseFloat(e.target.value) })}
                        />
                    );
                }
                return <span className="font-mono text-neutral-700 font-medium">{loc.difficultyFactor.toFixed(2)}</span>;
            }
        },
        {
            key: "actions",
            header: "",
            width: "100px",
            render: (loc, isEditing, draft, setDraft, onEditStart, onSave, onCancel) => {
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
                            onClick={(e) => { e.stopPropagation(); if (onEditStart) onEditStart(loc); }}
                            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(loc.id); }}
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
                data={locations}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No location factors found"
                onSave={handleSaveRow}
            />

            <AddModal isOpen={isOpen} onClose={onClose} onAdd={handleAdd} />
        </div>
    );
}
