"use client";

import clsx from "clsx";
import { Settings, User, Users, Shield, Key, Bell, Link, Lock, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import useUserProfile from "@/hooks/useUserProfile";

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

  return (
    <aside className="w-full h-full flex flex-col justify-between pb-6">
      <div className="space-y-6 pt-2">
        {/* MOBILE PROFILE CARD */}
        {profile && (
          <div className="px-4 py-6 flex flex-col items-center border-b border-neutral-100 mb-2">
            <div className="w-20 h-20 rounded-full bg-neutral-200 overflow-hidden mb-3">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-neutral-400">
                  {profile.name?.charAt(0)}
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold text-neutral-900">{profile.name}</h3>
            <p className="text-sm text-neutral-500">{profile.email}</p>
            <div className="mt-3 px-3 py-1 rounded-full bg-neutral-100 text-xs font-medium text-neutral-600 border border-neutral-200">
              {profile.department || "No Department"} • {profile.role}
            </div>
          </div>
        )}

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

      <div className="mt-auto px-3 border-t border-neutral-100 pt-4">
        <button
          onClick={() => {
            // Need supabase client here, but for now standard full reload login redirect or similar
            // Since this component might not have router/supabase setup, let's keep it visually ready
            window.location.href = "/login";
          }}
          className="w-full text-left rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-red-600 hover:bg-red-50 py-2 px-3"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
