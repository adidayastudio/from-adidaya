"use client";
import { useParams } from "next/navigation";
import { redirect } from "next/navigation";

export default function ProjectFinanceRedirect() {
    const params = useParams();
    redirect(`/project/${params.id}?tab=finance`);
}
