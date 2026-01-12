"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import TrackingStagesTab from "./TrackingStagesTab";
import TrackingRabTab from "./TrackingRabTab";
import TrackingScheduleTab from "./TrackingScheduleTab";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowUpDown, Filter, Check, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import { mockTrackingItems, TrackingItem } from "./data";
import { PopoverRoot as Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type TrackingTab = "stages" | "rab" | "schedule";
type TabItem<T> = { key: T; label: string };
type TimeFilter = "all" | "today" | "week" | "month";
type SortKey = "status" | "date" | "progress";
type SortDir = "asc" | "desc";

export default function ProjectDetailTrackingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get("tab") as TrackingTab) || "stages";
    const [activeTab, setActiveTab] = useState<TrackingTab>(initialTab);

    // Filter State
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [filterStage, setFilterStage] = useState<string[]>([]);
    const [filterTime, setFilterTime] = useState<TimeFilter>("all");

    // Sort State
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const handleTabChange = (tab: TrackingTab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const tabs: TabItem<TrackingTab>[] = [
        { key: "stages", label: "Stages" },
        { key: "rab", label: "RAB Budget" },
        { key: "schedule", label: "Schedule" },
    ];

    // Logic
    const filteredItems = useMemo(() => {
        let items = mockTrackingItems.filter((item) => item.tab === activeTab);

        // Filter by Tags
        if (filterTags.length > 0) {
            items = items.filter((item) => filterTags.includes(item.tag));
        }

        // Filter by Stage
        if (filterStage.length > 0) {
            items = items.filter((item) => filterStage.includes(item.stage));
        }

        // Filter by Time
        if (filterTime !== "all") {
            const now = new Date();
            items = items.filter((item) => {
                const itemDate = new Date(item.timestamp);
                const diffTime = Math.abs(now.getTime() - itemDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (filterTime === "today") return diffDays <= 1;
                if (filterTime === "week") return diffDays <= 7;
                if (filterTime === "month") return diffDays <= 30;
                return true;
            });
        }

        // Sort
        return items.sort((a, b) => {
            let valA: any;
            let valB: any;

            if (sortKey === "date") {
                valA = new Date(a.timestamp).getTime();
                valB = new Date(b.timestamp).getTime();
            } else {
                valA = a[sortKey as keyof TrackingItem];
                valB = b[sortKey as keyof TrackingItem];
            }

            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [activeTab, filterTags, filterStage, filterTime, sortKey, sortDir]);

    const toggleTag = (tag: string) => {
        setFilterTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const toggleStage = (stage: string) => {
        setFilterStage((prev) =>
            prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
        );
    };

    return (
        <div>
            {/* HEADER: TITLE LEFT, TOGGLE + ACTION RIGHT */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
                <h2 className="text-xl font-bold text-neutral-900 whitespace-nowrap">Project Tracking</h2>

                <div className="flex flex-row items-center justify-between gap-2 w-full xl:w-auto">
                    {/* SEGMENTED TOGGLE */}
                    <div className="grid grid-cols-3 xl:flex xl:items-center p-0.5 xl:p-1 bg-neutral-100 rounded-full flex-1 xl:flex-none xl:w-auto gap-0 xl:gap-0 min-w-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={clsx(
                                    "px-0 xl:px-4 py-1.5 text-[9px] md:text-sm font-medium rounded-full transition-all duration-200 capitalize flex items-center justify-center whitespace-nowrap min-w-0",
                                    activeTab === tab.key
                                        ? "bg-white text-neutral-900 shadow-sm"
                                        : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                <span className="xl:hidden">{tab.label}</span>
                                <span className="hidden xl:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* ACTIONS (Sort/Filter) */}
                    <div className="flex items-center justify-end gap-1 w-auto shrink-0 xl:gap-2">

                        {/* FILTER POPOVER */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className={clsx(
                                        "!h-10 !w-10 !p-0 !rounded-full border border-neutral-200 bg-white shadow-none flex-shrink-0 min-w-[40px] flex items-center justify-center",
                                        (filterTags.length > 0 || filterStage.length > 0 || filterTime !== "all") ? "text-brand-red border-brand-red ring-1 ring-brand-red bg-red-50" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                                    )}
                                >
                                    <Filter className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4" align="end">
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 text-neutral-900">Type</h4>
                                        <div className="space-y-2">
                                            {["Site", "Design", "Expense", "Procurement"].map((tag) => (
                                                <div key={tag} className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleTag(tag)}
                                                        className={clsx(
                                                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                            filterTags.includes(tag) ? "bg-brand-red border-brand-red text-white" : "border-neutral-300 bg-white"
                                                        )}
                                                    >
                                                        {filterTags.includes(tag) && <Check className="w-3 h-3" />}
                                                    </button>
                                                    <span className="text-sm text-neutral-700 cursor-pointer" onClick={() => toggleTag(tag)}>{tag}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-px bg-neutral-100" />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 text-neutral-900">Stage</h4>
                                        <div className="space-y-2">
                                            {["01-KO", "02-SD", "03-DD", "04-CD", "06-CN"].map((stg) => (
                                                <div key={stg} className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleStage(stg)}
                                                        className={clsx(
                                                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                            filterStage.includes(stg) ? "bg-brand-red border-brand-red text-white" : "border-neutral-300 bg-white"
                                                        )}
                                                    >
                                                        {filterStage.includes(stg) && <Check className="w-3 h-3" />}
                                                    </button>
                                                    <span className="text-sm text-neutral-700 cursor-pointer" onClick={() => toggleStage(stg)}>{stg}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-px bg-neutral-100" />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 text-neutral-900">Time Range</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(["all", "today", "week", "month"] as TimeFilter[]).map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setFilterTime(t)}
                                                    className={clsx(
                                                        "px-3 py-1.5 text-xs rounded-full border transition-all capitalize",
                                                        filterTime === t
                                                            ? "bg-neutral-900 text-white border-neutral-900"
                                                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                                                    )}
                                                >
                                                    {t === "all" ? "All Time" : t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {(filterTags.length > 0 || filterStage.length > 0 || filterTime !== "all") && (
                                        <Button size="sm" variant="text" onClick={() => { setFilterTags([]); setFilterStage([]); setFilterTime("all"); }} className="w-full text-xs text-neutral-500 hover:text-red-600">
                                            Reset Filters
                                        </Button>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* SORT POPOVER */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className={clsx(
                                        "!h-10 !w-10 !p-0 !rounded-full border border-neutral-200 bg-white shadow-none flex-shrink-0 min-w-[40px] flex items-center justify-center",
                                        (sortKey !== "date" || sortDir !== "desc") ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                                    )}
                                >
                                    <ArrowUpDown className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="end">
                                <div className="flex flex-col gap-1">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Sort by</div>
                                    {[
                                        { key: "status", label: "Status" },
                                        { key: "date", label: "Date" },
                                        { key: "progress", label: "Progress" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.key}
                                            onClick={() => setSortKey(opt.key as SortKey)}
                                            className={clsx(
                                                "flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors",
                                                sortKey === opt.key ? "bg-neutral-100 text-neutral-900 font-medium" : "text-neutral-600 hover:bg-neutral-50"
                                            )}
                                        >
                                            {opt.label}
                                            {sortKey === opt.key && <Check className="w-4 h-4 text-neutral-900" />}
                                        </button>
                                    ))}
                                    <div className="h-px bg-neutral-100 my-1" />
                                    <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Direction</div>
                                    <div className="flex bg-neutral-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setSortDir("asc")}
                                            className={clsx("flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-all", sortDir === "asc" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                                        >
                                            Asc <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => setSortDir("desc")}
                                            className={clsx("flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-all", sortDir === "desc" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                                        >
                                            Desc <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* CONTENT: ANIMATED */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === "stages" && <TrackingStagesTab items={filteredItems} />}
                {activeTab === "rab" && <TrackingRabTab items={filteredItems} />}
                {activeTab === "schedule" && <TrackingScheduleTab items={filteredItems} />}
            </div>
        </div>
    );
}
