"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import useUserProfile from "@/hooks/useUserProfile";

import {
  LayoutDashboard,
  FolderKanban,
  Search,
  CheckSquare,
  Bell,
  Globe,
  Share2,
  GraduationCap,
  Receipt,
  Banknote,
  Package,
  Box,
  Map,
  Target,
  User,
  Users,
  Clock,
  Briefcase,
  HardHat,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,

  Menu,
  X,
  LogOut,
  PanelLeft
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

type MenuItem = { label: string; href: string; icon: LucideIcon };
type MenuSection = { section: string; items: MenuItem[] };

const menuItems: MenuSection[] = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Tasks", href: "/task", icon: CheckSquare },
      { label: "Actions", href: "/action", icon: Target },
      { label: "Projects", href: "/project", icon: FolderKanban },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    section: "WORKSPACE",
    items: [
      { label: "Finance", href: "/flow/finance", icon: Banknote },
      { label: "Resources", href: "/flow/resources", icon: Package },
      { label: "People", href: "/feel/people", icon: Users },
      { label: "Clock", href: "/feel/clock", icon: Clock },
      { label: "Crew", href: "/feel/crew", icon: HardHat },
      // { label: "Website", href: "/frame/website", icon: Globe },
      // { label: "Social", href: "/frame/social", icon: Share2 },
      // { label: "Learn", href: "/frame/learn", icon: GraduationCap },
    ],
  },
];

// Helper to get specific colors per section
function getSectionColors(section: string) {
  switch (section) {
    case "FLOW":
      return { active: "text-red-600 border-red-600 bg-red-50", hover: "hover:bg-red-50", icon: "text-red-600" };
    case "FEEL":
      return { active: "text-blue-600 border-blue-600 bg-blue-600/10", hover: "hover:bg-blue-600/5", icon: "text-blue-600" };
    case "FRAME":
      return { active: "text-orange-600 border-orange-600 bg-orange-600/10", hover: "hover:bg-orange-600/5", icon: "text-orange-600" };
    case "SYSTEM":
      return { active: "text-neutral-900 border-neutral-900 bg-neutral-200", hover: "hover:bg-neutral-100", icon: "text-neutral-900" };
    default: // MAIN and others
      return { active: "text-neutral-900 border-neutral-200 bg-neutral-100", hover: "hover:bg-neutral-50", icon: "text-neutral-900" };
  }
}

export default function Sidebar({
  isOpen: open = true,
  onToggle,
  onWidthChange
}: {
  isOpen?: boolean;
  onToggle?: () => void;
  onWidthChange?: (w: number) => void
}) {
  const { profile } = useUserProfile();
  const isStaff = profile?.role === "staff";

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Tooltip State
  const [hoveredItem, setHoveredItem] = useState<{ label: string; top: number } | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(open ? 256 : 64);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const updateWidth = () => {
      const isDesktop = window.innerWidth >= 1024;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      let newWidth = 64;
      
      if (open) {
        newWidth = isDesktop ? 256 : (isTablet ? 200 : 256);
      }
      
      setSidebarWidth(newWidth);
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [open]);

  useEffect(() => {
    if (mounted) onWidthChange?.(sidebarWidth);
  }, [mounted, sidebarWidth, onWidthChange]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!mounted) return null;

  return (
    <>
      {/* MOBILE OVERLAY BACKDROP */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR - Desktop: inside window container, Mobile: drawer from left */}
      <aside
        className={clsx(
          "transition-all duration-300 z-[60] flex flex-col",
          // Mobile: drawer, fixed, h-screen
          "fixed left-0 top-0 h-screen -translate-x-full bg-bg-100",
          mobileOpen && "translate-x-0 cursor-default",
          // Desktop: relative inside window shell, h-full
          "md:relative md:translate-x-0 md:h-full md:bg-transparent"
        )}
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          maxWidth: sidebarWidth,
          overflow: "hidden",
        }}
      >
        <div className="md:p-0 h-full flex flex-col">
          <div className="h-full flex flex-col bg-white/20 dark:bg-neutral-800/20 backdrop-blur-2xl rounded-[18px] border border-white/40 dark:border-neutral-700/30 shadow-sm overflow-hidden">
            {/* HEADER */}
            <div className={clsx(
              "h-[60px] flex items-center gap-3",
              open ? "justify-between px-4" : "justify-center px-0"
            )}>
              {/* Logo & Title - Visible when expanded */}
              {open && (
                <div className="flex items-center gap-2.5 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                  <img src="/logo-adidaya-red.svg" alt="Adidaya" className="w-4 h-4 object-contain shrink-0" />
                  <h1 className="text-[13px] font-bold tracking-tight text-neutral-900 dark:text-neutral-100 uppercase truncate whitespace-nowrap">
                    <span className="text-neutral-400 font-medium lowercase">from:</span>{" "}
                    <span>Adidaya</span>
                  </h1>
                </div>
              )}

              <div className="flex items-center gap-1">
                {/* macOS Style Toggle (sidebar.left) */}
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-500 transition-colors shrink-0"
                  title={open ? "Hide Sidebar" : "Show Sidebar"}
                >
                  <PanelLeft size={16} strokeWidth={2} />
                </button>

                {/* Close button for mobile */}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-500 transition-colors md:hidden"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* MENU */}
            <nav className={clsx(
              "flex flex-col mt-0 pb-5 overflow-y-auto flex-1 scrollbar-hide",
              open ? "px-1" : "px-0"
            )}>
              {menuItems.map((group) => {
                const colors = getSectionColors(group.section);

                return (
                  <div key={group.section} className={clsx(
                    group.section === "MAIN" ? "mt-0" : "mt-4",
                    group.section === "SYSTEM" && "mt-8 border-t border-neutral-200/30 dark:border-neutral-800/30 pt-4"
                  )}>
                    {open && (
                      <p className="px-4 text-[10px] font-bold text-neutral-400/80 mb-2 uppercase tracking-widest leading-none">
                        {group.section}
                      </p>
                    )}

                    {group.items.filter(item => !(isStaff && item.href === "/action")).map((item) => {
                      const Icon = item.icon;

                      const isActive =
                        item.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname === item.href || pathname.startsWith(item.href + "/");

                      return (
                        <div
                          key={item.href}
                          className={clsx(
                            "relative group w-full mb-0.5",
                            open ? "px-2" : "px-0"
                          )}
                          onMouseEnter={(e) => {
                            if (open) return; // No tooltip if expanded
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredItem({
                              label: item.label,
                              top: rect.top + rect.height / 2,
                            });
                          }}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <Link
                            href={item.href}
                            className={clsx(
                              "flex items-center rounded-lg text-[12px] transition-all select-none group/link",
                              open ? "gap-2.5 px-3 py-1.5" : "h-8 w-8 mx-auto justify-center",
                              // Active State (macOS Blue Glassy Style)
                              isActive 
                                ? "bg-blue-500/15 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 font-semibold shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]"
                                : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                            )}
                          >
                            <Icon
                              size={16}
                              strokeWidth={isActive ? 2.5 : 2}
                              className={clsx(
                                "transition-transform group-hover/link:scale-105",
                                isActive ? "text-blue-600 dark:text-blue-400" : "text-neutral-400 group-hover/link:text-neutral-500"
                              )}
                            />

                            {open && <span>{item.label}</span>}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <div className={clsx(
                "mt-8 border-t border-neutral-200/30 dark:border-neutral-800/30 pt-4",
                open ? "px-2" : "px-0"
              )}>
                <div
                  className="relative group w-full"
                  onMouseEnter={(e) => {
                    if (open) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredItem({
                      label: "Settings",
                      top: rect.top + rect.height / 2,
                    });
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    href="/settings"
                    className={clsx(
                      "flex items-center rounded-lg text-[12px] font-medium transition-all select-none group/link",
                      open ? "gap-2.5 px-3 py-1.5" : "h-8 w-8 mx-auto justify-center",
                      pathname.startsWith("/settings")
                        ? "text-blue-600 bg-blue-500/15 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]"
                        : "text-neutral-500 hover:bg-white/40 hover:text-neutral-900"
                    )}
                  >
                    <Settings
                      size={16}
                      strokeWidth={pathname.startsWith("/settings") ? 2.5 : 2}
                      className={clsx(
                        "transition-transform group-hover/link:scale-110",
                        pathname.startsWith("/settings") ? "text-blue-600" : "text-neutral-400 group-hover/link:text-neutral-600"
                      )}
                    />
                    {open && <span>Settings</span>}
                  </Link>
                </div>
              </div>
            </nav>

            {/* FOOTER */}
            <div className="px-5 py-4 mt-auto border-t border-neutral-200/30 dark:border-neutral-800/30">
              {open && <p className="text-[10px] uppercase font-bold tracking-tight text-neutral-400/60">© 2026 Adidaya Studio</p>}
            </div>
          </div>
        </div>
      </aside>


      {/* PORTAL TOOLTIP */}
      {!open && hoveredItem && (
        createPortal(
          <div
            className="fixed left-[88px] z-[9999] pointer-events-none flex items-center"
            style={{
              top: hoveredItem.top,
              transform: "translateY(-50%)"
            }}
          >
            {/* Triangle Arrow */}
            <div className="absolute -left-1 w-2 h-2 bg-white/40 dark:bg-neutral-800/40 backdrop-blur-2xl border-l border-b border-white/20 dark:border-neutral-700/20 rotate-45" />

            {/* Badge */}
            <div className="bg-white/20 dark:bg-neutral-800/20 backdrop-blur-2xl text-neutral-900 dark:text-neutral-100 text-[11px] font-bold py-1.5 px-3 rounded-xl border border-white/40 dark:border-neutral-700/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-200">
              {hoveredItem.label}
            </div>
          </div>,
          document.body
        )
      )}
    </>
  );
}
