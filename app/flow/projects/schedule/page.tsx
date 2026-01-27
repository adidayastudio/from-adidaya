"use client";

import { useState, useEffect } from "react";
import ProjectsPageWrapper from "@/components/flow/projects/ProjectsPageWrapper";
import { User, Users, Calendar, ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

export default function SchedulePage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const data = await fetchProjectsByWorkspace(wsId);
                    setProjects(data.map((p: any) => ({
                        code: `${p.project_number}-${p.project_code}`,
                        name: p.project_name
                    })));
                }
            } catch (e) { console.error(e); }
        };
        load();
    }, []);

    return (
        <ProjectsPageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Projects" }, { label: "Schedule" }]}
        >
            <div className="space-y-8 w-full animate-in fade-in duration-500">
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div><h1 className="text-2xl font-bold text-neutral-900">Schedule</h1><p className="text-sm text-neutral-500 mt-1">Project timeline and upcoming events.</p></div>
                        <div className="flex items-center bg-neutral-100 rounded-full p-1">
                            <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                            <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                        </div>
                    </div>
                    <div className="border-b border-neutral-200" />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button className="p-2 hover:bg-neutral-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-neutral-400" /><span className="font-semibold">January 2026</span></div>
                        <button className="p-2 hover:bg-neutral-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Add Event</button>
                </div>

                <div className="bg-white rounded-xl border p-6">
                    <h3 className="font-semibold mb-4">Upcoming Events</h3>
                    <div className="py-12 text-center text-neutral-400">
                        <CalendarDays className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                        <h3 className="font-medium text-neutral-600 mb-1">No upcoming events</h3>
                        <p className="text-sm">Scheduled inspections, meetings, and milestones will appear here.</p>
                    </div>
                </div>
            </div>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Add Event" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Project" required>
                        <FormSelect>
                            <option value="">Select project...</option>
                            {projects.map(p => <option key={p.code} value={p.code}>[{p.code}] {p.name}</option>)}
                        </FormSelect>
                    </FormField>
                    <FormField label="Event Type" required><FormSelect><option value="">Select type...</option><option>Inspection</option><option>Meeting</option><option>Milestone</option><option>Delivery</option><option>Deadline</option><option>Other</option></FormSelect></FormField>
                    <FormField label="Event Title" required><FormInput placeholder="e.g. Foundation Inspection" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Date" required><FormInput type="date" /></FormField>
                        <FormField label="Time"><FormInput type="time" /></FormField>
                    </div>
                    <FormField label="Location"><FormInput placeholder="Event location" /></FormField>
                    <FormField label="Participants"><FormInput placeholder="Names of participants" /></FormField>
                    <FormField label="Description"><FormTextarea placeholder="Event details..." /></FormField>
                    <FormField label="Reminder"><FormSelect><option>1 day before</option><option>2 days before</option><option>1 week before</option><option>No reminder</option></FormSelect></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Add Event" />
                </form>
            </Drawer>
        </ProjectsPageWrapper>
    );
}
