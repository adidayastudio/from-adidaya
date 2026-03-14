"use client";

import { useState, useEffect, useRef } from "react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Package, Wrench, Truck, Handshake, RefreshCw, Sparkles, MoreHorizontal, Search, ListFilter, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { triggerResourceMerge, triggerResourceSync } from "@/lib/api/resources-client";
import { toast } from "sonner";
import clsx from "clsx";

const supabase = createClient();

interface CategoryStats {
    category: string;
    total: number;
    withStock: number;
    outOfStock: number;
}

function SummaryCard({ icon, iconBg, label, value, subtext }: { icon: React.ReactNode; iconBg: string; label: string; value: string; subtext?: string }) {
    return (
        <div className="bg-white/40 dark:bg-neutral-800/20 backdrop-blur-md rounded-2xl border border-white/40 dark:border-neutral-700/30 p-4 hover:border-red-200 dark:hover:border-red-900/40 transition-all group scale-100 active:scale-[0.98]">
            <div className="flex items-start justify-between mb-2">
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", iconBg)}>
                    {icon}
                </div>
            </div>
            <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-0.5">{label}</div>
            <div className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">{value}</div>
            {subtext && <div className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 mt-0.5">{subtext}</div>}
        </div>
    );
}

export default function ResourcesOverviewPage() {
    const [stats, setStats] = useState<CategoryStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMerging, setIsMerging] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchVal, setSearchVal] = useState("");
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const loadStats = async (signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            const categories = ['material', 'tool', 'asset', 'service'];
            const results = await Promise.all(
                categories.map(async (cat) => {
                    const { count } = await supabase
                        .from('pricing_resources')
                        .select('id', { count: 'exact', head: true })
                        .eq('category', cat);
                    return { category: cat, total: count || 0, withStock: 0, outOfStock: 0 };
                })
            );
            if (!signal?.aborted) setStats(results);
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            console.error("Failed to load overview stats:", e);
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    };

    const handleSync = async (isHistorical: boolean = false) => {
        const today = new Date().toISOString().split('T')[0];
        const startDate = isHistorical ? undefined : today;

        const promise = triggerResourceSync(startDate);
        toast.promise(promise, {
            loading: isHistorical ? 'Processing historical data...' : 'Auto-syncing today\'s data...',
            success: (res: any) => {
                loadStats();
                return `Sync completed: ${res.processed || 0} items`;
            },
            error: 'Sync failed'
        });
    };

    const handleMerge = async () => {
        setIsMerging(true);
        const promise = triggerResourceMerge();
        toast.promise(promise, {
            loading: 'AI is analyzing and merging duplicates...',
            success: (res: any) => {
                loadStats();
                return `Successfully merged ${res.mergedCount} items!`;
            },
            error: 'Failed to merge duplicates'
        });
        try {
            await promise;
        } finally {
            setIsMerging(false);
        }
    };

    const handleSearchChange = (val: string) => {
        setSearchVal(val);
        window.dispatchEvent(new CustomEvent('resource-search', { detail: { query: val } }));
    };

    useEffect(() => {
        const controller = new AbortController();
        loadStats(controller.signal);

        // Listen for actions from outside triggers if any
        const handleAction = (e: any) => {
            if (e.detail?.type === 'historical-sync') handleSync(true);
            if (e.detail?.type === 'ai-cleanup') handleMerge();
        };
        window.addEventListener('resource-action', handleAction);

        function handleClickOutside(event: MouseEvent) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMore(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            controller.abort();
            window.removeEventListener('resource-action', handleAction);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (isLoading) {
        return <div className="py-12 text-center text-neutral-400 font-medium animate-pulse">Loading overview...</div>;
    }

    const getStats = (cat: string) => stats.find(s => s.category === cat) || { total: 0, withStock: 0, outOfStock: 0 };

    const materialStats = getStats('material');
    const toolStats = getStats('tool');
    const assetStats = getStats('asset');
    const serviceStats = getStats('service');

    const toolbarActions = (
        <div className="flex items-center gap-1">
            <div className={clsx(
                "flex items-center gap-2 bg-white/40 dark:bg-neutral-800/20 backdrop-blur-md rounded-full transition-all duration-300 overflow-hidden border border-white/40 dark:border-neutral-700/30",
                isSearching ? "w-40 sm:w-64 px-3 h-10 ml-2" : "w-0 h-10 px-0 opacity-0"
            )}>
                <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search catalog..."
                    className="bg-transparent border-none outline-none text-[12px] font-bold text-neutral-700 dark:text-neutral-300 w-full"
                    value={searchVal}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onBlur={() => { if (!searchVal) setIsSearching(false); }}
                />
            </div>

            <button
                onClick={() => {
                    setIsSearching(!isSearching);
                    if (!isSearching) setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/40 dark:hover:bg-neutral-800/40 active:scale-90 transition-all duration-200 border border-transparent shadow-sm",
                    isSearching && "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100/50"
                )}>
                <Search className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/40 dark:hover:bg-neutral-800/40 active:scale-90 transition-all duration-200 shadow-sm border border-transparent">
                <ListFilter className="w-4 h-4 text-neutral-700 dark:text-white" />
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/40 dark:hover:bg-neutral-800/40 active:scale-90 transition-all duration-200 shadow-sm border border-transparent">
                <Plus className="w-4 h-4 text-neutral-700 dark:text-white" />
            </button>

            <div className="relative" ref={moreMenuRef}>
                <button
                    onClick={() => setShowMore(!showMore)}
                    className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/40 dark:hover:bg-neutral-800/40 active:scale-90 transition-all duration-200 shadow-sm border border-transparent",
                        showMore && "bg-neutral-100 dark:bg-neutral-800"
                    )}
                >
                    <MoreHorizontal className="w-4 h-4 text-neutral-700 dark:text-white" />
                </button>

                {showMore && (
                    <div className="absolute right-0 mt-2 w-48 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-white/40 dark:border-neutral-700/30 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <button
                            onClick={() => { handleSync(true); setShowMore(false); }}
                            className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                            Historical Sync
                        </button>
                        <button
                            onClick={() => { handleMerge(); setShowMore(false); }}
                            className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                            AI Cleanup
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="hidden lg:block">
                <StandardPageHeader
                    title="Resources Overview"
                    subtitle="Catalog summary across all resource categories."
                    action={
                        <div className="flex items-center gap-3">
                            {isMerging && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-[11px] font-bold animate-pulse border border-orange-200/20">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    AI CLEANING
                                </div>
                            )}
                            {toolbarActions}
                        </div>
                    }
                />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard
                    icon={<Package className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-500/10"
                    label="Materials"
                    value={String(materialStats.total)}
                    subtext="Standard Items"
                />
                <SummaryCard
                    icon={<Wrench className="w-5 h-5 text-orange-600" />}
                    iconBg="bg-orange-500/10"
                    label="Tools"
                    value={String(toolStats.total)}
                    subtext="Ready for Use"
                />
                <SummaryCard
                    icon={<Truck className="w-5 h-5 text-purple-600" />}
                    iconBg="bg-purple-500/10"
                    label="Assets"
                    value={String(assetStats.total)}
                    subtext="Fleet & Equipment"
                />
                <SummaryCard
                    icon={<Handshake className="w-5 h-5 text-emerald-600" />}
                    iconBg="bg-emerald-500/10"
                    label="Services"
                    value={String(serviceStats.total)}
                    subtext="Active Subcontractors"
                />
            </div>
        </div>
    );
}
