"use client";

import React from "react";
import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import StreamCard from "./StreamCard";
import type { FeedItem } from "@/lib/stream/types";
import { groupFeedByDate } from "@/lib/stream/stream-feed";
import { Zap, ArrowDown } from "lucide-react";

interface StreamFeedProps {
    items: FeedItem[];
    onItemTap?: (item: FeedItem) => void;
    isLoading?: boolean;
    module?: string;
    navMode?: string;
}

export default function StreamFeed({ items, onItemTap, isLoading, module, navMode }: StreamFeedProps) {
    if (isLoading) {
        return (
            <div className="space-y-4 px-1">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="animate-pulse rounded-[20px] bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl border border-white/50 dark:border-neutral-800/50 p-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-[14px] bg-neutral-200/50 dark:bg-neutral-700/50" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 rounded-lg bg-neutral-200/50 dark:bg-neutral-700/50" />
                                <div className="h-3 w-1/2 rounded-lg bg-neutral-200/30 dark:bg-neutral-700/30" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return <EmptyState module={module} navMode={navMode} />;
    }

    const sortedItems = [...items];
    if (navMode === "workspace_module") {
        sortedItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    const grouped = groupFeedByDate(sortedItems);

    return (
        <div className="space-y-6 px-1">
            <AnimatePresence mode="popLayout">
                {Array.from(grouped.entries()).map(([dateLabel, dateItems]) => (
                    <div key={dateLabel} className="space-y-2">
                        {/* Date Separator */}
                        <div className="flex items-center gap-3 px-2">
                            <div className="h-px flex-1 bg-neutral-200/50 dark:bg-neutral-700/40" />
                            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-tight">
                                {dateLabel}
                            </span>
                            <div className="h-px flex-1 bg-neutral-200/50 dark:bg-neutral-700/40" />
                        </div>

                        {/* Cards & Bubbles */}
                        <div className="space-y-2">
                            {dateItems.map((item) => {
                                const isPrompt = item.type === ("chat_prompt" as any);
                                const isResponse = item.type === ("chat_response" as any);

                                if (isPrompt || isResponse) {
                                    return (
                                        <IMessageBubble
                                            key={item.id}
                                            isPrompt={isPrompt}
                                            text={item.title}
                                            attachment={item.metadata?.attachment}
                                        />
                                    );
                                }

                                return (
                                    <StreamCard
                                        key={item.id}
                                        item={item}
                                        onTap={onItemTap}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ module, navMode }: { module?: string; navMode?: string }) {
    const isWorkspace = navMode === "workspace_module";

    // Set custom content based on module
    let title = "Welcome to Stream";
    let desc = "Your operational command center. Type anything below — projects, expenses, tasks, or progress updates.";
    let hints = [
        { emoji: "📋", example: '"bikin proyek baru Precision Gym Jakarta"' },
        { emoji: "💰", example: '"beli semen 50 sak 200rb"' },
        { emoji: "📊", example: '"progress lantai 2 udah 70%"' },
        { emoji: "✅", example: '"besok harus selesain gambar denah"' }
    ];

    if (isWorkspace) {
        if (module === "crew") {
            title = "Crew Operations";
            desc = "Manage your team on site. Log attendance, crew directory updates, project assignments, and payroll.";
            hints = [
                { emoji: "📋", example: '"Hasim ijin sakit hari ini"' },
                { emoji: "👤", example: '"tambah crew baru Abdul Helper"' },
                { emoji: "📍", example: '"assign Abdul ke proyek JPF"' },
                { emoji: "📑", example: '"approve request cuti Neli"' }
            ];
        } else if (module === "finance") {
            title = "Finance & Budgeting";
            desc = "Track cash flow, project budgets, petty cash requests, and vendor purchasing order approvals.";
            hints = [
                { emoji: "💰", example: '"beli semen 50 sak 200rb"' },
                { emoji: "🧾", example: '"nota petty cash Rawamangun 500rb"' },
                { emoji: "💵", example: '"kasbon Abdul 300rb"' },
                { emoji: "📊", example: '"tambah dana JPADEL 50jt"' }
            ];
        } else if (module === "resources") {
            title = "Resources & Inventory";
            desc = "Monitor materials, site tools, heavy machinery rentals, and warehouse supply logs.";
            hints = [
                { emoji: "🧱", example: '"semen masuk 100 sak"' },
                { emoji: "🔧", example: '"sewa genset 5kVA untuk 3 hari"' },
                { emoji: "📦", example: '"retur besi 10mm ke vendor"' },
                { emoji: "🚜", example: '"alat berat excavator standby"' }
            ];
        }
    }

    // Set custom icon styling based on module
    let iconBg = "bg-gradient-to-br from-red-500/10 to-amber-500/10 border-red-200/30 dark:border-red-800/20 shadow-[0_8px_32px_-8px_rgba(220,38,38,0.1)]";
    let iconColor = "text-red-500/70";

    if (isWorkspace) {
        if (module === "crew") {
            iconBg = "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-200/30 dark:border-purple-800/20 shadow-[0_8px_32px_-8px_rgba(168,85,247,0.1)]";
            iconColor = "text-purple-500/70";
        } else if (module === "finance") {
            iconBg = "bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-200/30 dark:border-red-800/20 shadow-[0_8px_32px_-8px_rgba(239,68,68,0.1)]";
            iconColor = "text-red-500/70";
        } else if (module === "resources") {
            iconBg = "bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-200/30 dark:border-amber-800/20 shadow-[0_8px_32px_-8px_rgba(245,158,11,0.1)]";
            iconColor = "text-amber-500/70";
        }
    }

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            {/* Icon */}
            <div className={clsx(
                "w-20 h-20 rounded-[28px] flex items-center justify-center mb-6",
                iconBg
            )}>
                <Zap className={clsx("w-9 h-9", iconColor)} strokeWidth={1.5} />
            </div>

            {/* Text */}
            <h3 className="text-[18px] font-bold text-neutral-800 dark:text-white tracking-tight mb-2">
                {title}
            </h3>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[280px] mb-6">
                {desc}
            </p>

            {/* Hint Cards */}
            <div className="space-y-2 w-full max-w-[320px]">
                {hints.map((h, i) => (
                    <HintCard
                        key={i}
                        emoji={h.emoji}
                        example={h.example}
                    />
                ))}
            </div>

            {/* Arrow hint */}
            <div className="mt-8 flex flex-col items-center gap-1 text-neutral-300 dark:text-neutral-600 animate-bounce">
                <ArrowDown className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                    Start typing below
                </span>
            </div>
        </div>
    );
}

function HintCard({ emoji, example }: { emoji: string; example: string }) {
    return (
        <div className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-2xl",
            "bg-white/40 dark:bg-neutral-800/40 backdrop-blur-xl",
            "border border-white/60 dark:border-neutral-700/30"
        )}>
            <span className="text-lg">{emoji}</span>
            <span className="text-[12px] text-neutral-500 dark:text-neutral-400 font-medium italic leading-snug">
                {example}
            </span>
        </div>
    );
}

function CrewAttachmentCard({ attachment }: { attachment: any }) {
    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    // 1. Anomalies View
    if (attachment.anomaliesList) {
        return (
            <div className="w-full max-w-[320px] p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-neutral-900 dark:text-neutral-100 backdrop-blur-xl shadow-xs transition-all self-start">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                    <span>⚠️</span>
                    <span>{attachment.anomaliesCount} Anomali Terdeteksi</span>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {attachment.anomaliesList.slice(0, 5).map((anom: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-white/50 dark:bg-neutral-800/50 border border-red-500/10 text-[11px]">
                            <div className="font-bold text-neutral-800 dark:text-neutral-200">
                                {anom.crewName} <span className="text-[9px] font-normal text-neutral-500">({anom.projectCode || "ALL"})</span>
                            </div>
                            <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-0.5">
                                {anom.type}
                            </div>
                            <div className="text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                                {anom.description}
                            </div>
                        </div>
                    ))}
                    {attachment.anomaliesList.length > 5 && (
                        <div className="text-[10px] text-neutral-400 text-center italic pt-1">
                            + {attachment.anomaliesList.length - 5} anomali lainnya...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Payroll Comparison View
    if (attachment.currentTotal !== undefined && attachment.previousTotal !== undefined) {
        const isUp = attachment.difference > 0;
        return (
            <div className="w-full max-w-[320px] p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-neutral-900 dark:text-neutral-100 backdrop-blur-xl shadow-xs transition-all self-start">
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider mb-2 text-blue-600 dark:text-blue-400">
                    <span>📈 Analisis Payroll</span>
                    <span className={clsx(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold",
                        isUp ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    )}>
                        {isUp ? "Naik" : "Turun"} {Math.abs(Math.round(attachment.percentageChange))}%
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3 bg-white/40 dark:bg-neutral-800/40 p-2 rounded-xl">
                    <div>
                        <div className="text-[9px] text-neutral-400">Periode Ini</div>
                        <div className="text-[12px] font-bold font-mono text-neutral-800 dark:text-neutral-100">
                            {formatRupiah(attachment.currentTotal)}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-neutral-400">Sebelumnya</div>
                        <div className="text-[12px] font-bold font-mono text-neutral-800 dark:text-neutral-100">
                            {formatRupiah(attachment.previousTotal)}
                        </div>
                    </div>
                </div>
                {attachment.drivers && attachment.drivers.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Faktor Kontribusi</div>
                        {attachment.drivers.map((drv: string, idx: number) => (
                            <div key={idx} className="text-[10px] text-neutral-600 dark:text-neutral-300 flex items-start gap-1">
                                <span className="text-blue-500">•</span>
                                <span className="leading-snug">{drv}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // 3. Payroll Rincian View
    if (attachment.payrollData || attachment.totals) {
        const t = attachment.totals || {};
        return (
            <div className="w-full max-w-[320px] p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-neutral-900 dark:text-neutral-100 backdrop-blur-xl shadow-xs transition-all self-start">
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider mb-2 text-emerald-600 dark:text-emerald-400">
                    <span>💰 Rincian Payroll</span>
                    <span className="text-neutral-400 font-mono text-[9px]">{attachment.projectCode || "ALL"}</span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between text-neutral-550">
                        <span>Gaji Pokok:</span>
                        <span>{formatRupiah(t.basePay)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-550">
                        <span>Lembur:</span>
                        <span>{formatRupiah(t.otPay)}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                        <span>Potongan Bon:</span>
                        <span>-{formatRupiah(t.kasbon)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                        <span>Reimbursement:</span>
                        <span>+{formatRupiah(t.reimburse)}</span>
                    </div>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1" />
                    <div className="flex justify-between text-[12px] font-extrabold text-neutral-850 dark:text-neutral-100">
                        <span>Take Home Pay:</span>
                        <span>{formatRupiah(t.takeHomePay)}</span>
                    </div>
                </div>
            </div>
        );
    }

    // 4. KPI health / dashboard
    if (attachment.activeCrew !== undefined && attachment.avgKPI !== undefined) {
        return (
            <div className="w-full max-w-[320px] p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-neutral-900 dark:text-neutral-100 backdrop-blur-xl shadow-xs transition-all self-start">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider mb-2 text-indigo-600 dark:text-indigo-400">
                    <span>📊 Crew Health Status</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-white/40 dark:bg-neutral-800/40 border border-indigo-500/5">
                        <div className="text-[9px] text-neutral-400">Personil Aktif</div>
                        <div className="text-lg font-extrabold text-neutral-850 dark:text-neutral-100">
                            {attachment.activeCrew}
                        </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/40 dark:bg-neutral-800/40 border border-indigo-500/5">
                        <div className="text-[9px] text-neutral-400">Rerata KPI</div>
                        <div className="text-lg font-extrabold text-neutral-850 dark:text-neutral-100">
                            {Math.round(attachment.avgKPI)}/100
                        </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/40 dark:bg-neutral-800/40 border border-indigo-500/5">
                        <div className="text-[9px] text-neutral-400">Kehadiran Hari Ini</div>
                        <div className="text-lg font-extrabold text-neutral-850 dark:text-neutral-100">
                            {attachment.todayAttendancePercent}%
                        </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/40 dark:bg-neutral-800/40 border border-indigo-500/5">
                        <div className="text-[9px] text-neutral-400">Monitor / Replace</div>
                        <div className="text-xs font-extrabold text-amber-500 dark:text-amber-400 mt-1">
                            {attachment.monitorCount} / {attachment.replaceCount}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 5. Completion Status (Daily Log Missing)
    if (attachment.completionStatus) {
        const missing = attachment.completionStatus.missingLogs || [];
        return (
            <div className="w-full max-w-[320px] p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-neutral-900 dark:text-neutral-100 backdrop-blur-xl shadow-xs transition-all self-start">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider mb-2 text-amber-600 dark:text-amber-400">
                    <span>📅 Daily Log Kelengkapan</span>
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                    Status kelengkapan: <span className="font-bold text-neutral-800 dark:text-white">{attachment.completionStatus.percentComplete}%</span> ({attachment.completionStatus.completedCount} terisi dari {attachment.completionStatus.totalExpected} seharusnya).
                </div>
                {missing.length > 0 && (
                    <div className="mt-2.5">
                        <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Daftar Belum Terisi:</div>
                        <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                            {missing.slice(0, 5).map((log: any, idx: number) => (
                                <div key={idx} className="p-1.5 rounded bg-white/50 dark:bg-neutral-800/50 border border-amber-500/10 text-[10px] flex justify-between">
                                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{log.projectSuffix || log.projectName}</span>
                                    <span className="font-mono text-neutral-400">{log.date}</span>
                                </div>
                            ))}
                            {missing.length > 5 && (
                                <div className="text-[9px] text-neutral-400 text-center italic pt-1">
                                    + {missing.length - 5} lainnya belum terisi...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 6. Crew Members List View (Directory or Assignments)
    if (attachment.members) {
        return (
            <div className="w-full max-w-[320px] p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 backdrop-blur-xl shadow-xs transition-all self-start">
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider mb-2 text-neutral-500">
                    <span>👥 Anggota Crew ({attachment.members.length})</span>
                    <span className="text-neutral-400 font-mono text-[9px]">{attachment.projectCode || "ALL"}</span>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {attachment.members.slice(0, 8).map((member: any, idx: number) => {
                        const name = typeof member === "string" ? member : member.name;
                        const role = typeof member === "string" ? null : member.role;
                        return (
                            <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-white/30 dark:bg-neutral-800/30 border border-neutral-200/20 dark:border-neutral-800/10 text-[11px]">
                                <span className="font-bold text-neutral-800 dark:text-neutral-200">{name}</span>
                                {role && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-neutral-200/50 dark:bg-neutral-700/50 text-neutral-500">
                                        {role}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {attachment.members.length > 8 && (
                        <div className="text-[10px] text-neutral-400 text-center italic pt-1">
                            + {attachment.members.length - 8} orang lainnya...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // No special card needed — the AI text bubble is sufficient
    return null;
}

function IMessageBubble({ isPrompt, text, attachment }: { isPrompt: boolean; text: string; attachment?: any }) {
    return (
        <div className={clsx("flex w-full mb-3 px-2", isPrompt ? "justify-end" : "justify-start")}>
            <div className="max-w-[85%] flex flex-col gap-1.5">
                {/* Bubble */}
                <div
                    className={clsx(
                        "px-4 py-2 text-[14px] leading-relaxed shadow-2xs",
                        isPrompt
                            ? "bg-[#0A84FF] text-white rounded-[20px] rounded-br-[4px] self-end font-normal"
                            : "bg-[#E9E9EB] dark:bg-[#262629] text-neutral-900 dark:text-neutral-100 rounded-[20px] rounded-bl-[4px] self-start"
                    )}
                >
                    {text}
                </div>

                {/* Attachment Card */}
                {attachment && (
                    attachment._module === "crew" ? (
                        <div className={clsx("w-full transition-all", isPrompt ? "self-end" : "self-start")}>
                            <CrewAttachmentCard attachment={attachment} />
                        </div>
                    ) : (
                        <div className={clsx(
                            "w-full max-w-[280px] p-3 rounded-2xl border backdrop-blur-xl shadow-xs transition-all",
                            attachment.type === "finance"
                                ? "bg-amber-500/10 border-amber-500/20 text-neutral-900 dark:text-white"
                                : "bg-emerald-500/10 border-emerald-500/20 text-neutral-900 dark:text-white",
                            isPrompt ? "self-end" : "self-start"
                        )}>
                            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider mb-1">
                                <span>
                                    {attachment.type === "finance" ? "💰 Expense Log" : "✅ Action Success"}
                                </span>
                                <span className={clsx(
                                    "px-1.5 py-0.5 rounded text-[8px] font-bold",
                                    attachment.type === "finance" ? "bg-amber-500/20 text-amber-600" : "bg-emerald-500/20 text-emerald-600"
                                )}>
                                    {attachment.status}
                                </span>
                            </div>
                            <h4 className="text-[12px] font-bold leading-tight">{attachment.title}</h4>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{attachment.subtitle}</p>
                            {attachment.amount && (
                                <p className="text-[11px] font-mono font-bold mt-1 text-right">{attachment.amount}</p>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
