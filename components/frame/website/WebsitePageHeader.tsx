"use client";

import { Button } from "@/shared/ui/primitives/button/button";
import { Plus, ExternalLink } from "lucide-react";
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
        <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">
                        {config.title}
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        {config.description}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {view === "dashboard" && (
                        <a
                            href="https://www.adidayastudio.id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 text-xs h-8 px-3 gap-1.5 bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Visit Live Website
                        </a>
                    )}

                    {showAdd && onAdd && (
                        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAdd}>
                            {view === "studio-people" ? "Add Member" : view === "projects" ? "Add Project" : "Add New"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
