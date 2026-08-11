"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/components/flow/project-context";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";
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
    const projectId = (params?.projectId || params?.id) as string;
    const { profile, loading: profileLoading } = useUserProfile();
    const { project, isLoading: projectLoading, error } = useProject();

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
                setPeople(data);
            } catch (error) {
                console.error("Failed to load people directory", error);
            } finally {
                setLoadingData(false);
            }
        };
        load();
    }, []);

    const isLoading = profileLoading || projectLoading || loadingData;

    if (projectLoading) {
        return <GlobalLoading />;
    }

    if (error || !project) {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">
                {error || "Project not found."}
            </div>
        );
    }

    const projectForHeader = mapProjectToHeader(project);
    const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

    return (
        <StandardPageWrapper
            breadcrumbItems={[
                { label: "Flow" },
                { label: "Projects", href: "/flow/projects" },
                { label: breadcrumbLabel, href: `/project/${project.project_code}` },
                { label: "People" }
            ]}
            sidebar={<ProjectDetailSidebar />}
            isTransparent
        >
            <div className="space-y-8 max-w-4xl mx-auto px-4 lg:px-0 animate-in fade-in duration-500">
                <ProjectDetailHeader project={projectForHeader as any} />

                <div className="space-y-6">
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
            </div>
        </StandardPageWrapper>
    );
}
