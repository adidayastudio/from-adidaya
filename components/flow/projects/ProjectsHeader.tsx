import React from "react";
import { Plus } from "lucide-react";

interface ProjectsHeaderProps {
    title: string;
    subtitle: string;
    onNewClick?: () => void;
    showNewButton?: boolean;
}

export default function ProjectsHeader({ title, subtitle, onNewClick, showNewButton }: ProjectsHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Mobile: Compact */}
            <div className="lg:hidden">
                <h1 className="text-lg font-bold text-neutral-900">{title}</h1>
                <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
            </div>
            {/* Desktop: Full */}
            <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
                <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
            </div>

            {showNewButton && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={onNewClick}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Project
                    </button>
                </div>
            )}
        </div>
    );
}
