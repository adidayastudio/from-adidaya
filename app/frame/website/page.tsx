"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useUserProfile from "@/hooks/useUserProfile";
import WebsitePageWrapper from "@/components/frame/website/WebsitePageWrapper";
import WebsiteSidebar from "@/components/frame/website/WebsiteSidebar";
import WebsitePageHeader from "@/components/frame/website/WebsitePageHeader";
import { WebsiteView } from "@/components/frame/website/WebsiteView";
import StatsOverview from "@/components/frame/website/dashboard/StatsOverview";
import DashboardContent from "@/components/frame/website/dashboard/DashboardContent";

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

export default function WebsiteDashboardPage() {
    const { profile, loading } = useUserProfile();
    const searchParams = useSearchParams();
    const viewParam = searchParams.get("view") as WebsiteView | null;
    const [activeView, setActiveView] = useState<WebsiteView>(viewParam || "dashboard");
    const pillarsRef = useRef<StudioPillarsRef>(null);
    const peopleRef = useRef<StudioPeopleRef>(null);

    // Sync with URL query params
    useEffect(() => {
        if (viewParam) {
            setActiveView(viewParam);
        } else {
            setActiveView("dashboard");
        }
    }, [viewParam]);

    if (loading) return <div className="p-6 text-neutral-400">Loading profile...</div>;
    if (!profile) return <div className="p-6 text-red-600">Access Denied</div>;

    const handleViewChange = (view: WebsiteView) => {
        setActiveView(view);
    };

    const getBreadcrumbs = () => {
        const base = [
            { label: "Frame" },
            { label: "Website" },
        ];

        if (activeView === "dashboard") return base;

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

    const header = activeView !== "projects" && activeView !== "insights" && activeView !== "network-contact" && activeView !== "network-career" ? (
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
    ) : undefined;

    return (
        <WebsitePageWrapper
            breadcrumbItems={getBreadcrumbs()}
            header={header}
            sidebar={
                <WebsiteSidebar
                    activeView={activeView}
                    onViewChange={handleViewChange}
                />
            }
        >
            <div className="space-y-8">
                {activeView === "dashboard" && (
                    <>
                        <StatsOverview />
                        <DashboardContent role={profile.role} />
                    </>
                )}

                {activeView === "projects" && <WebsiteProjectsPage />}
                {activeView === "insights" && <WebsiteInsightsPage />}

                {activeView === "hero-image" && <WebsiteHeroImagePage />}
                {activeView === "landing-description" && <WebsiteLandingDescriptionPage />}

                {activeView === "studio-profile" && <WebsiteStudioProfilePage />}
                {activeView === "studio-people" && <WebsiteStudioPeoplePage ref={peopleRef} />}
                {activeView === "studio-pillars" && <WebsiteStudioPillarsPage ref={pillarsRef} />}
                {activeView === "studio-process" && <WebsiteStudioProcessPage />}

                {activeView === "network-contact" && <WebsiteNetworkContactPage />}
                {activeView === "network-career" && <WebsiteCareerPage />}
            </div>
        </WebsitePageWrapper>
    );
}
