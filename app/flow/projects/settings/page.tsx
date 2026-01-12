"use client";

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
    Coins,
    Calculator
} from "lucide-react";
import Link from "next/link";

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
        icon: (props) => <Calculator {...props} />, // Keeping dynamic check safely or just use icon component directly if type matches
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
            <div className="bg-white rounded-xl border border-neutral-200 p-6 hover:border-red-200 hover:shadow-md transition-all group">
                <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                        <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-neutral-900">{section.title}</h3>
                            <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-red-400 transition-colors" />
                        </div>
                        <p className="text-sm text-neutral-500 mb-3">{section.description}</p>
                        <div className="flex flex-wrap gap-2">
                            {section.subsections.map((sub) => (
                                <span key={sub} className="px-2 py-0.5 bg-neutral-100 rounded text-xs text-neutral-600">
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
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Project Settings</h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            Configure global templates and rules for all projects
                        </p>
                    </div>

                    <div className="border-b border-neutral-200" />

                    {/* Info Banner */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex gap-3">
                            <div className="text-blue-600">ℹ️</div>
                            <div className="flex-1">
                                <p className="text-sm text-blue-900 font-medium mb-1">Global Template Configuration</p>
                                <p className="text-xs text-blue-700">
                                    Settings defined here serve as master templates for all projects.
                                    When creating a new project, these templates are applied and can be customized per-project in Setup.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Settings Sections */}
                    <div className="grid gap-5">
                        {SETTINGS_SECTIONS.map((section) => (
                            <SectionCard key={section.title} section={section} />
                        ))}
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
