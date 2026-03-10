"use client";

import { useState, useEffect } from "react";
import { Package, Wrench, Truck, Handshake, RefreshCw, Sparkles } from "lucide-react";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "@/components/flow/finance/FinanceSummaryCard";
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

export default function ResourcesOverviewPage() {
    const [stats, setStats] = useState<CategoryStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMerging, setIsMerging] = useState(false);

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

    useEffect(() => {
        const controller = new AbortController();
        loadStats(controller.signal);

        // Listen for actions from ResourcesPageWrapper toolbar
        const handleAction = (e: any) => {
            if (e.detail?.type === 'historical-sync') handleSync(true);
            if (e.detail?.type === 'ai-cleanup') handleMerge();
        };
        window.addEventListener('resource-action', handleAction);

        return () => {
            controller.abort();
            window.removeEventListener('resource-action', handleAction);
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

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Resources Overview</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Catalog summary across all resource categories.</p>
                </div>
                {isMerging && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-full text-[12px] font-bold animate-pulse">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Cleaning...
                    </div>
                )}
            </div>

            <div className="-mx-5 lg:mx-0">
                <FinanceSummaryCardsRow>
                    <FinanceSummaryCard
                        icon={<Package className="w-5 h-5 text-blue-600" />}
                        iconBg="bg-blue-100"
                        label="Materials"
                        value={materialStats.total}
                        subtext="Standard Items"
                        activeColor="ring-blue-500"
                    />
                    <FinanceSummaryCard
                        icon={<Wrench className="w-5 h-5 text-orange-600" />}
                        iconBg="bg-orange-100"
                        label="Tools"
                        value={toolStats.total}
                        subtext="Ready for Use"
                        activeColor="ring-orange-500"
                    />
                    <FinanceSummaryCard
                        icon={<Truck className="w-5 h-5 text-purple-600" />}
                        iconBg="bg-purple-100"
                        label="Assets"
                        value={assetStats.total}
                        subtext="Fleet & Equipment"
                        activeColor="ring-purple-500"
                    />
                    <FinanceSummaryCard
                        icon={<Handshake className="w-5 h-5 text-emerald-600" />}
                        iconBg="bg-emerald-100"
                        label="Services"
                        value={serviceStats.total}
                        subtext="Active Subcontractors"
                        activeColor="ring-emerald-500"
                    />
                </FinanceSummaryCardsRow>
            </div>
        </div>
    );
}
