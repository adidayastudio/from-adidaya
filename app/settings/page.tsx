"use client";

import { useState } from "react";

import PageWrapper from "@/components/layout/PageWrapper";
import SettingsSidebar, { SettingsQuickView } from "@/components/system/settings/SettingsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";
import { Settings } from "lucide-react";

// Content Components
import { GeneralSettings } from "@/components/system/settings/content/GeneralSettings";
import { AccountSettings } from "@/components/system/settings/content/AccountSettings";
import { TeamSettings } from "@/components/system/settings/content/TeamSettings";
import { RolesSettings } from "@/components/system/settings/content/RolesSettings";
import { SecuritySettings } from "@/components/system/settings/content/SecuritySettings";

export default function SystemSettingsPage() {
  const [view, setView] = useState<SettingsQuickView>("general");

  const renderContent = () => {
    switch (view) {
      case "general": return <GeneralSettings />;
      case "account": return <AccountSettings />;
      case "team": return <TeamSettings />;
      case "roles": return <RolesSettings />;
      case "security": return <SecuritySettings />;
      default:
        return (
          <EmptyState
            icon={Settings}
            title="Under Construction"
            description={`The ${view} settings panel is currently being built.`}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6 relative">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-0">
        <Breadcrumb
          items={[
            { label: "System" },
            { label: "Settings" },
            { label: view.charAt(0).toUpperCase() + view.slice(1) }
          ]}
        />
      </div>

      <PageWrapper sidebar={
        <SettingsSidebar activeView={view} onViewChange={setView} />
      }>
        <div className="h-full">
          {renderContent()}
        </div>
      </PageWrapper>
    </div>
  );
}
