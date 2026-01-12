"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Save, RotateCcw, Plus, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { supabase } from "@/lib/supabaseClient";

// Local WBS Item type matching WBSList expectations
type WBSItemLocal = {
    id: string;
    code: string;
    nameEn: string;
    nameId?: string;
    children?: WBSItemLocal[];
    indent_level?: number;
    parent_id?: string | null;
    sort_order?: number;
};

// Reuse WBSList component
import WBSList from "@/components/flow/projects/project-detail/setup/wbs/WBSList";

// API for Disciplines sync
import { fetchDisciplines, createDiscipline, type Discipline } from "@/lib/api/templates";

// Default mandatory disciplines (SAM)
const MANDATORY_CODES = ["S", "A", "M"];

type ViewMode = "SUMMARY" | "BREAKDOWN";

interface Props {
    workspaceId: string;
    projectTypeId: string;
    headerContent?: React.ReactNode;
}

// Add Discipline Modal - Grand Design
function AddDisciplineModal({
    isOpen,
    onClose,
    onAdd,
    existingCodes
}: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (code: string, nameEn: string, nameId: string) => void;
    existingCodes: string[];
}) {
    const [code, setCode] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [nameId, setNameId] = useState("");
    const [error, setError] = useState("");

    // Real-time code validation with debounce
    useEffect(() => {
        if (!code.trim()) {
            setError("");
            return;
        }

        const timer = setTimeout(() => {
            const upperCode = code.toUpperCase().trim();
            if (existingCodes.includes(upperCode)) {
                setError(`Code "${upperCode}" already exists`);
            } else {
                setError("");
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [code, existingCodes]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const upperCode = code.toUpperCase().trim();

        if (!upperCode) {
            setError("Code is required");
            return;
        }
        if (existingCodes.includes(upperCode)) {
            setError(`Code "${upperCode}" already exists`);
            return;
        }
        if (!nameEn.trim()) {
            setError("English name is required");
            return;
        }

        onAdd(upperCode, nameEn.trim(), nameId.trim() || nameEn.trim());
        setCode("");
        setNameEn("");
        setNameId("");
        setError("");
        onClose();
    };

    const handleClose = () => {
        setCode("");
        setNameEn("");
        setNameId("");
        setError("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                onClick={handleClose}
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900">Add New Discipline</h2>
                        <p className="text-xs text-neutral-500 mt-1">Create a new discipline category for WBS.</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1">
                                Discipline Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
                                placeholder="e.g., C, X, F"
                                className="w-full px-4 py-2.5 border border-neutral-200 rounded-pill focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none uppercase text-sm"
                                maxLength={3}
                                autoFocus
                            />
                            <p className="text-xs text-neutral-400 mt-1.5">Single letter or short code (max 3 chars). Must be unique.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1">
                                Name (English) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={nameEn}
                                onChange={(e) => setNameEn(e.target.value)}
                                placeholder="e.g., Civil Works"
                                className="w-full px-4 py-2.5 border border-neutral-200 rounded-pill focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1">
                                Name (Indonesian)
                            </label>
                            <input
                                type="text"
                                value={nameId}
                                onChange={(e) => setNameId(e.target.value)}
                                placeholder="e.g., Pekerjaan Sipil"
                                className="w-full px-4 py-2.5 border border-neutral-200 rounded-pill focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-sm"
                            />
                            <p className="text-xs text-neutral-400 mt-1.5">Optional, defaults to English name.</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-neutral-100 p-6 bg-neutral-50 rounded-b-2xl flex items-center justify-end gap-3">
                        <Button variant="outline" type="button" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={!code.trim() || !nameEn.trim()}
                        >
                            Add Discipline
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BallparkTab({ workspaceId, projectTypeId, headerContent }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>("SUMMARY");
    const [wbsItems, setWbsItems] = useState<WBSItemLocal[]>([]);
    const [loading, setLoading] = useState(true);

    // Disciplines from Settings General
    const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch Data
    const loadData = useCallback(async () => {
        if (!workspaceId) return;
        setLoading(true);

        const [wbsRes, discRes] = await Promise.all([
            supabase.from('work_breakdown_structure')
                .select('*')
                .eq('workspace_id', workspaceId)
                // .order('sort_order', { ascending: true }) // Column missing in DB
                .order('created_at', { ascending: true }),
            fetchDisciplines(workspaceId)
        ]);

        if (discRes) setAllDisciplines(discRes);

        if (wbsRes.data) {
            // Build Tree
            const nodes = wbsRes.data.map((d: any) => ({
                id: d.id,
                code: d.code,
                nameEn: d.name,
                nameId: d.description,
                level: d.level,
                indent_level: d.indent_level || 0,
                parent_id: d.parent_id,
                sort_order: d.sort_order || 0,
                children: []
            }));

            // Reconstruct Hierarchy
            const idMap = new Map<string, WBSItemLocal>();
            nodes.forEach((n: any) => idMap.set(n.id, n));

            const roots: WBSItemLocal[] = [];
            nodes.forEach((n: any) => {
                if (n.parent_id && idMap.has(n.parent_id)) {
                    const parent = idMap.get(n.parent_id)!;
                    parent.children = parent.children || [];
                    parent.children.push(n);
                } else {
                    roots.push(n);
                }
            });

            setWbsItems(roots);
        }
        setLoading(false);
    }, [workspaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    // --- Computed ---

    // All existing codes
    const allExistingCodes = useMemo(() => {
        const wbsCodes = wbsItems.map(item => item.code);
        const settingsCodes = allDisciplines.map(d => d.code);
        return [...new Set([...wbsCodes, ...settingsCodes])];
    }, [wbsItems, allDisciplines]);

    // Available Disciplines
    const availableDisciplines = useMemo(() => {
        const existingCodes = wbsItems.map(item => item.code);
        return allDisciplines.filter(d =>
            !existingCodes.includes(d.code) &&
            !MANDATORY_CODES.includes(d.code)
        );
    }, [allDisciplines, wbsItems]);


    // BALLPARK DEFAULTS: Summary L1, Breakdown L1-L2
    const visibleTree = useMemo(() => {
        const maxIndent = viewMode === "SUMMARY" ? 0 : 1; // 0=L1, 1=L2

        const prune = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
            return nodes.filter(n => (n.indent_level || 0) <= maxIndent).map(n => ({
                ...n,
                children: n.children ? prune(n.children) : undefined
            }));
        };
        return prune(wbsItems);
    }, [wbsItems, viewMode]);


    // --- Actions ---

    // Add Discipline (Add Root L1)
    const handleAddDiscipline = async (discipline: Discipline) => {
        const newItem = {
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            project_type_id: projectTypeId,
            parent_id: null,
            code: discipline.code,
            name: discipline.nameEn,
            description: discipline.nameId,
            indent_level: 0,
            level: 'L1',
            sort_order: wbsItems.length + 1
        };

        // Optimistic
        setWbsItems(prev => [...prev, {
            id: newItem.id,
            code: newItem.code,
            nameEn: newItem.name,
            nameId: newItem.description,
            indent_level: newItem.indent_level,
            children: []
        }]);

        await supabase.from('work_breakdown_structure').insert(newItem);
        loadData();
    };

    // Add Custom Discipline
    const handleAddOtherDiscipline = async (code: string, nameEn: string, nameId: string) => {
        // 1. Add to Settings (if new)
        const existsInSettings = allDisciplines.some(d => d.code === code);
        if (!existsInSettings) {
            await createDiscipline(workspaceId, {
                code,
                nameEn,
                nameId,
                color: "bg-neutral-500",
                sortOrder: allDisciplines.length + 1,
                isActive: true
            });
            // Update local disciplines
            const discs = await fetchDisciplines(workspaceId);
            setAllDisciplines(discs);
        }

        // 2. Add to WBS (DB)
        const newItem = {
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            project_type_id: projectTypeId,
            parent_id: null,
            code: code,
            name: nameEn,
            description: nameId,
            indent_level: 0,
            level: 'L1',
            sort_order: wbsItems.length + 1
        };

        // Optimistic
        setWbsItems(prev => [...prev, {
            id: newItem.id,
            code: newItem.code,
            nameEn: newItem.name,
            nameId: newItem.description,
            indent_level: newItem.indent_level,
            children: []
        }]);

        await supabase.from('work_breakdown_structure').insert(newItem);
        loadData();
    };


    // Edit
    const handleUpdateItem = useCallback(async (id: string, patch: Partial<{ nameEn: string; nameId?: string, code?: string }>) => {
        // Optimistic
        const updateTree = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
            return nodes.map(n => {
                if (n.id === id) return { ...n, ...patch };
                if (n.children) return { ...n, children: updateTree(n.children) };
                return n;
            });
        };
        setWbsItems(prev => updateTree(prev));

        // DB Update
        const dbPatch: any = {};
        if (patch.nameEn) dbPatch.name = patch.nameEn;
        if (patch.nameId) dbPatch.description = patch.nameId;
        if (patch.code) dbPatch.code = patch.code;

        await supabase.from('work_breakdown_structure').update(dbPatch).eq('id', id);
    }, []);

    // Add Child (L2)
    const handleAddChild = useCallback(async (parentId: string, level: number) => {
        if (level !== 0) return; // Only allow adding to Root (0) -> creates L2 (1)

        const findNode = (nodes: WBSItemLocal[], targetId: string): WBSItemLocal | null => {
            for (const n of nodes) {
                if (n.id === targetId) return n;
                // Shallow search usually enough for L1 parent
            }
            return null;
        };
        const parent = wbsItems.find(n => n.id === parentId);
        if (!parent) return;

        const nextNum = (parent.children?.length || 0) + 1;
        const newCode = `${parent.code}.${nextNum}`;

        const newItem = {
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            project_type_id: projectTypeId,
            parent_id: parentId,
            code: newCode,
            name: "New Work Item",
            description: "Pekerjaan Baru",
            indent_level: 1,
            level: 'L2',
            sort_order: nextNum
        };

        // Optimistic
        const addDeep = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
            return nodes.map(n => {
                if (n.id === parentId) {
                    const child: WBSItemLocal = {
                        id: newItem.id,
                        code: newItem.code,
                        nameEn: newItem.name,
                        nameId: newItem.description,
                        indent_level: newItem.indent_level,
                        children: []
                    };
                    return { ...n, children: [...(n.children || []), child] };
                }
                return n;
            });
        };
        setWbsItems(prev => addDeep(prev));

        await supabase.from('work_breakdown_structure').insert(newItem);
        loadData();

    }, [wbsItems, workspaceId, projectTypeId, loadData]);

    const handleAddSibling = useCallback(async (siblingId: string, position: "above" | "below") => {
        // Same logic as before
        // ...
        // For brevity, using reload strategy or simplified optimistic
        // Implementing Simplified Append Sibling logic via DB
        // (User will likely refresh or we reload)
        // ...
        // Let's assume Add Child is primary use case for Ballpark.
        // Sibling add is complicated. I'll rely on direct DB insert + reload.

        const { data: sibling } = await supabase.from('work_breakdown_structure').select('parent_id, indent_level, code, sort_order').eq('id', siblingId).single();
        if (!sibling) return;

        const parentId = sibling.parent_id;
        // Generate code...
        const newItem = {
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            project_type_id: projectTypeId,
            parent_id: parentId,
            code: sibling.code + "-new",
            name: "New Sibling Item",
            description: "Pekerjaan Baru",
            indent_level: sibling.indent_level,
            level: `L${sibling.indent_level + 1}`,
            sort_order: 999
        };
        await supabase.from('work_breakdown_structure').insert(newItem);
        loadData();

    }, [workspaceId, projectTypeId, loadData]);

    // Delete
    const handleRemove = useCallback(async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        setWbsItems(prev => prev.filter(n => n.id !== id).map(n => ({ ...n, children: n.children?.filter(c => c.id !== id) }))); // Shallow optimistic
        await supabase.from('work_breakdown_structure').delete().eq('id', id);
        loadData(); // Full reload to ensure children gone if cascade or whatever
    }, [loadData]);

    const handleReorder = useCallback((parentId: string | null, fromIndex: number, toIndex: number) => {
        // ...
    }, []);

    const handleReset = async () => {
        if (confirm("Reset to baseline? This will DELETE all current WBS items and re-seed.")) {
            // 1. Delete all
            setLoading(true);
            await supabase.from('work_breakdown_structure').delete().eq('workspace_id', workspaceId);

            // 2. Trigger seed (Simulation: we can call an API or just reload page if backend handles it?)
            // Or we can just leave it empty and let user use "Add Discipline".
            // Actually reseed_wbs_discipline.ts does this.
            // Maybe just clear for now.
            setWbsItems([]);
            setLoading(false);
            alert("WBS Cleared. Please run seed script or add disciplines manually.");
        }
    };


    return (
        <div className="space-y-6">
            <AddDisciplineModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddOtherDiscipline}
                existingCodes={allExistingCodes}
            />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                    {headerContent}
                    <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
                        <button
                            onClick={() => setViewMode("SUMMARY")}
                            className={`px-4 py-1.5 text-xs font-medium transition-colors ${viewMode === "SUMMARY" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"}`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setViewMode("BREAKDOWN")}
                            className={`px-4 py-1.5 text-xs font-medium border-l border-neutral-200 transition-colors ${viewMode === "BREAKDOWN" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"}`}
                        >
                            Breakdown
                        </button>
                    </div>
                </div>
                <Button
                    onClick={loadData}
                    disabled={loading}
                    variant="outline"
                    icon={<RotateCcw className="w-4 h-4" />}
                    className="rounded-full px-6 shrink-0"
                >
                    Refresh
                </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500 mr-2">Add Discipline:</span>
                {availableDisciplines.map(discipline => (
                    <button
                        key={discipline.id}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                        onClick={() => handleAddDiscipline(discipline)}
                    >
                        + {discipline.nameEn}
                    </button>
                ))}
                <button
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-500"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus className="w-3 h-3 inline mr-1" />
                    Other
                </button>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-neutral-400 text-sm">Loading Ballpark WBS...</div>
            ) : (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    <WBSList
                        items={visibleTree as any}
                        view={viewMode}
                        mode="BALLPARK"
                        onUpdateItem={handleUpdateItem}
                        onAddChild={handleAddChild}
                        onAddSibling={handleAddSibling}
                        onRemove={handleRemove}
                        onReorder={handleReorder}
                    />
                </div>
            )}
        </div>
    );
}
