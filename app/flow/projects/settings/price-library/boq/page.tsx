"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Trash2, Box, Save, Ruler, ChevronRight, ChevronDown, Check, Link as LinkIcon, FileJson } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import * as Dialog from "@radix-ui/react-dialog";

// --- Types ---

type WBSItem = {
    id: string;
    code: string;
    name: string;
    name_id?: string;
    level: string;
    indent_level: number;
    parent_id?: string | null;
    boq_definition_id?: string | null;
    definition?: BoqDefinition | null; // Joined
    children?: WBSItem[];
};

type BoqDefinition = {
    id: string;
    workspace_id: string;
    code: string;
    name: string;
    unit: string;
    description?: string;
    formula?: string; // Added
    elements?: BoqElement[];
};

type BoqElement = {
    id: string;
    definition_id: string;
    name: string;
    symbol: string;
    unit: string;
    description?: string;
};

export default function BoqBuilderPage() {
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Data
    const [wbsItems, setWbsItems] = useState<WBSItem[]>([]);
    const [definitions, setDefinitions] = useState<BoqDefinition[]>([]);

    // UI State
    const [selectedWbsId, setSelectedWbsId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Initialize
    useEffect(() => {
        const init = async () => {
            const wsId = await fetchDefaultWorkspaceId();
            setWorkspaceId(wsId);
            if (wsId) {
                await Promise.all([
                    loadWBS(wsId),
                    loadDefinitions(wsId)
                ]);
            }
            setIsLoading(false);
        };
        init();
    }, []);

    const loadWBS = async (wsId: string) => {
        // Fetch WBS + Link to Definition
        const { data, error } = await supabase
            .from('work_breakdown_structure')
            .select(`
                *,
                definition:boq_definitions(*)
            `)
            .eq('workspace_id', wsId)
            .order('created_at', { ascending: true });

        if (data) {
            // Map and build tree
            const items: WBSItem[] = data.map((d: any) => ({
                id: d.id,
                code: d.code,
                name: d.name_en || d.name,
                name_id: d.description, // Mapping description to ID Name
                level: d.level,
                indent_level: d.indent_level || 0,
                parent_id: d.parent_id,
                boq_definition_id: d.boq_definition_id,
                definition: d.definition,
            }));

            // Auto-expand root levels (L0, L1)
            const initialExpanded = new Set<string>();
            items.forEach(i => {
                if (i.indent_level < 2) initialExpanded.add(i.id);
            });
            setExpandedIds(initialExpanded);
            setWbsItems(items);
        }
    };

    const loadDefinitions = async (wsId: string) => {
        const { data: defs, error: defError } = await supabase
            .from('boq_definitions')
            .select(`
                *,
                elements:boq_elements(*)
            `)
            .eq('workspace_id', wsId)
            .order('name', { ascending: true });

        if (defError) console.error("Error loading definitions:", defError);

        if (defs) setDefinitions(defs);
    };

    // --- Actions ---

    // Toggle Expansion
    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    // 1. Create New Definition & Link
    const handleCreateAndLink = async (wbsItem: WBSItem) => {
        if (!workspaceId) return;

        // 1. Create Definition
        const newDef = {
            workspace_id: workspaceId,
            name: `${wbsItem.name} Formula`, // Default name based on WBS
            unit: "m3", // Default unit, user can change
            code: wbsItem.code // Default code
        };

        const { data: defData, error: defError } = await supabase
            .from('boq_definitions')
            .insert(newDef)
            .select()
            .single();

        if (defData) {
            // 2. Link to WBS
            const { error: linkError } = await supabase
                .from('work_breakdown_structure')
                .update({ boq_definition_id: defData.id })
                .eq('id', wbsItem.id);

            if (!linkError) {
                // Update Local State
                const newDefWithElements = { ...defData, elements: [] };
                setDefinitions(prev => [...prev, newDefWithElements]);
                setWbsItems(prev => prev.map(i => i.id === wbsItem.id ? { ...i, boq_definition_id: defData.id, definition: newDefWithElements } : i));
            }
        }
    };

    // 2. Link Existing Definition
    const handleLinkExisting = async (wbsId: string, defId: string) => {
        const { error } = await supabase
            .from('work_breakdown_structure')
            .update({ boq_definition_id: defId })
            .eq('id', wbsId);

        if (!error) {
            const def = definitions.find(d => d.id === defId) || null;
            setWbsItems(prev => prev.map(i => i.id === wbsId ? { ...i, boq_definition_id: defId, definition: def } : i));
        }
    };

    // 3. Unlink
    const handleUnlink = async (wbsId: string) => {
        if (!confirm("Unlink this definition from the WBS item?")) return;
        const { error } = await supabase
            .from('work_breakdown_structure')
            .update({ boq_definition_id: null })
            .eq('id', wbsId);

        if (!error) {
            setWbsItems(prev => prev.map(i => i.id === wbsId ? { ...i, boq_definition_id: null, definition: null } : i));
        }
    };

    // 4. Update Definition (Name, Unit)
    const handleUpdateDefinition = async (id: string, updates: Partial<BoqDefinition>, showSuccess = false) => {
        // Optimistic update
        setDefinitions(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
        // Also update the WBS item's joined view if it uses this def
        setWbsItems(prev => prev.map(i => i.definition?.id === id ? { ...i, definition: { ...i.definition, ...updates } } : i));

        const { error } = await supabase.from('boq_definitions').update(updates).eq('id', id);

        if (error) {
            console.error("Failed to update definition:", error);
        }
    };

    // 5. Update Elements
    const handleAddElement = async (defId: string) => {
        // Optimistic ID
        const tempId = crypto.randomUUID();
        const newElRaw = {
            id: tempId,
            definition_id: defId,
            name: "New Element",
            symbol: "Var",
            unit: "m"
        };

        // Optimistic Update
        const updateState = (newItem: BoqElement) => {
            setDefinitions(prev => prev.map(d => d.id === defId ? { ...d, elements: [...(d.elements || []), newItem] } : d));
            setWbsItems(prev => prev.map(i => i.definition?.id === defId ? { ...i, definition: { ...i.definition!, elements: [...(i.definition!.elements || []), newItem] } } : i));
        };

        updateState(newElRaw);

        // DB Insert (Send the ID explicitly)
        const { data, error } = await supabase
            .from('boq_elements')
            .insert(newElRaw)
            .select()
            .single();

        if (error) {
            console.error("Failed to add element:", error);
            // Revert State
            setDefinitions(prev => prev.map(d => d.id === defId ? { ...d, elements: d.elements?.filter(e => e.id !== tempId) } : d));
            setWbsItems(prev => prev.map(i => i.definition?.id === defId ? { ...i, definition: { ...i.definition!, elements: i.definition!.elements?.filter(e => e.id !== tempId) } } : i));
            return;
        }
    };

    const handleUpdateElement = async (defId: string, elId: string, updates: Partial<BoqElement>) => {
        // Optimistic
        const updateState = (prevDefs: BoqDefinition[]) => prevDefs.map(d => {
            if (d.id === defId) {
                return { ...d, elements: d.elements?.map(e => e.id === elId ? { ...e, ...updates } : e) };
            }
            return d;
        });

        setDefinitions(updateState);
        setWbsItems(prevItems => prevItems.map(i => i.definition?.id === defId ? { ...i, definition: { ...i.definition!, elements: i.definition!.elements?.map(e => e.id === elId ? { ...e, ...updates } : e) } } : i));

        const { error } = await supabase.from('boq_elements').update(updates).eq('id', elId);
        if (error) {
            console.error("Failed to update element:", error);
            alert(`Failed to update variable: ${error.message}`);
        }
    };

    const handleDeleteElement = async (defId: string, elId: string) => {
        const updateState = (prevDefs: BoqDefinition[]) => prevDefs.map(d => {
            if (d.id === defId) {
                return { ...d, elements: d.elements?.filter(e => e.id !== elId) };
            }
            return d;
        });
        setDefinitions(updateState);
        setWbsItems(prevItems => prevItems.map(i => i.definition?.id === defId ? { ...i, definition: { ...i.definition!, elements: i.definition!.elements?.filter(e => e.id !== elId) } } : i));

        await supabase.from('boq_elements').delete().eq('id', elId);
    };


    // --- Tree & View Logic ---
    const visibleTreeItems = useMemo(() => {
        if (!wbsItems.length) return [];
        const q = searchQuery.toLowerCase();

        // Flattened list for search results
        if (q) {
            return wbsItems.filter(item => {
                return item.name.toLowerCase().includes(q) ||
                    (item.name_id?.toLowerCase().includes(q)) ||
                    item.code.toLowerCase().includes(q);
            });
        }

        // Tree Traversal for Collapsible View
        // Build Tree
        const idMap = new Map<string, WBSItem & { childrenNodes: WBSItem[] }>();
        wbsItems.forEach(i => idMap.set(i.id, { ...i, childrenNodes: [] }));

        const roots: (WBSItem & { childrenNodes: WBSItem[] })[] = [];
        wbsItems.forEach(i => {
            // Find parent in our map
            if (i.parent_id && idMap.has(i.parent_id)) {
                idMap.get(i.parent_id)!.childrenNodes.push(idMap.get(i.id)!);
            } else {
                // Treat as root if parent not found or is null
                // Note: 'created_at' sort might mean parent comes after child in some edge cases?
                // Assuming standard top-down creation.
                roots.push(idMap.get(i.id)!);
            }
        });

        const result: WBSItem[] = [];
        const flatten = (nodes: (WBSItem & { childrenNodes: WBSItem[] })[]) => {
            nodes.forEach(node => {
                result.push(node);
                if (expandedIds.has(node.id) && node.childrenNodes.length > 0) {
                    flatten(node.childrenNodes as any);
                }
            });
        };

        flatten(roots);
        return result;

    }, [wbsItems, searchQuery, expandedIds]);

    // Derived State
    const activeWbsItem = useMemo(() => {
        if (!selectedWbsId) return null;
        return wbsItems.find(i => i.id === selectedWbsId) || null;
    }, [wbsItems, selectedWbsId]);

    // FIX: Derive activeDef from the FRESH definitions state, not the stale WBS item
    const activeDef = useMemo(() => {
        if (!activeWbsItem?.boq_definition_id) return null;
        return definitions.find(d => d.id === activeWbsItem.boq_definition_id) || null;
    }, [definitions, activeWbsItem]);

    const hasDefinition = !!activeDef;

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-neutral-900">BOQ Builder</h2>
                <p className="text-sm text-neutral-500">Define Volume Formulas for WBS Items</p>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">

                {/* SIDEBAR: WBS TREE */}
                <div className="w-[340px] flex flex-col bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex-shrink-0">
                    <div className="p-3 border-b border-neutral-100 bg-neutral-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                            <Input
                                className="pl-8 h-9 text-xs bg-white"
                                placeholder="Search WBS items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1">
                        {visibleTreeItems.length === 0 && (
                            <div className="text-center p-8 text-neutral-400 text-xs">
                                No items found.
                            </div>
                        )}
                        {visibleTreeItems.map(item => {
                            const isSelected = selectedWbsId === item.id;
                            const isExpanded = expandedIds.has(item.id);
                            // Heuristic for "Has Children" / Is Group
                            // We can check if it has children in the idMap logic, but here we are iterating linear list.
                            // We can check indent level relative to next item? 
                            // Or just use the 'isGroup' heuristic (Indent < 3) as the user typically uses L0-L2 as groups.
                            const isGroup = item.indent_level < 3;
                            const hasDef = !!item.boq_definition_id;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedWbsId(item.id)}
                                    className={clsx(
                                        "flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer rounded-md transition-colors border border-transparent select-none",
                                        isSelected ? "bg-brand-red/5 border-brand-red/20" : "hover:bg-neutral-50",
                                        isGroup && "font-semibold text-neutral-800"
                                    )}
                                    style={{ paddingLeft: `${Math.max(0.2, item.indent_level * 0.8)}rem` }}
                                >
                                    {/* Expand Toggle */}
                                    {isGroup ? (
                                        <div
                                            className="p-0.5 rounded hover:bg-neutral-200 cursor-pointer text-neutral-400 shrink-0"
                                            onClick={(e) => toggleExpand(e, item.id)}
                                        >
                                            {isExpanded || searchQuery ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </div>
                                    ) : (
                                        <div className="w-4 shrink-0" /> // Spacer matching toggle width
                                    )}

                                    {/* Indent Guide/Status */}
                                    <div
                                        className={clsx("w-1.5 h-1.5 rounded-full shrink-0",
                                            hasDef ? "bg-green-500" : (isGroup ? "bg-neutral-300" : "bg-neutral-100 border border-neutral-200")
                                        )}
                                        title={hasDef ? "Formula Defined" : "Undefined"}
                                    />

                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-2">
                                                <span className={clsx("font-mono text-[9px] opacity-75 shrink-0 uppercase", isGroup ? "font-bold text-neutral-500" : "text-neutral-400")}>
                                                    {item.code}
                                                </span>
                                                <span className={clsx("truncate text-xs", isSelected ? "text-brand-red font-medium" : "text-neutral-700")}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            {item.name_id && (
                                                <span className="text-[10px] text-neutral-400 italic truncate pl-8 leading-tight">
                                                    {item.name_id}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* MAIN: EDITOR */}
                <div className="flex-1 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col relative">
                    {activeWbsItem ? (
                        hasDefinition && activeDef ? (
                            // MODE: EDITING DEFINITION
                            <div className="flex flex-col h-full">
                                {/* Definition Header */}
                                <div className="p-6 border-b border-neutral-100 bg-neutral-50/30">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="text-xs font-bold text-brand-red uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <LinkIcon className="w-3 h-3" /> Linked to {activeWbsItem.code}
                                            </div>
                                            <h3 className="text-xl font-bold text-neutral-900">{activeDef.name}</h3>
                                            <p className="text-sm text-neutral-500">Edit the volume breakdown structure for this item.</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                                className="shrink-0 whitespace-nowrap"
                                                onClick={() => handleUnlink(activeWbsItem.id)}
                                            >
                                                Unlink Formula
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                icon={<Save className="w-3.5 h-3.5" />}
                                                className="shrink-0 whitespace-nowrap"
                                                onClick={() => {
                                                    handleUpdateDefinition(activeDef.id, {}, true);
                                                }}
                                            >
                                                Save Definition
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Formula Header / Metadata */}
                                    <div className="grid grid-cols-3 gap-4 p-4 mx-6 mb-6 bg-white rounded-lg border border-neutral-200 shadow-sm">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-neutral-500 uppercase">Formula Name</label>
                                            <Input
                                                value={activeDef.name}
                                                onChange={(e) => handleUpdateDefinition(activeDef.id, { name: e.target.value })}
                                                className="font-medium"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-neutral-500 uppercase">Base Unit</label>
                                            <Input
                                                value={activeDef.unit}
                                                onChange={(e) => handleUpdateDefinition(activeDef.id, { unit: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-neutral-500 uppercase">Formula Code</label>
                                            <Input
                                                value={activeDef.code || ""}
                                                onChange={(e) => handleUpdateDefinition(activeDef.id, { code: e.target.value })}
                                                className="font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Formula Logic Input */}
                                <div className="mx-6 mb-6 p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileJson className="w-4 h-4 text-brand-red" />
                                        <h3 className="font-semibold text-neutral-800 text-sm">Calculation Formula</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-xs text-neutral-500">
                                            Define the formula using variables (e.g. <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-700">L * W * H</code>).
                                        </p>
                                        <Input
                                            value={activeDef.formula || ""}
                                            onChange={(e) => handleUpdateDefinition(activeDef.id, { formula: e.target.value })}
                                            placeholder="e.g. L * W * H"
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Elements List */}
                                <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-neutral-900 flex items-center gap-2">
                                            <Ruler className="w-4 h-4 text-neutral-400" />
                                            Volume Elements (Variables)
                                        </h4>
                                        <Button size="sm" variant="outline" onClick={() => handleAddElement(activeDef.id)} icon={<Plus className="w-3.5 h-3.5" />}>
                                            Add Variable
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {(!activeDef.elements || activeDef.elements.length === 0) && (
                                            <div className="text-center py-10 border-2 border-dashed border-neutral-100 rounded-xl bg-neutral-50/50">
                                                <p className="text-sm text-neutral-400">No variables defined yet.</p>
                                                <p className="text-xs text-neutral-400 mt-1">Add Length, Width, Height, etc.</p>
                                            </div>
                                        )}
                                        {activeDef.elements?.map((el, idx) => (
                                            <div key={el.id} className="group flex items-center gap-3 p-3 rounded-lg border border-neutral-100 hover:border-brand-red/30 hover:bg-brand-red/5 transition-all shadow-sm">
                                                <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {idx + 1}
                                                </div>

                                                <div className="flex-1 grid grid-cols-12 gap-3">
                                                    <div className="col-span-5">
                                                        <label className="text-[9px] text-neutral-400 font-bold uppercase mb-0.5 block">Name</label>
                                                        <Input
                                                            className="h-8 text-sm"
                                                            value={el.name}
                                                            onChange={(e) => handleUpdateElement(activeDef.id, el.id, { name: e.target.value })}
                                                            placeholder="e.g. Panjang Ruangan"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <label className="text-[9px] text-neutral-400 font-bold uppercase mb-0.5 block">Symbol</label>
                                                        <Input
                                                            className="h-8 text-sm font-mono text-brand-red bg-white"
                                                            value={el.symbol}
                                                            onChange={(e) => handleUpdateElement(activeDef.id, el.id, { symbol: e.target.value })}
                                                            placeholder="e.g. L"
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <label className="text-[9px] text-neutral-400 font-bold uppercase mb-0.5 block">Unit</label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                className="h-8 text-sm"
                                                                value={el.unit}
                                                                onChange={(e) => handleUpdateElement(activeDef.id, el.id, { unit: e.target.value })}
                                                                placeholder="m"
                                                            />
                                                            <button
                                                                onClick={() => handleDeleteElement(activeDef.id, el.id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // MODE: SELECTION (Undefined)
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-neutral-50/30">
                                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                    <FileJson className="w-8 h-8 text-neutral-400" />
                                </div>
                                <h3 className="text-xl font-bold text-neutral-900 mb-2">No Formula Defined</h3>
                                <p className="text-neutral-500 max-w-md mx-auto mb-8">
                                    The item <span className="font-semibold text-neutral-800">"{activeWbsItem.name}"</span> does not have a volume calculation formula yet.
                                </p>

                                <div className="flex gap-4">
                                    {/* Option A: Create New */}
                                    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer w-64 text-left group" onClick={() => handleCreateAndLink(activeWbsItem)}>
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        <div className="font-bold text-neutral-900 mb-1">Create New Formula</div>
                                        <div className="text-xs text-neutral-500">Define a new volume structure from scratch for this item.</div>
                                    </div>

                                    {/* Option B: Link Existing */}
                                    <LinkExistingDropdown
                                        definitions={definitions}
                                        onSelect={(defId) => handleLinkExisting(activeWbsItem.id, defId)}
                                    />
                                </div>
                            </div>
                        )
                    ) : (
                        // MODE: NO SELECTION
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                            <Box className="w-12 h-12 text-neutral-200 mb-4" />
                            <p>Select a WBS Item from the sidebar to define its volume.</p>
                        </div>
                    )
                    }
                </div >
            </div >
        </div >
    );
}

// Helper: Link Existing Dropdown
function LinkExistingDropdown({ definitions, onSelect }: { definitions: BoqDefinition[], onSelect: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <div
                onClick={() => setOpen(!open)}
                className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer w-64 text-left group h-full"
            >
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <LinkIcon className="w-5 h-5" />
                </div>
                <div className="font-bold text-neutral-900 mb-1">Link Existing</div>
                <div className="text-xs text-neutral-500">Use a formula definition from another item or library.</div>
            </div>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-neutral-200 z-20 max-h-60 overflow-y-auto py-1">
                        {definitions.length === 0 ? (
                            <div className="p-3 text-xs text-neutral-400 text-center">No definitions found.</div>
                        ) : (
                            definitions.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => { onSelect(d.id); setOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-sm flex items-center justify-between group"
                                >
                                    <span className="font-medium text-neutral-700">{d.name}</span>
                                    <span className="text-[10px] text-neutral-400 font-mono bg-neutral-100 px-1 rounded">{d.unit}</span>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
