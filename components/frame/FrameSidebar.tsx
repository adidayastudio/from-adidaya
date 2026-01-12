"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
    LayoutGrid,
    Video,
    BookOpen,
    ChevronRight,
    ChevronDown,
    Calendar,
    Lightbulb,
    LayoutDashboard,
    Users
} from "lucide-react";

const WEBSITE_SECTIONS = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        type: "link"
    },
    {
        label: "Landing Page",
        id: "landing",
        icon: LayoutGrid,
        type: "accordion",
        items: [
            { label: "Hero Image", href: "/frame/landing" },
            { label: "Description", href: "/frame/landing/about" },
            { label: "Features", href: "/frame/landing/features" },
            { label: "Contact", href: "/frame/landing/contact" }
        ]
    },
    {
        label: "Studio",
        id: "studio",
        icon: Video,
        type: "accordion",
        items: [
            { label: "Profile", href: "/frame/studio/profile" },
            { label: "Pillars", href: "/frame/studio/pillars" },
            { label: "Process", href: "/frame/studio/process" },
            { label: "People", href: "/frame/studio/people" }
        ]
    },
    {
        label: "Projects",
        href: "/frame/projects",
        icon: BookOpen,
        type: "link",
        count: 86
    },
    {
        label: "Insights",
        href: "/frame/insights",
        icon: Lightbulb,
        type: "link",
        count: 42
    },
    {
        label: "Network",
        id: "network",
        icon: Users,
        type: "accordion",
        items: [
            { label: "Partners", href: "/frame/network/partners" },
            { label: "Clients", href: "/frame/network/clients" },
            { label: "Talent", href: "/frame/network/talent" }
        ]
    }
];

type Props = {
    activeSocialView?: "PLANNER" | "IDEAS";
    onSocialViewChange?: (view: "PLANNER" | "IDEAS") => void;
};

export default function FrameSidebar({ activeSocialView, onSocialViewChange }: Props) {
    const pathname = usePathname();
    // Default expanded sections based on path
    const [expandedSections, setExpandedSections] = useState<string[]>(["landing", "studio"]);

    const toggleSection = (id: string) => {
        setExpandedSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <div className="space-y-6 hidden md:flex flex-col h-full pb-4">
                {/* BACK */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                    ← Back to Dashboard
                </Link>

                <div className="border-t border-neutral-100" />

                {/* CONTENT MANAGER */}
                <div className="space-y-4 flex-1 overflow-y-auto">
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2">
                        Content Manager
                    </div>
                    <nav className="space-y-1">
                        {WEBSITE_SECTIONS.map((section: any) => {
                            const isAccordion = section.type === "accordion";
                            const isActive = isAccordion
                                ? section.items.some((i: any) => pathname === i.href)
                                : pathname === section.href;

                            const isExpanded = isAccordion && expandedSections.includes(section.id);

                            if (!isAccordion) {
                                // DIRECT LINK
                                return (
                                    <Link
                                        key={section.label}
                                        href={section.href}
                                        className={clsx(
                                            "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                            isActive
                                                ? "bg-orange-50 text-orange-600"
                                                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <section.icon className={clsx("w-4 h-4", isActive ? "text-orange-600" : "text-neutral-400 group-hover:text-neutral-600")} />
                                            {section.label}
                                        </div>
                                        {section.count && <span className="text-xs text-neutral-400">{section.count}</span>}
                                    </Link>
                                );
                            }

                            // ACCORDION
                            return (
                                <div key={section.label} className="space-y-0.5">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className={clsx(
                                            "w-full group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-neutral-50",
                                            isActive
                                                ? "bg-orange-50 text-orange-600"
                                                : "text-neutral-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <section.icon className={clsx("w-4 h-4", isActive ? "text-orange-600" : "text-neutral-400 group-hover:text-neutral-600")} />
                                            {section.label}
                                        </div>
                                        <ChevronDown className={clsx("w-3 h-3 text-neutral-400 transition-transform", isExpanded && "rotate-180")} />
                                    </button>

                                    {/* SUB ITEMS */}
                                    {isExpanded && (
                                        <div className="ml-9 space-y-0.5 border-l border-neutral-100 pl-2">
                                            {section.items.map((item: any) => {
                                                const isItemActive = pathname === item.href;
                                                return (
                                                    <Link
                                                        key={item.label}
                                                        href={item.href}
                                                        className={clsx(
                                                            "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                                            isItemActive
                                                                ? "bg-orange-50 text-orange-600"
                                                                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                                                        )}
                                                    >
                                                        {item.label}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {/* FOOTER */}
                <div className="mt-auto px-2 pt-4 border-t border-neutral-100">
                    <div className="text-xs text-neutral-400">
                        Website v2.0
                    </div>
                </div>
            </div>

            {/* MOBILE FLOATING TAB BAR WITH FAN NAVIGATION */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-sm md:hidden safe-area-bottom">
                {/* Navigation Container */}
                <div className="relative bg-white/70 backdrop-blur-md backdrop-saturate-150 border border-white/50 shadow-2xl rounded-2xl px-2 py-2 flex justify-between items-end">

                    {/* 1. DASHBOARD (Direct Link) */}
                    <Link href="/dashboard" className="flex flex-col items-center justify-center p-2 rounded-xl text-neutral-400 hover:text-neutral-600 active:scale-95 transition-all">
                        <LayoutGrid className="w-5 h-5" />
                        <span className="text-[9px] font-medium mt-1">Dash</span>
                    </Link>

                    {/* 2. LANDING PAGE (Fan) */}
                    <FanMenu
                        icon={LayoutGrid}
                        label="Land"
                        pathPrefix="/frame/landing"
                        items={[
                            { label: "Home", href: "/frame/landing" },
                            { label: "About", href: "/frame/landing/about" },
                            { label: "Contact", href: "/frame/landing/contact" }
                        ]}
                    />

                    {/* 3. STUDIO (Fan: Profile, Pillars, Process, People) */}
                    <FanMenu
                        icon={Video}
                        label="Studio"
                        pathPrefix="/frame/studio"
                        items={[
                            { label: "Profile", href: "/frame/studio/profile" },
                            { label: "Pillars", href: "/frame/studio/pillars" },
                            { label: "Process", href: "/frame/studio/process" },
                            { label: "People", href: "/frame/studio/people" }
                        ]}
                    />

                    {/* 4. PROJECTS (Direct Link) */}
                    <Link href="/frame/projects" className={clsx(
                        "flex flex-col items-center justify-center p-2 rounded-xl active:scale-95 transition-all",
                        pathname.startsWith('/frame/projects') ? "text-orange-600 bg-orange-50" : "text-neutral-400"
                    )}>
                        <BookOpen className="w-5 h-5" />
                        <span className="text-[9px] font-medium mt-1">Projs</span>
                    </Link>

                    {/* 5. INSIGHTS (Direct Link) */}
                    <Link href="/frame/insights" className={clsx(
                        "flex flex-col items-center justify-center p-2 rounded-xl active:scale-95 transition-all",
                        pathname.startsWith('/frame/insights') ? "text-orange-600 bg-orange-50" : "text-neutral-400"
                    )}>
                        <Lightbulb className="w-5 h-5" />
                        <span className="text-[9px] font-medium mt-1">Idea</span>
                    </Link>

                    {/* 6. NETWORK (Fan) */}
                    <FanMenu
                        icon={Users}
                        label="Net"
                        pathPrefix="/frame/network"
                        align="right"
                        items={[
                            { label: "Partners", href: "/frame/network/partners" },
                            { label: "Clients", href: "/frame/network/clients" },
                            { label: "Talent", href: "/frame/network/talent" }
                        ]}
                    />
                </div>
            </div>
        </>
    );
}

// Helper Component for Fan Menu Interaction

function FanMenu({ icon: Icon, label, items, pathPrefix, align = 'center' }: {
    icon: any,
    label: string,
    items: { label: string, href: string }[],
    pathPrefix: string,
    align?: 'left' | 'center' | 'right'
}) {
    const pathname = usePathname();
    const isActive = pathname.startsWith(pathPrefix);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative group">
            {/* Fan Items (Absolute Positioned) */}
            <div className={clsx(
                "absolute bottom-full mb-3 flex flex-col gap-2 transition-all duration-300 ease-out origin-bottom",
                align === 'center' ? "left-1/2 -translate-x-1/2" : align === 'right' ? "right-0" : "left-0",
                isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4 pointer-events-none"
            )}>
                <div className="bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl p-2 border border-white/50 flex flex-col gap-1 min-w-[120px]">
                    {items.map((item) => {
                        const isItemActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={clsx(
                                    "px-3 py-2 rounded-lg text-xs font-medium text-center transition-colors",
                                    isItemActive ? "bg-orange-50 text-orange-600" : "text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </div>
                {/* Arrow pointer */}
                <div className={clsx(
                    "w-3 h-3 bg-white/90 rotate-45 absolute -bottom-1.5 shadow-sm border-r border-b border-white/50",
                    align === 'center' ? "left-1/2 -translate-x-1/2" : align === 'right' ? "right-4" : "left-4"
                )} />
            </div>

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay close to allow clicks
                className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-xl transition-all",
                    isActive || isOpen ? "text-orange-600 bg-orange-50" : "text-neutral-400"
                )}
            >
                <Icon className={clsx("w-5 h-5 transition-transform duration-300", isOpen && "rotate-180")} />
                <span className="text-[9px] font-medium mt-1">{label}</span>
            </button>
        </div>
    );
}
