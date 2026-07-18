"use client";
import { useParams } from "next/navigation";
import { redirect } from "next/navigation";

export default function ProjectCrewRedirect() {
    const params = useParams();
    redirect(`/project/${params.id}?tab=crew`);
}
