"use client";

import { useState } from "react";
import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import DashboardSidebar, { DashboardView } from "@/components/dashboard/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/views/DashboardOverview";
import { DashboardToday } from "@/components/dashboard/views/DashboardToday";
import { DashboardWeek } from "@/components/dashboard/views/DashboardWeek";
import { DashboardOverdue } from "@/components/dashboard/views/DashboardOverdue";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Clock, FolderKanban, Users, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const [view, setView] = useState<DashboardView>("overview");
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
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
      <div className="h-full overflow-y-auto pr-2 scrollbar-hide">
        <div className="w-full pb-20">
          <header>
            <h1 className="text-2xl font-bold text-neutral-900 capitalize">
              {view === "overview" ? "Dashboard Overview" :
                view === "today" ? "Today's Focus" :
                  view === "week" ? "This Week" : "Overdue Tasks"}
            </h1>
            <p className="text-sm text-neutral-500">
              Welcome back to Adidaya Operational System
            </p>
          </header>

          <div className="h-px bg-neutral-200 my-6" />

          {/* QUICK ACCESS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

            {/* CLOCK CARD */}
            <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col items-start gap-4 group">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Attendance</h3>
                <p className="text-sm text-neutral-500 mt-1">Manage daily timesheets and clock in/out status.</p>
              </div>
              <Link href="/feel/clock" className="mt-2 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:gap-3 transition-all">
                Open Clock <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* PROJECTS CARD */}
            <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-red-200 transition-all flex flex-col items-start gap-4 group">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-100 transition-colors">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Projects</h3>
                <p className="text-sm text-neutral-500 mt-1">Track active projects, milestones, and estimations.</p>
              </div>
              <Link href="/flow/projects/list" className="mt-2 flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 hover:gap-3 transition-all">
                View Projects <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* CREW CARD */}
            <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col items-start gap-4 group">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl group-hover:bg-indigo-100 transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Crew</h3>
                <p className="text-sm text-neutral-500 mt-1">Manage site crew and field workers.</p>
              </div>
              <Link href="/feel/crew" className="mt-2 flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-800 hover:gap-3 transition-all">
                Manage Crew <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

          {view === "overview" && <DashboardOverview />}
          {view === "today" && <DashboardToday />}
          {view === "week" && <DashboardWeek />}
          {view === "overdue" && <DashboardOverdue />}
        </div>
      </div>
    </PageWrapper>
  );
}
