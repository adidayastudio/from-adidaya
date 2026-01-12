"use client";

import { PageHeader } from "@/shared/ui/headers/PageHeader";
import Link from "next/link";
import { FolderKanban, AlertCircle, TrendingUp, Flag } from "lucide-react";

export default function OverviewPage() {
    return (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-neutral-900">Overview</h1>
                <p className="text-sm text-neutral-500">Your personal project summary.</p>
            </div>

            <div className="border-b border-neutral-200" />

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Active */}
                <Link href="/dashboard/projects/active" className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between h-32 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer group">
                    <div className="text-neutral-400 group-hover:text-neutral-600 transition-colors"><FolderKanban className="w-5 h-5" /></div>
                    <div>
                        <div className="text-3xl font-bold text-neutral-900 tracking-tight">12</div>
                        <div className="text-xs font-medium text-neutral-500 mt-1">Active Projects</div>
                    </div>
                </Link>
                {/* Critical */}
                <Link href="/dashboard/projects/attention" className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between h-32 hover:border-red-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className="text-red-500 group-hover:text-red-600 transition-colors"><AlertCircle className="w-5 h-5" /></div>
                    <div>
                        <div className="text-3xl font-bold text-neutral-900 tracking-tight">3</div>
                        <div className="text-xs font-medium text-red-600 mt-1">Need Attention</div>
                    </div>
                </Link>
                {/* Progress */}
                <Link href="/dashboard/projects/active" className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between h-32 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className="text-blue-500 group-hover:text-blue-600 transition-colors"><TrendingUp className="w-5 h-5" /></div>
                    <div>
                        <div className="text-3xl font-bold text-neutral-900 tracking-tight">68%</div>
                        <div className="text-xs font-medium text-neutral-500 mt-1">Average Progress</div>
                    </div>
                </Link>
                {/* Milestone */}
                <Link href="/dashboard/projects/updates" className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between h-32 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className="text-purple-500 group-hover:text-purple-600 transition-colors"><Flag className="w-5 h-5" /></div>
                    <div>
                        <div className="text-3xl font-bold text-neutral-900 tracking-tight">2d</div>
                        <div className="text-xs font-medium text-neutral-500 mt-1">Next Milestone</div>
                    </div>
                </Link>
            </div>

            {/* Milestone Detail */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">Nearest Upcoming Milestone</h3>
                <Link href="/dashboard/projects/updates" className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100 hover:bg-purple-50 hover:border-purple-200 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-purple-600 font-bold text-sm shadow-sm border border-purple-100 group-hover:border-purple-200 group-hover:shadow-md transition-all">
                        JPF
                    </div>
                    <div>
                        <div className="font-semibold text-neutral-900">Concept Design Approval</div>
                        <div className="text-xs text-neutral-500 mt-0.5">JPF House • <span className="text-purple-600 font-medium">Due in 2 days</span></div>
                    </div>
                </Link>
            </div>
        </div>
    )
}
