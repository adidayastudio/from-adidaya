"use client";

import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { SettingsQuickView } from "./SettingsSidebar";

export type SettingsView =
  | "general"
  | "account"
  | "team"
  | "roles"
  | "permissions"
  | "notifications"
  | "integrations"
  | "security";

export default function SettingsPageHeader({
  view,
}: {
  view: SettingsQuickView;
}) {
  const subtitles: Record<string, string> = {
    general: "Configure system-wide preferences and identity.",
    account: "Manage your personal account and preferences.",
    team: "Manage team members and organization structure.",
    roles: "Configure roles and access control lists.",
    security: "Manage security settings and authentication.",
  };

  return (
    <div className="hidden lg:block mb-0">
      <div className="flex items-center justify-between gap-4 pt-0">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight capitalize">
            {view || "Settings"}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {subtitles[view] || "Manage system preferences."}
          </p>
        </div>
      </div>
      <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
    </div>
  );
}
