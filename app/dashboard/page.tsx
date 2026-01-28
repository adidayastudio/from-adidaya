"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/views/DashboardOverview";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import useUserProfile from "@/hooks/useUserProfile";
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
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  ClipboardCheck,
  Bell,
  LayoutDashboard,
  Inbox
} from "lucide-react";
import { useClock } from "@/hooks/useClock";
import { formatTargetTime } from "@/lib/work-hours-utils";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";
import { useNotifications } from "@/hooks/useNotifications";

// Dashboard Tab Components
import MyTasksContent from "@/components/my-tasks/MyTasksContent";
import MyProjectsContent from "@/components/dashboard/my-projects/MyProjectsContent";
import NotificationsContent from "@/components/dashboard/notifications/NotificationsContent";
import { X, Check, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_FAVORITES = ["Projects", "Finance", "Resources", "Clock", "People", "Career", "Crew"];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUserProfile();
  const { isCheckedIn, elapsed, toggleClock, formatTime, status: clockStatus, startTime } = useClock();
  const { unreadCount } = useNotifications();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [showAllApps, setShowAllApps] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isServicesDrawerOpen, setIsServicesDrawerOpen] = useState(false);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Time Phase Logic
  const getPhase = (date: Date, checkedIn: boolean) => {
    const hours = date.getHours();
    if (checkedIn && hours >= 18) return "overtime";
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

  const currentPhaseKey = getPhase(currentTime, isCheckedIn);
  const phase = phases[currentPhaseKey] || phases.morning;
  const PhaseIcon = phase.icon;

  const APPS = [
    { label: "Website", href: "/frame/website", icon: Globe, color: "text-orange-500", bg: "bg-gradient-to-br from-orange-100/80 to-orange-50/40 border-orange-200/40", category: "FRAME" },
    { label: "Social", href: "/frame/social", icon: Share2, color: "text-orange-500", bg: "bg-gradient-to-br from-orange-100/80 to-orange-50/40 border-orange-200/40", category: "FRAME" },
    { label: "Learn", href: "/frame/learn", icon: GraduationCap, color: "text-orange-500", bg: "bg-gradient-to-br from-orange-100/80 to-orange-50/40 border-orange-200/40", category: "FRAME" },
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
    <div className="min-h-screen bg-neutral-50 md:p-6 relative">
      <Breadcrumb items={[{ label: "Dashboard" }]} className="hidden md:flex" />

      <PageWrapper sidebar={<DashboardSidebar />}>
        <div className="h-full overflow-y-auto scrollbar-hide md:mx-0 -mx-4">
          <div className="w-full pb-32 md:px-0 px-4">

            {/* GOJEK-STYLE BANNER HEADER (MOBILE ONLY) */}
            <div className="md:hidden -mx-4 -mt-12 mb-6 relative overflow-hidden h-48 flex items-center">
              <div className={clsx("absolute inset-0 bg-gradient-to-br transition-all duration-1000", phase.banner)} />

              <div className="absolute inset-x-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-neutral-100 overflow-hidden bg-white flex items-center justify-center shadow-sm">
                    <PhaseIcon className={clsx("w-6 h-6", phase.color)} />
                  </div>
                  <div>
                    <h2 className={clsx("text-lg font-black tracking-tight leading-tight", phase.color)}>
                      {phase.greeting}, {profile?.name?.split(' ')[0] || "Team"}
                    </h2>
                    <p className="text-neutral-500 text-[11px] font-medium max-w-[200px] mt-1 leading-tight">{phase.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/dashboard/notifications" className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-100 flex items-center justify-center shadow-sm active:scale-95 transition-all relative">
                    <Bell className="w-5 h-5 text-neutral-500" strokeWidth={1.5} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/settings" className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-100 flex items-center justify-center shadow-sm active:scale-95 transition-all">
                    <User className="w-5 h-5 text-neutral-500" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            </div>

            {/* iOS 26 GLASS CLOCK WIDGET (MOBILE ONLY) */}
            <div className="md:hidden relative z-10 -mt-10 mx-2 mb-8">
              <div className="backdrop-blur-xl bg-white/70 rounded-[24px] shadow-lg shadow-black/[0.03] border border-white/60 p-2.5 flex items-center"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 100%)' }}>
                <div className="flex-1 flex items-center gap-3">
                  <div className={clsx(
                    "w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-all backdrop-blur-sm",
                    isCheckedIn
                      ? "bg-gradient-to-br from-blue-100/80 to-blue-50/40 border border-blue-200/30 text-blue-600"
                      : "bg-gradient-to-br from-neutral-100/80 to-neutral-50/40 border border-neutral-200/30 text-neutral-400"
                  )}>
                    <Clock className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest leading-none mb-1">
                      {isCheckedIn ? "On Duty" : "Offline"}
                    </div>
                    <div className={clsx(
                      "text-xl font-bold tracking-tighter tabular-nums leading-none",
                      isCheckedIn ? "text-neutral-800" : "text-neutral-300"
                    )}>
                      {isCheckedIn ? formatTime(elapsed) : "00:00:00"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsClockModalOpen(true)}
                  className={clsx(
                    "flex items-center gap-2 px-5 py-3.5 rounded-[18px] text-xs font-bold transition-all active:scale-95 ml-2",
                    isCheckedIn
                      ? "bg-gradient-to-b from-red-50 to-red-100/70 text-red-600 border border-red-200/40 shadow-sm"
                      : "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-300/40"
                  )}
                >
                  {isCheckedIn ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  {isCheckedIn ? "Clock Out" : "Clock In"}
                </button>
              </div>
            </div>

            {/* DESKTOP WELCOME (UNCHANGED BUT HIDDEN ON MOBILE) */}
            <div className={clsx(
              "hidden md:flex rounded-2xl p-8 items-center justify-between gap-6 mb-10 backdrop-blur-xl shadow-sm border",
              phase.bg, phase.border
            )}>
              <div className="flex items-center gap-5">
                <div className={clsx("w-16 h-16 rounded-xl flex items-center justify-center bg-white shadow-sm border border-neutral-100/50", phase.color)}>
                  <PhaseIcon className="w-8 h-8 opacity-90" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className={clsx("text-xl font-bold tracking-tight", phase.color)}>
                    {phase.greeting}, {profile?.name || "Team"}
                  </h2>
                  <p className="text-neutral-500 font-medium text-sm">Have a productive day ahead</p>
                </div>
              </div>
              <div className="text-right">
                <div className={clsx("text-3xl font-bold tabular-nums tracking-tight", phase.color)}>
                  {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
                  {currentTime.toLocaleDateString("en-US", { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
            </div>

            {/* iOS 26 GLASS APP GRID (MOBILE ONLY) */}
            <div className="md:hidden pb-8 px-2">
              {isMounted && (
                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                  {displayFavorites.slice(0, 7).map((label) => {
                    const app = APPS.find(a => a.label === label);
                    if (!app) return null;
                    return (
                      <Link href={app.href} key={app.label} className="flex flex-col items-center gap-2 transition-all active:scale-95">
                        <div className={clsx(
                          "flex items-center justify-center w-[56px] h-[56px] rounded-[18px] shadow-sm border transition-all",
                          app.bg
                        )}>
                          <app.icon className={clsx("w-6 h-6", app.color)} strokeWidth={1.5} />
                        </div>
                        <span className="text-[10px] font-medium text-neutral-500 text-center leading-tight px-1">
                          {app.label}
                        </span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => setIsServicesDrawerOpen(true)}
                    className="flex flex-col items-center gap-2 transition-all active:scale-95"
                  >
                    <div className="flex items-center justify-center w-[56px] h-[56px] backdrop-blur-xl rounded-[18px] border border-dashed border-neutral-300/60 text-neutral-400"
                      style={{ background: 'linear-gradient(180deg, rgba(250,250,250,0.8) 0%, rgba(245,245,245,0.5) 100%)' }}>
                      <LayoutDashboard className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] font-medium text-neutral-400 text-center leading-tight">More</span>
                  </button>
                </div>
              )}
            </div>

            {/* DESKTOP APP GRID (WITH THEMED BACKGROUNDS) */}
            <div className="hidden md:grid grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8 mb-8">
              {isMounted && APPS.map((app) => (
                <Link href={app.href} key={app.label} className="flex flex-col items-center gap-2 group">
                  <div className={clsx(
                    "flex items-center justify-center w-[56px] h-[56px] border rounded-[18px] shadow-sm transition-all duration-300",
                    "group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-md",
                    app.bg
                  )}>
                    <app.icon className={clsx("w-6 h-6", app.color)} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-medium text-neutral-500 group-hover:text-neutral-900 transition-colors text-center w-full truncate px-1">
                    {app.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* iOS 26 GLASS TAB BAR (MOBILE ONLY) */}
            <div className="md:hidden space-y-3">
              <div className="flex backdrop-blur-xl p-0.5 rounded-full border border-white/50"
                style={{ background: 'linear-gradient(180deg, rgba(245,245,245,0.9) 0%, rgba(240,240,240,0.7) 100%)' }}>
                {[
                  { id: "tasks", label: "Tasks", icon: ClipboardCheck },
                  { id: "projects", label: "Projects", icon: FolderKanban },
                ].map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[11px] font-semibold transition-all",
                        active
                          ? "bg-white/90 text-neutral-800 shadow-sm border border-white/60"
                          : "text-neutral-400"
                      )}
                      style={active ? { background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)' } : {}}
                    >
                      <Icon className={clsx("w-3.5 h-3.5", active ? "text-blue-500" : "text-neutral-400")} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* iOS 26 GLASS CONTENT */}
              <div className="space-y-2.5">
                {activeTab === "tasks" && (
                  <>
                    {/* Tasks Empty State */}
                    {false ? (
                      [].map((task: any) => (
                        <Link
                          key={task.id}
                          href="/dashboard/tasks"
                          className="flex items-center justify-between p-3.5 backdrop-blur-xl rounded-2xl border border-white/50 active:scale-[0.98] transition-all shadow-sm"
                          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              "w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm border",
                              task.status === "in-progress"
                                ? "bg-gradient-to-br from-blue-100/80 to-blue-50/40 border-blue-200/40"
                                : "bg-gradient-to-br from-neutral-100/80 to-neutral-50/40 border-neutral-200/40"
                            )}>
                              <ClipboardCheck className={clsx("w-4 h-4", task.status === "in-progress" ? "text-blue-500" : "text-neutral-400")} strokeWidth={1.5} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-700">{task.name}</p>
                              <p className="text-[10px] text-neutral-400">{task.project}</p>
                            </div>
                          </div>
                          <span className={clsx(
                            "text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm border",
                            task.due === "Today"
                              ? "bg-gradient-to-br from-blue-100/80 to-blue-50/40 text-blue-600 border-blue-200/40"
                              : "bg-gradient-to-br from-neutral-100/80 to-neutral-50/40 text-neutral-500 border-neutral-200/40"
                          )}>
                            {task.due}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <EmptyPlaceholder text="No tasks due today 🎉" />
                    )}
                    {/* View All Button - Always Show */}
                    <Link href="/dashboard/tasks" className="block text-center text-[11px] font-semibold text-blue-500 py-2">
                      View All Tasks →
                    </Link>
                  </>
                )}
                {activeTab === "projects" && (
                  <>
                    {/* Projects Empty State */}
                    {false ? (
                      [].map((project: any) => (
                        <Link
                          key={project.id}
                          href={`/flow/projects/${project.id}`}
                          className="flex items-center justify-between p-3.5 backdrop-blur-xl rounded-2xl border border-white/50 active:scale-[0.98] transition-all shadow-sm"
                          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              "w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm border",
                              project.status === "attention"
                                ? "bg-gradient-to-br from-orange-100/80 to-orange-50/40 border-orange-200/40"
                                : "bg-gradient-to-br from-neutral-100/80 to-neutral-50/40 border-neutral-200/40"
                            )}>
                              <FolderKanban className={clsx("w-4 h-4", project.status === "attention" ? "text-orange-500" : "text-neutral-400")} strokeWidth={1.5} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-700">{project.name}</p>
                              <p className="text-[10px] text-neutral-400">{project.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-neutral-200/50 rounded-full overflow-hidden backdrop-blur-sm">
                              <div
                                className={clsx("h-full rounded-full", project.status === "attention" ? "bg-orange-400" : "bg-blue-500")}
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-neutral-500">{project.progress}%</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <EmptyPlaceholder text="No active projects" />
                    )}
                    <Link href="/dashboard/projects" className="block text-center text-[11px] font-semibold text-blue-500 py-2">
                      View All Projects →
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <DashboardOverview />
            </div>
          </div>
        </div>
      </PageWrapper>

      <ClockActionModal
        isOpen={isClockModalOpen}
        onClose={() => setIsClockModalOpen(false)}
        type={isCheckedIn ? "OUT" : "IN"}
        userRole={profile?.role || "staff"}
        onConfirm={toggleClock}
      />

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
              className="w-full max-w-lg backdrop-blur-2xl rounded-t-[40px] shadow-2xl overflow-hidden relative border-t border-white/50"
              style={{ background: 'linear-gradient(180deg, rgba(250,250,252,0.97) 0%, rgba(245,245,247,0.95) 100%)' }}
            >
              {/* Handle Bar */}
              <div className="w-full flex justify-center py-3">
                <div className="w-12 h-1.5 bg-neutral-300/60 rounded-full" />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-neutral-800 tracking-tight">My Favorite Apps</h3>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="p-2.5 rounded-full backdrop-blur-sm active:scale-95 transition-all border border-blue-200/40"
                  style={{ background: 'linear-gradient(180deg, rgba(219,234,254,0.8) 0%, rgba(191,219,254,0.5) 100%)' }}
                >
                  <MoreHorizontal className="w-5 h-5 text-blue-600" />
                </button>
              </div>

              <div className="px-6 pb-32 overflow-y-auto max-h-[75vh] space-y-10 scrollbar-hide">
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
                          <span className="text-[11px] font-medium text-neutral-500 text-center leading-tight">
                            {app.label}
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="col-span-4 py-8 px-4 text-center rounded-3xl backdrop-blur-sm border border-white/50"
                      style={{ background: 'linear-gradient(180deg, rgba(250,250,250,0.8) 0%, rgba(245,245,245,0.5) 100%)' }}>
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
                          <span className="text-[11px] font-medium text-neutral-500 text-center leading-tight">
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
