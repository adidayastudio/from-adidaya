"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { LayoutDashboard } from "lucide-react";

export default function ProjectsOverviewShortPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Overview" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div><h1 className="text-2xl font-bold text-neutral-900">Projects Overview</h1><p className="text-sm text-neutral-500 mt-1">Dashboard for project portfolio and progress.</p></div>
                        <div className="border-b border-neutral-200" />
                    </div>
                    <div className="bg-white rounded-xl border border-dashed border-neutral-300 p-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4"><LayoutDashboard className="w-8 h-8 text-blue-400" /></div>
                        <h3 className="text-lg font-semibold text-neutral-700 mb-2">Coming Soon</h3>
                        <p className="text-sm text-neutral-500 max-w-sm">Project overview dashboard with portfolio analytics and KPI monitoring is under development.</p>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
