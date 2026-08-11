"use client";

import { useParams } from "next/navigation";
import { ProjectProvider } from "@/components/flow/project-context";

export default function ProjectDetailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const projectId = (params?.projectId || params?.id) as string;

    return (
        <ProjectProvider projectId={projectId}>
            {children}
        </ProjectProvider>
    );
}
