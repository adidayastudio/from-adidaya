"use client";

import { useState, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ChevronLeft, FolderTree, Gauge, BarChart3, ListTree } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProjectTypes, ProjectTypeTemplate, fetchDefaultWorkspaceId } from "@/lib/api/templates";
import clsx from "clsx";

import DetailTab from "./tabs/DetailTab";

export default function WorkStructurePage() {
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    const [projectTypes, setProjectTypes] = useState<ProjectTypeTemplate[]>([]);
    const [workspaceId, setWorkspaceId] = useState("");

    useEffect(() => {
        const init = async () => {
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) {
                setWorkspaceId(wsId);
                const types = await fetchProjectTypes(wsId);
                setProjectTypes(types);

                const dnb = types.find(t => t.code === "DNB" || (t.name.toLowerCase().includes("design") && t.name.toLowerCase().includes("build")));
                const bld = types.find(t => t.code === "BLD" || (t.name.toLowerCase().includes("build") && !t.name.toLowerCase().includes("design")));

                if (dnb) setSelectedTypeId(dnb.projectTypeId);
                else if (bld) setSelectedTypeId(bld.projectTypeId);
                else if (types.length > 0) setSelectedTypeId(types[0].projectTypeId);
            }
        };
        init();
    }, []);

    return (
        <div className="min-h-screen bg-transparent px-5 md:px-0 py-6 md:py-0">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "Work Structure" }
            ]} />

            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Work Structure</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure work breakdown structure templates</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="animate-in fade-in duration-300">
                        {!selectedTypeId ? (
                            <div className="p-12 text-center text-neutral-500">Loading project types...</div>
                        ) : (
                            <DetailTab
                                workspaceId={workspaceId}
                                projectTypeId={selectedTypeId}
                            />
                        )}
                    </div>

                </div>
            </PageWrapper>
        </div>
    );
}
