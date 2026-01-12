"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Link as LinkIcon, AlertCircle, Check, Coins, ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { supabase } from "@/lib/supabaseClient";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";

// --- Types ---

type WBSDetailItem = {
    id: string;
    code: string;
    name: string; // or name_en / name_id
    discipline_id?: string;
    ahsp_id?: string | null;
    level: string;
    indent_level: number;
    parent_id?: string | null;
    name_id?: string;
};

type AhspSummary = {
    id: string;
    code: string | null;
    name: string;
    unit: string;
    overhead_percent: number;
    total_price: number; // Calculated
};

type Discipline = {
    id: string;
    name: string;
};

// --- Helper: Calculate Price ---
// We need to fetch components to calc price. For 2000 items, fetching all components might be heavy.
// Alternative: Just fetch price for the *assigned* ones?
// Decisions: For the "Assign" modal, better to see the price.
// Optimization: Fetch all masters, but maybe only fetch components for visible?
// For now, let's try fetching all. If slow, we'll optimize.

export default function DetailCostPage() {
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Data
    const [wbsItems, setWbsItems] = useState<WBSDetailItem[]>([]);
    const [ahspList, setAhspList] = useState<AhspSummary[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);

    // Assignment Modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [activeWbsId, setActiveWbsId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    // const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null); // Removed per user request
    const [selectedAhspId, setSelectedAhspId] = useState<string | null>(null); // In modal

    useEffect(() => {
        const init = async () => {
            const wsId = await fetchDefaultWorkspaceId();
            setWorkspaceId(wsId);
            if (wsId) {
                await Promise.all([
                    loadWBS(wsId),
                    loadAHSPs(wsId),
                    loadDisciplines(wsId)
                ]);
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const loadWBS = async (wsId: string) => {
        // Fetch ALL levels (1-5) as requested
        const { data } = await supabase
            .from('work_breakdown_structure')
            .select('*, parent_id') // Add parent_id here
            .eq('workspace_id', wsId)
            .order('created_at', { ascending: true });

        if (data) {
            // Map to unified type
            const mapped = data.map((d: any) => ({
                id: d.id,
                code: d.code,
                name: d.name_en || d.name,
                name_id: d.description,
                discipline_id: d.discipline_id,
                ahsp_id: d.ahsp_id,
                level: d.level,
                indent_level: d.indent_level || 0,
                parent_id: d.parent_id // Add parent_id here
            }));

            // Custom Sort: SAMIL (Structure, Architecture, MEP, Infrastructure, Landscape)
            // S=1, A=2, M=3, I=4, L=5
            const sortOrder: Record<string, number> = {
                'S': 1,
                'A': 2,
                'M': 3,
                'I': 4,
                'L': 5
            };

            mapped.sort((a: any, b: any) => {
                // Get Root Code (first letter/part)
                const codeA = a.code.split('.')[0];
                const codeB = b.code.split('.')[0];

                const orderA = sortOrder[codeA] || 99;
                const orderB = sortOrder[codeB] || 99;

                if (orderA !== orderB) return orderA - orderB;

                // Secondary sort: Alphanumeric on full code
                // Use localeCompare for natural sort (1.1, 1.2, 1.10)
                return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
            });

            setWbsItems(mapped);

            // Default expand Level 0 and 1 (Structure, Summary)
            const defaultExpanded = new Set<string>();
            mapped.forEach((item: any) => {
                if (item.indent_level < 2) defaultExpanded.add(item.id);
            });
            setExpandedIds(defaultExpanded);
        }
    };

    const loadAHSPs = async (wsId: string) => {
        // Fetch Masters + Components for calculation
        // WARNING: Heavy query. 
        const { data, error } = await supabase
            .from('ahsp_masters')
            .select(`
                id, code, name, unit, overhead_percent,
                ahsp_components (
                    coefficient,
                    resource:pricing_resources (price_default, category)
                )
            `)
            .eq('workspace_id', wsId);

        if (data) {
            const calculated = data.map((m: any) => {
                const subtotal = m.ahsp_components.reduce((sum: number, c: any) => {
                    const price = c.resource?.price_default || 0;
                    return sum + (price * c.coefficient);
                }, 0);
                const overhead = subtotal * ((m.overhead_percent || 0) / 100);
                return {
                    id: m.id,
                    code: m.code,
                    name: m.name,
                    unit: m.unit,
                    overhead_percent: m.overhead_percent,
                    total_price: subtotal + overhead
                };
            });
            setAhspList(calculated);
        }
    };

    const loadDisciplines = async (wsId: string) => {
        const { data } = await supabase.from('disciplines').select('id, name').eq('workspace_id', wsId);
        if (data) setDisciplines(data);
    };

    // --- Tree Logic ---
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Sorting logic removed - strictly SAMIL (handled in loadWBS)
    // const handleSort = (key: string) => { ... }

    // Flatten logic
    const visibleItems = useMemo(() => {
        // 1. Build Map & Tree
        const map = new Map<string, any>();
        const roots: any[] = [];
        // Clone items to avoid mutation
        const nodes = wbsItems.map(i => ({ ...i, children: [] as any[] }));

        nodes.forEach(node => map.set(node.id, node));
        nodes.forEach(node => {
            if (node.parent_id && map.has(node.parent_id)) {
                map.get(node.parent_id).children.push(node);
            } else {
                roots.push(node);
            }
        });

        // 2. Sort Function (Recursive Sibling Sort)
        const sortNodes = (nodes: any[]) => {
            const sortOrder: Record<string, number> = { 'S': 1, 'A': 2, 'M': 3, 'I': 4, 'L': 5 };

            nodes.sort((a, b) => {
                // Get Root Code (first part)
                const codeA = a.code?.split('.')[0] || '';
                const codeB = b.code?.split('.')[0] || '';

                const orderA = sortOrder[codeA] || 99;
                const orderB = sortOrder[codeB] || 99;

                // Priority to SAMIL
                if (orderA !== orderB) return orderA - orderB;

                // Secondary sort: Alphanumeric
                return a.code.localeCompare(b.code, undefined, { numeric: true });
            });

            nodes.forEach(n => sortNodes(n.children));
        };
        sortNodes(roots);

        // 3. Filter & Flatten
        const flat: any[] = [];
        const process = (nodes: any[]) => {
            for (const node of nodes) {
                // Search Filter: Show if self matches OR children match
                // Actually, for simplicity, if search is active, show matching rows and their parents?
                // Simpler: Show if 'matches' is true. If parent matches, show all children?
                // Let's settle on: If search active -> Flatten list, filter by match. Tree structure ignored?
                // OR: Filter tree.

                // Let's do simple Filter List if search is present to prioritize finding items.
                if (searchQuery) {
                    const matches = node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        node.code.toLowerCase().includes(searchQuery.toLowerCase());
                    if (matches) flat.push(node);
                    if (node.children.length > 0) process(node.children);
                } else {
                    // Tree View
                    flat.push(node);
                    if (expandedIds.has(node.id) && node.children.length > 0) {
                        process(node.children);
                    }
                }
            }
        };

        process(roots);
        return flat;
    }, [wbsItems, expandedIds, searchQuery, ahspList]);


    // --- Actions ---

    const openAssignModal = (wbsId: string, currentAhspId?: string) => {
        setActiveWbsId(wbsId);
        setSelectedAhspId(currentAhspId || null);
        setSearchQuery("");
        setIsAssignModalOpen(true);
    };

    const handleAssign = async () => {
        if (!activeWbsId || !selectedAhspId) return;

        // Optimistic update
        setWbsItems(prev => prev.map(item => item.id === activeWbsId ? { ...item, ahsp_id: selectedAhspId } : item));

        await supabase
            .from('work_breakdown_structure')
            .update({ ahsp_id: selectedAhspId })
            .eq('id', activeWbsId);

        setIsAssignModalOpen(false);
    };

    const handleRemoveAssignment = async (e: React.MouseEvent, wbsId: string) => {
        e.stopPropagation();
        if (!confirm("Remove AHSP assignment?")) return;

        setWbsItems(prev => prev.map(item => item.id === wbsId ? { ...item, ahsp_id: null } : item));

        await supabase
            .from('work_breakdown_structure')
            .update({ ahsp_id: null })
            .eq('id', wbsId);
    };

    // --- Computed ---

    // Filter AHSPs in Modal
    const filteredAhspList = useMemo(() => {
        if (!searchQuery) return ahspList.slice(0, 50); // Limit initial view
        return ahspList.filter(a =>
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.code && a.code.toLowerCase().includes(searchQuery.toLowerCase()))
        ).slice(0, 50);
    }, [ahspList, searchQuery]);

    // Lookup
    const getAhsp = (id?: string | null) => ahspList.find(a => a.id === id);


    // SortIcon component removed as sorting is no longer dynamic

    return (
        <div className="flex h-[calc(100vh-140px)] flex-col gap-4 animate-in fade-in duration-300">
            {/* Header / Toolbar (New) */}
            <div className="flex flex-col gap-4 px-1">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-neutral-900">Detail Cost Estimation</h2>
                        <p className="text-sm text-neutral-500">Assign AHSP Analysis to WBS Detail items</p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            className="pl-9 h-10 text-sm bg-white shadow-sm border-neutral-200"
                            placeholder="Search WBS items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-neutral-500 bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm">
                        {wbsItems.filter(i => i.ahsp_id).length} / {wbsItems.length} Assigned
                    </div>
                </div>
            </div>

            {/* Table Container (The Box) */}
            <div className="flex-1 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-white border-b border-neutral-100 sticky top-0 z-10 shadow-sm">
                            <tr className="text-neutral-500 font-medium text-xs uppercase tracking-wider">
                                <th className="px-6 py-3 w-48 select-none">
                                    <div className="flex items-center gap-1">WBS Code</div>
                                </th>
                                <th className="px-6 py-3 select-none">
                                    <div className="flex items-center gap-1">Work Item</div>
                                </th>
                                <th className="px-6 py-3 w-1/3">Assigned Analysis (AHSP)</th>
                                <th className="px-6 py-3 text-right w-24">Unit</th>
                                <th className="px-6 py-3 text-right w-40 select-none">
                                    <div className="flex items-center justify-end gap-1">Unit Price</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-neutral-400">Loading data...</td></tr>
                            ) : visibleItems.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-neutral-400">No matching items found.</td></tr>
                            ) : (
                                visibleItems.map(item => {
                                    const ahsp = getAhsp(item.ahsp_id);
                                    const isGroup = item.indent_level < 2; // Allow assignment for Level 2 (Estimate) and below

                                    const hasChildren = item.children && item.children.length > 0;
                                    const isExpanded = expandedIds.has(item.id);

                                    return (
                                        <tr key={item.id} className={clsx(
                                            "transition-colors border-b border-neutral-50 last:border-0",
                                            isGroup ? "bg-white" : "hover:bg-neutral-50 group"
                                        )}>
                                            {/* CODE COLUMN */}
                                            <td className="px-6 py-3 font-mono text-neutral-500 text-xs align-top">
                                                <div className="flex items-center h-full pt-1" style={{ paddingLeft: `${item.indent_level * 1.5}rem` }}>
                                                    {/* Toggle */}
                                                    <div className="w-5 flex justify-center mr-1 flex-shrink-0">
                                                        {hasChildren && !searchQuery && (
                                                            <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="p-0.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-600 transition-colors">
                                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Code Pill */}
                                                    <span className={clsx(
                                                        "inline-flex items-center justify-center font-mono text-[10px] font-medium transition-colors",
                                                        item.indent_level === 0
                                                            ? "bg-neutral-900 text-white rounded-full w-6 h-6" // Root: Circle Black
                                                            : "bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-full px-2 py-0.5 min-w-[24px]" // Others: Pill Gray
                                                    )}>
                                                        {item.code}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* NAME COLUMN */}
                                            <td className="px-6 py-3 align-top">
                                                <div className="flex flex-col pt-1" style={{ paddingLeft: `${item.indent_level > 0 ? 0 : 0}rem` }}>
                                                    <span className={clsx("text-sm", isGroup ? "font-bold text-neutral-900" : "font-medium text-neutral-900")}>
                                                        {item.name}
                                                    </span>
                                                    {item.name_id && (
                                                        <span className="text-[11px] text-neutral-500 italic mt-0.5">
                                                            {item.name_id}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* AHSP COLUMN */}
                                            <td className="px-6 py-3 align-top">
                                                <div className="pt-1">
                                                    {!isGroup ? (
                                                        ahsp ? (
                                                            <div
                                                                onClick={() => openAssignModal(item.id, ahsp.id)}
                                                                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-brand-red/20 bg-brand-red/5 hover:bg-brand-red/10 cursor-pointer transition-all group/cell shadow-sm hover:shadow-md"
                                                            >
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-medium text-brand-red truncate text-xs">{ahsp.name}</span>
                                                                    <span className="text-[10px] text-brand-red/70 font-mono">{ahsp.code}</span>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => handleRemoveAssignment(e, item.id)}
                                                                    className="p-1 hover:bg-white rounded-full text-brand-red/40 hover:text-brand-red transition-colors"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => openAssignModal(item.id)}
                                                                className="flex items-center gap-2 text-neutral-400 hover:text-neutral-600 px-3 py-2 rounded-lg border border-dashed border-neutral-300 hover:border-neutral-400 w-full text-xs transition-colors bg-white hover:bg-neutral-50"
                                                            >
                                                                <LinkIcon className="w-3.5 h-3.5" /> Assign Analysis...
                                                            </button>
                                                        )
                                                    ) : (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-400 font-medium">Group</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* UNIT COLUMN */}
                                            <td className="px-6 py-3 text-right text-neutral-500 text-xs align-top pt-4">
                                                {ahsp ? ahsp.unit : "-"}
                                            </td>

                                            {/* PRICE COLUMN */}
                                            <td className="px-6 py-3 text-right tabular-nums text-neutral-900 align-top pt-4">
                                                {ahsp ? (
                                                    <span className="font-medium">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(ahsp.total_price)}
                                                    </span>
                                                ) : "-"}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal remains mostly redundant to change but kept for structure completeness if needed, but Dialog is outside main div in previous code? No, it was inside. */}
                {/* Close Table Container */}
            </div>

            <Dialog.Root open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col z-50 overflow-hidden">
                        <div className="p-6 border-b border-neutral-100 flex-shrink-0">
                            <Dialog.Title className="text-xl font-bold text-neutral-900 mb-1">Assign Analysis</Dialog.Title>
                            <Dialog.Description className="text-sm text-neutral-500">
                                Select an AHSP to link with this work item.
                            </Dialog.Description>
                            <div className="mt-4 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                                    placeholder="Search by name or code..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredAhspList.length === 0 ? (
                                <div className="text-center py-12 text-neutral-400">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No matching AHSP found.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredAhspList.map(ahsp => (
                                        <div
                                            key={ahsp.id}
                                            onClick={() => setSelectedAhspId(ahsp.id)}
                                            className={clsx(
                                                "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border",
                                                selectedAhspId === ahsp.id
                                                    ? "bg-brand-red/5 border-brand-red/30 shadow-sm"
                                                    : "bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200"
                                            )}
                                        >
                                            <div className="flex gap-3 items-center overflow-hidden">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs",
                                                    selectedAhspId === ahsp.id ? "bg-brand-red text-white" : "bg-neutral-100 text-neutral-500"
                                                )}>
                                                    {ahsp.unit}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className={clsx("font-medium truncate", selectedAhspId === ahsp.id ? "text-neutral-900" : "text-neutral-700")}>
                                                        {ahsp.name}
                                                    </div>
                                                    <div className="text-xs text-neutral-400 font-mono">
                                                        {ahsp.code || "NO CODE"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <div className="text-right">
                                                    <div className="text-xs text-neutral-400">Price</div>
                                                    <div className="font-semibold text-neutral-900 tabular-nums">
                                                        {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(ahsp.total_price)}
                                                    </div>
                                                </div>
                                                {selectedAhspId === ahsp.id && (
                                                    <Check className="w-5 h-5 text-brand-red" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {ahspList.length > 50 && searchQuery === "" && (
                                        <div className="text-center py-2 text-xs text-neutral-400 italic">
                                            Showing top 50 of {ahspList.length}. Use search to find more.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3 flex-shrink-0">
                            <Button variant="text" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleAssign} disabled={!selectedAhspId}>Confirm Assignment</Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

        </div>
    );
}
