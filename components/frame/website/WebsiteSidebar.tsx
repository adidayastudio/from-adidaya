"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight, LayoutDashboard, Image, FileText, Building2, FolderKanban, Lightbulb, Phone, Video, Users, X, Plus } from "lucide-react";
import { WebsiteView } from "@/components/frame/website/WebsiteView";
import type { LucideIcon } from "lucide-react";

type Props = {
    activeView: WebsiteView;
    onViewChange: (view: WebsiteView) => void;
};

type NavItem = {
    id?: WebsiteView;
    label: string;
    shortLabel?: string;
    icon?: LucideIcon;
    count?: number;
    children?: NavItem[];
};

const NAV_STRUCTURE: NavItem[] = [
    { id: "dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
    {
        label: "Landing Page",
        icon: Image,
        children: [
            { id: "hero-image", label: "Hero Image" },
            { id: "landing-description", label: "Description" },
        ],
    },
    {
        label: "Studio",
        icon: Building2,
        children: [
            { id: "studio-profile", label: "Profile" },
            { id: "studio-pillars", label: "Pillars" },
            { id: "studio-process", label: "Process" },
            { id: "studio-people", label: "People" },
        ],
    },
    { id: "projects", label: "Projects", shortLabel: "Projects", icon: FolderKanban, count: 86 },
    { id: "insights", label: "Insights", shortLabel: "Insights", icon: Lightbulb, count: 42 },
    {
        label: "Network",
        icon: Phone,
        children: [
            { id: "network-contact", label: "Contact" },
            { id: "network-career", label: "Career", count: 2 },
        ],
    },
];

// Main nav items for mobile
const MOBILE_NAV_ITEMS = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    {
        id: "hero-image",
        label: "Land",
        icon: Image,
        children: [
            { id: "hero-image", label: "Hero" },
            { id: "landing-description", label: "Desc" }
        ]
    },
    {
        id: "studio-profile",
        label: "Studio",
        icon: Building2,
        children: [
            { id: "studio-profile", label: "Profile" },
            { id: "studio-pillars", label: "Pillars" },
            { id: "studio-process", label: "Process" },
            { id: "studio-people", label: "People" }
        ]
    },
    { id: "projects", label: "Projs", icon: FolderKanban },
    {
        id: "network-contact",
        label: "Net",
        icon: Users,
        children: [
            { id: "network-contact", label: "Contact" },
            { id: "network-career", label: "Career" }
        ]
    },
];

export default function WebsiteSidebar({ activeView, onViewChange }: Props) {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        "Landing Page": false,
        "Studio": false,
        "Network": false
    });

    const toggleSection = (label: string) => {
        setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const renderItem = (item: NavItem, depth = 0) => {
        if (item.children) {
            const isExpanded = expandedSections[item.label];
            return (
                <div key={item.label} className="space-y-1">
                    <button
                        onClick={() => toggleSection(item.label)}
                        className={clsx(
                            "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center justify-between",
                            "text-neutral-500 hover:text-neutral-800"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {item.icon && <item.icon className="w-4 h-4" />}
                            <span>{item.label}</span>
                        </div>
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {isExpanded && (
                        <div className="space-y-1 ml-2 border-l border-neutral-100 pl-2">
                            {item.children.map(child => renderItem(child, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

        const isActive = activeView === item.id;
        return (
            <button
                key={item.id}
                onClick={() => item.id && onViewChange(item.id)}
                className={clsx(
                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center justify-between",
                    isActive
                        ? "text-orange-600 bg-orange-50"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                )}
            >
                <div className="flex items-center gap-2">
                    {item.icon && (
                        <span className={clsx("transition-colors", isActive ? "text-orange-600" : "text-neutral-400")}>
                            <item.icon className="w-4 h-4" />
                        </span>
                    )}
                    <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                    <span className={clsx("text-xs px-1.5 rounded", isActive ? "text-orange-600/80" : "text-neutral-400")}>
                        {item.count}
                    </span>
                )}
            </button>
        );
    };

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <div className="space-y-6 hidden lg:block">
                <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Content Manager</div>
                    {NAV_STRUCTURE.map(item => renderItem(item))}
                </div>
            </div>

            {/* MOBILE FLOATING TAB BAR - STANDARD LABELED PILL */}
            {/* MOBILE FLOATING TAB BAR - STANDARD LABELED PILL */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 lg:hidden safe-area-bottom">
                <div className="bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-4 py-1.5 flex items-center justify-center gap-4">
                    {MOBILE_NAV_ITEMS.map((item) => {
                        const isActive = activeView === item.id ||
                            (item.label === 'Land' && activeView === 'landing-description') ||
                            (item.label === 'Studio' && activeView.startsWith('studio')) ||
                            (item.label === 'Net' && activeView.startsWith('network'));

                        if (item.children) {
                            return (
                                <FanMenuButton
                                    key={item.id}
                                    item={item}
                                    isActive={isActive}
                                    onViewChange={onViewChange}
                                    activeView={activeView}
                                />
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id as WebsiteView)}
                                className={clsx(
                                    "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                                    isActive ? "bg-orange-50 text-orange-600" : "text-neutral-400"
                                )}
                            >
                                <item.icon className={clsx("w-5 h-5", isActive && "stroke-2")} />
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// Helper: Fan Menu Button (Popup Submenu)
function FanMenuButton({ item, isActive, onViewChange, activeView }: {
    item: any,
    isActive: boolean,
    onViewChange: (view: WebsiteView) => void,
    activeView: WebsiteView
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            {/* Backdrop to close */}
            {isOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            )}

            {/* Fan Popup Menu */}
            {isOpen && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex flex-col gap-2 min-w-[140px] z-20">
                    <div className="bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl border border-white/50 p-1.5 flex flex-col gap-1 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                        {item.children.map((child: any) => (
                            <button
                                key={child.id}
                                onClick={() => {
                                    onViewChange(child.id);
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "w-full text-left px-3 py-2 text-xs font-medium rounded-xl transition-all",
                                    activeView === child.id
                                        ? "bg-orange-50 text-orange-600"
                                        : "text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                {child.label}
                            </button>
                        ))}
                    </div>
                    {/* Arrow tip (optional visual) */}
                    <div className="mx-auto w-3 h-3 bg-white/90 rotate-45 border-b border-r border-white/50 -mt-2.5 z-10" />
                </div>
            )}

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "relative flex items-center justify-center transition-all duration-200 rounded-full p-2.5 z-20",
                    (isActive || isOpen) ? "bg-orange-50 text-orange-600" : "text-neutral-400"
                )}
            >
                {isOpen ? <X className="w-5 h-5" /> : <item.icon className={clsx("w-5 h-5", isActive && "stroke-2")} />}

                {/* Tiny dot if children active but menu closed */}
                {isActive && !isOpen && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-orange-600" />
                )}
            </button>
        </div>
    );
}



