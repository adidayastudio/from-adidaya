"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import PageWrapper from "@/components/layout/PageWrapper";
import SettingsSidebar, { SettingsQuickView, NAV_ITEMS } from "@/components/system/settings/SettingsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";
import { Settings, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

// Content Components
import { GeneralSettings } from "@/components/system/settings/content/GeneralSettings";
import { AccountSettings } from "@/components/system/settings/content/AccountSettings";
import { TeamSettings } from "@/components/system/settings/content/TeamSettings";
import { RolesSettings } from "@/components/system/settings/content/RolesSettings";
import { SecuritySettings } from "@/components/system/settings/content/SecuritySettings";
import SettingsPageHeader from "@/components/system/settings/SettingsPageHeader";

// Hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function SystemSettingsPage() {
  const isMobile = useIsMobile();
  // On mobile, view can be null (showing the index list). On desktop, it defaults to "general".
  const [view, setView] = useState<SettingsQuickView | null>(null);

  // Ensure default view on desktop
  useEffect(() => {
    if (!isMobile && !view) {
      setView("general");
    }
  }, [isMobile, view]);

  const renderContent = () => {
    switch (view) {
      case "general": return <GeneralSettings />;
      case "account": return <AccountSettings />;
      case "team": return <TeamSettings />;
      case "roles": return <RolesSettings />;
      case "security": return <SecuritySettings />;
      default:
        // Generic fallback for unimplemented views
        if (view) {
          return (
            <EmptyState
              icon={Settings}
              title="Under Construction"
              description={`The ${view} settings panel is currently being built.`}
            />
          );
        }
        return null;
    }
  };

  // MOBILE: If no view selected, show the sidebar (as the index page)
  if (isMobile && !view) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 pt-16">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6 px-2">Settings</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
          <SettingsSidebar activeView={view as any} onViewChange={setView} />
        </div>
      </div>
    );
  }

    // DESKTOP: Standard View
    if (!isMobile) {
        return (
            <div className="hidden md:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={
                    <SettingsSidebar activeView={view || "general"} onViewChange={setView} />
                } isTransparent>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {/* Inline Tabs for iPad (Hidden on Desktop) */}
                        <div className="lg:hidden flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 mb-2">
                            {NAV_ITEMS.map((item) => {
                                const isActive = (view || "general") === item.id;
                                const Icon = item.icon || Settings;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setView(item.id)}
                                        className={clsx(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors flex-shrink-0",
                                            isActive
                                                ? "text-neutral-900 dark:text-white font-semibold"
                                                : "text-neutral-500 font-medium hover:text-neutral-700"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabBadgeSettings"
                                                className="absolute inset-0 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-black/[0.04] dark:border-white/[0.04]"
                                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                            />
                                        )}
                                        <div className="relative z-10 flex items-center gap-2">
                                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-neutral-900 dark:text-white" : "opacity-60"} />
                                            <span className="text-[13px]">{item.label}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <SettingsPageHeader view={view || "general"} />
                        <div className="h-full">
                            {renderContent()}
                        </div>
                    </div>
                </PageWrapper>
            </div>
        );
    }

  // MOBILE DETAIL VIEW (With Sticky Glass Header)
  return (
    <div className="min-h-screen bg-neutral-50 relative">
      {/* Mobile Unified Navbar Pill (Fixed Position) */}
      <div className="fixed top-0 left-0 right-0 z-50 px-3 pt-3 pb-2 pointer-events-none">
        <div
          className="flex items-center gap-2 p-1.5 rounded-full backdrop-blur-2xl backdrop-saturate-150 border border-white/50 transition-all duration-300 pointer-events-auto shadow-sm"
          style={{
            background: 'rgba(255,255,255,0.6)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)'
          }}
        >
          {/* Left: Back Button (Styled like App Switcher Pill) */}
          <button
            onClick={() => setView(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 border border-white/70 shrink-0 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-neutral-900" />
            <span className="font-semibold text-neutral-900 text-xs">Settings</span>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-neutral-300/40 shrink-0" />

          {/* Right: Scrollable Tabs */}
          <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex gap-1.5 w-max pr-2">
              {NAV_ITEMS.map((item) => {
                const isActive = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={clsx(
                      "relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                      isActive ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeSettingsTab"
                        className="absolute inset-0 bg-neutral-100 border border-neutral-200/50 rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content with spacer for header */}
      <div className="pt-20 px-4 pb-10 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 min-h-[calc(100vh-120px)]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
