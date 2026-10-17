"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Save, RotateCcw, Plus, X, Download, Upload, FileText, Layers } from "lucide-react";
import { exportWBSToExcel, parseWBSExcel } from "@/lib/flow/wbs-excel";
import clsx from "clsx";
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

// API for WBS seed baseline
import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";

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

// Add Discipline Modal
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
        }, 500);

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
            <div
                onClick={handleClose}
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
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
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Code</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                placeholder="E.g., ARS"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Nama Disiplin (Indonesia) *</label>
                            <input
                                type="text"
                                value={nameId}
                                onChange={(e) => setNameId(e.target.value)}
                                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                placeholder="E.g., Arsitektur"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Nama Disiplin (Inggris)</label>
                            <input
                                type="text"
                                value={nameEn}
                                onChange={(e) => setNameEn(e.target.value)}
                                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                placeholder="E.g., Architecture"
                                required
                            />
                        </div>
                    </div>
                    <div className="border-t border-neutral-100 px-6 py-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-full px-5 py-2 text-xs font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-full px-5 py-2 text-xs font-semibold bg-brand-red text-white hover:bg-red-600 shadow-sm"
                        >
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BallparkTab({ workspaceId, projectTypeId, headerContent }: Props) {
    const [wbsItems, setWbsItems] = useState<WBSItemLocal[]>([]);
    const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("BREAKDOWN");

    // Sheet state
    const [currentSheet, setCurrentSheet] = useState<string>("cover");

    // Cover Info state
    const [coverInfo, setCoverInfo] = useState({
        projectName: "Template Proyek Baru",
        projectCode: "PRJ-TMP-01",
        location: "DKI Jakarta, Indonesia",
        year: String(new Date().getFullYear())
    });

    useEffect(() => {
        const saved = localStorage.getItem(`cover_info_${projectTypeId}`);
        if (saved) {
            try {
                setCoverInfo(JSON.parse(saved));
            } catch (e) {
                console.error(e);
            }
        }
    }, [projectTypeId]);

    const saveCoverInfo = (updated: typeof coverInfo) => {
        setCoverInfo(updated);
        localStorage.setItem(`cover_info_${projectTypeId}`, JSON.stringify(updated));
    };

    // Load Data
    const loadData = useCallback(async () => {
        if (!workspaceId) return;
        setLoading(true);

        const discs = await fetchDisciplines(workspaceId);
        setAllDisciplines(discs);

        const { data, error } = await supabase
            .from('work_breakdown_structure')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('sort_order', { ascending: true })
            .order('code', { ascending: true });

        if (data) {
            const nodes = data.map((d: any) => ({
                id: d.id,
                code: d.code,
                nameEn: d.name || "",
                nameId: d.description || "",
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

            // Sort roots and child nodes
            const sortNodes = (list: WBSItemLocal[]) => {
                list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                list.forEach(node => {
                    if (node.children) sortNodes(node.children);
                });
            };
            sortNodes(roots);

            setWbsItems(roots);
        }
        setLoading(false);
    }, [workspaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const allExistingCodes = useMemo(() => {
        const wbsCodes = wbsItems.map(item => item.code);
        const settingsCodes = allDisciplines.map(d => d.code);
        return [...new Set([...wbsCodes, ...settingsCodes])];
    }, [wbsItems, allDisciplines]);

    const availableDisciplines = useMemo(() => {
        const existingCodes = wbsItems.map(item => item.code);
        return allDisciplines.filter(d =>
            !existingCodes.includes(d.code) &&
            !MANDATORY_CODES.includes(d.code)
        );
    }, [allDisciplines, wbsItems]);

    // WBS Disciplines (roots)
    const disciplines = useMemo(() => {
        return wbsItems.filter(item => (item.indent_level || 0) === 0);
    }, [wbsItems]);

    // Slice visible tree for tree editor V1
    const visibleTree = useMemo(() => {
        if (currentSheet === "cover") return [];

        if (currentSheet === "rekap") {
            // Rekapitulasi shows all Level 1 roots (no children)
            return wbsItems.map(n => ({ ...n, children: [] }));
        }

        const activeDisc = wbsItems.find(item => item.code === currentSheet);
        if (!activeDisc) return [];

        // Count all descendants under a node in the original unpruned tree
        const countDescendants = (node: WBSItemLocal): number => {
            let count = 0;
            if (node.children) {
                count += node.children.length;
                node.children.forEach(child => {
                    count += countDescendants(child);
                });
            }
            return count;
        };

        // Prune the tree to Level 1 and Level 2 only (indent_level <= 1)
        const prune = (node: WBSItemLocal): WBSItemLocal => {
            const isL2 = (node.indent_level || 0) === 1;

            return {
                ...node,
                descendantCount: isL2 ? countDescendants(node) : 0,
                // Only keep children if it's Level 1 (indent_level === 0)
                children: (node.indent_level || 0) === 0 && node.children
                    ? node.children.map(prune)
                    : undefined
            };
        };

        return [prune(activeDisc)];
    }, [wbsItems, currentSheet]);

    // Actions
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

    const handleAddOtherDiscipline = async (code: string, nameEn: string, nameId: string) => {
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
            const discs = await fetchDisciplines(workspaceId);
            setAllDisciplines(discs);
        }

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

    const handleUpdateItem = useCallback(async (id: string, patch: Partial<{ nameEn: string; nameId?: string, code?: string }>) => {
        const updateTree = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
            return nodes.map(n => {
                if (n.id === id) return { ...n, ...patch };
                if (n.children) return { ...n, children: updateTree(n.children) };
                return n;
            });
        };
        setWbsItems(prev => updateTree(prev));

        const dbPatch: any = {};
        if (patch.nameEn) dbPatch.name = patch.nameEn;
        if (patch.nameId) dbPatch.description = patch.nameId;
        if (patch.code) dbPatch.code = patch.code;

        await supabase.from('work_breakdown_structure').update(dbPatch).eq('id', id);
    }, []);

    const handleRemove = useCallback(async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        setWbsItems(prev => prev.filter(n => n.id !== id).map(n => ({ ...n, children: n.children?.filter(c => c.id !== id) })));
        await supabase.from('work_breakdown_structure').delete().eq('id', id);
        loadData();
    }, [loadData]);

    const handleAddChild = useCallback(async (parentId: string, level: number) => {
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
        const { data: sibling } = await supabase.from('work_breakdown_structure').select('parent_id, indent_level, code, sort_order').eq('id', siblingId).single();
        if (!sibling) return;

        const parentId = sibling.parent_id;
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

    const handleReorder = useCallback(async (parentId: string | null, fromIndex: number, toIndex: number) => {
        // Drag & drop logic can be added here
    }, []);

    const handleReset = async () => {
        if (confirm("Reset to baseline? This will DELETE all current WBS items and re-seed from the default template.")) {
            setLoading(true);
            try {
                const { error: deleteError } = await supabase.from('work_breakdown_structure').delete().eq('workspace_id', workspaceId);
                if (deleteError) throw deleteError;

                const estimatesTree = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
                const detailTree = buildDetailFromEstimates(estimatesTree);

                const insertNode = async (item: any, parentDbId: string | null = null, indentLevel: number = 0) => {
                    let currentLevel = "structure";
                    if (indentLevel === 0) currentLevel = "structure";
                    else if (indentLevel === 1) currentLevel = "summary";
                    else if (indentLevel === 2) currentLevel = "estimate";
                    else if (indentLevel >= 3) currentLevel = "detail";

                    const code = item.code || item.wbsCode || "NO-CODE";
                    const name = item.nameEn || item.titleEn || item.name || item.title || "Unnamed";
                    const description = item.nameId || item.name || item.title || "";

                    const { data, error } = await supabase.from("work_breakdown_structure").insert({
                        workspace_id: workspaceId,
                        code: code,
                        name: name,
                        level: currentLevel,
                        indent_level: indentLevel,
                        parent_id: parentDbId,
                        description: description
                    }).select('id').single();

                    if (error) throw error;

                    const newDbId = data.id;
                    const children = item.children || item.items || [];
                    if (children && children.length > 0) {
                        for (const child of children) {
                            await insertNode(child, newDbId, indentLevel + 1);
                        }
                    }
                };

                for (const root of detailTree) {
                    await insertNode(root);
                }

                alert("✅ Baseline WBS seeded successfully!");
                loadData();
                setCurrentSheet("rekap");
            } catch (err: any) {
                console.error("Error seeding WBS:", err);
                alert("❌ Failed to seed WBS: " + err.message);
                loadData();
            }
        }
    };

    const handleExportExcel = () => {
        exportWBSToExcel(wbsItems, `wbs_template_ballpark_${projectTypeId}.xlsx`);
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const buffer = evt.target?.result as ArrayBuffer;
            try {
                const parsed = parseWBSExcel(buffer);
                if (parsed.length === 0) {
                    alert("No valid WBS items found in Excel.");
                    return;
                }

                if (!confirm(`Are you sure you want to overwrite all current WBS items with the ${parsed.length} items from the Excel file?`)) {
                    e.target.value = "";
                    return;
                }

                setLoading(true);
                const { error: deleteError } = await supabase
                    .from('work_breakdown_structure')
                    .delete()
                    .eq('workspace_id', workspaceId);

                if (deleteError) throw deleteError;

                const codeToIdMap = new Map<string, string>();
                const sortedItems = [...parsed].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));

                for (const item of sortedItems) {
                    const parts = item.code.split('.');
                    const parentCode = parts.slice(0, -1).join('.');
                    const parentId = parentCode ? codeToIdMap.get(parentCode) || null : null;

                    const dbLevel = parts.length === 1 ? 'structure' 
                                  : parts.length === 2 ? 'summary'
                                  : parts.length === 3 ? 'estimate'
                                  : 'detail';
                    const indentLevel = parts.length - 1;

                    const newId = crypto.randomUUID();
                    await supabase.from('work_breakdown_structure').insert({
                        id: newId,
                        workspace_id: workspaceId,
                        project_type_id: projectTypeId,
                        code: item.code,
                        name: item.nameEn || item.nameId,
                        description: item.nameId,
                        level: dbLevel,
                        indent_level: indentLevel,
                        parent_id: parentId,
                        sort_order: parseInt(parts[parts.length - 1]) || 0
                    });
                    codeToIdMap.set(item.code, newId);
                }

                alert("✅ WBS imported successfully!");
                loadData();
                setCurrentSheet("rekap");
            } catch (err: any) {
                console.error(err);
                alert("❌ Failed to import WBS: " + err.message);
                setLoading(false);
            }
            e.target.value = "";
        };
        reader.readAsArrayBuffer(file);
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
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <Button
                        onClick={handleExportExcel}
                        disabled={loading}
                        variant="outline"
                        icon={<Download className="w-4 h-4 text-neutral-600" />}
                        className="rounded-full px-5 py-2 text-xs font-semibold shrink-0"
                    >
                        Export Excel
                    </Button>
                    <label className={clsx(
                        "flex items-center gap-2 cursor-pointer rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 px-5 py-2 text-xs font-semibold shadow-sm transition-all active:scale-95 shrink-0",
                        loading && "opacity-50 pointer-events-none"
                    )}>
                        <Upload className="w-4 h-4 text-neutral-600" />
                        <span>Import Excel</span>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleImportExcel}
                            className="hidden"
                            disabled={loading}
                        />
                    </label>
                    <Button
                        onClick={handleReset}
                        disabled={loading}
                        variant="outline"
                        icon={<RotateCcw className="w-4 h-4 text-brand-red" />}
                        className="rounded-full px-5 py-2 text-xs font-semibold shrink-0 border border-red-100 text-brand-red hover:bg-red-50"
                    >
                        Reset Baseline
                    </Button>
                    <Button
                        onClick={loadData}
                        disabled={loading}
                        variant="outline"
                        icon={<RotateCcw className="w-4 h-4 text-neutral-500" />}
                        className="rounded-full px-5 py-2 text-xs font-semibold shrink-0"
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* SPREADSHEET TABS - High-end modern tabs */}
            <div className="bg-neutral-100/80 p-1.5 rounded-xl border border-neutral-200/60 w-fit flex items-center gap-1.5 overflow-x-auto select-none max-w-full">
                <button
                    onClick={() => setCurrentSheet("cover")}
                    className={clsx(
                        "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95",
                        currentSheet === "cover"
                            ? "bg-white text-neutral-900 shadow-sm font-bold border border-neutral-200/50"
                            : "text-neutral-500 hover:text-neutral-800 hover:bg-white/40"
                    )}
                >
                    <FileText className="w-3.5 h-3.5 text-brand-red" />
                    Cover
                </button>
                <div className="h-4 w-[1px] bg-neutral-300" />
                <button
                    onClick={() => setCurrentSheet("rekap")}
                    className={clsx(
                        "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95",
                        currentSheet === "rekap"
                            ? "bg-white text-neutral-900 shadow-sm font-bold border border-neutral-200/50"
                            : "text-neutral-500 hover:text-neutral-800 hover:bg-white/40"
                    )}
                >
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    Rekapitulasi
                </button>

                {disciplines.length > 0 && <div className="h-4 w-[1px] bg-neutral-300" />}

                {disciplines.map((disc, idx) => {
                    const active = currentSheet === disc.code;
                    return (
                        <button
                            key={disc.id}
                            onClick={() => setCurrentSheet(disc.code)}
                            className={clsx(
                                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95",
                                active
                                    ? "bg-white text-neutral-900 shadow-sm font-bold border border-neutral-200/50"
                                    : "text-neutral-500 hover:text-neutral-800 hover:bg-white/40"
                            )}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {disc.nameId || disc.nameEn || "Disiplin"}
                        </button>
                    );
                })}
            </div>

            {/* Bottom Actions for adding L1 Roots */}
            {currentSheet === "rekap" && (
                <div className="flex items-center gap-2 flex-wrap bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                    <span className="text-xs font-semibold text-neutral-500 mr-2 uppercase tracking-wider">Add Discipline:</span>
                    {availableDisciplines.map(discipline => (
                        <button
                            key={discipline.id}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-neutral-200 hover:border-neutral-300 hover:bg-white bg-transparent"
                            onClick={() => handleAddDiscipline(discipline)}
                        >
                            + {discipline.nameEn}
                        </button>
                    ))}
                    <button
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-white text-neutral-500"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus className="w-3 h-3 inline mr-1" />
                        Other
                    </button>
                </div>
            )}

            {/* Main Area */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm min-h-[400px]">
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-neutral-400 text-sm">
                        <span className="animate-pulse">Loading WBS Editor...</span>
                    </div>
                ) : currentSheet === "cover" ? (
                    <div className="p-10 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3 border-b pb-4 border-neutral-100">
                            <div className="p-2.5 bg-red-50 rounded-xl">
                                <FileText className="w-5 h-5 text-brand-red" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-neutral-800">Informasi Umum Proyek</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">Edit detail proyek untuk template ini</p>
                            </div>
                        </div>
                        <div className="space-y-5 text-sm">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Nama Proyek</label>
                                <input
                                    type="text"
                                    className="col-span-2 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm bg-neutral-50 hover:bg-neutral-50/20 focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                    value={coverInfo.projectName}
                                    onChange={(e) => saveCoverInfo({ ...coverInfo, projectName: e.target.value })}
                                    placeholder="Masukkan Nama Proyek..."
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Kode Proyek</label>
                                <input
                                    type="text"
                                    className="col-span-2 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm bg-neutral-50 hover:bg-neutral-50/20 focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                    value={coverInfo.projectCode}
                                    onChange={(e) => saveCoverInfo({ ...coverInfo, projectCode: e.target.value })}
                                    placeholder="Masukkan Kode Proyek..."
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Lokasi Default</label>
                                <input
                                    type="text"
                                    className="col-span-2 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm bg-neutral-50 hover:bg-neutral-50/20 focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                    value={coverInfo.location}
                                    onChange={(e) => saveCoverInfo({ ...coverInfo, location: e.target.value })}
                                    placeholder="Masukkan Lokasi..."
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tahun</label>
                                <input
                                    type="text"
                                    className="col-span-2 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm bg-neutral-50 hover:bg-neutral-50/20 focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                    value={coverInfo.year}
                                    onChange={(e) => saveCoverInfo({ ...coverInfo, year: e.target.value })}
                                    placeholder="Tahun Proyek..."
                                />
                            </div>
                        </div>
                    </div>
                ) : visibleTree.length === 0 ? (
                    <div className="p-16 text-center text-neutral-400 text-sm">
                        Sheet kosong. Silakan tambah baris pekerjaan baru.
                    </div>
                ) : (
                    <div className="overflow-hidden">
                        <WBSList
                            items={visibleTree as any}
                            view={currentSheet === "rekap" ? "SUMMARY" : viewMode}
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
        </div>
    );
}
