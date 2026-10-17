"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { RotateCcw, Plus, Download, Upload, FileText, Layers, X, ChevronDown, Trash2, Settings } from "lucide-react";
import { exportWBSToExcel, parseWBSExcel } from "@/lib/flow/wbs-excel";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import { supabase } from "@/lib/supabaseClient";

// Reuse WBSList component
import WBSList from "@/components/flow/projects/project-detail/setup/wbs/WBSList";

// API for WBS seed baseline
import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";

// API for Disciplines sync
import { fetchDisciplines, createDiscipline, type Discipline } from "@/lib/api/templates";

// Default mandatory disciplines (SAMIL)
const MANDATORY_CODES = ["S", "A", "M", "I", "L"];
const ORDER_MAP: Record<string, number> = { S: 1, A: 2, M: 3, I: 4, L: 5 };

type WBSItemLocal = {
    id: string;
    code: string;
    nameEn: string;
    nameId?: string;
    children?: WBSItemLocal[];
    indent_level?: number;
    parent_id?: string | null;
    sort_order?: number;
    descendantCount?: number;
};

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
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Discipline Name (English) *</label>
                            <input
                                type="text"
                                value={nameEn}
                                onChange={(e) => setNameEn(e.target.value)}
                                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                placeholder="E.g., Architecture"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Nama Disiplin (Indonesia)</label>
                            <input
                                type="text"
                                value={nameId}
                                onChange={(e) => setNameId(e.target.value)}
                                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                placeholder="E.g., Arsitektur"
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

export default function DetailTab({ workspaceId, projectTypeId, headerContent }: Props) {
    const [wbsItems, setWbsItems] = useState<WBSItemLocal[]>([]);
    const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("BREAKDOWN");
    const [showActionsMenu, setShowActionsMenu] = useState(false);

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

    // Load Data
    const loadData = useCallback(async (showSpinner: boolean = false) => {
        if (!workspaceId) return;
        if (showSpinner) setLoading(true);

        const discs = await fetchDisciplines(workspaceId);
        setAllDisciplines(discs);

        const { data, error } = await supabase
            .from('work_breakdown_structure')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('sort_order', { ascending: true })
            .order('code', { ascending: true });

        if (error) {
            console.error("Error loading WBS data:", error);
            alert("Error loading WBS data: " + error.message);
        }

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
                notes: d.notes || "",
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
            const compareWBSCodes = (a: string, b: string): number => {
                const partsA = a.split('.');
                const partsB = b.split('.');
                const minLen = Math.min(partsA.length, partsB.length);
                for (let i = 0; i < minLen; i++) {
                    const partA = partsA[i];
                    const partB = partsB[i];
                    const numA = parseInt(partA);
                    const numB = parseInt(partB);
                    const isNumA = !isNaN(numA);
                    const isNumB = !isNaN(numB);
                    if (isNumA && isNumB) {
                        if (numA !== numB) return numA - numB;
                    } else if (partA !== partB) {
                        return partA.localeCompare(partB, undefined, { numeric: true, sensitivity: 'base' });
                    }
                }
                return partsA.length - partsB.length;
            };

            const sortNodes = (list: WBSItemLocal[]) => {
                list.sort((a, b) => compareWBSCodes(a.code, b.code));
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
        loadData(true);
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

    // WBS Disciplines sorted by SAMIL order
    const disciplines = useMemo(() => {
        const list = wbsItems.filter((item: WBSItemLocal) => (item.indent_level || 0) === 0);
        return list.sort((a: WBSItemLocal, b: WBSItemLocal) => {
            const orderA = ORDER_MAP[a.code] ?? 999;
            const orderB = ORDER_MAP[b.code] ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.sort_order || 0) - (b.sort_order || 0);
        });
    }, [wbsItems]);

    // Slice visible tree for tree editor V1
    const visibleTree = useMemo(() => {
        if (currentSheet === "cover") return [];

        if (currentSheet === "rekap") {
            return [...disciplines].map(n => ({ ...n, children: [] }));
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

        const attachDescendants = (node: WBSItemLocal): WBSItemLocal => {
            const isL2 = (node.indent_level || 0) === 1;

            return {
                ...node,
                descendantCount: isL2 ? countDescendants(node) : 0,
                children: node.children ? node.children.map(attachDescendants) : undefined
            };
        };

        return [attachDescendants(activeDisc)];
    }, [wbsItems, currentSheet, disciplines]);

    // Actions
    const handleAddDiscipline = async (discipline: Discipline) => {
        const newItem = {
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            parent_id: null,
            code: discipline.code,
            name: discipline.nameEn,
            description: discipline.nameId,
            indent_level: 0,
            level: 'structure',
            sort_order: wbsItems.length + 1
        };

        const { error } = await supabase.from('work_breakdown_structure').insert(newItem);
        if (error) {
            console.error("Error inserting discipline:", error);
            alert("Error adding discipline: " + error.message);
        } else {
            loadData();
        }
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
            parent_id: null,
            code: code,
            name: nameEn,
            description: nameId,
            indent_level: 0,
            level: 'structure',
            sort_order: wbsItems.length + 1
        };

        const { error } = await supabase.from('work_breakdown_structure').insert(newItem);
        if (error) {
            console.error("Error inserting custom discipline:", error);
            alert("Error adding custom discipline: " + error.message);
        } else {
            loadData();
        }
    };

    const syncItemCodeAndDescendants = async (id: string, oldCode: string, newCode: string, newSortOrder?: number) => {
        const patch: any = { code: newCode };
        if (newSortOrder !== undefined) {
            patch.sort_order = newSortOrder;
        }

        const { error } = await supabase.from('work_breakdown_structure')
            .update(patch)
            .eq('id', id);

        if (error) {
            return { error };
        }

        if (oldCode !== newCode) {
            const { data, error: selectErr } = await supabase.from('work_breakdown_structure')
                .select('id, code')
                .eq('workspace_id', workspaceId)
                .like('code', `${oldCode}.%`);

            if (selectErr) {
                return { error: selectErr };
            }

            if (data && data.length > 0) {
                const promises = data.map(item => {
                    const suffix = item.code.substring(oldCode.length);
                    const updatedCode = newCode + suffix;
                    return supabase.from('work_breakdown_structure')
                        .update({ code: updatedCode })
                        .eq('id', item.id);
                });
                const results = await Promise.all(promises);
                const failed = results.find(r => r.error);
                if (failed) return { error: failed.error };
            }
        }
        return { error: null };
    };

    const handleUpdateItem = useCallback(async (id: string, patch: Partial<{ nameEn: string; nameId?: string, code?: string }>) => {
        // Find current item to get old code
        const findOldCode = (nodes: WBSItemLocal[]): string | null => {
            for (const n of nodes) {
                if (n.id === id) return n.code;
                if (n.children) {
                    const found = findOldCode(n.children);
                    if (found) return found;
                }
            }
            return null;
        };
        const oldCode = findOldCode(wbsItems);

        // Optimistically update local state
        setWbsItems(prev => {
            const updateTree = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
                return nodes.map(n => {
                    if (n.id === id) return { ...n, ...patch };
                    if (n.children) return { ...n, children: updateTree(n.children) };
                    return n;
                });
            };
            return updateTree(prev);
        });

        const dbPatch: any = {};
        if (patch.nameEn !== undefined) dbPatch.name = patch.nameEn;
        if (patch.nameId !== undefined) dbPatch.description = patch.nameId;
        if (patch.notes !== undefined) dbPatch.notes = patch.notes;

        if (patch.code && oldCode) {
            const { error } = await syncItemCodeAndDescendants(id, oldCode, patch.code);
            if (error) {
                console.error("Error updating WBS item code:", error);
                alert("Error updating item code: " + error.message);
                loadData();
            }
        }

        if (Object.keys(dbPatch).length > 0) {
            const { error } = await supabase.from('work_breakdown_structure').update(dbPatch).eq('id', id);
            if (error) {
                console.error("Error updating WBS item:", error);
                alert("Error updating item: " + error.message);
                loadData(); // Revert
            }
        }
    }, [wbsItems, loadData]);

    const handleRemove = useCallback(async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        const { data: itemData, error: fetchErr } = await supabase
            .from('work_breakdown_structure')
            .select('parent_id')
            .eq('id', id)
            .single();

        if (fetchErr || !itemData) {
            console.error("Error finding item before deletion:", fetchErr);
            alert("Error: item not found.");
            return;
        }

        const parentId = itemData.parent_id;

        const { error } = await supabase.from('work_breakdown_structure').delete().eq('id', id);
        if (error) {
            console.error("Error deleting WBS item:", error);
            alert("Error deleting item: " + error.message);
            return;
        }

        // Reorder remaining siblings to fill the gap
        let query = supabase.from('work_breakdown_structure')
            .select('id, code, sort_order')
            .eq('workspace_id', workspaceId);

        if (parentId) {
            query = query.eq('parent_id', parentId);
        } else {
            query = query.is('parent_id', null);
        }

        const { data: siblingsList, error: listErr } = await query;
        if (listErr || !siblingsList) {
            console.error("Error fetching siblings list after delete:", listErr);
            loadData();
            return;
        }

        const sorted = [...siblingsList].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const promises = sorted.map((item, index) => {
            const newSortOrder = index + 1;
            const parts = item.code.split('.');
            const lastPart = parts[parts.length - 1];
            const prefix = parts.slice(0, -1).join('.');
            let newCode = item.code;
            if (/^\d+$/.test(lastPart)) {
                newCode = prefix ? `${prefix}.${newSortOrder}` : `${newSortOrder}`;
            }

            return syncItemCodeAndDescendants(item.id, item.code, newCode, newSortOrder);
        });

        const results = await Promise.all(promises);
        const failed = results.find(r => r.error);
        if (failed && failed.error) {
            console.error("Error renumbering siblings after delete:", failed.error);
            alert("Error updating order: " + failed.error.message);
        }
        loadData();
    }, [workspaceId, loadData]);

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
        const dbLevel = newIndent === 0 ? 'structure'
                      : newIndent === 1 ? 'summary'
                      : newIndent === 2 ? 'estimate'
                      : 'detail';

        const newItem = {
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            parent_id: parentId,
            code: newCode,
            name: "New Work Item",
            description: "Pekerjaan Baru",
            indent_level: newIndent,
            level: dbLevel,
            sort_order: nextNum
        };

        const { error } = await supabase.from('work_breakdown_structure').insert(newItem);
        if (error) {
            console.error("Error inserting child WBS item:", error);
            alert("Error adding child: " + error.message);
        } else {
            loadData();
        }
    }, [wbsItems, workspaceId, projectTypeId, loadData]);

    const handleAddSibling = useCallback(async (siblingId: string, position: "above" | "below") => {
        const { data: sibling, error: fetchErr } = await supabase
            .from('work_breakdown_structure')
            .select('parent_id, indent_level, code, sort_order')
            .eq('id', siblingId)
            .single();

        if (fetchErr || !sibling) {
            console.error("Error fetching sibling:", fetchErr);
            alert("Error adding sibling: failed to locate neighbor node.");
            return;
        }

        const parentId = sibling.parent_id;
        const newIndent = sibling.indent_level || 0;
        const dbLevel = newIndent === 0 ? 'structure'
                      : newIndent === 1 ? 'summary'
                      : newIndent === 2 ? 'estimate'
                      : 'detail';

        let query = supabase.from('work_breakdown_structure')
            .select('id, code, sort_order')
            .eq('workspace_id', workspaceId);

        if (parentId) {
            query = query.eq('parent_id', parentId);
        } else {
            query = query.is('parent_id', null);
        }

        const { data: siblingsList, error: listErr } = await query;
        if (listErr || !siblingsList) {
            console.error("Error fetching siblings list:", listErr);
            alert("Error adding sibling: failed to retrieve list.");
            return;
        }

        const reordered = [...siblingsList].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const targetIdx = reordered.findIndex(item => item.id === siblingId);
        if (targetIdx === -1) return;

        const insertIdx = position === "below" ? targetIdx + 1 : targetIdx;

        const promises = [];
        for (let i = insertIdx; i < reordered.length; i++) {
            const item = reordered[i];
            const newSortOrder = i + 2; // Shift up by 1
            const parts = item.code.split('.');
            const lastPart = parts[parts.length - 1];
            const prefix = parts.slice(0, -1).join('.');
            let newCode = item.code;
            if (/^\d+$/.test(lastPart)) {
                newCode = prefix ? `${prefix}.${newSortOrder}` : `${newSortOrder}`;
            }
            promises.push(
                syncItemCodeAndDescendants(item.id, item.code, newCode, newSortOrder)
            );
        }

        const results = await Promise.all(promises);
        const err = results.find((r: any) => r.error);
        if (err && err.error) {
            console.error("Error shifting siblings:", err.error);
            alert("Error updating neighbor orders: " + err.error.message);
            return;
        }

        const parts = sibling.code.split('.');
        const prefix = parts.slice(0, -1).join('.');
        const targetNum = insertIdx + 1;
        const newCode = prefix ? `${prefix}.${targetNum}` : `${targetNum}`;

        const newItem = {
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            parent_id: parentId,
            code: newCode,
            name: "New Work Item",
            description: "Pekerjaan Baru",
            indent_level: newIndent,
            level: dbLevel,
            sort_order: targetNum
        };

        const { error } = await supabase.from('work_breakdown_structure').insert(newItem);
        if (error) {
            console.error("Error inserting sibling WBS item:", error);
            alert("Error adding sibling: " + error.message);
        } else {
            loadData();
        }
    }, [workspaceId, loadData]);

    const handleReorder = useCallback(async (parentId: string | null, fromIndex: number, toIndex: number) => {

        let siblings: WBSItemLocal[] = [];
        if (parentId) {
            const findNode = (nodes: WBSItemLocal[], id: string): WBSItemLocal | null => {
                for (const n of nodes) {
                    if (n.id === id) return n;
                    if (n.children) {
                        const found = findNode(n.children, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            const parent = findNode(wbsItems, parentId);
            siblings = parent?.children || [];
        } else {
            siblings = wbsItems.filter(item => !item.parent_id);
        }

        const reordered = [...siblings].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);

        const promises = reordered.map((item, index) => {
            const newSortOrder = index + 1;
            const parts = item.code.split('.');
            const lastPart = parts[parts.length - 1];
            const prefix = parts.slice(0, -1).join('.');
            let newCode = item.code;
            if (/^\d+$/.test(lastPart)) {
                newCode = prefix ? `${prefix}.${newSortOrder}` : `${newSortOrder}`;
            }

            return syncItemCodeAndDescendants(item.id, item.code, newCode, newSortOrder);
        });

        const results = await Promise.all(promises);
        const err = results.find((r: any) => r.error);
        if (err && err.error) {
            console.error("Error updating order in database:", err.error);
            alert("Error updating order: " + err.error.message);
        }

        await loadData();
    }, [wbsItems, loadData]);

    const handleExportExcel = () => {
        exportWBSToExcel(wbsItems, `wbs_template_detail_${projectTypeId}.xlsx`);
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

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset WBS to the default baseline template? This will DELETE all current WBS items and re-seed from the default template.")) {
            return;
        }
        setLoading(true);
        try {
            const { error: deleteError } = await supabase
                .from('work_breakdown_structure')
                .delete()
                .eq('workspace_id', workspaceId);
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
                    id: crypto.randomUUID(),
                    workspace_id: workspaceId,
                    code: code,
                    name: name,
                    level: currentLevel,
                    indent_level: indentLevel,
                    parent_id: parentDbId,
                    description: description,
                    sort_order: parseInt(code.split('.').pop() || "0") || 1
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
            loadData(true);
            setCurrentSheet("rekap");
        } catch (err: any) {
            console.error(err);
            alert("❌ Failed to reset WBS: " + err.message);
            setLoading(false);
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

            {headerContent && (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4 flex-wrap">
                        {headerContent}
                    </div>
                </div>
            )}

            {/* SPREADSHEET TABS & ACTIONS LINE - Single aligned row */}
            <div className="flex items-center justify-between gap-4 w-full flex-nowrap border-b border-neutral-200/60 pb-3">
                {/* Horizontal Sliding Tabs Wrapper */}
                <div 
                    className="bg-neutral-100/80 p-1.5 rounded-xl border border-neutral-200/60 flex items-center gap-1.5 overflow-x-auto select-none grow scrollbar-none flex-nowrap"
                    style={{ WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}
                >
                    <button
                        onClick={() => setCurrentSheet("cover")}
                        className={clsx(
                            "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 shrink-0",
                            currentSheet === "cover"
                                ? "bg-white text-neutral-900 shadow-sm font-bold border border-neutral-200/50"
                                : "text-neutral-500 hover:text-neutral-800 hover:bg-white/40"
                        )}
                    >
                        <FileText className="w-3.5 h-3.5 text-brand-red" />
                        Cover
                    </button>
                    <div className="h-4 w-[1px] bg-neutral-300 shrink-0" />
                    <button
                        onClick={() => setCurrentSheet("rekap")}
                        className={clsx(
                            "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 shrink-0",
                            currentSheet === "rekap"
                                ? "bg-white text-neutral-900 shadow-sm font-bold border border-neutral-200/50"
                                : "text-neutral-500 hover:text-neutral-800 hover:bg-white/40"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        Summary
                    </button>

                    {disciplines.length > 0 && <div className="h-4 w-[1px] bg-neutral-300 shrink-0" />}

                    {disciplines.map((disc: WBSItemLocal, idx: number) => {
                        const active = currentSheet === disc.code;
                        return (
                            <button
                                key={disc.id}
                                onClick={() => setCurrentSheet(disc.code)}
                                className={clsx(
                                    "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 shrink-0",
                                    active
                                        ? "bg-white text-neutral-900 shadow-sm font-bold border border-neutral-200/50"
                                        : "text-neutral-500 hover:text-neutral-800 hover:bg-white/40"
                                )}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                {disc.nameEn || disc.nameId || "Discipline"}
                            </button>
                        );
                    })}
                </div>

                {/* Right side: Add Discipline + Actions Menu */}
                <div className="flex items-center gap-2 shrink-0 relative">
                    {currentSheet === "rekap" && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="p-2 px-3 rounded-xl border border-dashed border-neutral-300 bg-white hover:bg-neutral-50 hover:border-neutral-400 text-neutral-500 hover:text-neutral-700 transition flex items-center gap-1.5 text-xs font-semibold active:scale-95 shadow-sm shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Discipline
                        </button>
                    )}

                    {/* Actions Menu Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-2 px-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition flex items-center gap-1.5 text-xs font-semibold active:scale-95 shadow-sm shrink-0"
                        >
                            <Settings className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Actions</span>
                            <ChevronDown className={clsx("w-3 h-3 text-neutral-400 transition-transform", showActionsMenu && "rotate-180")} />
                        </button>

                        {showActionsMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150">
                                    <button
                                        onClick={() => { handleExportExcel(); setShowActionsMenu(false); }}
                                        className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-50 text-neutral-700 font-medium flex items-center gap-2.5"
                                    >
                                        <Download className="w-3.5 h-3.5 text-neutral-400" /> Export Excel
                                    </button>
                                    
                                    <label className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-50 text-neutral-700 font-medium flex items-center gap-2.5 cursor-pointer">
                                        <Upload className="w-3.5 h-3.5 text-neutral-400" /> 
                                        <span>Import Excel</span>
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={(e) => { handleImportExcel(e); setShowActionsMenu(false); }}
                                            className="hidden"
                                            disabled={loading}
                                        />
                                    </label>

                                    <div className="border-t border-neutral-100 my-1.5" />

                                    <button
                                        onClick={() => { handleReset(); setShowActionsMenu(false); }}
                                        className="w-full px-4 py-2 text-left text-xs hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2.5"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 text-red-500" /> Reset Baseline
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="min-h-[400px]">
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
                                <h3 className="text-base font-bold text-neutral-800">General Project Information</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">Edit project details for this template</p>
                            </div>
                        </div>
                        <div className="space-y-5 text-sm">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Project Name</label>
                                <input
                                    type="text"
                                    className="col-span-2 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm bg-neutral-50 hover:bg-neutral-50/20 focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                    value={coverInfo.projectName}
                                    onChange={(e) => saveCoverInfo({ ...coverInfo, projectName: e.target.value })}
                                    placeholder="Enter Project Name..."
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Project Code</label>
                                <input
                                    type="text"
                                    className="col-span-2 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm bg-neutral-50 hover:bg-neutral-50/20 focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                    value={coverInfo.projectCode}
                                    onChange={(e) => saveCoverInfo({ ...coverInfo, projectCode: e.target.value })}
                                    placeholder="Enter Project Code..."
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Default Location</label>
                                <input
                                    type="text"
                                    className="col-span-2 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm bg-neutral-50 hover:bg-neutral-50/20 focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                    value={coverInfo.location}
                                    onChange={(e) => saveCoverInfo({ ...coverInfo, location: e.target.value })}
                                    placeholder="Enter Location..."
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Year</label>
                                <input
                                    type="text"
                                    className="col-span-2 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm bg-neutral-50 hover:bg-neutral-50/20 focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                                    value={coverInfo.year}
                                    onChange={(e) => saveCoverInfo({ ...coverInfo, year: e.target.value })}
                                    placeholder="Project Year..."
                                />
                            </div>
                        </div>
                    </div>
                ) : visibleTree.length === 0 ? (
                    <div className="p-16 text-center text-neutral-400 text-sm">
                        Sheet empty. Please add a new discipline or work item.
                    </div>
                ) : (
                    <div>
                        <WBSList
                            items={visibleTree as any}
                            view={currentSheet === "rekap" ? "SUMMARY" : viewMode}
                            mode="DETAIL"
                            onUpdateItem={handleUpdateItem}
                            onAddChild={handleAddChild}
                            onAddSibling={handleAddSibling}
                            onRemove={handleRemove}
                            onReorder={handleReorder}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Add Discipline Area - Only show on Summary tab */}
            {currentSheet === "rekap" && (
                <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-sm font-bold text-neutral-800">Add Discipline Category</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">Quickly append a new primary discipline layer to your structure.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {availableDisciplines.map((discipline: Discipline) => (
                            <button
                                key={discipline.id}
                                className="rounded-lg border px-3 py-1.5 text-xs font-medium bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-600 transition"
                                onClick={() => handleAddDiscipline(discipline)}
                            >
                                + {discipline.nameEn}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="rounded-lg border border-dashed border-neutral-300 bg-white hover:bg-neutral-50 hover:border-neutral-400 text-neutral-500 hover:text-neutral-700 px-3 py-1.5 text-xs font-medium transition flex items-center gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Other
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
