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
            <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
                <div className="space-y-6 pt-2">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2">Filters</h3>
                    <div className="space-y-1">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSectionChange(item.id)}
                                className={clsx(
                                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                                    activeSection === item.id
                                        ? "text-brand-red bg-brand-red/5"
                                        : "text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                <span className={clsx("transition-colors", activeSection === item.id ? "text-brand-red" : "text-neutral-400")}>
                                    <item.icon className="w-4 h-4" />
                                </span>
                                <span>{item.label}</span>
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
