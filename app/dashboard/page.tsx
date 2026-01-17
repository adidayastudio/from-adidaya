"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import DashboardSidebar, { DashboardView } from "@/components/dashboard/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/views/DashboardOverview";
import { DashboardToday } from "@/components/dashboard/views/DashboardToday";
import { DashboardWeek } from "@/components/dashboard/views/DashboardWeek";
import { DashboardOverdue } from "@/components/dashboard/views/DashboardOverdue";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import useUserProfile from "@/hooks/useUserProfile";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import {
  LogOut,
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
  Layers,
  Zap,
  Smile,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  CloudSun
} from "lucide-react";

export default function DashboardPage() {
  const [view, setView] = useState<DashboardView>("overview");
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUserProfile();
  const [currentTime, setCurrentTime] = useState(new Date());

  // UPDATE CURRENT TIME
  useEffect(() => {
    // Set initial time to avoid hydration mismatch if possible, or just accept client-side update
    // But to be safe with hydration, we might want to only show time after mount
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    if (hours >= 15 && hours < 18) return "late-afternoon";
    if (hours >= 18 && hours < 21) return "evening";
    return "night"; // 21 - 5
  };

  const phases = {
    morning: { greeting: "Good Morning", color: "text-amber-600", bg: "bg-gradient-to-br from-amber-50/80 to-white/60", border: "border-amber-100/50", icon: Sunrise },
    afternoon: { greeting: "Good Afternoon", color: "text-blue-600", bg: "bg-gradient-to-br from-blue-50/80 to-white/60", border: "border-blue-100/50", icon: Sun },
    "late-afternoon": { greeting: "Good Afternoon", color: "text-orange-600", bg: "bg-gradient-to-br from-orange-50/80 to-white/60", border: "border-orange-100/50", icon: Sunset },
    evening: { greeting: "Good Evening", color: "text-purple-600", bg: "bg-gradient-to-br from-purple-50/80 to-white/60", border: "border-purple-100/50", icon: CloudSun },
    night: { greeting: "Good Night", color: "text-indigo-900", bg: "bg-gradient-to-br from-indigo-50/80 to-white/60", border: "border-indigo-100/50", icon: Moon },
  };

  const currentPhaseKey = getPhase(currentTime);
  const phase = phases[currentPhaseKey];
  const PhaseIcon = phase.icon;

  const APPS = [
    // FRAME (Orange)
    { label: "Website", href: "/frame/website", icon: Globe, color: "text-orange-500", bg: "hover:bg-orange-50", ring: "hover:ring-orange-100" },
    { label: "Social", href: "/frame/social", icon: Share2, color: "text-orange-500", bg: "hover:bg-orange-50", ring: "hover:ring-orange-100" },
    { label: "Learn", href: "/frame/learn", icon: GraduationCap, color: "text-orange-500", bg: "hover:bg-orange-50", ring: "hover:ring-orange-100" },
    // FLOW (Red)
    { label: "Projects", href: "/flow/projects", icon: FolderKanban, color: "text-red-500", bg: "hover:bg-red-50", ring: "hover:ring-red-100" },
    { label: "Finance", href: "/flow/finance", icon: Banknote, color: "text-red-500", bg: "hover:bg-red-50", ring: "hover:ring-red-100" },
    { label: "Resources", href: "/flow/resources", icon: Package, color: "text-red-500", bg: "hover:bg-red-50", ring: "hover:ring-red-100" },
    { label: "Client", href: "/flow/client", icon: User, color: "text-red-500", bg: "hover:bg-red-50", ring: "hover:ring-red-100" },
    // FEEL (Blue)
    { label: "People", href: "/feel/people", icon: Users, color: "text-blue-500", bg: "hover:bg-blue-50", ring: "hover:ring-blue-100" },
    { label: "Clock", href: "/feel/clock", icon: Clock, color: "text-blue-500", bg: "hover:bg-blue-50", ring: "hover:ring-blue-100" },
    { label: "Career", href: "/feel/career", icon: Briefcase, color: "text-blue-500", bg: "hover:bg-blue-50", ring: "hover:ring-blue-100" },
    { label: "Crew", href: "/feel/crew", icon: HardHat, color: "text-blue-500", bg: "hover:bg-blue-50", ring: "hover:ring-blue-100" },
    { label: "Culture", href: "/feel/culture", icon: Sparkles, color: "text-blue-500", bg: "hover:bg-blue-50", ring: "hover:ring-blue-100" },
    { label: "Calendar", href: "/feel/calendar", icon: Calendar, color: "text-blue-500", bg: "hover:bg-blue-50", ring: "hover:ring-blue-100" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6 relative">
      <Breadcrumb
        items={[
          { label: "Dashboard" },
        ]}
      />

      <PageWrapper sidebar={
        <>
          <DashboardSidebar activeView={view} onChangeView={setView} />
          {/* Added Logout Button to bottom of sidebar area for MVP convenience */}
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors px-3 py-2 w-full hover:bg-red-50 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </>
      }>
        <div className="h-full overflow-y-auto scrollbar-hide">
          <div className="w-full pb-20">

            {/* DYNAMIC WELCOME BANNER (Soft Minimalist Glass) */}
            <div className={clsx(
              "rounded-2xl p-5 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-700 mb-10 backdrop-blur-xl shadow-sm border",
              phase.bg,
              phase.border
            )}>
              <div className="flex items-center gap-5">
                <div className={clsx("w-16 h-16 rounded-xl flex items-center justify-center bg-white shadow-sm border border-neutral-100/50", phase.color)}>
                  <PhaseIcon className="w-8 h-8 opacity-90" strokeWidth={1.5} />
                </div>
                <div className="space-y-0.5">
                  <h2 className={clsx("text-xl font-bold tracking-tight transition-colors duration-500", phase.color)}>
                    {phase.greeting}, {profile?.name || "Team"}
                  </h2>
                  <div className="flex items-center gap-2 text-neutral-500 font-medium text-sm">
                    Have a productive day ahead
                  </div>
                </div>
              </div>
              <div className="text-left md:text-right flex flex-col items-start md:items-end">
                <div className={clsx("text-3xl font-bold tabular-nums tracking-tight transition-colors duration-500", phase.color)}>
                  {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
                  {currentTime.toLocaleDateString("en-US", { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
            </div>

            {/* APP GRID (Unified Minimalist Grid) */}
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 md:gap-x-6 gap-y-10 mb-12">
              {APPS.map((app) => {
                const hoverGradient = app.color.includes("orange")
                  ? "hover:bg-[linear-gradient(145deg,rgba(255,237,213,0.4),rgba(255,255,255,0.1))]" // Orange
                  : app.color.includes("red")
                    ? "hover:bg-[linear-gradient(145deg,rgba(254,202,202,0.4),rgba(255,255,255,0.1))]" // Red
                    : "hover:bg-[linear-gradient(145deg,rgba(191,219,254,0.4),rgba(255,255,255,0.1))]"; // Blue

                return (
                  <Link
                    href={app.href}
                    key={app.label}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div
                      className={clsx(
                        "flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 relative",
                        "bg-[linear-gradient(145deg,rgba(255,255,255,0.25),rgba(255,255,255,0.05))]", // Default Glass
                        hoverGradient
                      )}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.35)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    >
                      <app.icon className={`w-8 h-8 opacity-90 group-hover:opacity-100 transition-opacity ${app.color} drop-shadow-sm`} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors text-center w-full truncate px-1 tracking-tight shadow-black/5 drop-shadow-sm">
                      {app.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="h-px bg-neutral-100 my-8" />

            {view === "overview" && <DashboardOverview />}
            {view === "today" && <DashboardToday />}
            {view === "week" && <DashboardWeek />}
            {view === "overdue" && <DashboardOverdue />}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
