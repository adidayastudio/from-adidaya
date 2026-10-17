"use client";

import clsx from "clsx";
import { Settings, User, Users, Shield, Key, Bell, Link, Lock, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import useUserProfile from "@/hooks/useUserProfile";
import { createClient } from "@/utils/supabase/client";

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

export const NAV_ITEMS: NavItemConfig[] = [
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



/* ... (imports remain) ... */

export default function SettingsSidebar({ activeView, onViewChange }: SettingsSidebarProps) {
  const { profile } = useUserProfile();
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
      <aside className="w-full h-full flex flex-col pt-0">
        <div className="space-y-0.5 mb-4">
          <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest px-3 mb-2 leading-none">Settings</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                activeView === item.id
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
              )}
            >
              <item.icon className={clsx("w-4 h-4 shrink-0 transition-colors", activeView === item.id ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto px-0 border-t border-neutral-200/30 dark:border-neutral-800/30 pt-4">
          <button
            onClick={handleLogout}
            className="w-full text-left rounded-lg text-[12px] font-medium transition-all flex items-center gap-2.5 text-red-600 hover:bg-red-500/10 py-1.5 px-3"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="truncate">Log Out</span>
          </button>
        </div>
      </aside>
  );
}
