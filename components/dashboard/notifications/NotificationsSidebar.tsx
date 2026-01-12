"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Mail,
  AtSign,
  CheckSquare,
  Settings
} from "lucide-react";

export type NotificationsSection = "all" | "unread" | "mentions" | "approvals" | "system";

const NAV_ITEMS = [
  { id: "all", label: "All Notifications", icon: Bell, href: "/dashboard/notifications" },
  { id: "unread", label: "Unread", icon: Mail, href: "/dashboard/notifications/unread" },
  { id: "mentions", label: "Mentions", icon: AtSign, href: "/dashboard/notifications/mentions" },
  { id: "approvals", label: "Approvals", icon: CheckSquare, href: "/dashboard/notifications/approvals" },
  { id: "system", label: "System", icon: Settings, href: "/dashboard/notifications/system" },
];

export default function NotificationsSidebar() {
  const pathname = usePathname();

  const getActiveSection = (path: string) => {
    if (path === "/dashboard/notifications") return "all";
    const parts = path.split("/");
    return parts[parts.length - 1]; // e.g. "unread", "mentions"
  };

  const activeSection = getActiveSection(pathname);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
        <div className="space-y-6 pt-2">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={clsx(
                  "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  activeSection === item.id
                    ? "text-neutral-900 bg-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className={clsx("transition-colors", activeSection === item.id ? "text-neutral-900" : "text-neutral-400")}>
                  <item.icon className="w-4 h-4" />
                </span>
                <span>{item.label}</span>
                {item.id === "unread" && (
                  <span className="ml-auto text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">3</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full px-4 max-w-sm safe-area-bottom">
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-3 py-2 flex justify-between items-center relative">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
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
                {item.id === "unread" && !isActive && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
