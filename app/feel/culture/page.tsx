"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { CultureSidebar } from "@/components/feel/culture/CultureSidebar";
import { CultureHome } from "@/components/feel/culture/CultureHome";
import { Users, User } from "lucide-react";
import clsx from "clsx";

import { CultureChapter } from "@/components/feel/culture/CultureChapter";
import { CultureTeam } from "@/components/feel/culture/CultureTeam";
import { CultureJourney } from "@/components/feel/culture/CultureJourney";
import { CultureValues } from "@/components/feel/culture/CultureValues";
import { CulturePulse } from "@/components/feel/culture/CulturePulse";
import { CultureHandbook } from "@/components/feel/culture/CultureHandbook";
import { CultureRecognition } from "@/components/feel/culture/CultureRecognition";
import { CultureSetup } from "@/components/feel/culture/CultureSetup";

type CultureSection = "home" | "chapter" | "journey" | "values" | "pulse" | "handbook" | "recognition" | "team_overview" | "team_members" | "setup";
type ViewMode = "PERSONAL" | "TEAM";

export default function CulturePage() {
  const [activeSection, setActiveSection] = useState<CultureSection>("home");
  const [viewMode, setViewMode] = useState<ViewMode>("PERSONAL");

  // Mock Role - toggle this to test access
  const userRole = "hr"; // "staff" or "hr"

  const handleSectionChange = (section: string) => {
    setActiveSection(section as CultureSection);
  };

  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    // Reset section to logical default when switching views
    setActiveSection(mode === "PERSONAL" ? "home" : "team_overview");
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

  return (
    <div className="min-h-screen bg-neutral-50 p-6 relative">
      <div className="flex items-center justify-between mb-0">
        <Breadcrumb items={[{ label: "Feel" }, { label: "Culture" }, { label: activeSection.charAt(0).toUpperCase() + activeSection.slice(1).replace("_", " ") }]} />
      </div>

      <PageWrapper sidebar={
        <CultureSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          viewMode={viewMode}
        />
      }>
        <div className="flex flex-col h-full pb-28 lg:pb-0">
          {renderContent()}
        </div>
      </PageWrapper>
    </div>
  );
}
