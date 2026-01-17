"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Save, Check, X, Download, ArrowUpDown, Edit2, Users, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { CREW_ROLE_LABELS, CrewRole, fetchCrewMembers, fetchDailyLogs, upsertDailyLog, deleteDailyLogEntry, DailyLog } from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { isHolidayOrSunday } from "@/lib/holidays";

interface CrewDailyInputProps {
    role?: string;
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "CUTI" | "";
// Helper to format project code (get 3 letters after dash)

interface DailyEntry {
    id: string;
    crewName: string;
    initials: string;
    crewRole: CrewRole;
    status: AttendanceStatus;
    regularHrs: number;
    ot1Hrs: number;
    ot2Hrs: number;
    ot3Hrs: number;
    saved: boolean;
}

// Removed local getInitials

// Helper to format project code (get 3 letters after dash)
const formatProjectCode = (code?: string) => {
    if (!code) return "-";
    const parts = code.split("-");
    const suffix = parts.length > 1 ? parts[1] : code;
    return suffix.toUpperCase();
};

export function CrewDailyInput({ role }: CrewDailyInputProps) {
    // Data state
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [entries, setEntries] = useState<DailyEntry[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<"name" | "status">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [editingEntry, setEditingEntry] = useState<string | null>(null);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [exporting, setExporting] = useState(false);

    // 1. Load Projects
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

    // 2. Load Crew when Project Selects (Mocking "Assigned to Project" via currentProjectCode)
    useEffect(() => {
        const loadCrew = async () => {
            if (!selectedProject) {
                setEntries([]);
                return;
            }

            try {
                // In a real app, we would fetch from "DailyLog" table for this date + project
                // For now, we seed the list with ALL crew assigned to this project
                // And assume default status is empty or fetch existing log
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const members = await fetchCrewMembers(wsId);

                    // Filter by project (normalize code for comparison)
                    const projectSuffix = formatProjectCode(selectedProject);

                    console.log("DEBUG: Selected Project:", selectedProject);
                    console.log("DEBUG: Project Suffix:", projectSuffix);
                    console.log("DEBUG: All Members Sample:", members.slice(0, 3).map(m => ({ name: m.name, project: m.currentProjectCode, fmt: formatProjectCode(m.currentProjectCode) })));

                    const assignedCrew = members.filter(m => m.currentProjectCode && (
                        formatProjectCode(m.currentProjectCode) === projectSuffix ||
                        m.currentProjectCode.includes(projectSuffix!)
                    ));
                    console.log("DEBUG: Assigned Crew Count:", assignedCrew.length);



                    // Fetch existing logs for this date
                    // Fix: Use local date string
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;

                    const existingLogs = await fetchDailyLogs(wsId, projectSuffix, dateStr);
                    const logsMap = new Map(existingLogs.map(l => [l.crewId, l]));

                    // Map to entries
                    const newEntries: DailyEntry[] = assignedCrew.map(c => {
                        const log = logsMap.get(c.id);
                        return {
                            id: c.id,
                            crewName: c.name,
                            initials: c.initials,
                            crewRole: c.role,
                            status: (log?.status as any) || "",
                            regularHrs: log ? log.regularHours : 8,
                            ot1Hrs: log ? log.ot1Hours : 0,
                            ot2Hrs: log ? log.ot2Hours : 0,
                            ot3Hrs: log ? log.ot3Hours : 0,
                            saved: !!log
                        };
                    });
                    setEntries(newEntries);
                }
            } catch (e) { console.error(e); }
        };
        loadCrew();
    }, [selectedProject, selectedDate]);

    const formatDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
    const formatDateShort = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const handleDateChange = (dir: "prev" | "next") => { const n = new Date(selectedDate); n.setDate(n.getDate() + (dir === "next" ? 1 : -1)); setSelectedDate(n); };
    const isHolidayDay = isHolidayOrSunday(selectedDate);

    const toggleRowSelection = (id: string) => { const n = new Set(selectedRows); n.has(id) ? n.delete(id) : n.add(id); setSelectedRows(n); };
    const selectAll = () => { selectedRows.size === entries.length ? setSelectedRows(new Set()) : setSelectedRows(new Set(entries.map(e => e.id))); };



    const saveEntry = async (id: string) => {
        const entry = entries.find(e => e.id === id);
        if (!entry || !entry.status) return; // Must have status to save

        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId) return;

            const projectSuffix = formatProjectCode(selectedProject);
            // Fix: Use local date string
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            await upsertDailyLog({
                workspaceId: wsId,
                crewId: entry.id,
                projectCode: projectSuffix, // Using suffix for consistency
                date: dateStr,
                status: entry.status,
                regularHours: entry.regularHrs,
                ot1Hours: entry.ot1Hrs,
                ot2Hours: entry.ot2Hrs,
                ot3Hours: entry.ot3Hrs
            });

            setEntries(prev => prev.map(e => e.id === id ? { ...e, saved: true } : e));
            setEditingEntry(null);
            setShowSuccessPopup(true);
            setTimeout(() => setShowSuccessPopup(false), 3000);
        } catch (e) {
            console.error("Failed to save log:", e);
            alert("Failed to save log. Please try again.");
        }
    };

    const saveAll = async () => {
        const unsaved = entries.filter(e => !e.saved); // Save all unsaved changes (including deletions)
        if (unsaved.length === 0) return;

        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId) return;
            const projectSuffix = formatProjectCode(selectedProject);

            // Fix: Use local date string to match user selection and CrewRequests logic
            // (Avoids toISOString() shifting to yesterday due to timezone)
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // Save in parallel
            // Save in parallel
            await Promise.all(unsaved.map(entry => {
                const crewId = entry.id.split('_')[0]; // Extract crewId properly if ID is composite
                // Wait, previously entry.id was used directly. Check loadCrew: entry.id = m.id. 
                // Wait, existing check at line 207 said "Assuming ID is crewID now". 
                // But let's be safe. If we changed id generation logic, we should check.
                // Looking at loadCrew (line 120 in file view previously), id is just m.id (UUID). 
                // So entry.id IS crewId. 
                // Actually, line 207 in valid code had `entry.id.split('_')[0]`. Why? 
                // Maybe unique key for list?
                // Let's assume entry.id is just UUID for now based on `m.id`.

                if (entry.status === "") {
                    // Delete
                    return deleteDailyLogEntry(entry.id, dateStr, projectSuffix);
                } else {
                    // Upsert
                    return upsertDailyLog({
                        workspaceId: wsId,
                        crewId: entry.id,
                        projectCode: projectSuffix,
                        date: dateStr,
                        status: entry.status,
                        regularHours: entry.regularHrs,
                        ot1Hours: entry.ot1Hrs,
                        ot2Hours: entry.ot2Hrs,
                        ot3Hours: entry.ot3Hrs
                    });
                }
            }));

            setEntries(prev => prev.map(e => ({ ...e, saved: true })));
            setShowSuccessPopup(true);
            setTimeout(() => setShowSuccessPopup(false), 3000);
        } catch (e) {
            console.error("Failed to save logs:", e);
            alert("Failed to save some logs.");
        }
    };
    const updateEntry = (id: string, keyOrUpdates: string | Partial<DailyEntry>, val?: any) => {
        // Toggle logic helper
        const handleStatusToggle = (currentStatus: string, newStatus: string) => {
            return currentStatus === newStatus ? "" : newStatus;
        };

        setEntries(prev => prev.map(e => {
            if (e.id !== id) return e;

            let updated = { ...e, saved: false };

            if (typeof keyOrUpdates === 'string') {
                if (keyOrUpdates === 'status') {
                    // Apply toggle if it's a status update
                    const newStatus = handleStatusToggle(e.status, val as string) as AttendanceStatus;

                    // Only update if status actually changes (or toggles to empty)
                    if (updated.status !== newStatus) {
                        updated.status = newStatus;

                        // Defaults based on NEW status
                        if (updated.status === "PRESENT") { updated.regularHrs = 8; }
                        else if (updated.status === "ABSENT" || updated.status === "CUTI" || updated.status === "") {
                            updated.regularHrs = 0; updated.ot1Hrs = 0; updated.ot2Hrs = 0; updated.ot3Hrs = 0;
                        }
                        else if (updated.status === "HALF_DAY") { updated.regularHrs = 4; }
                    }
                } else {
                    (updated as any)[keyOrUpdates] = val;
                }
            } else {
                updated = { ...updated, ...keyOrUpdates };
            }

            // Enforce constraints
            if (updated.status === "HALF_DAY" && updated.regularHrs > 4) updated.regularHrs = 4;

            return updated;
        }));
    };

    const bulkSetStatus = (status: AttendanceStatus) => setEntries(prev => prev.map(e => {
        if (!selectedRows.has(e.id)) return e;
        const updated = { ...e, status, saved: false };
        if (status === "ABSENT" || status === "CUTI") { updated.regularHrs = 0; updated.ot1Hrs = 0; updated.ot2Hrs = 0; updated.ot3Hrs = 0; }
        else if (status === "PRESENT") { updated.regularHrs = 8; }
        if (status === "HALF_DAY" && updated.regularHrs > 4) updated.regularHrs = 4;
        return updated;
    }));

    const handleSort = (column: "name" | "status") => {
        if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(column); setSortOrder("asc"); }
    };

    const sortedEntries = useMemo(() => [...entries].sort((a, b) => {
        const cmp = sortBy === "name" ? a.crewName.localeCompare(b.crewName) : a.status.localeCompare(b.status);
        return sortOrder === "asc" ? cmp : -cmp;
    }), [entries, sortBy, sortOrder]);

    const handleExport = async () => {
        if (!selectedProject || entries.length === 0) return;
        setExporting(true);

        try {
            // 1. Prepare Meta
            const project = projects.find(p => p.code === selectedProject);
            const projectCode = project
                ? project.code.includes("-")
                    ? project.code.replace("-", " · ").toUpperCase()
                    : project.code.toUpperCase()
                : formatProjectCode(selectedProject);

            const projectName = project ? project.name : "Unknown Project";
            const periodText = selectedDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
            const generatedAt = new Date().toLocaleString("id-ID");

            // 2. Prepare Summary
            const totalPresent = entries.filter(e => e.status === "PRESENT").length;
            const totalHalf = entries.filter(e => e.status === "HALF_DAY").length;
            const totalAbsent = entries.filter(e => e.status === "ABSENT").length;
            const totalOT = entries.reduce((s, e) => s + e.ot1Hrs + e.ot2Hrs + e.ot3Hrs, 0);

            const summaryCards = [
                { label: "Present", value: totalPresent, format: "number" as const, color: "green" as const },
                { label: "Half Day", value: totalHalf, format: "number" as const, color: "blue" as const },
                { label: "Absent", value: totalAbsent, format: "number" as const, color: "red" as const },
                { label: "Total OT", value: `${totalOT} Hrs`, format: "string" as const, color: "blue" as const },
            ];

            // 3. Prepare Columns
            const columns = [
                { id: "crewName", label: "Name", align: "left" as const },
                { id: "crewRole", label: "Role", align: "left" as const },
                { id: "status", label: "Status", align: "center" as const },
                { id: "reg", label: "Reg", align: "right" as const },
                { id: "ot", label: "OT", align: "right" as const },
            ];

            // 4. Prepare Data
            const rows = sortedEntries.map(e => ({
                crewName: e.crewName,
                crewRole: CREW_ROLE_LABELS[e.crewRole]?.en || e.crewRole,
                status: e.status || "-",
                reg: e.regularHrs,
                ot: e.ot1Hrs + e.ot2Hrs + e.ot3Hrs
            }));

            // 5. POST to API
            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode,
                        projectName,
                        documentName: "Daily Log Report",
                        periodText,
                        generatedAt,
                    },
                    summary: summaryCards,
                    columns,
                    data: rows
                })
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const dateStr = selectedDate.toISOString().split('T')[0];
            a.download = `Daily_Log_${projectCode.replace(/\s·\s/g, '_')}_${dateStr}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to export PDF.");
        } finally {
            setExporting(false);
        }
    };

    const SortIcon = ({ column }: { column: "name" | "status" }) => {
        if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-neutral-400" />;
        return sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    const unsavedCount = entries.filter(e => !e.saved).length;

    const HourInput = ({ label, value, onChange, disabled, max = 8 }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; max?: number }) => (
        <div className="flex items-center gap-2">
            <span className="w-8 text-xs text-neutral-500">{label}</span>
            <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={disabled || value <= 0} className={clsx("w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors", disabled || value <= 0 ? "bg-neutral-100 text-neutral-300" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")}>-</button>
            <span className={clsx("w-5 text-center text-sm font-medium", disabled ? "text-neutral-300" : "text-neutral-700")}>{value}</span>
            <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max} className={clsx("w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors", disabled || value >= max ? "bg-neutral-100 text-neutral-300" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")}>+</button>
        </div>
    );

    // Future Date Check
    const isDateFuture = (d: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(d);
        target.setHours(0, 0, 0, 0);
        return target > today;
    };
    const futureLocked = isDateFuture(selectedDate);

    const getTotalOT = (e: DailyEntry) => e.ot1Hrs + e.ot2Hrs + e.ot3Hrs;

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Daily Log</h1>
                        <p className="text-sm text-neutral-500 mt-1">Input daily attendance and overtime.</p>
                    </div>
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full">

                {/* 1. PROJECT SELECT */}
                {projects.length > 0 && (
                    <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="appearance-none w-full pl-3 pr-7 py-2 text-sm border border-neutral-200 rounded-full bg-white font-medium focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,118,255,0.3)] transition-all">
                            <option value="">Select Project</option>
                            {projects.map(p => <option key={p.code} value={p.code}>[{formatProjectCode(p.code)}] {p.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                )}

                {/* 2. DATE CONTROL */}
                <div className="flex items-center gap-2 order-2 sm:order-none">
                    <div className={clsx("flex items-center gap-0.5 border rounded-full px-1 py-1 shadow-sm flex-shrink-0", isHolidayDay ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200")}>
                        <button onClick={() => handleDateChange("prev")} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className={clsx("text-sm font-medium text-center select-none px-1 min-w-[80px] sm:min-w-[100px]", isHolidayDay ? "text-amber-700" : "text-neutral-700")}>
                            <span className="hidden sm:inline">{formatDate(selectedDate)}</span>
                            <span className="sm:hidden">{formatDateShort(selectedDate)}</span>
                        </span>
                        <button onClick={() => handleDateChange("next")} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                    {isHolidayDay && <span className="hidden sm:inline px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Holiday</span>}
                </div>

                {/* 3. ACTIONS */}
                <div className="flex items-center gap-2 ml-auto order-2 sm:order-none">
                    <Button
                        variant="secondary"
                        className="!rounded-full !py-1.5 !px-3"
                        icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={handleExport}
                        disabled={exporting || entries.length === 0}
                    >
                        {exporting ? "..." : "Export"}
                    </Button>
                    <Button variant="primary" className="!rounded-full !py-1.5 !px-4" icon={<Save className="w-4 h-4" />} onClick={saveAll} disabled={entries.length === 0}>Save {unsavedCount > 0 && `(${unsavedCount})`}</Button>
                </div>
            </div>

            {/* BULK */}
            {selectedRows.size > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-blue-700">{selectedRows.size} selected</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => bulkSetStatus("PRESENT")} className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Present</button>
                        <button onClick={() => bulkSetStatus("ABSENT")} className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Absent</button>
                        <button onClick={() => bulkSetStatus("HALF_DAY")} className="px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Half</button>
                        <button onClick={() => bulkSetStatus("CUTI")} className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Cuti</button>
                    </div>
                </div>
            )}

            {/* EMPTY STATE */}
            {entries.length === 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <h3 className="font-medium text-neutral-600 mb-2">{selectedProject ? "No crew assigned to this project" : "Select a project"}</h3>
                    <p className="text-sm text-neutral-400">{selectedProject ? "Go to Crew Directory to assign members." : "Choose a project to view daily log."}</p>
                </div>
            )}

            {/* TABLE */}
            {sortedEntries.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="px-3 py-3 w-8"><input type="checkbox" checked={selectedRows.size === entries.length} onChange={selectAll} className="rounded border-neutral-300" /></th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("name")}><div className="flex items-center gap-1">Name <SortIcon column="name" /></div></th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("status")}><div className="flex items-center gap-1">Status <SortIcon column="status" /></div></th>
                                    <th className="text-center px-3 py-3 text-xs font-semibold text-neutral-600 uppercase">Hours</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold text-neutral-600 uppercase w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {sortedEntries.map((entry) => {
                                    const isOff = entry.status === "ABSENT" || entry.status === "CUTI";
                                    const isHalf = entry.status === "HALF_DAY";
                                    const isEditing = editingEntry === entry.id;
                                    const maxReg = isHalf ? 4 : 8;
                                    return (
                                        <tr key={entry.id} className={clsx("transition-colors", selectedRows.has(entry.id) ? "bg-blue-50" : "hover:bg-neutral-50", !entry.saved && "bg-amber-50/50")}>
                                            <td className="px-3 py-3"><input type="checkbox" checked={selectedRows.has(entry.id)} onChange={() => toggleRowSelection(entry.id)} className="rounded border-neutral-300" /></td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-semibold flex-shrink-0">{entry.initials}</div>
                                                    <div><div className="font-medium text-neutral-900 text-sm">{entry.crewName}</div><div className="text-xs text-neutral-500">{CREW_ROLE_LABELS[entry.crewRole]?.en || entry.crewRole}</div></div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex gap-1 flex-wrap">
                                                    {(["PRESENT", "HALF_DAY", "ABSENT", "CUTI"] as AttendanceStatus[]).map(s => {
                                                        const isDisabled = futureLocked && s !== "CUTI";
                                                        const isSelected = entry.status === s;
                                                        return (
                                                            <button
                                                                key={s}
                                                                onClick={() => !isDisabled && updateEntry(entry.id, "status", s)}
                                                                disabled={isDisabled}
                                                                className={clsx(
                                                                    "px-2 py-1 rounded-full transition-colors text-[10px] font-medium",
                                                                    isSelected
                                                                        ? (s === "PRESENT" ? "bg-emerald-100 text-emerald-700" : s === "HALF_DAY" ? "bg-amber-100 text-amber-700" : s === "ABSENT" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700")
                                                                        : (isDisabled ? "bg-neutral-50 text-neutral-300 cursor-not-allowed" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200")
                                                                )}
                                                            >
                                                                {s === "PRESENT" ? "P" : s === "HALF_DAY" ? "½" : s === "ABSENT" ? "A" : "C"}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <HourInput label="Reg" value={entry.regularHrs} onChange={(v) => updateEntry(entry.id, "regularHrs", v)} disabled={isOff} max={maxReg} />
                                                        <HourInput label="OT1" value={entry.ot1Hrs} onChange={(v) => updateEntry(entry.id, "ot1Hrs", v)} disabled={isOff} max={2} />
                                                        <HourInput label="OT2" value={entry.ot2Hrs} onChange={(v) => updateEntry(entry.id, "ot2Hrs", v)} disabled={isOff} max={4} />
                                                        <HourInput label="OT3" value={entry.ot3Hrs} onChange={(v) => updateEntry(entry.id, "ot3Hrs", v)} disabled={isOff} max={6} />
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="text-sm font-medium text-neutral-700">R:{entry.regularHrs} <span className="ml-3 text-blue-600">+{getTotalOT(entry)}OT</span></div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {isEditing ? (
                                                    <button onClick={() => saveEntry(entry.id)} className="p-1.5 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200"><Check className="w-3.5 h-3.5" /></button>
                                                ) : (
                                                    <button onClick={() => setEditingEntry(entry.id)} className="p-1.5 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"><Edit2 className="w-3.5 h-3.5" /></button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SUCCESS POPUP */}
            {showSuccessPopup && (
                <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold">Saved Successfully</h4>
                        <p className="text-xs text-emerald-100">Daily logs have been updated.</p>
                    </div>
                    <button onClick={() => setShowSuccessPopup(false)} className="ml-2 hover:bg-white/20 p-1 rounded-full"><X className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
}
