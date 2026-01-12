"use client";

/**
 * Project Detail Layout
 * Wraps all [projectId] routes with ProjectProvider
 */

import { useParams } from "next/navigation";
import { ProjectProvider } from "@/components/flow/project-context";

export default function ProjectDetailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const projectId = params.projectId as string;

    // Note: projectId from URL could be slug (e.g. "001-prg") or UUID
    // The ProjectProvider handles fetching by ID from Supabase

    return (
        <ProjectProvider projectId={projectId}>
            {children}
        </ProjectProvider>
    );
}
