"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";

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
  LogOut
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

type MenuItem = { label: string; href: string; icon: LucideIcon };
type MenuSection = { section: string; items: MenuItem[] };

const menuItems: MenuSection[] = [
  {
    section: "MAIN",
    items: [
      { label: "Search", href: "/search", icon: Search },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "FRAME",
    items: [
      { label: "Website", href: "/frame/website", icon: Globe },
      { label: "Social", href: "/frame/social", icon: Share2 },
      { label: "Learn", href: "/frame/learn", icon: GraduationCap },
    ],
  },
  {
    section: "FLOW",
    items: [
      { label: "Projects", href: "/flow/projects", icon: FolderKanban },

      { label: "Finance", href: "/flow/finance", icon: Banknote },
      { label: "Resources", href: "/flow/resources", icon: Package },
      { label: "Client", href: "/flow/client", icon: User },
    ],
  },
  {
    section: "FEEL",
    items: [
      { label: "People", href: "/feel/people", icon: Users },
      { label: "Clock", href: "/feel/clock", icon: Clock },
      { label: "Career", href: "/feel/career", icon: Briefcase },
      { label: "Crew", href: "/feel/crew", icon: HardHat },
      { label: "Culture", href: "/feel/culture", icon: Sparkles },
      { label: "Calendar", href: "/feel/calendar", icon: Calendar },
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

export default function Sidebar({ onWidthChange }: { onWidthChange?: (w: number) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false); // Default to collapsed
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Tooltip State
  const [hoveredItem, setHoveredItem] = useState<{ label: string; top: number } | null>(null);

  const width = open ? 256 : 80;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted) onWidthChange?.(width);
  }, [mounted, width, onWidthChange]);

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
      {/* MOBILE HAMBURGER BUTTON - Fixed top left */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white border border-neutral-200 shadow-md"
      >
        <Menu className="w-6 h-6 text-neutral-700" />
      </button>

      {/* MOBILE LOGOUT BUTTON - Fixed top right */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-lg bg-white border border-neutral-200 shadow-md text-red-600 active:scale-95 transition-transform"
        aria-label="Sign Out"
      >
        <LogOut className="w-6 h-6" />
      </button>

      {/* MOBILE OVERLAY BACKDROP */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR - Desktop: always visible, Mobile: drawer from left */}
      <aside
        className={clsx(
          "fixed left-0 top-0 h-screen bg-bg-100 border-r border-border-light transition-all duration-300 z-50 flex flex-col",
          // Mobile: slide in/out
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          width,
          minWidth: width,
          maxWidth: width,
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <div className="px-4 py-5 border-b border-border-light flex items-center justify-between">
          {open ? (
            <div className="flex items-center gap-2">
              <img src="/logo-adidaya-red.svg" alt="Adidaya" className="w-7 h-7" />
              <h1 className="text-base font-semibold tracking-tight">
                <span className="text-neutral-500">from:</span>{" "}
                <span className="text-brand-red">Adidaya</span>
              </h1>
            </div>
          ) : (
            <img src="/logo-adidaya-red.svg" alt="Adidaya" className="w-7 h-7 mx-auto" />
          )}
          <div className="flex items-center gap-2">
            {/* Close button for mobile */}
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md hover:bg-bg-300 transition-colors md:hidden"
            >
              <X size={18} />
            </button>
            {/* Collapse toggle for desktop */}
            <button
              onClick={() => setOpen((o) => !o)}
              className="p-2 rounded-md hover:bg-bg-300 transition-colors hidden md:block"
            >
              {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* MENU */}
        <nav className="flex flex-col mt-4 px-2 pb-5 overflow-y-auto">
          {menuItems.map((group) => {
            const colors = getSectionColors(group.section);

            return (
              <div key={group.section} className="mt-4">
                {open && (
                  <p className="px-3 text-[11px] font-semibold text-text-tertiary mb-1">
                    {group.section}
                  </p>
                )}

                {group.items.map((item) => {
                  const Icon = item.icon;

                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <div
                      key={item.href}
                      className="relative group w-full"
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
                          "flex items-center rounded-full text-sm font-medium transition-all select-none group/link",
                          open ? "gap-3 px-3 py-2.5" : "px-0 py-2.5 justify-center w-full",
                          // Active State
                          isActive ? colors.active : `text-neutral-500 ${colors.hover} hover:text-neutral-900 border border-transparent`
                        )}
                      >
                        <Icon
                          size={20}
                          strokeWidth={isActive ? 2 : 1.5}
                          className={clsx(
                            "transition-transform group-hover/link:scale-110",
                            isActive ? colors.icon : "text-neutral-400 group-hover/link:text-neutral-600"
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
        </nav>

        <div className="mt-auto border-t border-border-light px-4 py-4">
          {open && <p className="text-xs text-text-tertiary">© 2026 Adidaya Studio</p>}
        </div>
      </aside>

      {/* PORTAL TOOLTIP */}
      {!open && hoveredItem && createPortal(
        <div
          className="fixed left-[80px] z-[9999] pointer-events-none flex items-center"
          style={{
            top: hoveredItem.top,
            transform: "translateY(-50%)"
          }}
        >
          {/* Triangle Arrow */}
          <div className="absolute -left-1 w-2 h-2 bg-neutral-900 rotate-45" />

          {/* Badge */}
          <div className="bg-neutral-900 text-white text-xs font-medium py-1.5 px-3 rounded-md shadow-xl animate-in fade-in zoom-in-95 duration-100">
            {hoveredItem.label}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
