"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { RotateCcw, Plus, Download, Upload, FileText, Layers } from "lucide-react";
import { exportWBSToExcel, parseWBSExcel } from "@/lib/flow/wbs-excel";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import { supabase } from "@/lib/supabaseClient";

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

import WBSList from "@/components/flow/projects/project-detail/setup/wbs/WBSList";

type ViewMode = "SUMMARY" | "BREAKDOWN";

interface Props {
    workspaceId: string;
    projectTypeId: string;
    headerContent?: React.ReactNode;
}

export default function EstimatesTab({ workspaceId, projectTypeId, headerContent }: Props) {
    const [wbsItems, setWbsItems] = useState<WBSItemLocal[]>([]);
    const [loading, setLoading] = useState(true);
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
        const saved = localStorage.getItem(`cover_info_est_${projectTypeId}`);
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
        localStorage.setItem(`cover_info_est_${projectTypeId}`, JSON.stringify(updated));
    };

    // Load Data
    const loadData = useCallback(async () => {
        if (!workspaceId) return;
        setLoading(true);

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

    // WBS Disciplines (roots)
    const disciplines = useMemo(() => {
        return wbsItems.filter(item => (item.indent_level || 0) === 0);
    }, [wbsItems]);

    // Slice visible tree for tree editor V1
    const visibleTree = useMemo(() => {
        if (currentSheet === "cover") return [];

        if (currentSheet === "rekap") {
            return wbsItems.map(n => ({ ...n, children: [] }));
        }

        const activeDisc = wbsItems.find(item => item.code === currentSheet);
        if (!activeDisc) return [];

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

        const prune = (node: WBSItemLocal): WBSItemLocal => {
            const isL2 = (node.indent_level || 0) === 1;

            return {
                ...node,
                descendantCount: isL2 ? countDescendants(node) : 0,
                children: (node.indent_level || 0) === 0 && node.children
                    ? node.children.map(prune)
                    : undefined
            };
        };

        return [prune(activeDisc)];
    }, [wbsItems, currentSheet]);

    // Actions
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
        if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;
        setWbsItems(prev => prev.filter(n => n.id !== id).map(n => ({ ...n, children: n.children?.filter(c => c.id !== id) })));
        await supabase.from('work_breakdown_structure').delete().eq('id', id);
        loadData();
    }, [loadData]);

    const handleAddChild = useCallback(async (parentId: string, parentLevel: number) => {
        const findNode = (nodes: WBSItemLocal[], targetId: string): WBSItemLocal | null => {
            for (const n of nodes) {
                if (n.id === targetId) return n;
                if (n.children) {
                    const found = findNode(n.children, targetId);
                    if (found) return found;
                }
            }
            return null;
        };

        const parent = findNode(wbsItems, parentId);
        if (!parent) return;

        const newIndent = (parent.indent_level || 0) + 1;
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
            indent_level: newIndent,
            level: `L${newIndent + 1}`,
            sort_order: nextNum
        };

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
        // Drag & drop sorting
    }, []);

    const handleExportExcel = () => {
        exportWBSToExcel(wbsItems, `wbs_template_estimates_${projectTypeId}.xlsx`);
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

            {/* Main Content Area */}
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
                            mode="ESTIMATES"
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
