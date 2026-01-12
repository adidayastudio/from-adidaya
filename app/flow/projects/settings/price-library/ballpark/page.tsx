"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, RefreshCw, Layers, GitMerge, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { fetchClasses, updateClass, fetchDisciplines, ClassTemplate, Discipline } from "@/lib/api/templates-extended";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { CurrencyInput } from "./CurrencyInput";
import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";

type ViewMode = "SUMMARY" | "BREAKDOWN";

interface FlattenedRow {
    code: string;
    nameEn: string;
    nameId?: string;
    depth: number;
    hasChildren: boolean;
    rootCode: string; // To inherit color
    parentCode?: string;
    isLeaf: boolean;
}

export default function BallparkPage() {
    const [classes, setClasses] = useState<ClassTemplate[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [wbsRows, setWbsRows] = useState<FlattenedRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("SUMMARY");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

    const loadData = async () => {
        setIsLoading(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();
            setWorkspaceId(wsId);
            if (wsId) {
                // Fetch Classes & Disciplines (Global)
                const [classesData, disciplinesData] = await Promise.all([
                    fetchClasses(wsId),
                    fetchDisciplines(wsId)
                ]);
                setClasses(classesData.sort((a, b) => a.sortOrder - b.sortOrder));
                setDisciplines(disciplinesData);

                // Use Static WBS Data
                if (WBS_BALLPARK) {
                    const rows: FlattenedRow[] = [];
                    // Flatten recursively
                    const flatten = (nodes: any[], depth: number, root: string, parentCode?: string) => {
                        nodes.forEach(node => {
                            const currentRoot = depth === 0 ? node.code : root;
                            const hasChildren = !!(node.children && node.children.length > 0);

                            rows.push({
                                code: node.code,
                                nameEn: node.nameEn,
                                nameId: node.nameId,
                                depth,
                                hasChildren,
                                rootCode: currentRoot,
                                parentCode,
                                isLeaf: !hasChildren
                            });

                            if (hasChildren) {
                                flatten(node.children!, depth + 1, currentRoot, node.code);
                            }
                        });
                    };
                    flatten(WBS_BALLPARK, 0, "");
                    setWbsRows(rows);

                    // Auto-expand roots
                    const roots = new Set<string>();
                    rows.forEach(r => {
                        if (r.depth === 0) roots.add(r.code);
                    });
                    setExpandedRows(roots);
                }
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChange = (classId: string, itemCode: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setClasses(prev => prev.map(c => {
            if (c.id !== classId) return c;

            const newValues = { ...c.values };
            if (!newValues[itemCode]) {
                newValues[itemCode] = { cost: 0, percentage: 0 };
            }
            newValues[itemCode] = {
                ...newValues[itemCode],
                cost: numValue
            };

            return { ...c, values: newValues };
        }));
    };

    const handleSave = async () => {
        if (!workspaceId) return;
        setIsSaving(true);
        try {
            // Update percentages before saving based on current totals
            const updatedClasses = classes.map(c => {
                const total = getGrandTotalCost(c);
                const updatedValues = { ...c.values };
                Object.keys(updatedValues).forEach(key => {
                    const cost = updatedValues[key].cost;
                    updatedValues[key].percentage = total > 0 ? (cost / total) * 100 : 0;
                });
                return { ...c, values: updatedValues };
            });

            await Promise.all(updatedClasses.map(c => updateClass(c.id, workspaceId, {
                values: c.values
            })));

            const refreshedClasses = await fetchClasses(workspaceId);
            setClasses(refreshedClasses.sort((a, b) => a.sortOrder - b.sortOrder));

        } catch (error) {
            console.error("Failed to save changes", error);
            alert("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    const getRowColor = (rootCode: string) => {
        const d = disciplines.find(disc => disc.code === rootCode);
        return d?.color || "bg-neutral-200";
    };

    const getGrandTotalCost = (c: ClassTemplate) => {
        let total = 0;
        const rootRows = wbsRows.filter(r => r.depth === 0);
        rootRows.forEach(r => {
            total += c.values[r.code]?.cost || 0;
        });
        return total;
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID').format(val);

    const visibleRows = viewMode === "SUMMARY"
        ? wbsRows.filter(r => r.depth === 0)
        : wbsRows.filter(r => {
            if (r.depth === 0) return true;
            let parent = r.parentCode;
            while (parent) {
                if (!expandedRows.has(parent)) return false;
                const pRow = wbsRows.find(pr => pr.code === parent);
                if (!pRow) break;
                parent = pRow.parentCode;
            }
            return true;
        });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Ballpark Cost Data</h2>
                    <p className="text-sm text-neutral-500">
                        Manage baseline costs across the WBS hierarchy.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">

                    {/* View Switcher */}
                    <div className="bg-neutral-100 p-1 rounded-lg flex items-center">
                        <button
                            onClick={() => setViewMode("SUMMARY")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "SUMMARY"
                                ? "bg-white text-neutral-900 shadow-sm"
                                : "text-neutral-500 hover:text-neutral-700"
                                }`}
                        >
                            <Layers className="w-4 h-4" />
                            Summary
                        </button>
                        <button
                            onClick={() => setViewMode("BREAKDOWN")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "BREAKDOWN"
                                ? "bg-white text-neutral-900 shadow-sm"
                                : "text-neutral-500 hover:text-neutral-700"
                                }`}
                        >
                            <GitMerge className="w-4 h-4" />
                            Breakdown
                        </button>
                    </div>

                    <div className="flex gap-2 ml-auto">
                        <Button
                            variant="secondary"
                            onClick={loadData}
                            icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
                        >
                            Refresh
                        </Button>
                        <Button
                            className="bg-brand-red hover:bg-red-700 text-white"
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm relative">
                {/* Scrollable Container */}
                <div className="overflow-x-auto rounded-lg">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-200">
                                {/* Sticky Column Header (WBS) */}
                                <th className="px-6 py-4 font-semibold text-neutral-700 text-sm sticky left-0 bg-neutral-50 z-20 min-w-[300px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    WBS Item
                                </th>
                                {/* Dynamic Columns Based on Classes */}
                                {classes.map((cls) => (
                                    <th key={cls.id} className="px-6 py-4 font-semibold text-neutral-500 text-xs uppercase text-right w-40 min-w-[160px]">
                                        <div className="flex flex-col items-end">
                                            <span className="text-neutral-900 font-bold">{cls.classCode}</span>
                                            <span className="text-[10px] text-neutral-400 font-normal truncate max-w-full">{cls.finishLevel}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={classes.length + 1} className="p-8 text-center text-neutral-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Loading pricing data...
                                    </td>
                                </tr>
                            ) : visibleRows.length === 0 ? (
                                <tr>
                                    <td colSpan={classes.length + 1} className="p-8 text-center text-neutral-500">
                                        No WBS structure found.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {visibleRows.map((row) => (
                                        <tr key={row.code} className="hover:bg-neutral-50 group">
                                            {/* Sticky Row Header (WBS) */}
                                            <td className="px-6 py-3 sticky left-0 bg-white group-hover:bg-neutral-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10">
                                                <div className="flex items-center gap-3" style={{ paddingLeft: `${row.depth * 24}px` }}>
                                                    {/* Expand Toggle */}
                                                    <div className="w-5 flex justify-center shrink-0">
                                                        {row.hasChildren && viewMode === "BREAKDOWN" && (
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

                                            {/* Cells per Class */}
                                            {classes.map((cls) => {
                                                const grandTotal = getGrandTotalCost(cls);
                                                const currentCost = cls.values[row.code]?.cost || 0;
                                                const derivedPercentage = grandTotal > 0 ? (currentCost / grandTotal) * 100 : 0;

                                                return (
                                                    <td key={cls.id} className="px-4 py-2 align-top">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <CurrencyInput
                                                                value={currentCost}
                                                                onChange={(val) => handleChange(cls.id, row.code, val)}
                                                                className={`text-right font-mono text-sm border-transparent hover:border-neutral-300 focus:border-brand-red bg-transparent w-full ${row.hasChildren ? 'font-bold text-neutral-800' : 'text-neutral-600'}`}
                                                            />
                                                            <span className="text-[11px] text-neutral-400 font-medium">
                                                                {derivedPercentage.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}

                                    {/* Footer Row: Totals */}
                                    <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                                        <td className="px-6 py-4 font-bold text-neutral-900 text-sm sticky left-0 bg-neutral-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            GRAND TOTAL / m²
                                        </td>
                                        {classes.map((cls) => (
                                            <td key={cls.id} className="px-6 py-4 text-right">
                                                <div className="font-bold text-neutral-900 tabular-nums text-lg">
                                                    {formatCurrency(getGrandTotalCost(cls))}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex gap-2">
                <span>ℹ️</span>
                <p>
                    <strong>Summary</strong> shows top-level disciplines. <strong>Breakdown</strong> shows the detailed WBS hierarchy for the selected Project Type.
                </p>
            </div>
        </div>
    );
}
