"use client";

import { PageHeader } from "@/shared/ui/headers/PageHeader";

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
  view: SettingsView;
}) {
  return (
    <div className="space-y-2">
      <PageHeader title="Settings" />
      <div className="text-sm text-neutral-500">
        Configure system-wide preferences and access control.
      </div>
    </div>
  );
}
