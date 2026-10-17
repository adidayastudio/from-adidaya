"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { FilterItem } from "@/components/dashboard/shared/SummaryFilterCards";

interface MobileNotificationTabsProps {
    items: FilterItem[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export function MobileNotificationTabs({ items, selectedId, onSelect }: MobileNotificationTabsProps) {
    return (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pl-1">
            {items.map((item) => {
                const isSelected = selectedId === item.id;

                return (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={clsx(
                            "relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                            isSelected ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                        )}
                    >
                        {isSelected && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-neutral-100 border border-neutral-200/50 rounded-full"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">{item.label}</span>
                        {item.count !== 0 && item.count !== "-" && item.count !== "" && (
                            <span className={clsx("relative z-10 text-[10px] px-1.5 py-0.5 rounded-full", isSelected ? "bg-white shadow-sm ring-1 ring-black/5 text-neutral-900" : "bg-neutral-200 text-neutral-600")}>
                                {item.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
