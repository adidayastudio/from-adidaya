"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/views/DashboardOverview";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import useUserProfile from "@/hooks/useUserProfile";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import {
  Globe,
  Share2,
  GraduationCap,
  FolderKanban,
  Banknote,
  Package,
  User,
  Users,
  Clock,
  Briefcase,
  HardHat,
  Sparkles,
  Calendar,
  Sunrise,
  Sunset,
  Sun,
  Moon,
  CloudSun,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  ClipboardCheck,
  Bell,
  LayoutDashboard,
  LayoutGrid,
  Inbox,
  Settings,
  LogOut
} from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";

// Dashboard Tab Components
import MyTasksContent from "@/components/my-tasks/MyTasksContent";
import MyProjectsContent from "@/components/dashboard/my-projects/MyProjectsContent";
import NotificationsContent from "@/components/dashboard/notifications/NotificationsContent";
import NotificationDrawer from "@/components/dashboard/notifications/NotificationDrawer";
import { X, Check, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WorkPersonaCard from "@/components/dashboard/WorkPersonaCard";
import { resolveWorkPersona, WorkMetrics } from "@/lib/workPersonaLogic";
import DashboardHeader from "@/components/dashboard/revamp/DashboardHeader";
import ActivitySummaryCard from "@/components/dashboard/revamp/ActivitySummaryCard";
import VibeCard from "@/components/dashboard/revamp/VibeCard";
import WorkspaceGrid from "@/components/dashboard/revamp/WorkspaceGrid";

const DEFAULT_FAVORITES = ["Projects", "Finance", "Resources", "Clock", "People", "Career", "Crew"];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUserProfile();

  const { unreadCount } = useNotifications();

  // Mock metrics for demo
  const mockMetrics: WorkMetrics = {
    tasksCompleted: 3,
    tasksTotal: 5,
    tasksOverdue: 0,
    attendanceRate: 100,
    pulseScore: 85,
    activeTasks: 4,
    criticalTasksOpen: 0,
    timeLoggedHours: 7.5,
    projectSwitchCount: 2,
    daysEvaluated: 1,
    previousPeriodTasksCompleted: 2,
  };

  const persona = useMemo(() => resolveWorkPersona(mockMetrics), []);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [showAllApps, setShowAllApps] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isServicesDrawerOpen, setIsServicesDrawerOpen] = useState(false);
  const [isNotifSheetOpen, setIsNotifSheetOpen] = useState(false);
  const [isMeMenuOpen, setIsMeMenuOpen] = useState(false);
  const meMenuRef = useRef<HTMLDivElement>(null);

  // SET MOUNTED
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // LOAD FAVORITES
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_favorites");
    if (saved) {
      setFavorites(JSON.parse(saved));
    } else {
      setFavorites(DEFAULT_FAVORITES);
    }
  }, []);

  // UPDATE CURRENT TIME
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close Me menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (meMenuRef.current && !meMenuRef.current.contains(event.target as Node)) {
        setIsMeMenuOpen(false);
      }
    };
    if (isMeMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMeMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Time Phase Logic
  const getPhase = (date: Date) => {
    const hours = date.getHours();
    if (hours >= 5 && hours < 11) return "morning";
    if (hours >= 11 && hours < 15) return "afternoon";
    if (hours >= 15 && hours < 18) return "sore";
    return "night";
  };

  const phases = {
    morning: {
      greeting: "Good Morning",
      message: "Wishing you a productive and smooth day ahead.",
      color: "text-amber-600",
      bg: "bg-gradient-to-br from-amber-50/50 to-white/40",
      banner: "from-amber-50 to-white",
      border: "border-amber-100/30",
      icon: Sunrise
    },
    afternoon: {
      greeting: "Good Afternoon",
      message: "How’s today going so far? A quick update helps keep things moving.",
      color: "text-blue-600",
      bg: "bg-gradient-to-br from-blue-50/50 to-white/40",
      banner: "from-blue-50 to-white",
      border: "border-blue-100/30",
      icon: Sun
    },
    sore: {
      greeting: "Good Afternoon",
      message: "As the day winds down, focus on what truly matters.",
      color: "text-orange-600",
      bg: "bg-gradient-to-br from-orange-50/50 to-white/40",
      banner: "from-orange-50 to-white",
      border: "border-orange-100/30",
      icon: Sunset
    },
    overtime: {
      greeting: "Working Late",
      message: "You’re still working. Remember to take care of yourself.",
      color: "text-rose-600",
      bg: "bg-gradient-to-br from-rose-50/50 to-white/40",
      banner: "from-rose-50 to-white",
      border: "border-rose-100/30",
      icon: Clock
    },
    night: {
      greeting: "Good Night",
      message: "It’s been a long day. Time to recharge for tomorrow.",
      color: "text-indigo-900",
      bg: "bg-gradient-to-br from-indigo-50/50 to-white/40",
      banner: "from-indigo-50/80 via-indigo-100/40 to-white/20",
      border: "border-indigo-100/30",
      icon: Moon
    },
  };

  const currentPhaseKey = getPhase(currentTime);
  const phase = phases[currentPhaseKey] || phases.morning;
  const PhaseIcon = phase.icon;

  const APPS = [
    // { label: "Website", href: "/frame/website", icon: Globe, color: "text-orange-500", bg: "bg-gradient-to-br from-orange-100/80 to-orange-50/40 border-orange-200/40", category: "FRAME" },
    // { label: "Social", href: "/frame/social", icon: Share2, color: "text-orange-500", bg: "bg-gradient-to-br from-orange-100/80 to-orange-50/40 border-orange-200/40", category: "FRAME" },
    // { label: "Learn", href: "/frame/learn", icon: GraduationCap, color: "text-orange-500", bg: "bg-gradient-to-br from-orange-100/80 to-orange-50/40 border-orange-200/40", category: "FRAME" },
    { label: "Projects", href: "/flow/projects", icon: FolderKanban, color: "text-red-500", bg: "bg-gradient-to-br from-red-100/80 to-red-50/40 border-red-200/40", category: "FLOW" },
    { label: "Finance", href: "/flow/finance", icon: Banknote, color: "text-red-500", bg: "bg-gradient-to-br from-red-100/80 to-red-50/40 border-red-200/40", category: "FLOW" },
    { label: "Resources", href: "/flow/resources", icon: Package, color: "text-red-500", bg: "bg-gradient-to-br from-red-100/80 to-red-50/40 border-red-200/40", category: "FLOW" },
    { label: "Client", href: "/flow/client", icon: User, color: "text-red-500", bg: "bg-gradient-to-br from-red-100/80 to-red-50/40 border-red-200/40", category: "FLOW" },
    { label: "People", href: "/feel/people", icon: Users, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-100/80 to-blue-50/40 border-blue-200/40", category: "FEEL" },
    { label: "Clock", href: "/feel/clock", icon: Clock, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-100/80 to-blue-50/40 border-blue-200/40", category: "FEEL" },
    { label: "Career", href: "/feel/career", icon: Briefcase, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-100/80 to-blue-50/40 border-blue-200/40", category: "FEEL" },
    { label: "Crew", href: "/feel/crew", icon: HardHat, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-100/80 to-blue-50/40 border-blue-200/40", category: "FEEL" },
    { label: "Culture", href: "/feel/culture", icon: Sparkles, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-100/80 to-blue-50/40 border-blue-200/40", category: "FEEL" },
    { label: "Calendar", href: "/feel/calendar", icon: Calendar, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-100/80 to-blue-50/40 border-blue-200/40", category: "FEEL" },
  ];
  // Logic for displaying favorites (sorted by category + default state)
  const displayFavorites = favorites.length > 0
    ? [...favorites].sort((a, b) => {
      const indexA = APPS.findIndex(app => app.label === a);
      const indexB = APPS.findIndex(app => app.label === b);
      return indexA - indexB;
    })
    : ["Projects", "Finance", "Crew"];

  return (
    <div className="w-full h-full relative transition-colors">
      <StandardPageWrapper
        breadcrumbItems={[{ label: "Dashboard" }]}
        isTransparent
        fullWidth
      >
        <div className="w-full pb-32 px-5 md:px-0">
          {/* NEW REVAMPED DASHBOARD (MOBILE) */}
          <div className="md:hidden">
            <DashboardHeader onOpenNotifications={() => setIsNotifSheetOpen(true)} />
            {/* <ActivitySummaryCard /> */}
            {/* <VibeCard /> */}
            <WorkspaceGrid />
          </div>

          {/* DESKTOP DASHBOARD (macOS Style + Standard Pattern) */}
          <div className="hidden md:block">
            <StandardPageHeader
              title={`${phase.greeting}, ${profile?.nickname || profile?.full_name?.split(' ')[0] || profile?.username || "Team"}`}
              subtitle={phase.message}
              hideDivider={true}
              action={
                <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm backdrop-blur-md border", phase.bg, phase.border)}>
                  <PhaseIcon className={clsx("w-6 h-6", phase.color)} strokeWidth={2.5} />
                </div>
              }
            />

            <div className="space-y-8">
              {/* Top Row: Activity and Vibe (Hidden for now) */}
              {/* <div className="grid grid-cols-1 gap-6 relative z-10 overflow-visible">
                <ActivitySummaryCard />
                <VibeCard />
              </div> */}

              {/* Bottom Row: Workspace Grid full width */}
              <WorkspaceGrid />
            </div>
          </div>
        </div>
      </StandardPageWrapper>



      {/* SERVICES BOTTOM SHEET (GOJEK-STYLE) */}
      <AnimatePresence>
        {isServicesDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsServicesDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl rounded-t-[40px] shadow-2xl overflow-hidden relative border-t border-white/50 dark:border-neutral-800"
            >
              {/* Handle Bar */}
              <div className="w-full flex justify-center py-3">
                <div className="w-12 h-1.5 bg-neutral-300/60 rounded-full" />
              </div>

              <div className="py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-neutral-800 dark:text-white tracking-tight">My Favorite Apps</h3>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="p-2.5 rounded-full backdrop-blur-sm active:scale-95 transition-all border border-blue-200/40"
                  style={{ background: 'linear-gradient(180deg, rgba(219,234,254,0.8) 0%, rgba(191,219,254,0.5) 100%)' }}
                >
                  <MoreHorizontal className="w-5 h-5 text-blue-600" />
                </button>
              </div>

              <div className="pb-32 overflow-y-auto max-h-[75vh] space-y-10 scrollbar-hide">
                {/* FAVORITES SECTION */}
                <div className="grid grid-cols-4 gap-y-8 gap-x-2">
                  {favorites.length > 0 ? (
                    [...favorites].sort((a, b) => {
                      const indexA = APPS.findIndex(app => app.label === a);
                      const indexB = APPS.findIndex(app => app.label === b);
                      return indexA - indexB;
                    }).map((label) => {
                      const app = APPS.find(a => a.label === label);
                      if (!app) return null;
                      return (
                        <Link href={app.href} key={app.label} className="flex flex-col items-center gap-2">
                          <div className={clsx(
                            "w-16 h-16 rounded-[22px] shadow-sm border flex items-center justify-center",
                            app.bg
                          )}>
                            <app.icon className={clsx("w-7 h-7", app.color)} strokeWidth={1.5} />
                          </div>
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 text-center leading-tight">
                            {app.label}
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="col-span-4 py-8 px-4 text-center rounded-3xl backdrop-blur-sm border border-white/50 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80">
                      <p className="text-[12px] font-medium text-neutral-400 leading-relaxed">
                        No favorite app selected.<br />Choose your most used apps for quick access.
                      </p>
                    </div>
                  )}
                </div>

                {/* CATEGORIES SECTION */}
                {["FRAME", "FLOW", "FEEL"].map((category) => (
                  <div key={category} className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-1.5 h-4 rounded-full",
                        category === "FRAME" && "bg-orange-500",
                        category === "FLOW" && "bg-red-500",
                        category === "FEEL" && "bg-blue-500"
                      )} />
                      <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.15em]">{category}</h4>
                    </div>

                    <div className="grid grid-cols-4 gap-y-8 gap-x-2">
                      {APPS.filter(app => app.category === category).map((app) => (
                        <Link href={app.href} key={app.label} className="flex flex-col items-center gap-2">
                          <div className={clsx(
                            "w-16 h-16 rounded-[22px] shadow-sm border flex items-center justify-center",
                            app.bg
                          )}>
                            <app.icon className={clsx("w-7 h-7", app.color)} strokeWidth={1.5} />
                          </div>
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 text-center leading-tight">
                            {app.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* iOS 26 GLASS EDIT FAVORITES MODAL */}
      {isEditMode && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={() => setIsEditMode(false)} />
          <div className="w-full max-w-sm backdrop-blur-2xl rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom duration-300 border border-white/50"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(250,250,252,0.95) 100%)' }}>
            <div className="px-6 py-5 border-b border-neutral-200/30 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-800">Manage Favorites</h3>
                <p className="text-[10px] text-neutral-400 font-medium">Select up to 7 applications</p>
              </div>
              <button onClick={() => setIsEditMode(false)}
                className="p-2 rounded-full backdrop-blur-sm text-neutral-500 border border-neutral-200/40 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(180deg, rgba(245,245,245,0.8) 0%, rgba(240,240,240,0.5) 100%)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-[50vh] overflow-y-auto grid grid-cols-1 gap-1.5">
              {APPS.map((app) => {
                const isFav = favorites.includes(app.label);
                const disabled = !isFav && favorites.length >= 7;

                return (
                  <button
                    key={app.label}
                    disabled={disabled}
                    onClick={() => {
                      let next;
                      if (isFav) {
                        next = favorites.filter(f => f !== app.label);
                      } else {
                        next = [...favorites, app.label];
                      }
                      setFavorites(next);
                      localStorage.setItem("dashboard_favorites", JSON.stringify(next));
                    }}
                    className={clsx(
                      "flex items-center justify-between p-3 rounded-2xl transition-all backdrop-blur-sm border",
                      isFav
                        ? "border-white/60 shadow-sm"
                        : "border-transparent hover:border-neutral-200/40",
                      disabled ? "opacity-30 grayscale pointer-events-none" : ""
                    )}
                    style={isFav ? { background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.7) 100%)' } : {}}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-sm border transition-all",
                        isFav ? "border-white/60" : "border-neutral-200/40"
                      )}
                        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 100%)' }}>
                        <app.icon className={clsx("w-5 h-5", isFav ? app.color : "text-neutral-400")} strokeWidth={1.5} />
                      </div>
                      <span className={clsx("text-sm font-semibold", isFav ? "text-neutral-800" : "text-neutral-500")}>{app.label}</span>
                    </div>
                    <div className={clsx(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      isFav
                        ? "border-blue-500/50 text-white shadow-sm"
                        : "border-neutral-300/60"
                    )}
                      style={isFav ? { background: 'linear-gradient(180deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)' } : {}}>
                      {isFav && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              <button
                onClick={() => setIsEditMode(false)}
                className="w-full py-4 rounded-full font-semibold text-sm shadow-lg active:scale-[0.98] transition-all text-white"
                style={{ background: 'linear-gradient(180deg, rgba(38,38,38,1) 0%, rgba(23,23,23,1) 100%)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Bottom Sheet */}
      <NotificationDrawer
        isOpen={isNotifSheetOpen}
        onClose={() => setIsNotifSheetOpen(false)}
      />
    </div>
  );
}

function EmptyPlaceholder({ text = "No items" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 h-32 text-neutral-400">
      <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
        <Inbox className="w-5 h-5 opacity-50" />
      </div>
      <span className="text-xs font-medium">{text}</span>
    </div>
  );
}
