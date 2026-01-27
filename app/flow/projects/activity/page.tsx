"use client";

import { useState } from "react";
import ProjectsPageWrapper from "@/components/flow/projects/ProjectsPageWrapper";
import { User, Users, Search, Inbox } from "lucide-react";
import clsx from "clsx";

export default function ActivityPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");

    return (
        <ProjectsPageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Projects" }, { label: "Activity" }]}
        >
            <div className="space-y-8 w-full animate-in fade-in duration-500">
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900">Activity</h1>
                            <p className="text-sm text-neutral-500 mt-1">Track updates and changes across projects.</p>
                        </div>
                        <div className="flex items-center bg-neutral-100 rounded-full p-1">
                            <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                            <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                        </div>
                    </div>
                    <div className="border-b border-neutral-200" />
                </div>

                <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search activity..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" /></div>

                <div className="bg-white rounded-xl border p-6">
                    <div className="py-12 text-center text-neutral-400">
                        <Inbox className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                        <h3 className="font-medium text-neutral-600 mb-1">No activity yet</h3>
                        <p className="text-sm">Project updates, comments, and milestones will appear here.</p>
                    </div>
                </div>
            </div>
        </ProjectsPageWrapper>
    );
}
