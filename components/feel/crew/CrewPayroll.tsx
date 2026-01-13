"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, ArrowUpDown, Plus, Minus, Edit2, FileDown, Users } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { CREW_ROLE_LABELS, CrewRole, fetchCrewMembers, fetchDailyLogs, DailyLog, CrewMember, fetchRequests } from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { isHolidayOrSunday } from "@/lib/holidays";

interface CrewPayrollProps {
    role?: string;
}

interface PayrollEntry {
    id: string;
    crewName: string;
    initials: string;
    crewRole: CrewRole;
    days: number;
    basePay: number;
    otPay: number;
    kasbon: number;
    reimburse: number;
    total: number;
}

// Removed local getInitials

// Helper to format project code (get 3 letters after dash)
const formatProjectCode = (code?: string) => {
    if (!code) return "-";
    const parts = code.split("-");
    const suffix = parts.length > 1 ? parts[1] : code;
    return suffix.toUpperCase(); // Ensure uppercase for consistent matching
};



type ViewMode = "weekly" | "monthly";

export function CrewPayroll({ role }: CrewPayrollProps) {
    // Data state
    const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [selectedProject, setSelectedProject] = useState("");
    const [periodStart, setPeriodStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day; // Adjust to Sunday
        return new Date(d.setDate(diff));
    });
    const [viewMode, setViewMode] = useState<ViewMode>("weekly");
    const [sortBy, setSortBy] = useState<"name" | "total">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const formatDateShort = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const getPeriodEnd = (s: Date) => { const e = new Date(s); e.setDate(e.getDate() + (viewMode === "weekly" ? 6 : 29)); return e; };

    // Load Projects
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const data = await fetchProjectsByWorkspace(wsId);
                    setProjects(data.map((p: any) => ({
                        code: `${p.project_number}-${p.project_code}`,
                        name: p.project_name
                    })));
                }
            } catch (e) { console.error(e); }
        };
        loadProjects();
    }, []);

    // Calculate Payroll
    useEffect(() => {
        const calculatePayroll = async () => {
            setLoading(true);
            try {
                const wsId = await fetchDefaultWorkspaceId();
                if (!wsId) return;

                // 1. Fetch Crew
                const members = await fetchCrewMembers(wsId);

                // Filter by project if selected
                // Use formatProjectCode to normalize input "009-LAX" to "LAX"
                // And match against crew current project suffix
                const projectSuffix = selectedProject ? formatProjectCode(selectedProject) : undefined;
                const relevantCrew = projectSuffix
                    ? members.filter(m => m.currentProjectCode && (
                        formatProjectCode(m.currentProjectCode) === projectSuffix ||
                        m.currentProjectCode.includes(projectSuffix!)
                    ))
                    : members;

                if (relevantCrew.length === 0) {
                    setPayrollData([]);
                    setLoading(false);
                    return;
                }

                // 2. Fetch Logs for Period
                const endDate = getPeriodEnd(periodStart);
                // Need to fetch logs for EACH day in period? Or a range query?
                // Currently API only supports specific date. 
                // We'll fetch all logs for workspace (not efficient but okay for prototype) 
                // or parallel fetch for each day in range.
                // Let's do parallel fetch for range.
                const dates: string[] = [];
                let d = new Date(periodStart);
                while (d <= endDate) {
                    dates.push(d.toISOString().split("T")[0]);
                    d.setDate(d.getDate() + 1);
                }

                // Fetch logs for all days (and specific project if selected)
                const logsPromises = dates.map(date => fetchDailyLogs(wsId, projectSuffix, date));
                const logsArrs = await Promise.all(logsPromises);
                const allLogs = logsArrs.flat();

                // 3. Aggregate
                const payrollMap = new Map<string, PayrollEntry>();

                relevantCrew.forEach(crew => {
                    payrollMap.set(crew.id, {
                        id: crew.id,
                        crewName: crew.name,
                        initials: crew.initials,
                        crewRole: crew.role,
                        days: 0,
                        basePay: 0,
                        otPay: 0,
                        kasbon: 0, // Not implemented
                        reimburse: 0, // Not implemented
                        total: 0
                    });
                });

                // Deduplicate logs: If API returns duplicates (e.g. slight projectCode variant or past bugs), ensure unique key (crewId+date)
                // Actually, the unique constraint should handle it, but user report says otherwise.
                // It's possible "P01" and "P001" are treated as different by DB constraint but same by business logic.
                // Or "P01" and "p01".
                // Let's filter correct unique logs per day per crew.
                const uniqueLogsMap = new Map<string, DailyLog>();
                allLogs.forEach(log => {
                    const key = `${log.crewId}_${log.date}`;
                    // If duplicate, maybe take the latest updated_at? Or just first.
                    // Let's trust the latest one if we had timestamps, but here just overwrite.
                    uniqueLogsMap.set(key, log);
                });

                // Aggregate from Unique Logs
                Array.from(uniqueLogsMap.values()).forEach(log => {
                    const entry = payrollMap.get(log.crewId);
                    if (!entry) return; // Should be in relevantCrew

                    const crew = relevantCrew.find(c => c.id === log.crewId);
                    if (!crew) return;

                    // Days count
                    if (log.status === "PRESENT") entry.days += 1;
                    else if (log.status === "HALF_DAY") entry.days += 0.5;

                    // Base Pay Calculation
                    // (RegHours / 8) * DailyRate ? Or Attendance based?
                    // Let's us Hours based for precision.
                    // Assumes DailyRate is for 8 hours.

                    // CHECK IF HOLIDAY OR SUNDAY
                    const isHoliday = isHolidayOrSunday(log.date);

                    // If Holiday/Sunday, use Overtime Daily Rate as base
                    const dailyRate = isHoliday ? crew.overtimeDailyRate : crew.baseDailyRate;
                    const hourlyRate = dailyRate / 8;

                    entry.basePay += log.regularHours * hourlyRate;

                    // OT Pay
                    entry.otPay += (log.ot1Hours * crew.otRate1) + (log.ot2Hours * crew.otRate2) + (log.ot3Hours * crew.otRate3);
                });

                // 4. Load Requests (Kasbon & Reimburse)
                try {
                    const requests = await fetchRequests(wsId);
                    // Filter approved requests within period
                    const approvedReqs = requests.filter(r =>
                        r.status === "APPROVED" &&
                        (r.type === "KASBON" || r.type === "REIMBURSE") &&
                        new Date(r.createdAt) >= periodStart &&
                        new Date(r.createdAt) <= endDate
                    );

                    approvedReqs.forEach(req => {
                        const entry = payrollMap.get(req.crewId);
                        if (!entry) return;

                        if (req.type === "KASBON") {
                            entry.kasbon += (req.amount || 0);
                        } else if (req.type === "REIMBURSE") {
                            entry.reimburse += (req.amount || 0);
                        }
                    });
                } catch (err) {
                    console.error("Error loading requests for payroll:", err);
                }

                // Finalize Totals
                const results = Array.from(payrollMap.values()).map(e => ({
                    ...e,
                    total: e.basePay + e.otPay - e.kasbon + e.reimburse
                }));

                setPayrollData(results); // Show all crew, even if no data
            } catch (e) {
                console.error("Payroll Calc Error:", e);
            } finally {
                setLoading(false);
            }
        };

        calculatePayroll();
    }, [selectedProject, periodStart, viewMode]);
    const handlePeriodChange = (d: "prev" | "next") => { const n = new Date(periodStart); n.setDate(n.getDate() + (d === "next" ? (viewMode === "weekly" ? 7 : 30) : -(viewMode === "weekly" ? 7 : 30))); setPeriodStart(n); };
    const formatNumFull = (n: number) => n.toLocaleString("id-ID");

    const CurrencyValue = ({ value, className }: { value: number, className?: string }) => (
        <span className={clsx("inline-flex items-start", className)}>
            <span className="text-[0.6em] font-bold opacity-70 mr-0.5 leading-none mt-[2px]">Rp</span>
            <span>{value.toLocaleString("id-ID")}</span>
        </span>
    );

    const handleSort = (column: "name" | "total") => {
        if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(column); setSortOrder(column === "total" ? "desc" : "asc"); }
    };

    const sortedPayroll = useMemo(() => [...payrollData].sort((a, b) => {
        const cmp = sortBy === "name" ? a.crewName.localeCompare(b.crewName) : a.total - b.total;
        return sortOrder === "asc" ? cmp : -cmp;
    }), [payrollData, sortBy, sortOrder]);

    const totals = useMemo(() => ({
        base: payrollData.reduce((s, p) => s + p.basePay, 0),
        ot: payrollData.reduce((s, p) => s + p.otPay, 0),
        kasbon: payrollData.reduce((s, p) => s + p.kasbon, 0),
        reimburse: payrollData.reduce((s, p) => s + p.reimburse, 0),
        total: payrollData.reduce((s, p) => s + p.total, 0),
    }), [payrollData]);

    const handleExport = async () => {
        if (payrollData.length === 0) return;
        setExporting(true);
        const toastId = "export-pdf"; // You might need a toaster library, using console for now or alert

        try {
            // 1. Prepare Meta
            const project = projects.find(p => p.code === selectedProject);
            const projectCode = project
                ? project.code.includes("-")
                    ? project.code.replace("-", " · ").toUpperCase()
                    : project.code.toUpperCase()
                : "ALL";
            const projectName = project ? project.name : (selectedProject ? "Selected Project" : "All Projects");

            const startStr = formatDateShort(periodStart);
            const endStr = formatDateShort(getPeriodEnd(periodStart));
            const periodText = viewMode === "weekly"
                ? `Weekly Report (${startStr} – ${endStr})`
                : `Monthly Report (${startStr} – ${endStr})`;

            // 2. Prepare Summary
            const summaryCards = [
                { label: "Base Pay", value: totals.base, format: "currency" as const },
                { label: "Overtime", value: totals.ot, format: "currency" as const, color: "blue" as const },
                { label: "Kasbon", value: totals.kasbon, format: "currency" as const, color: "red" as const },
                { label: "Reimburse", value: totals.reimburse, format: "currency" as const, color: "blue" as const },
                { label: "Total Payout", value: totals.total, format: "currency" as const, color: "green" as const },
            ];

            // 3. Prepare Columns
            const columns = [
                { id: "crewName", label: "Name", align: "left" as const },
                { id: "crewRole", label: "Role", align: "left" as const },
                { id: "days", label: "Days", align: "right" as const, width: "60px" },
                { id: "basePay", label: "Base", align: "right" as const, format: "currency" as const },
                { id: "otPay", label: "OT", align: "right" as const, format: "currency" as const },
                { id: "adj", label: "Adj", align: "right" as const, format: "currency" as const },
                { id: "total", label: "Total", align: "right" as const, format: "currency" as const },
            ];

            // 4. Prepare Data
            const rows = sortedPayroll.map(p => ({
                crewName: p.crewName,
                crewRole: CREW_ROLE_LABELS[p.crewRole]?.id || p.crewRole,
                days: p.days,
                basePay: p.basePay,
                otPay: p.otPay,
                adj: p.reimburse - p.kasbon,
                total: p.total
            }));

            // 5. Call API
            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode,
                        projectName,
                        documentName: "Crew Payroll Report",
                        periodText,
                        generatedAt: new Date().toLocaleString("id-ID"),
                    },
                    summary: summaryCards,
                    columns,
                    data: rows
                })
            });

            if (!response.ok) throw new Error("Export failed");

            // 6. Download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Payroll_${projectCode}_${periodStart.toISOString().split("T")[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (e) {
            console.error(e);
            alert("Failed to export PDF");
        } finally {
            setExporting(false);
        }
    };

    const SortIcon = ({ column }: { column: "name" | "total" }) => {
        if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-neutral-400" />;
        return sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Payroll</h1>
                        <p className="text-sm text-neutral-500 mt-1">Calculated from daily logs.</p>
                    </div>
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* TOOLBAR */}
            <div className="flex items-center justify-between gap-4 w-full flex-wrap bg-neutral-50/50 p-2 rounded-2xl border border-neutral-100">
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {projects.length > 0 && (
                        <div className="relative flex-shrink-0">
                            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="appearance-none pl-3 pr-7 py-2 text-sm border border-neutral-200 rounded-full bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all">
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p.code} value={p.code}>[{formatProjectCode(p.code)}] {p.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                        </div>
                    )}
                    <div className="flex items-center gap-0.5 bg-white border border-neutral-200 rounded-full px-1 py-1 shadow-sm flex-shrink-0">
                        <button onClick={() => handlePeriodChange("prev")} className="p-1.5 rounded-full hover:bg-neutral-50 text-neutral-500"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-sm font-medium text-neutral-700 text-center select-none px-1 min-w-[80px] sm:min-w-[100px]">{formatDateShort(periodStart)} - {formatDateShort(getPeriodEnd(periodStart))}</span>
                        <button onClick={() => handlePeriodChange("next")} className="p-1.5 rounded-full hover:bg-neutral-50 text-neutral-500"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center bg-neutral-200/50 rounded-full p-1">
                        <button onClick={() => setViewMode("weekly")} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full transition-colors", viewMode === "weekly" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}>Weekly</button>
                        <button onClick={() => setViewMode("monthly")} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full transition-colors", viewMode === "monthly" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}>Monthly</button>
                    </div>
                </div>

                <Button
                    variant="secondary"
                    className="!rounded-full !py-1.5 !px-4 shadow-sm active:scale-95 transition-all"
                    icon={<Download className="w-4 h-4" />}
                    onClick={handleExport}
                    disabled={loading || exporting || payrollData.length === 0}
                >
                    {exporting ? "Exporting..." : "Export PDF"}
                </Button>
            </div>

            {/* CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="text-xs text-neutral-500 mb-1">Base</div>
                    <div className="text-base font-bold text-neutral-900"><CurrencyValue value={totals.base} /></div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="text-xs text-neutral-500 mb-1">OT</div>
                    <div className="text-base font-bold text-blue-600"><CurrencyValue value={totals.ot} /></div>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 shadow-sm">
                    <div className="flex items-center gap-1 text-xs text-red-600 mb-1"><Minus className="w-3 h-3" /> Kasbon</div>
                    <div className="text-base font-bold text-red-600"><CurrencyValue value={totals.kasbon} /></div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-1 text-xs text-blue-600 mb-1"><Plus className="w-3 h-3" /> Reimburse</div>
                    <div className="text-base font-bold text-blue-600"><CurrencyValue value={totals.reimburse} /></div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 shadow-sm col-span-2 sm:col-span-1">
                    <div className="text-xs text-emerald-600 mb-1">Total</div>
                    <div className="text-base font-bold text-emerald-700"><CurrencyValue value={totals.total} /></div>
                </div>
            </div>

            {/* EMPTY STATE */}
            {payrollData.length === 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <h3 className="font-medium text-neutral-600 mb-2">No payroll data</h3>
                    <p className="text-sm text-neutral-400">Fill daily logs first to calculate payroll.</p>
                </div>
            )}

            {/* TABLE */}
            {sortedPayroll.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("name")}><div className="flex items-center gap-1">Name <SortIcon column="name" /></div></th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell">Days</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Base</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell">OT</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden lg:table-cell">Adj</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("total")}><div className="flex items-center justify-end gap-1">Total <SortIcon column="total" /></div></th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {sortedPayroll.map((e) => {
                                    const adj = e.reimburse - e.kasbon;
                                    return (
                                        <tr key={e.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-semibold flex-shrink-0">{e.initials}</div><div><span className="font-medium text-neutral-900">{e.crewName}</span><div className="text-xs text-neutral-500">{CREW_ROLE_LABELS[e.crewRole]?.id || e.crewRole}</div></div></div></td>
                                            <td className="px-4 py-3 text-right text-neutral-600 hidden md:table-cell">{e.days}</td>
                                            <td className="px-4 py-3 text-right text-neutral-700">{formatNumFull(e.basePay)}</td>
                                            <td className="px-4 py-3 text-right text-blue-600 hidden md:table-cell">{formatNumFull(e.otPay)}</td>
                                            <td className="px-4 py-3 text-right hidden lg:table-cell"><span className={adj >= 0 ? "text-emerald-600" : "text-red-600"}>{adj >= 0 ? "+" : ""}{formatNumFull(adj)}</span></td>
                                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatNumFull(e.total)}</td>
                                            <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600" title="Edit/Revise"><Edit2 className="w-3.5 h-3.5" /></button><button className="p-1.5 rounded-full hover:bg-blue-50 text-blue-500 hover:text-blue-600" title="Export Slip"><FileDown className="w-3.5 h-3.5" /></button></div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-neutral-50 border-t-2 border-neutral-200">
                                <tr>
                                    <td className="px-4 py-3 text-sm font-semibold text-neutral-700">Total</td>
                                    <td className="px-4 py-3 hidden md:table-cell"></td>
                                    <td className="px-4 py-3 text-right font-semibold text-neutral-700">{formatNumFull(totals.base)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-blue-600 hidden md:table-cell">{formatNumFull(totals.ot)}</td>
                                    <td className="px-4 py-3 text-right hidden lg:table-cell"><span className={totals.reimburse - totals.kasbon >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{totals.reimburse - totals.kasbon >= 0 ? "+" : ""}{formatNumFull(totals.reimburse - totals.kasbon)}</span></td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatNumFull(totals.total)}</td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
