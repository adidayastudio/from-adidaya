"use client";

import { ArrowUpRight, ArrowDownRight, Users, Briefcase, FileText, Activity } from "lucide-react";
import clsx from "clsx";

interface StatProps {
    label: string;
    value: string;
    trend?: string;
    trendUp?: boolean;
    icon: React.ReactNode;
}

function StatCard({ label, value, trend, trendUp, icon }: StatProps) {
    return (
        <div className="bg-white p-3 rounded-lg border border-neutral-100 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-md bg-neutral-50 text-neutral-500 shrink-0">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500 truncate">{label}</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-neutral-900">{value}</h3>
                    {trend && (
                        <div className={clsx(
                            "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            trendUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        )}>
                            {trendUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                            {trend}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function StatsOverview() {
    return (
        <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
                label="Total Visits"
                value="120.5k"
                trend="+12%"
                trendUp={true}
                icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
                label="Active Careers"
                value="8"
                trend="+2"
                trendUp={true}
                icon={<Briefcase className="w-4 h-4" />}
            />
            <StatCard
                label="Published Projects"
                value="86"
                trend="+14"
                trendUp={true}
                icon={<FileText className="w-4 h-4" />}
            />
            <StatCard
                label="Insights Read"
                value="4.2k"
                trend="+8%"
                trendUp={true}
                icon={<Users className="w-4 h-4" />}
            />
        </div>
    );
}
