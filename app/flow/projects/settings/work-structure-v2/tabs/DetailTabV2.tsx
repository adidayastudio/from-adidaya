"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Save, RotateCcw, Plus, Trash2, Download, Upload, FileText, ChevronRight, Layers, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { supabase } from "@/lib/supabaseClient";
import { exportWBSToExcel, parseWBSExcel } from "@/lib/flow/wbs-excel";
import clsx from "clsx";

type WBSItemLocal = {
    id: string;
    code: string;
    nameEn: string;
    nameId?: string;
    children?: WBSItemLocal[];
    level?: string;
    indent_level?: number;
    parent_id?: string | null;
    sort_order?: number;
};

interface Props {
    workspaceId: string;
    projectTypeId: string;
}

export default function DetailTabV2({ workspaceId, projectTypeId }: Props) {
    const [wbsItems, setWbsItems] = useState<WBSItemLocal[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    
    // Tab/Sheet State: 'cover' | 'rekap' | disciplineCode (e.g. 'S', 'A')
    const [currentSheet, setCurrentSheet] = useState<string>("cover");

    // Cover Info state
    const [coverInfo, setCoverInfo] = useState({
        projectName: "Template Proyek Baru",
        projectCode: "PRJ-TMP-01",
        location: "DKI Jakarta, Indonesia",
        year: String(new Date().getFullYear())
    });

    useEffect(() => {
        const saved = localStorage.getItem(`cover_info_det_${projectTypeId}`);
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
        localStorage.setItem(`cover_info_det_${projectTypeId}`, JSON.stringify(updated));
    };

    // Fetch Data
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

    const disciplines = useMemo(() => {
        return wbsItems.filter(item => (item.indent_level || 0) === 0);
    }, [wbsItems]);

    const visibleFlatItems = useMemo(() => {
        if (currentSheet === "rekap") {
            return disciplines;
        }
        if (currentSheet === "cover") {
            return [];
        }

        const activeDisc = wbsItems.find(item => item.code === currentSheet);
        if (!activeDisc) return [];

        const list: WBSItemLocal[] = [];
        const flatten = (node: WBSItemLocal) => {
            list.push(node);
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => flatten(child));
            }
        };
        flatten(activeDisc);
        return list;
    }, [wbsItems, currentSheet, disciplines]);

    const handleCellBlur = async (id: string, field: "nameId" | "nameEn" | "code", value: string) => {
        setWbsItems(prev => {
            const updateLocal = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
                return nodes.map(n => {
                    if (n.id === id) {
                        return { ...n, [field]: value };
                    }
                    if (n.children) {
                        return { ...n, children: updateLocal(n.children) };
                    }
                    return n;
                });
            };
            return updateLocal(prev);
        });

        const dbPatch: any = {};
        if (field === "nameEn") dbPatch.name = value;
        if (field === "nameId") dbPatch.description = value;
        if (field === "code") dbPatch.code = value;

        await supabase.from('work_breakdown_structure').update(dbPatch).eq('id', id);
    };

    const handleAddRowOption = async (targetItem: WBSItemLocal, position: "above" | "below" | "subtask") => {
        setLoading(true);

        if (position === "subtask") {
            const siblingCount = targetItem.children?.length || 0;
            const newIndent = (targetItem.indent_level || 0) + 1;
            
            const isNumeric = /^\d+$/.test(targetItem.code.split('.').pop() || "");
            const newCode = isNumeric ? `${targetItem.code}.${siblingCount + 1}` : `${targetItem.code}.1`;

            const newItem = {
                id: crypto.randomUUID(),
                workspace_id: workspaceId,
                project_type_id: projectTypeId,
                parent_id: targetItem.id,
                code: newCode,
                name: "",
                description: "Pekerjaan Baru",
                indent_level: newIndent,
                level: `L${newIndent + 1}`,
                sort_order: siblingCount + 1
            };
            await supabase.from('work_breakdown_structure').insert(newItem);
        } else {
            const parentId = targetItem.parent_id;
            let siblings: WBSItemLocal[] = [];
            if (parentId) {
                const findParent = (nodes: WBSItemLocal[]): WBSItemLocal | null => {
                    for (const n of nodes) {
                        if (n.id === parentId) return n;
                        if (n.children) {
                            const found = findParent(n.children);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                const parentNode = findParent(wbsItems);
                siblings = parentNode?.children || [];
            } else {
                siblings = wbsItems.filter(item => !item.parent_id);
            }

            siblings.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

            const targetIdx = siblings.findIndex(s => s.id === targetItem.id);
            const insertIdx = position === "above" ? targetIdx : targetIdx + 1;

            const codeParts = targetItem.code.split('.');
            const lastPart = codeParts[codeParts.length - 1];
            const prefix = codeParts.slice(0, -1).join('.');
            const isNumeric = /^\d+$/.test(lastPart);

            const promises = [];
            for (let i = siblings.length - 1; i >= insertIdx; i--) {
                const sib = siblings[i];
                const parts = sib.code.split('.');
                const currentIdx = parseInt(parts[parts.length - 1]) || 0;
                
                const dbPatch: any = { sort_order: (sib.sort_order || 0) + 1 };
                
                if (isNumeric) {
                    dbPatch.code = prefix ? `${prefix}.${currentIdx + 1}` : `${currentIdx + 1}`;
                }

                promises.push(
                    supabase.from('work_breakdown_structure').update(dbPatch).eq('id', sib.id)
                );
            }
            await Promise.all(promises);

            const newSortOrder = (targetItem.sort_order || 0) + (position === "above" ? 0 : 1);
            
            let newCode = "";
            if (isNumeric) {
                const newCodeIndex = (parseInt(lastPart) || 0) + (position === "above" ? 0 : 1);
                newCode = prefix ? `${prefix}.${newCodeIndex}` : `${newCodeIndex}`;
            } else {
                newCode = "NEW";
            }

            const newItem = {
                id: crypto.randomUUID(),
                workspace_id: workspaceId,
                project_type_id: projectTypeId,
                parent_id: parentId,
                code: newCode,
                name: "",
                description: "Pekerjaan Baru",
                indent_level: targetItem.indent_level,
                level: targetItem.level,
                sort_order: newSortOrder
            };
            await supabase.from('work_breakdown_structure').insert(newItem);
        }

        await loadData();
    };

    const handleDeleteRow = async (id: string) => {
        if (!confirm("Hapus baris pekerjaan ini beserta seluruh sub-pekerjaannya?")) return;
        setLoading(true);
        await supabase.from('work_breakdown_structure').delete().eq('id', id);
        await loadData();
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

                if (!confirm(`Hapus semua WBS saat ini dan ganti dengan ${parsed.length} baris dari Excel?`)) {
                    e.target.value = "";
                    return;
                }

                setLoading(true);
                await supabase.from('work_breakdown_structure').delete().eq('workspace_id', workspaceId);

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

    const handleExportExcel = () => {
        exportWBSToExcel(wbsItems, `wbs_template_detail_${projectTypeId}.xlsx`);
    };

    return (
        <div className="space-y-6">
            {/* Top Action Bar */}
            <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 shadow-sm transition-all duration-300">
                <div>
                    {currentSheet !== "cover" && (
                        <Button
                            onClick={() => handleAddRowOption(wbsItems[0] || { id: "", code: "1" }, "subtask")}
                            variant="primary"
                            icon={<Plus className="w-4 h-4 text-white" />}
                            className="rounded-full px-5 py-2 text-xs font-semibold bg-brand-red text-white hover:bg-red-600 shadow-sm active:scale-95 transition-all"
                        >
                            Tambah Pekerjaan
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleExportExcel}
                        disabled={loading}
                        variant="outline"
                        icon={<Download className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />}
                        className="rounded-full px-4 py-2 text-xs font-semibold border-neutral-200/80 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 shadow-sm transition-all"
                    >
                        Export Excel
                    </Button>
                    <label className={clsx(
                        "flex items-center gap-2 cursor-pointer rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 shadow-sm transition-all active:scale-95",
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
                        icon={<RotateCcw className="w-4 h-4 text-neutral-600" />}
                        className="rounded-full px-4 py-2 text-xs font-semibold border-neutral-200/80 text-neutral-700 hover:bg-neutral-50 shadow-sm transition-all"
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* SPREADSHEET TABS */}
            <div className="bg-neutral-100/80 dark:bg-neutral-800/40 p-1.5 rounded-xl border border-neutral-200/60 w-fit flex items-center gap-1.5 overflow-x-auto select-none max-w-full">
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
                <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700" />
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

                {disciplines.length > 0 && <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700" />}

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

            {/* Main Content Area without vertical columns grid/boxes */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
                <div className="flex-1">
                    {loading ? (
                        <div className="h-64 flex items-center justify-center text-neutral-400 text-sm">
                            <span className="animate-pulse">Loading sheet grid...</span>
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
                    ) : visibleFlatItems.length === 0 ? (
                        <div className="p-16 text-center text-neutral-400 text-sm">
                            Sheet kosong. Silakan tambah baris pekerjaan baru.
                        </div>
                    ) : (
                        /* CLEAN FLAT TABLE VIEW */
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                                <thead>
                                    <tr className="bg-neutral-50/75 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase">
                                        <th className="px-6 py-4 w-40">WBS Code</th>
                                        <th className="px-6 py-4">Nama Pekerjaan (Indonesia) *</th>
                                        <th className="px-6 py-4">Nama Pekerjaan (Inggris)</th>
                                        <th className="px-6 py-4 w-40 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 text-sm">
                                    {visibleFlatItems.map((item) => {
                                        const indent = currentSheet === "rekap" ? 0 : Math.max((item.indent_level || 0) - 1, 0);
                                        const paddingLeft = `${indent * 20}px`;
                                        const isActiveRow = activeRowId === item.id;

                                        return (
                                            <tr 
                                                key={item.id} 
                                                className={clsx(
                                                    "transition-all duration-150 group",
                                                    isActiveRow ? "bg-neutral-50/50" : "hover:bg-neutral-50/30"
                                                )}
                                                onFocus={() => setActiveRowId(item.id)}
                                            >
                                                <td className="px-6 py-2.5 font-mono text-xs text-neutral-600 w-40">
                                                    <input
                                                        type="text"
                                                        defaultValue={item.code}
                                                        onBlur={(e) => handleCellBlur(item.id, "code", e.target.value)}
                                                        className="w-full bg-transparent border-none rounded px-2 py-1 outline-none font-bold text-xs text-neutral-700"
                                                    />
                                                </td>
                                                <td className="px-6 py-2.5">
                                                    <div style={{ paddingLeft }} className="flex items-center gap-1.5">
                                                        {indent > 0 && <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                                                        <input
                                                            type="text"
                                                            defaultValue={item.nameId}
                                                            onBlur={(e) => handleCellBlur(item.id, "nameId", e.target.value)}
                                                            placeholder="Nama pekerjaan..."
                                                            className={clsx(
                                                                "w-full bg-transparent border-none rounded px-2 py-1 outline-none text-sm text-neutral-800",
                                                                indent === 0 ? "font-bold text-neutral-900" : "text-neutral-700"
                                                            )}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2.5">
                                                    <input
                                                        type="text"
                                                        defaultValue={item.nameEn}
                                                        onBlur={(e) => handleCellBlur(item.id, "nameEn", e.target.value)}
                                                        placeholder="English name..."
                                                        className="w-full bg-transparent border-none rounded px-2 py-1 outline-none text-sm text-neutral-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-2.5 w-40 text-center">
                                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleAddRowOption(item, "above")}
                                                            className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-brand-red transition-all"
                                                            title="Tambah Pekerjaan di Atas"
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAddRowOption(item, "below")}
                                                            className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-brand-red transition-all"
                                                            title="Tambah Pekerjaan di Bawah"
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                        </button>
                                                        {currentSheet !== "rekap" && (
                                                            <button
                                                                onClick={() => handleAddRowOption(item, "subtask")}
                                                                className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-brand-red transition-all"
                                                                title="Tambah Sub-Pekerjaan"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteRow(item.id)}
                                                            className="p-1 hover:bg-red-50 rounded text-neutral-400 hover:text-red-600 transition-all"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
