"use client";

import clsx from "clsx";
import {
    Search,
    Users,
    FolderKanban,
    CheckSquare,
    FileText
} from "lucide-react";

export type SearchSection = "all" | "people" | "projects" | "tasks" | "files";

interface SearchSidebarProps {
    activeSection: SearchSection;
    onSectionChange: (section: SearchSection) => void;
}

const NAV_ITEMS = [
    { id: "all" as SearchSection, label: "All Results", icon: Search },
    { id: "people" as SearchSection, label: "People", icon: Users },
    { id: "projects" as SearchSection, label: "Projects", icon: FolderKanban },
    { id: "tasks" as SearchSection, label: "Tasks", icon: CheckSquare },
    { id: "files" as SearchSection, label: "Files", icon: FileText },
];

export default function SearchSidebar({ activeSection, onSectionChange }: SearchSidebarProps) {
    return (
        <>
            <aside className="w-full h-full hidden lg:flex flex-col pt-0">
                <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest px-3 mb-2 leading-none">Filters</div>
                    <div className="space-y-0.5">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSectionChange(item.id)}
                                className={clsx(
                                    "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                                    activeSection === item.id
                                        ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                                        : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                                )}
                            >
                                <item.icon className={clsx("w-4 h-4 shrink-0 transition-colors", activeSection === item.id ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                                <span className="truncate">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Mobile - Horizontal Scroll */}
            <div className="lg:hidden fixed bottom-6 left-0 right-0 z-50 px-4">
                <div className="bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full p-2 flex gap-2 overflow-x-auto no-scrollbar">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSectionChange(item.id)}
                            className={clsx(
                                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5",
                                activeSection === item.id
                                    ? "bg-brand-red text-white"
                                    : "bg-neutral-100 text-neutral-600"
                            )}
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
