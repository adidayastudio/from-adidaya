"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import {
    Settings,
    FolderTree,
    GitBranch,
    DollarSign,
    Clock,
    Shield,
    FileText,
    ChevronRight,
    ChevronLeft,
    Coins,
    Calculator
} from "lucide-react";

interface SettingSectionCard {
    icon: React.FC<{ className?: string }>;
    title: string;
    description: string;
    href: string;
    subsections: string[];
}

const SETTINGS_SECTIONS: SettingSectionCard[] = [
    {
        icon: Settings,
        title: "General",
        description: "Project types, categories, classes, and location factors",
        href: "/flow/projects/settings/general",
        subsections: ["Project Types", "Categories", "Classes", "Location Factors"],
    },
    {
        icon: GitBranch,
        title: "Stages",
        description: "Stage definitions, weights, and task templates",
        href: "/flow/projects/settings/stages",
        subsections: ["Stage List", "Weights", "Tasks"],
    },
    {
        icon: FolderTree,
        title: "Work Structure",
        description: "WBS templates, task templates, and disciplines",
        href: "/flow/projects/settings/work-structure",
        subsections: ["WBS Templates", "Task Templates", "Disciplines"],
    },
    {
        icon: (props) => <Calculator {...props} />,
        title: "Cost System",
        description: "Rules engine: templates, WBS depth, and validation",
        href: "/flow/projects/settings/cost-system",
        subsections: ["Templates", "WBS Rules", "Validation"],
    },
    {
        icon: (props) => <Coins {...props} />,
        title: "Price Library",
        description: "Price data: Ballpark, Estimates, and AHSP/BOQ",
        href: "/flow/projects/settings/price-library",
        subsections: ["Ballpark", "Estimates", "Detail"],
    },
    {
        icon: Clock,
        title: "Time System",
        description: "Schedule templates and progress rules",
        href: "/flow/projects/settings/time-system",
        subsections: ["Schedule Templates", "Progress Rules"],
    },
    {
        icon: Shield,
        title: "Control",
        description: "Roles, permissions, and change management",
        href: "/flow/projects/settings/control",
        subsections: ["Roles & Permissions", "Change Management"],
    },
    {
        icon: FileText,
        title: "Reports",
        description: "Report presets and document templates",
        href: "/flow/projects/settings/reports",
        subsections: ["Report Presets", "Document Templates"],
    },
];

function SectionCard({ section }: { section: SettingSectionCard }) {
    const Icon = section.icon;

    return (
        <Link href={section.href} className="block">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 hover:border-red-200 dark:hover:border-red-900 transition-all group">
                <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-500 group-hover:bg-red-50 dark:group-hover:bg-red-900/30 group-hover:text-red-600 transition-colors">
                        <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{section.title}</h3>
                            <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-red-400 transition-colors" />
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">{section.description}</p>
                        <div className="flex flex-wrap gap-2">
                            {section.subsections.map((sub) => (
                                <span key={sub} className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 rounded text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                                    {sub}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function ProjectsSettingsPage() {
    const router = useRouter();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#F6F6F6] dark:bg-[#000000] relative transition-colors overflow-y-auto">
            {/* Extended Blur Mask (Mobile Only) */}
            <div
                className={clsx(
                    "lg:hidden fixed left-0 right-0 z-40 pointer-events-none transition-opacity duration-300",
                    isScrolled ? "opacity-100" : "opacity-0"
                )}
                style={{
                    top: '-120px',
                    height: '240px',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                }}
            >
                <div className="absolute inset-0 bg-[#F6F6F6]/60 dark:bg-[#121212]/60" />
            </div>

            {/* Mobile Header (Fixed) */}
            <div className={clsx(
                "lg:hidden fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-5 flex flex-col",
                isScrolled ? "h-[72px] pt-6" : "pt-8"
            )}>
                {isScrolled && (
                    <div
                        className="absolute inset-0 z-[-1] bg-[#F6F6F6]/60 dark:bg-[#121212]/60 backdrop-blur-2xl"
                        style={{
                            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                        }}
                    />
                )}

                <div className="flex items-center justify-between relative z-[51]">
                    {/* Back Button Container */}
                    <div className={clsx(
                        "p-1 rounded-full shadow-sm border transition-all duration-300",
                        isScrolled
                            ? "bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md border-black/[0.03] dark:border-white/[0.05]"
                            : "bg-white dark:bg-neutral-900 border-black/[0.03] dark:border-white/[0.05]"
                    )}>
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                        >
                            <ChevronLeft size={20} className="text-neutral-900 dark:text-white" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Minimized Title */}
                    <h1
                        className={clsx(
                            "font-bold text-neutral-900 dark:text-white tracking-tight transition-all duration-300 ease-in-out absolute left-1/2 -translate-x-1/2",
                            isScrolled ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
                        )}
                    >
                        Settings
                    </h1>

                    {/* Toolbar Container */}
                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border transition-all duration-300",
                        isScrolled
                            ? "bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md border-black/[0.03] dark:border-white/[0.05] scale-90"
                            : "bg-white dark:bg-neutral-900 border-black/[0.03] dark:border-white/[0.05]"
                    )}>
                        <button
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                        >
                            <Settings size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col min-h-screen lg:pb-0 pb-32">
                {/* Mobile Large Title Area */}
                <div className={clsx(
                    "lg:hidden px-5 pt-28 transition-all duration-300",
                    isScrolled ? "opacity-0 invisible h-0 overflow-hidden" : "opacity-100 visible mb-8"
                )}>
                    <h1 className="text-[32px] font-bold text-neutral-900 dark:text-white tracking-tight ml-3">
                        Project Settings
                    </h1>
                    <p className="text-[17px] text-neutral-500 dark:text-neutral-400 mt-2 ml-3 max-w-[300px] leading-relaxed">
                        Configure global templates and rules for all projects
                    </p>
                </div>

                {/* Desktop Breadcrumb */}
                <div className="hidden lg:block p-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                    <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings" }]} />
                </div>

                <PageWrapper sidebar={<ProjectsSidebar />}>
                    <div className="space-y-8 w-full animate-in fade-in duration-500 lg:p-0 px-5 pt-4">
                        {/* Desktop Header */}
                        <div className="hidden lg:block">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Project Settings</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                Configure global templates and rules for all projects
                            </p>
                        </div>

                        <div className="hidden lg:block border-b border-neutral-200 dark:border-neutral-800" />

                        {/* Info Banner */}
                        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] border border-blue-100 dark:border-blue-900/30">
                            <div className="flex gap-4">
                                <div className="text-blue-500 text-xl font-bold">ℹ️</div>
                                <div className="flex-1">
                                    <p className="text-[15px] text-blue-900 dark:text-blue-200 font-bold mb-1 tracking-tight">Global Template Configuration</p>
                                    <p className="text-[13px] text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                                        Settings defined here serve as master templates for all projects.
                                        When creating a new project, these templates are applied and can be customized per-project in Setup.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Settings Sections */}
                        <div className="grid gap-4">
                            {SETTINGS_SECTIONS.map((section) => (
                                <SectionCard key={section.title} section={section} />
                            ))}
                        </div>
                    </div>
                </PageWrapper>
            </div>
        </div>
    );
}
