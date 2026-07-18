"use client";

import { useState, useEffect, useContext } from "react";
import { useParams } from "next/navigation";
import { ProjectContext } from "@/components/flow/project-context";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import clsx from "clsx";
import { Users, LayoutDashboard, TrendingUp, Heart } from "lucide-react";
import useUserProfile from "@/hooks/useUserProfile";
import { fetchPeopleDirectory } from "@/lib/api/people";
import { Person } from "@/components/feel/people/types";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

// Components
import OrgOverview from "@/components/feel/people/OrgOverview";
import GlobalDirectory from "@/components/feel/people/GlobalDirectory";
import PerformanceView from "@/components/feel/people/PerformanceView";
import TeamCulture from "@/components/feel/people/TeamCulture";

export default function ProjectPeoplePage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const { profile, loading: profileLoading } = useUserProfile();
    const projectCtx = useContext(ProjectContext);
    const projectName = projectCtx?.project?.name || "Project";

    const [people, setPeople] = useState<Person[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState("directory");

    const tabs = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "directory", label: "Directory", icon: Users },
        { id: "performance", label: "Performance", icon: TrendingUp },
        { id: "culture", label: "Culture", icon: Heart },
    ];

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchPeopleDirectory();
                // If we have project context, filter people to those assigned to this project
                // For now, show all people (the backend filtering can be done later)
                setPeople(data);
            } catch (error) {
                console.error("Failed to load people directory", error);
            } finally {
                setLoadingData(false);
            }
        };
        load();
    }, []);

    const isLoading = profileLoading || loadingData;

    return (
        <StandardPageWrapper
            breadcrumbItems={[
                { label: "Projects", href: "/flow/projects" },
                { label: "Project Detail", href: `/project/${projectId}` },
                { label: "People" }
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
                                onClick={() => setActiveTab(tab.id)}
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
                    {isLoading ? (
                        <div className="p-8 flex justify-center"><GlobalLoading /></div>
                    ) : (
                        <>
                            {activeTab === "overview" && (
                                <OrgOverview people={people} onNavigate={() => setActiveTab("directory")} />
                            )}
                            {activeTab === "directory" && (
                                <GlobalDirectory
                                    people={people}
                                    role={profile?.role || "admin"}
                                    triggerAddPerson={0}
                                />
                            )}
                            {activeTab === "performance" && (
                                <PerformanceView people={people} />
                            )}
                            {activeTab === "culture" && (
                                <TeamCulture />
                            )}
                        </>
                    )}
                </div>
            </div>
        </StandardPageWrapper>
    );
}
