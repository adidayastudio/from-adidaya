"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Lock, Unlock, Loader2, Save, RefreshCw, Layers, GitMerge, ChevronRight, ChevronDown, Calculator, PencilLine } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { CurrencyInput } from "../ballpark/CurrencyInput";

// Types matching Ballpark flattened structure roughly
interface FlattenedRow {
    code: string;
    nameEn: string;
    nameId?: string;
    depth: number;
    hasChildren: boolean;
    rootCode: string;
    parentCode?: string; // Needed for collapse logic
    unit?: string;
    // Estimate Specifics
    defaultPrice?: number;
    defaultVolumeSource?: "manual" | "calculated";
}

// Helper for Colors (matching Ballpark logic roughly)
const getRowColor = (rootCode: string) => {
    switch (rootCode) {
        case "S": return "bg-orange-500";
        case "A": return "bg-red-500";
        case "M": return "bg-blue-500";
        case "I": return "bg-purple-500";
        case "L": return "bg-green-500";
        default: return "bg-neutral-300";
    }
};

// Map Estimates Delta by Parent Code for easy tree injection
const estimatesDeltaMap = new Map<string, any[]>();
RAW_WBS_ESTIMATES_DELTA.forEach(group => {
    estimatesDeltaMap.set(group.parentCode, group.items);
});

const loadInitialData = () => {
    const rows: FlattenedRow[] = [];
    // Flatten recursively
    const flatten = (nodes: any[], depth: number, root: string, parentCode?: string) => {
        nodes.forEach(node => {
            const currentRoot = depth === 0 ? node.code : root;
            // Native children from Ballpark WBS
            const nativeChildren = node.children || [];

            // Estimates children (Detail Items) from Delta WBS
            const estimatesChildren = estimatesDeltaMap.get(node.code) || [];

            const hasChildren = nativeChildren.length > 0 || estimatesChildren.length > 0;

            // Determines if this is a price-bearing item (usually leaf)
            // If it comes from estimatesChildren, it definitely has price.
            // If it is from Ballpark but has no children, it might be a container.

            // We construct the row
            // Note: For Estimates Children, we need to adapt them to FlattenedRow

            rows.push({
                code: node.code,
                nameEn: node.nameEn,
                nameId: node.nameId,
                depth,
                hasChildren,
                rootCode: currentRoot,
                parentCode: parentCode,
                unit: node.unit || "ls",
                defaultPrice: node.unitPrice || 0,
                defaultVolumeSource: "manual"
            });

            // 1. Process Native Children (Recursive)
            if (nativeChildren.length > 0) {
                flatten(nativeChildren, depth + 1, currentRoot, node.code);
            }

            // 2. Process Estimates Children (Terminal/Leaf items usually)
            if (estimatesChildren.length > 0) {
                estimatesChildren.forEach(estChild => {
                    rows.push({
                        code: estChild.code,
                        nameEn: estChild.nameEn,
                        nameId: estChild.nameId,
                        depth: depth + 1,
                        hasChildren: false, // Estimates items usually leaf
                        rootCode: currentRoot,
                        parentCode: node.code,
                        unit: estChild.unit || "ls",
                        defaultPrice: estChild.unitPrice || 0,
                        defaultVolumeSource: "manual"
                    });
                });
            }
        });
    };
    flatten(WBS_BALLPARK, 0, "");
    return rows;
};

export default function EstimatesPage() {
    const [rows, setRows] = useState<FlattenedRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Simulate fetch
        setTimeout(() => {
            const data = loadInitialData();
            setRows(data);
            // Auto expand root items (Level 0)
            const initialExpanded = new Set<string>();
            data.forEach(r => {
                if (r.depth === 0) initialExpanded.add(r.code);
            });
            setExpandedRows(initialExpanded);
            setIsLoading(false);
        }, 500);
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const toggleExpand = (code: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(code)) {
                next.delete(code);
            } else {
                next.add(code);
            }
            return next;
        });
    };

    const visibleRows = useMemo(() => {
        if (searchQuery) {
            // If searching, show all matching rows (flat list style for simplicity, or we could show parents)
            const q = searchQuery.toLowerCase();
            return rows.filter(r =>
                r.code.toLowerCase().includes(q) ||
                r.nameEn.toLowerCase().includes(q)
            );
        }

        return rows.filter(r => {
            if (r.depth === 0) return true; // Roots always visible

            // Check if all ancestors are expanded
            let parent = r.parentCode;
            while (parent) {
                if (!expandedRows.has(parent)) return false;
                const parentRow = rows.find(p => p.code === parent);
                if (!parentRow) break;
                parent = parentRow.parentCode;
            }
            return true;
        });

    }, [rows, searchQuery, expandedRows]);

    const toggleVolumeSource = (code: string) => {
        setRows(prev => prev.map(r => {
            if (r.code !== code) return r;
            return {
                ...r,
                defaultVolumeSource: r.defaultVolumeSource === "manual" ? "calculated" : "manual"
            };
        }));
    };

    const updatePrice = (code: string, val: string) => {
        const num = parseFloat(val);
        setRows(prev => prev.map(r => {
            if (r.code !== code) return r;
            return { ...r, defaultPrice: isNaN(num) ? 0 : num };
        }));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Estimates Price List</h2>
                    <p className="text-sm text-neutral-500">
                        Configure default unit prices and volume settings for the WBS.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" icon={<RefreshCw className="w-4 h-4" />}>
                        Refresh
                    </Button>
                    <Button className="bg-brand-red hover:bg-red-700 text-white" icon={<Save className="w-4 h-4" />}>
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 text-sm"
                    />
                </div>
                <button className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">
                    <Filter size={18} />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm relative overflow-hidden flex flex-col max-h-[calc(100vh-250px)]">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="bg-neutral-50 text-neutral-500 font-medium text-xs uppercase sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 w-[400px]">WBS Item</th>
                                <th className="px-4 py-3 bg-neutral-50 text-center w-32">Volume Source</th>
                                <th className="px-4 py-3 bg-neutral-50 text-center w-24">Unit</th>
                                <th className="px-6 py-3 bg-neutral-50 text-right w-40">Default Price</th>
                                <th className="px-6 py-3 bg-neutral-50 text-right w-40">Sample Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-neutral-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading WBS data...
                                    </td>
                                </tr>
                            ) : visibleRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-neutral-500">
                                        No items found.
                                    </td>
                                </tr>
                            ) : (
                                visibleRows.map((row) => (
                                    <tr
                                        key={row.code}
                                        className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80 group ${row.hasChildren ? "bg-neutral-50 font-semibold" : "bg-white"
                                            }`}
                                    >
                                        {/* WBS Item (Merged Tree Column) */}
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3" style={{ paddingLeft: `${row.depth * 24}px` }}>
                                                {/* Expand Toggle */}
                                                <div className="w-5 flex justify-center shrink-0">
                                                    {row.hasChildren && (
                                                        <button
                                                            onClick={() => toggleExpand(row.code)}
                                                            className="text-neutral-500 hover:text-neutral-700 p-0.5 rounded hover:bg-neutral-100 transition-colors"
                                                        >
                                                            {expandedRows.has(row.code) ? (
                                                                <ChevronDown size={14} />
                                                            ) : (
                                                                <ChevronRight size={14} />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Code Badge */}
                                                <div className={`flex items-center justify-center border text-[10px] font-bold transition-colors shrink-0 ${row.depth === 0
                                                    ? "w-7 h-7 rounded-full border-neutral-300 bg-neutral-100 text-neutral-600"
                                                    : row.depth === 1
                                                        ? "w-6 h-6 rounded-full border-neutral-200 bg-neutral-50 text-neutral-500"
                                                        : "px-2 h-5 rounded-full border-neutral-100 bg-white text-neutral-400"
                                                    }`}>
                                                    {row.code}
                                                </div>

                                                {/* Name */}
                                                <div className="flex flex-col min-w-0">
                                                    <div className={`text-neutral-900 truncate ${row.depth === 0 ? 'font-semibold text-sm' : 'font-medium text-[13px]'}`} title={row.nameEn}>
                                                        {row.nameEn}
                                                    </div>
                                                    {row.nameId && (
                                                        <div className="text-[11px] text-neutral-400 font-normal italic truncate">
                                                            {row.nameId}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Volume Source Toggle */}
                                        <td className="px-4 py-2 text-center">
                                            {!row.hasChildren && (
                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={() => toggleVolumeSource(row.code)}
                                                        className={`
                                                            group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 border
                                                            ${row.defaultVolumeSource === "calculated"
                                                                ? "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-100 shadow-sm"
                                                                : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:text-neutral-700 hover:bg-neutral-50"
                                                            }
                                                        `}
                                                        title={row.defaultVolumeSource === "calculated" ? "Volume calculated via Formula" : "Volume entered manually"}
                                                    >
                                                        {row.defaultVolumeSource === "calculated" ? (
                                                            <>
                                                                <Calculator className="w-3.5 h-3.5" />
                                                                <span>Formula</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <PencilLine className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                                                                <span>Manual</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </td>

                                        {/* Unit */}
                                        <td className="px-4 py-2 text-center text-sm text-neutral-500">
                                            {!row.hasChildren ? row.unit : ''}
                                        </td>

                                        {/* Default Price */}
                                        <td className="px-6 py-2 text-right">
                                            {!row.hasChildren && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-neutral-400 text-xs text-right">Rp</span>
                                                    <CurrencyInput
                                                        value={row.defaultPrice || 0}
                                                        onChange={(val) => updatePrice(row.code, val)}
                                                        className="w-28 text-right bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-brand-red focus:outline-none text-sm font-mono text-neutral-900 placeholder-neutral-300"
                                                    />
                                                </div>
                                            )}
                                        </td>

                                        {/* Price Range / Total Preview (Just placeholder) */}
                                        <td className="px-6 py-2 text-right text-xs text-neutral-400 tabular-nums">
                                            -
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex gap-2">
                <span>ℹ️</span>
                <p>
                    <strong>Volume Settings:</strong> Set "Calculated" to lock volume input by default in new projects (forcing formula use). Set "Manual" to allow free entry.
                </p>
            </div>
        </div>
    );
}
