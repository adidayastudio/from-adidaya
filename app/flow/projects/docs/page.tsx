"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Upload, FileText, FolderOpen } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

export default function DocumentsPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Documents" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Documents</h1><p className="text-sm text-neutral-500 mt-1">Project files, drawings, and attachments.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search documents..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Upload className="w-4 h-4" /> Upload</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Name</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Size</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Uploader</th><th className="px-6 py-3"></th></tr></thead>
                            <tbody>
                                <tr><td colSpan={6} className="px-6 py-12 text-center">
                                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                                    <h3 className="font-medium text-neutral-600 mb-1">No documents yet</h3>
                                    <p className="text-sm text-neutral-400">Upload project files, drawings, and attachments.</p>
                                </td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Upload Document" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option></FormSelect></FormField>
                    <FormField label="Document Category" required><FormSelect><option value="">Select category...</option><option>Design Drawings</option><option>Site Plans</option><option>Contracts</option><option>Permits</option><option>Reports</option><option>Photos</option><option>Other</option></FormSelect></FormField>
                    <FormField label="Document Title" required><FormInput placeholder="Enter document title" /></FormField>
                    <FormField label="File" required>
                        <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-red-300 transition-colors cursor-pointer">
                            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                            <p className="text-sm text-neutral-600">Click to upload or drag and drop</p>
                            <p className="text-xs text-neutral-400 mt-1">PDF, DWG, DOC up to 50MB</p>
                            <input type="file" className="hidden" />
                        </div>
                    </FormField>
                    <FormField label="Version"><FormInput placeholder="e.g. v1.0" /></FormField>
                    <FormField label="Description"><FormTextarea placeholder="Brief description..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Upload" />
                </form>
            </Drawer>
        </div>
    );
}
