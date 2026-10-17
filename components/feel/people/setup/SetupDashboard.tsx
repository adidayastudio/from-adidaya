"use client";

import {
    LayoutTemplate,
    Briefcase,
    Zap,
    Scale,
    Shield,
    Database,
    ChevronRight
} from "lucide-react";

interface SetupCardProps {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    tags: string[];
    onClick: (id: string) => void;
}

const SECTIONS = [
    {
        id: "structure",
        title: "Organization Structure",
        description: "Define departments, positions, and hierarchy levels.",
        icon: LayoutTemplate,
        tags: ["Departments", "Positions", "Levels"]
    },
    {
        id: "employment",
        title: "Employment",
        description: "Manage contract types, work statuses, and policies.",
        icon: Briefcase,
        tags: ["Types", "Work Status", "Policy", "Schedule", "Leave"]
    },
    {
        id: "skills",
        title: "Skills & Capability",
        description: "Maintain skill library and competency categories.",
        icon: Zap,
        tags: ["Skill Category", "Skill Library"]
    },
    {
        id: "performance",
        title: "Performance Rules",
        description: "Configure scoring logic, weightings, and evaluation periods.",
        icon: Scale,
        tags: ["Weighting", "Evaluation", "Scoring", "Incentives"]
    },
    {
        id: "access",
        title: "Access & Visibility",
        description: "Control platform roles, capabilities, and data access.",
        icon: Shield,
        tags: ["System Roles", "Capabilities", "Visibility", "Approvals"]
    },
    {
        id: "data",
        title: "Data Control",
        description: "Manage governance locks, archiving, and audit trials.",
        icon: Database,
        tags: ["Governance", "Archive", "Audit Log"]
    }
];

export default function SetupDashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
    return (
        <div className="space-y-6">
            {/* Header removed to avoid duplication with main page header */}

            {/* Info Banner */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex gap-3">
                    <div className="text-blue-600">ℹ️</div>
                    <div className="flex-1">
                        <p className="text-sm text-blue-900 font-medium mb-1">Organization Configuration</p>
                        <p className="text-xs text-blue-700">
                            Settings defined here affect how the People module functions across the entire organization.
                            Ensure changes are communicated to relevant stakeholders.
                        </p>
                    </div>
                </div>
            </div>

            {/* Setup Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                        <button
                            key={section.id}
                            onClick={() => onNavigate(section.id)}
                            className="block text-left w-full"
                        >
                            <div className="h-full bg-white rounded-xl border border-neutral-200 p-6 hover:border-blue-300 hover:shadow-md transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors flex-shrink-0">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-lg font-semibold text-neutral-900">{section.title}</h3>
                                            <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{section.description}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {section.tags.map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 bg-neutral-100 rounded text-xs text-neutral-600 border border-neutral-200">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div >
    );
}
