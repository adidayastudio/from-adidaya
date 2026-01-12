"use client";

import clsx from "clsx";
import { Settings, User, Users, Shield, Key, Bell, Link, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ======================
   TYPES
====================== */

export type SettingsQuickView =
  | "general"
  | "account"
  | "team"
  | "roles"
  | "permissions"
  | "notifications"
  | "integrations"
  | "security";

interface NavItemConfig {
  id: SettingsQuickView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: "general", label: "General", shortLabel: "General", icon: Settings },
  { id: "account", label: "My Account", shortLabel: "Account", icon: User },
  { id: "team", label: "Team", shortLabel: "Team", icon: Users },
  { id: "roles", label: "Roles", shortLabel: "Roles", icon: Shield },
  { id: "permissions", label: "Permissions", shortLabel: "Perms", icon: Key },
  { id: "notifications", label: "Notifications", shortLabel: "Notifs", icon: Bell },
  { id: "integrations", label: "Integrations", shortLabel: "Integrate", icon: Link },
  { id: "security", label: "Security", shortLabel: "Security", icon: Lock },
];

/* ======================
   PROPS
====================== */

interface SettingsSidebarProps {
  activeView: SettingsQuickView;
  onViewChange: (view: SettingsQuickView) => void;
}

/* ======================
   ROOT
====================== */

export default function SettingsSidebar({ activeView, onViewChange }: SettingsSidebarProps) {

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
        <div className="space-y-6 pt-2">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={clsx(
                  "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  activeView === item.id
                    ? "text-neutral-900 bg-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className={clsx("transition-colors", activeView === item.id ? "text-neutral-900" : "text-neutral-400")}>
                  <item.icon className="w-4 h-4" />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Info (Static) */}
        <div className="text-xs text-neutral-400 px-3">
          v0.1.0 • Internal
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full px-4 max-w-sm safe-area-bottom">
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-3 py-2 flex justify-between items-center relative">

          {NAV_ITEMS.slice(0, 5).map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={clsx(
                  "relative flex items-center justify-center transition-all duration-200 rounded-full",
                  isActive ? "bg-neutral-100 p-2.5" : "p-2.5"
                )}
              >
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-neutral-900" : "text-neutral-400"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
