"use client";

import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Search, Plus, ExternalLink } from "lucide-react";
import { WebsiteView } from "./WebsiteView";

type Props = {
    view: WebsiteView;
    onAdd?: () => void;
};

const VIEW_CONFIG: Record<string, { title: string; description: string }> = {
    "dashboard": {
        title: "Website Overview",
        description: "Manage your website content and performance."
    },
    "hero-image": {
        title: "Hero Image",
        description: "Update the main homepage hero section and banner images."
    },
    "landing-description": {
        title: "Home Description",
        description: "Edit the introductory text and mission statement."
    },
    "studio-profile": {
        title: "Studio Profile",
        description: "Managing company profile information."
    },
    "studio-pillars": {
        title: "Studio Pillars",
        description: "Define core values and business pillars."
    },
    "studio-process": {
        title: "Studio Process",
        description: "Outline the working process and methodology."
    },
    "studio-people": {
        title: "People & Team",
        description: "Manage team member profiles and structure."
    },
    "projects": {
        title: "Projects",
        description: "Manage portfolio projects, case studies, and gallery images."
    },
    "insights": {
        title: "Insights",
        description: "Publish company news, blog posts, and industry insights."
    },
    "network-contact": {
        title: "Contact Info",
        description: "Update contact details and office locations."
    },
    "network-career": {
        title: "Careers",
        description: "Post job openings, manage applications, and update requirements."
    },
};

export default function WebsitePageHeader({ view, onAdd }: Props) {
    const showAdd = ["projects", "studio-people", "insights", "network-career"].includes(view);
    const config = VIEW_CONFIG[view] || { title: "Website", description: "Manage content." };

    return (
        <div className="hidden lg:block mb-0">
            <div className="flex items-center justify-between gap-4 pt-0">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                        {config.title}
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        {config.description}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {view === "dashboard" && (
                        <a
                            href="https://www.adidayastudio.id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center font-bold rounded-full transition-all duration-150 text-[11px] uppercase tracking-wider h-9 px-4 gap-1.5 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm active:scale-95"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Visit Live Website
                        </a>
                    )}

                    {showAdd && onAdd && (
                        <Button 
                            variant="primary" 
                            className="rounded-full h-9 px-4 text-[11px] font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-95" 
                            onClick={onAdd} 
                            icon={<Plus className="w-4 h-4" />}
                        >
                            {view === "studio-people" ? "Add Member" : view === "projects" ? "Add Project" : "Add New"}
                        </Button>
                    )}
                </div>
            </div>
            <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
        </div>
    );
}
