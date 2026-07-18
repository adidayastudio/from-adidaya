"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import clsx from "clsx";
import { Users, UserCheck, ClipboardCheck, DollarSign, TrendingUp, FileText } from "lucide-react";
import { useUserContext } from "@/components/providers/UserProvider";
import { CrewDirectory } from "@/components/feel/crew/CrewDirectory";
import { CrewAssignments } from "@/components/feel/crew/CrewAssignments";
import { CrewDailyInput } from "@/components/feel/crew/CrewDailyInput";
import { CrewPayroll } from "@/components/feel/crew/CrewPayroll";
import { CrewPerformance } from "@/components/feel/crew/CrewPerformance";
import { CrewRequests } from "@/components/feel/crew/CrewRequests";
import { CrewDetail } from "@/components/feel/crew/CrewDetail";

export default function ProjectCrewPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const { profile } = useUserContext();
    const userRole = profile?.role || "staff";
    const [activeTab, setActiveTab] = useState("directory");
    const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);

    const tabs = [
        { id: "directory", label: "Directory", icon: Users },
        { id: "assignments", label: "Assignments", icon: UserCheck },
        { id: "daily-input", label: "Daily Log", icon: ClipboardCheck },
        { id: "payroll", label: "Payroll", icon: DollarSign },
        { id: "performance", label: "Performance", icon: TrendingUp },
        { id: "requests", label: "Requests", icon: FileText },
    ];

    return (
        <StandardPageWrapper
            breadcrumbItems={[
                { label: "Projects", href: "/flow/projects" },
                { label: "Project Detail", href: `/project/${projectId}` },
                { label: "Crew" }
            ]}
        >
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
                {/* Tab Navigation */}
                <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const active = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSelectedCrewId(null); }}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-semibold select-none shrink-0",
                                    active
                                        ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab Contents */}
                <div className="bg-transparent">
                    {activeTab === "directory" && (
                        selectedCrewId ? (
                            <CrewDetail crewId={selectedCrewId} onBack={() => setSelectedCrewId(null)} />
                        ) : (
                            <CrewDirectory role={userRole} onViewDetail={setSelectedCrewId} />
                        )
                    )}
                    {activeTab === "assignments" && <CrewAssignments role={userRole} />}
                    {activeTab === "daily-input" && <CrewDailyInput role={userRole} />}
                    {activeTab === "payroll" && <CrewPayroll role={userRole} />}
                    {activeTab === "performance" && <CrewPerformance role={userRole} />}
                    {activeTab === "requests" && <CrewRequests role={userRole} />}
                </div>
            </div>
        </StandardPageWrapper>
    );
}
