"use client";

import { Person } from "./types";
import { User, Shield, Briefcase, Calendar, Clock, Star, MoreVertical } from "lucide-react";
import clsx from "clsx";

interface GlobalDirectoryCardProps {
    person: Person;
}

export default function GlobalDirectoryCard({ person }: GlobalDirectoryCardProps) {
    const isSystem = person.account_type === "system_account";

    return (
        <div className={clsx(
            "group relative p-4 rounded-2xl border transition-all duration-300",
            "bg-white/60 hover:bg-white/80 backdrop-blur-md shadow-sm hover:shadow-md",
            "flex flex-col gap-4",
            isSystem ? "border-neutral-200 bg-neutral-50/50" :
                (person.include_in_performance === false ? "bg-orange-50/30 border-orange-100/40 text-orange-900/80" : "border-white/40 bg-white/60 hover:bg-white/80")
        )}>
            {/* Header: Identity */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ring-2 ring-white",
                        isSystem ? "bg-neutral-200 text-neutral-500" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                    )}>
                        {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            person.initials
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-neutral-900 leading-tight">{person.name}</h3>
                            {isSystem && (
                                <Shield className="w-3 h-3 text-neutral-400" />
                            )}
                        </div>
                        <p className="text-xs text-neutral-500 font-medium font-mono mt-0.5">{person.id_code || person.display_id || person.id_number || person.system_id}</p>
                    </div>
                </div>

                {person.status && (
                    <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        person.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            person.status === "Probation" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                person.status === "On Leave" ? "bg-orange-50 text-orange-700 border-orange-100" :
                                    "bg-neutral-50 text-neutral-500 border-neutral-100"
                    )}>
                        {person.status}
                    </span>
                )}
            </div>

            {/* Content: Context */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="truncate">{person.title}</span>
                </div>
                {!isSystem && (
                    <div className="flex items-center gap-2 text-xs text-neutral-600">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="truncate">{person.department} • {person.level}</span>
                    </div>
                )}
            </div>

            {/* Footer: Metrics (Human Only) */}
            {!isSystem && (
                <div className="pt-3 mt-auto border-t border-neutral-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5" title="Performance Score">
                            <Star className={clsx("w-3.5 h-3.5", person.attendance.attendanceRate < 90 ? "text-amber-400" : "text-emerald-400")} fill="currentColor" />
                            <span className="font-semibold text-neutral-700">{person.performance.performanceScore || "-"}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Attendance">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-medium text-neutral-600">{person.attendance.attendanceRate}%</span>
                        </div>
                    </div>
                    {/* Excluded Badges */}
                    <div className="flex gap-1">
                        {person.include_in_performance === false && (
                            <div className="w-2 h-2 rounded-full bg-neutral-300" title="Excluded from Performance" />
                        )}
                    </div>
                </div>
            )}

            {/* System Badge */}
            {isSystem && (
                <div className="pt-3 mt-auto border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-neutral-400 italic">System Account</span>
                </div>
            )}

            {/* Action Menu (Hidden but clickable area) */}
            <button className="absolute top-3 right-3 p-1 rounded-lg text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 opacity-0 group-hover:opacity-100 transition-all">
                <MoreVertical className="w-4 h-4" />
            </button>
        </div>
    );
}
