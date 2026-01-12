"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useUserProfile from "@/hooks/useUserProfile";
import PageWrapper from "@/components/layout/PageWrapper";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import WebsiteSidebar from "@/components/frame/website/WebsiteSidebar";
import WebsitePageHeader from "@/components/frame/website/WebsitePageHeader";
import { WebsiteView } from "@/components/frame/website/WebsiteView";
import StatsOverview from "@/components/frame/website/dashboard/StatsOverview";
import DashboardContent from "@/components/frame/website/dashboard/DashboardContent";

// Sub-pages
import WebsiteProjectsPage from "@/components/frame/website/pages/WebsiteProjectsPage";
import WebsiteInsightsPage from "@/components/frame/website/pages/WebsiteInsightsPage";
import WebsiteCareerPage from "@/components/frame/website/pages/WebsiteCareerPage";
import WebsiteHeroImagePage from "@/components/frame/website/pages/WebsiteHeroImagePage";
import WebsiteLandingDescriptionPage from "@/components/frame/website/pages/WebsiteLandingDescriptionPage";
import WebsiteStudioProfilePage from "@/components/frame/website/pages/WebsiteStudioProfilePage";
import WebsiteStudioPeoplePage, { StudioPeopleRef } from "@/components/frame/website/pages/WebsiteStudioPeoplePage";
import WebsiteStudioPillarsPage, { StudioPillarsRef } from "@/components/frame/website/pages/WebsiteStudioPillarsPage";
import WebsiteStudioProcessPage from "@/components/frame/website/pages/WebsiteStudioProcessPage";
import WebsiteNetworkContactPage from "@/components/frame/website/pages/WebsiteNetworkContactPage";
import { useRef } from "react";

export default function WebsiteDashboardPage() {
    const { profile, loading } = useUserProfile();
    const router = useRouter();
    const [activeView, setActiveView] = useState<WebsiteView>("dashboard");
    const pillarsRef = useRef<StudioPillarsRef>(null);
    const peopleRef = useRef<StudioPeopleRef>(null);

    if (loading) return <div className="p-6 text-neutral-400">Loading profile...</div>;
    if (!profile) return <div className="p-6 text-red-600">Access Denied</div>;

    const handleViewChange = (view: WebsiteView) => {
        setActiveView(view);
    };

    // Helper to generate breadcrumbs based on view
    const getBreadcrumbs = () => {
        const base = [
            { label: "Frame" },
            { label: "Website" },
        ];

        if (activeView === "dashboard") return base;

        // Map views to hierarchy
        if (activeView.startsWith("hero-")) {
            return [...base, { label: "Landing Page" }, { label: "Hero Image" }];
        }
        if (activeView.startsWith("landing-")) {
            return [...base, { label: "Landing Page" }, { label: "Description" }];
        }
        if (activeView.startsWith("studio-")) {
            return [...base, { label: "Studio" }, { label: activeView.replace("studio-", "").replace(/^\w/, c => c.toUpperCase()) }];
        }
        if (activeView.startsWith("network-")) {
            return [...base, { label: "Network" }, { label: activeView.replace("network-", "").replace(/^\w/, c => c.toUpperCase()) }];
        }

        return [...base, { label: activeView.charAt(0).toUpperCase() + activeView.slice(1) }];
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-6 font-primary">
            <Breadcrumb items={getBreadcrumbs()} />

            <PageWrapper
                sidebar={
                    <WebsiteSidebar
                        activeView={activeView}
                        onViewChange={handleViewChange}
                    />
                }
            >
                <div className="h-full">
                    {activeView !== "projects" && activeView !== "insights" && activeView !== "network-contact" && activeView !== "network-career" && (
                        <WebsitePageHeader
                            view={activeView}
                            onAdd={() => {
                                if (activeView === "studio-pillars") {
                                    pillarsRef.current?.addPillar();
                                } else if (activeView === "studio-people") {
                                    peopleRef.current?.openAddModal();
                                } else {
                                    console.log("Add clicked");
                                }
                            }}
                        />
                    )}

                    <div className="space-y-8">
                        {activeView === "dashboard" && (
                            <>
                                <StatsOverview />
                                <DashboardContent role={profile.role} />
                            </>
                        )}

                        {/* MAIN MODULES */}
                        {activeView === "projects" && <WebsiteProjectsPage />}
                        {activeView === "insights" && <WebsiteInsightsPage />}

                        {/* LANDING PAGE */}
                        {activeView === "hero-image" && <WebsiteHeroImagePage />}
                        {activeView === "landing-description" && <WebsiteLandingDescriptionPage />}

                        {/* STUDIO */}
                        {activeView === "studio-profile" && <WebsiteStudioProfilePage />}
                        {activeView === "studio-people" && <WebsiteStudioPeoplePage ref={peopleRef} />}
                        {activeView === "studio-pillars" && <WebsiteStudioPillarsPage ref={pillarsRef} />}
                        {activeView === "studio-process" && <WebsiteStudioProcessPage />}

                        {/* NETWORK */}
                        {activeView === "network-contact" && <WebsiteNetworkContactPage />}
                        {activeView === "network-career" && <WebsiteCareerPage />}
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
