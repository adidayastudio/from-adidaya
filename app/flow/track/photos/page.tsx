"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import TrackSidebar from "@/components/flow/track/TrackSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Upload, Image, Calendar } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_PHOTOS = [
    { id: 1, project: "Rumah Pak Budi", title: "Foundation Complete", date: "2025-01-06", uploader: "Andi Pratama", count: 8 },
    { id: 2, project: "Villa Puncak", title: "Column Work", date: "2025-01-05", uploader: "Siti Rahayu", count: 12 },
    { id: 3, project: "Renovasi Kantor", title: "Interior Finishing", date: "2025-01-04", uploader: "Budi Santoso", count: 15 },
];

export default function PhotosPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Track" }, { label: "Photos" }]} />
            <PageWrapper sidebar={<TrackSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Photos</h1><p className="text-sm text-neutral-500 mt-1">Project progress documentation and galleries.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search photos..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Upload className="w-4 h-4" /> Upload</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MOCK_PHOTOS.map((p) => (
                            <div key={p.id} className="bg-white rounded-xl border overflow-hidden hover:border-red-200 transition-colors cursor-pointer">
                                <div className="h-40 bg-neutral-200 flex items-center justify-center"><Image className="w-12 h-12 text-neutral-400" /></div>
                                <div className="p-4"><div className="font-semibold text-neutral-900">{p.title}</div><div className="text-sm text-neutral-500">{p.project}</div><div className="flex items-center justify-between mt-3 text-xs text-neutral-400"><div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.date}</div><div>{p.count} photos</div></div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Upload Photos" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    <FormField label="Album Title" required><FormInput placeholder="e.g. Foundation Complete" /></FormField>
                    <FormField label="Category"><FormSelect><option value="">Select category...</option><option>Progress</option><option>Inspection</option><option>Issue</option><option>Before/After</option><option>Other</option></FormSelect></FormField>
                    <FormField label="Date Taken"><FormInput type="date" /></FormField>
                    <FormField label="Photos" required>
                        <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-red-300 transition-colors cursor-pointer">
                            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                            <p className="text-sm text-neutral-600">Click to upload or drag and drop</p>
                            <p className="text-xs text-neutral-400 mt-1">PNG, JPG up to 10MB each</p>
                            <input type="file" multiple accept="image/*" className="hidden" />
                        </div>
                    </FormField>
                    <FormField label="Description"><FormTextarea placeholder="Brief description of these photos..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Upload Photos" />
                </form>
            </Drawer>
        </div>
    );
}
