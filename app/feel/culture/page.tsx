"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import CulturePageWrapper from "@/components/feel/culture/CulturePageWrapper";
import { CultureSidebar } from "@/components/feel/culture/CultureSidebar";
import { CultureHome } from "@/components/feel/culture/CultureHome";

import { CultureChapter } from "@/components/feel/culture/CultureChapter";
import { CultureTeam } from "@/components/feel/culture/CultureTeam";
import { CultureJourney } from "@/components/feel/culture/CultureJourney";
import { CultureValues } from "@/components/feel/culture/CultureValues";
import { CulturePulse } from "@/components/feel/culture/CulturePulse";
import { CultureHandbook } from "@/components/feel/culture/CultureHandbook";
import { CultureRecognition } from "@/components/feel/culture/CultureRecognition";
import { CultureSetup } from "@/components/feel/culture/CultureSetup";
import { PageHeader } from "@/shared/ui/headers/PageHeader";

type CultureSection = "home" | "chapter" | "journey" | "values" | "pulse" | "handbook" | "recognition" | "team_overview" | "team_members" | "setup";
type ViewMode = "PERSONAL" | "TEAM";

export default function CulturePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sectionParam = searchParams.get("section");
  const viewParam = searchParams.get("view");

  const activeSection: CultureSection = (sectionParam as CultureSection) || "home";
  const viewMode: ViewMode = (viewParam as ViewMode) || "PERSONAL";

  const userRole = "hr";

  const handleSectionChange = (section: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("section", section);
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleViewMode = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", mode);
    params.set("section", mode === "PERSONAL" ? "home" : "team_overview");
    router.push(`${pathname}?${params.toString()}`);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <CultureHome onNavigate={handleSectionChange} viewMode={viewMode} onToggleView={toggleViewMode} userRole={userRole} />;
      case "chapter":
        return <CultureChapter onBack={() => handleSectionChange("home")} />;
      case "team_overview":
        return <CultureTeam onNavigate={handleSectionChange} viewMode={viewMode} onToggleView={toggleViewMode} userRole={userRole} />;
      case "journey":
        return <CultureJourney onNavigate={handleSectionChange} viewMode={viewMode} onToggleView={toggleViewMode} userRole={userRole} />;
      case "values":
        return <CultureValues onNavigate={handleSectionChange} />;
      case "pulse":
        return <CulturePulse onNavigate={handleSectionChange} viewMode={viewMode} onToggleView={toggleViewMode} userRole={userRole} />;
      case "handbook":
        return <CultureHandbook onNavigate={handleSectionChange} />;
      case "recognition":
        return <CultureRecognition onNavigate={handleSectionChange} viewMode={viewMode} onToggleView={toggleViewMode} userRole={userRole} />;
      case "setup":
        return <CultureSetup onNavigate={handleSectionChange} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚧</span>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">Work in Progress</h2>
            <p className="text-neutral-500">The section <strong>{activeSection}</strong> is being built.</p>
          </div>
        );
    }
  };

  const header = (
    <PageHeader
      title="Culture & Values"
      description="Company values, handbook, and team recognition."
    />
  );

  return (
    <CulturePageWrapper
      breadcrumbItems={[
        { label: "Feel" },
        { label: "Culture" },
        { label: activeSection.charAt(0).toUpperCase() + activeSection.slice(1).replace("_", " ") }
      ]}
      header={header}
      sidebar={
        <CultureSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          viewMode={viewMode}
        />
      }
    >
      <div className="flex flex-col h-full pb-28 lg:pb-0">
        {renderContent()}
      </div>
    </CulturePageWrapper>
  );
}
