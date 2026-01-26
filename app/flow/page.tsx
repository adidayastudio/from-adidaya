"use client";

import CategoryHub from "@/components/layout/CategoryHub";
import { FolderKanban, Banknote, Package, User } from "lucide-react";

export default function FlowRootPage() {
    const apps = [
        {
            label: "Projects",
            href: "/flow/projects",
            icon: FolderKanban,
            color: "text-red-500",
            snippet: "8 Active Projects · 2 Need attention",
            count: 2
        },
        {
            label: "Finance",
            href: "/flow/finance",
            icon: Banknote,
            color: "text-red-500",
            snippet: "Manage purchasing, reimbursements, and budgets.",
            count: 0
        },
        {
            label: "Resources",
            href: "/flow/resources",
            icon: Package,
            color: "text-red-500",
            snippet: "Materials, tools, and asset management.",
            count: 0
        },
        {
            label: "Client",
            href: "/flow/client",
            icon: User,
            color: "text-red-500",
            snippet: "Client database and project communications.",
            count: 0
        },
    ];

    return (
        <CategoryHub
            category="FLOW"
            title="Production & Operations"
            description="Manage the core movement of your projects, from finance to physical resources."
            apps={apps}
        />
    );
}
