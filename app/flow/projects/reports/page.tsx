"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { BarChart3, Download, Calendar, FileBarChart } from "lucide-react";

export default function ProjectsReportsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Reports" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
                                <p className="text-sm text-neutral-500 mt-1">Project analytics and performance summaries.</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Calendar className="w-4 h-4" /> This Year</button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Download className="w-4 h-4" /> Export</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-neutral-400" /><h3 className="font-semibold">Project Performance</h3></div>
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Progress</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Budget (M)</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Spent (M)</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Variance</th></tr></thead>
                            <tbody>
                                <tr><td colSpan={5} className="px-4 py-12 text-center">
                                    <FileBarChart className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                                    <h3 className="font-medium text-neutral-600 mb-1">No report data</h3>
                                    <p className="text-sm text-neutral-400">Project performance metrics will appear here once projects have data.</p>
                                </td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
