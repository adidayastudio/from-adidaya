"use client";

import { useState, useEffect, useRef, useContext } from "react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { ProjectContext } from "@/components/flow/project-context";
import { Package, Wrench, Truck, Handshake, RefreshCw, Sparkles, MoreHorizontal, Search, ListFilter, Plus, AlertTriangle, ArrowRight, History } from "lucide-react";
import { fetchResourceOverviewData, triggerResourceMerge, triggerResourceSync } from "@/lib/api/resources-client";
import { toast } from "sonner";
import clsx from "clsx";
import Link from "next/link";

interface CategoryStats {
    materials: number;
    tools: number;
    assets: number;
    services: number;
    lowStock: number;
}

interface RecentActivity {
    time: string;
    project: string;
    action: string;
    item: string;
}

function SummaryCard({ icon, iconBg, label, value, subtext }: { icon: React.ReactNode; iconBg: string; label: string; value: string; subtext?: string }) {
    return (
        <div className="bg-white/70 dark:bg-neutral-900/40 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 hover:border-blue-400 dark:hover:border-blue-500/40 transition-all duration-300 group shadow-2xs hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", iconBg)}>
                    {icon}
                </div>
            </div>
            <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">{value}</div>
            {subtext && <div className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mt-1">{subtext}</div>}
        </div>
    );
}

export default function ResourcesOverviewPage() {
    const projectCtx = useContext(ProjectContext);
    const forceProjectCode = projectCtx?.project?.code || null;

    const [stats, setStats] = useState<CategoryStats>({ materials: 0, tools: 0, assets: 0, services: 0, lowStock: 0 });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMerging, setIsMerging] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchVal, setSearchVal] = useState("");
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const loadData = async (signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            const data = await fetchResourceOverviewData(signal);
            if (data && !signal?.aborted) {
                setStats(data.stats);
                setRecentActivity(data.activity || []);
                
                // Filter low stock items from inventory
                const low = (data.inventory || []).filter((i: any) => {
                    const remaining = Number(i.quantity_in || 0) - Number(i.quantity_used || 0) + Number(i.quantity_manual_adj || 0);
                    return remaining <= 5; // Alert if remaining stock is 5 or less
                });
                setLowStockItems(low.slice(0, 5));
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            console.error("Failed to load overview data:", e);
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
                loadData();
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
                loadData();
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
        loadData(controller.signal);

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
    }, [forceProjectCode]);

    if (isLoading) {
        return <div className="py-20 text-center text-neutral-400 font-bold animate-pulse">Loading overview data...</div>;
    }

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
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
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

            {/* Overview Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={<Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    iconBg="bg-blue-500/10"
                    label="Materials"
                    value={String(stats.materials)}
                    subtext="Catalogued Items"
                />
                <SummaryCard
                    icon={<Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                    iconBg="bg-orange-500/10"
                    label="Tools"
                    value={String(stats.tools)}
                    subtext="Equipment Assets"
                />
                <SummaryCard
                    icon={<Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    iconBg="bg-purple-500/10"
                    label="Assets"
                    value={String(stats.assets)}
                    subtext="Fixed Fleet"
                />
                <SummaryCard
                    icon={<Handshake className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                    iconBg="bg-emerald-500/10"
                    label="Services"
                    value={String(stats.services)}
                    subtext="Active Subcontractors"
                />
            </div>

            {/* Content Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                {/* LOW STOCK ALERTS */}
                <div className="bg-white/70 dark:bg-neutral-900/40 backdrop-blur-md rounded-[24px] border border-neutral-200/80 dark:border-neutral-800/80 p-6 flex flex-col justify-between shadow-xs">
                    <div>
                        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-850">
                            <h3 className="text-sm font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
                                <span>Low Stock alerts</span>
                            </h3>
                            <span className="px-2.5 py-1 text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                                {stats.lowStock} Items Critical
                            </span>
                        </div>

                        <div className="divide-y divide-neutral-100 dark:divide-neutral-850/60 mt-3">
                            {lowStockItems.length === 0 ? (
                                <div className="py-8 text-center text-xs text-neutral-400 font-bold">
                                    All resources are at healthy stock levels.
                                </div>
                            ) : (
                                lowStockItems.map((item, idx) => {
                                    const remaining = Number(item.quantity_in || 0) - Number(item.quantity_used || 0) + Number(item.quantity_manual_adj || 0);
                                    return (
                                        <div key={item.id || idx} className="py-3.5 flex items-center justify-between gap-4 text-xs font-semibold">
                                            <div className="space-y-0.5">
                                                <div className="text-neutral-900 dark:text-white font-bold">{item.resource?.name}</div>
                                                <div className="text-[10px] text-neutral-400 uppercase tracking-tight">{item.resource?.category} &bull; {item.resource?.unit}</div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-red-500 font-black">{remaining} remaining</div>
                                                <div className="text-[9px] text-neutral-400 font-medium">Req. Restock</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    {lowStockItems.length > 0 && (
                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-850 mt-2">
                            <Link href="/flow/resources/materials" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                <span>View all materials</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}
                </div>

                {/* RECENT INVENTORY ACTIVITIES */}
                <div className="bg-white/70 dark:bg-neutral-900/40 backdrop-blur-md rounded-[24px] border border-neutral-200/80 dark:border-neutral-800/80 p-6 flex flex-col justify-between shadow-xs">
                    <div>
                        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-850">
                            <h3 className="text-sm font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                                <History className="w-4.5 h-4.5 text-neutral-500" />
                                <span>Recent Activities</span>
                            </h3>
                            <span className="text-[10px] text-neutral-400 font-bold">Live log</span>
                        </div>

                        <div className="divide-y divide-neutral-100 dark:divide-neutral-850/60 mt-3">
                            {recentActivity.length === 0 ? (
                                <div className="py-8 text-center text-xs text-neutral-400 font-bold">
                                    No recent sync or stock activity logged.
                                </div>
                            ) : (
                                recentActivity.map((act, idx) => (
                                    <div key={idx} className="py-3.5 flex items-center justify-between gap-4 text-xs font-semibold">
                                        <div className="space-y-0.5">
                                            <div className="text-neutral-900 dark:text-white font-bold">{act.item}</div>
                                            <div className="text-[10px] text-neutral-400 font-medium">Project: {act.project}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black">
                                                {act.action}
                                            </span>
                                            <div className="text-[9.5px] text-neutral-400 font-medium mt-0.5">{act.time}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    {recentActivity.length > 0 && (
                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-850 mt-2">
                            <Link href="/flow/resources/activity-log" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                <span>View all activity logs</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

