"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import PageWrapper from "@/components/layout/PageWrapper";
import { Settings, GitBranch, FolderTree, Calculator, Coins, Clock, Shield, FileText, ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

const SETTINGS_SECTIONS = [
  { label: "General", desc: "Project types, categories, classes, and location factors", path: "/project/settings/general", icon: Settings },
  { label: "Stages", desc: "Stage definitions, weights, and task templates", path: "/project/settings/stages", icon: GitBranch },
  { label: "Work Structure", desc: "WBS templates, task templates, and disciplines", path: "/project/settings/work-structure", icon: FolderTree },
  { label: "Cost System", desc: "Rules engine: templates, WBS depth, and validation", path: "/project/settings/cost-system", icon: Calculator },
  { label: "Price Library", desc: "Unit price databases, vendor catalogs, and labor rates", path: "/project/settings/price-library", icon: Coins },
  { label: "Time System", desc: "Calendar templates, progress formulas, and schedule rules", path: "/project/settings/time-system", icon: Clock },
  { label: "Control", desc: "Change workflow, approval thresholds, and audit trails", path: "/project/settings/control", icon: Shield },
  { label: "Reports", desc: "Standard templates, export formats, and custom metrics", path: "/project/settings/reports", icon: FileText },
];

export default function SettingsOverviewPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-transparent px-5 md:px-0 py-6 md:py-0">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" }
            ]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500">
                    <div className="flex flex-col gap-2">
                        <Link href="/project/settings" className="lg:hidden w-fit">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 shadow-sm border border-black/[0.03] dark:border-white/[0.05] active:scale-90 transition-all">
                                <ChevronLeft className="w-5 h-5 text-neutral-700 dark:text-white" strokeWidth={1.5} />
                            </div>
                        </Link>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Project Settings</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure templates and rules for all projects</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SETTINGS_SECTIONS.map((section) => (
                            <Link href={section.path} key={section.path}>
                                <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex items-start gap-4 shadow-sm group">
                                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-xl text-neutral-600 dark:text-neutral-400 group-hover:bg-brand-red/10 group-hover:text-brand-red transition-all">
                                        <section.icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="font-bold text-sm text-neutral-900 dark:text-white group-hover:text-brand-red transition-colors">{section.label}</h2>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{section.desc}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
