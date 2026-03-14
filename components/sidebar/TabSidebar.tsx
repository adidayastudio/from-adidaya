import React from "react";
import clsx from "clsx";

export interface TabItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface TabSidebarProps {
    title?: string;
    items: TabItem[];
    activeTabId: string;
    onTabChange: (id: string) => void;
}

export default function TabSidebar({ title, items, activeTabId, onTabChange }: TabSidebarProps) {
    return (
        <div className="w-full hidden lg:flex flex-col">
            <div className="space-y-0 pt-0">
                <div className="space-y-0.5">
                    {items.map((item) => {
                        const active = activeTabId === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={clsx(
                                    "w-full text-left rounded-lg text-[12px] transition-all flex items-center justify-between px-3 py-1.5",
                                    active
                                        ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                                        : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                                )}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    {item.icon && (
                                        <span className={clsx("shrink-0 transition-colors [&>svg]:w-4 [&>svg]:h-4", active ? "text-neutral-900 dark:text-white" : "text-neutral-400")}>
                                            {item.icon}
                                        </span>
                                    )}
                                    <span className="truncate">{item.label}</span>
                                </div>
                                {item.count !== undefined && (
                                    <span
                                        className={clsx(
                                            "min-w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 shrink-0 transition-all",
                                            active
                                                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                                : "bg-black/[0.04] dark:bg-white/[0.04] text-neutral-500 dark:text-neutral-400 group-hover:bg-black/[0.08]"
                                        )}
                                    >
                                        {item.count > 99 ? "99+" : item.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
