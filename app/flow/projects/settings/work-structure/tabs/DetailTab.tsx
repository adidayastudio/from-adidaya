"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { supabase } from "@/lib/supabaseClient";
import WBSList from "@/components/flow/projects/project-detail/setup/wbs/WBSList";

// Local WBS Item type
type WBSItemLocal = {
    id: string;
    code: string;
    nameEn: string;
    nameId?: string;
    children?: WBSItemLocal[];
    // DB Fields
    level?: string;
    indent_level?: number;
    parent_id?: string | null;
    sort_order?: number;
};

type ViewMode = "SUMMARY" | "BREAKDOWN";

interface Props {
    workspaceId: string;
    projectTypeId: string;
    headerContent?: React.ReactNode;
}

export default function DetailTab({ workspaceId, projectTypeId, headerContent }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>("SUMMARY");
    const [wbsItems, setWbsItems] = useState<WBSItemLocal[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Load Data ---
    const loadData = useCallback(async () => {
        if (!workspaceId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('work_breakdown_structure')
            .select('*')
            .eq('workspace_id', workspaceId)
            // .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (data) {
            // Build Tree
            const nodes = data.map((d: any) => ({
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


    // --- View Logic ---
    const visibleTree = useMemo(() => {
        // Detail Tab: Summary = L1-L2, Breakdown = All (L1-L5)
        const maxIndent = viewMode === "SUMMARY" ? 1 : 10;

        const prune = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
            return nodes.filter(n => (n.indent_level || 0) <= maxIndent).map(n => ({
                ...n,
                children: n.children ? prune(n.children) : undefined
            }));
        };
        return prune(wbsItems);
    }, [wbsItems, viewMode]);


    // --- Actions ---

    // 1. UPDATE
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

    // 2. DELETE
    const handleRemove = useCallback(async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        // Optimistic
        const removeDeep = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
            return nodes.filter(n => n.id !== id).map(n => ({
                ...n,
                children: n.children ? removeDeep(n.children) : undefined
            }));
        };
        setWbsItems(prev => removeDeep(prev));

        // DB
        await supabase.from('work_breakdown_structure').delete().eq('id', id);
    }, []);

    // 3. ADD CHILD
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
            name: "New Detail Item",
            description: "Pekerjaan Baru",
            indent_level: newIndent,
            level: `L${newIndent + 1}`,
            sort_order: nextNum
        };

        // Optimistic
        const addDeep = (nodes: WBSItemLocal[]): WBSItemLocal[] => {
            return nodes.map(n => {
                if (n.id === parentId) {
                    const childLocal: WBSItemLocal = {
                        id: newItem.id,
                        code: newItem.code,
                        nameEn: newItem.name,
                        nameId: newItem.description,
                        indent_level: newItem.indent_level,
                        children: []
                    };
                    return { ...n, children: [...(n.children || []), childLocal] };
                }
                if (n.children) return { ...n, children: addDeep(n.children) };
                return n;
            });
        };
        setWbsItems(prev => addDeep(prev));

        await supabase.from('work_breakdown_structure').insert(newItem);
        loadData();
    }, [wbsItems, workspaceId, projectTypeId, loadData]);

    // 4. ADD SIBLING
    const handleAddSibling = useCallback(async (siblingId: string, position: "above" | "below") => {
        const findParent = (nodes: WBSItemLocal[], targetId: string, parent: WBSItemLocal | null = null): { node: WBSItemLocal, parent: WBSItemLocal | null } | null => {
            for (const n of nodes) {
                if (n.id === targetId) return { node: n, parent };
                if (n.children) {
                    const found = findParent(n.children, targetId, n);
                    if (found) return found;
                }
            }
            return null;
        };

        const found = findParent(wbsItems, siblingId);
        if (!found) return;

        const { node: sibling, parent } = found;
        const parentId = parent ? parent.id : null;

        const newIndent = sibling.indent_level || 0;
        const prefix = sibling.code.substring(0, sibling.code.lastIndexOf('.'));
        const nextSuffix = (parent ? (parent.children?.length || 0) : wbsItems.length) + 1;
        const newCode = parentId ? `${prefix}.${nextSuffix}` : `${nextSuffix}`;

        const newItem = {
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            project_type_id: projectTypeId,
            parent_id: parentId,
            code: newCode,
            name: "New Sibling Item",
            description: "Pekerjaan Baru",
            indent_level: newIndent,
            level: `L${newIndent + 1}`,
            sort_order: 999
        };

        await supabase.from('work_breakdown_structure').insert(newItem);
        loadData();
    }, [wbsItems, workspaceId, projectTypeId, loadData]);

    const handleReorder = useCallback((parentId: string | null, fromIndex: number, toIndex: number) => {
        console.log("Reorder not fully persisted yet.");
    }, []);

    return (
        <div className="space-y-6">
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

            {loading ? (
                <div className="h-64 flex items-center justify-center text-neutral-400 text-sm">Loading Detail WBS...</div>
            ) : (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    <WBSList
                        items={visibleTree as any}
                        view={viewMode}
                        mode="DETAIL" // Detail Mode for L4-L5
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
