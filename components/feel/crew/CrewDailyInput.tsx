"use client";

import { useState, useMemo, useEffect, useContext } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ProjectContext } from "@/components/flow/project-context";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Save, Check, X, Download, ArrowUpDown, Edit2, Users, Loader2, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { CREW_ROLE_LABELS, CrewRole, fetchCrewMembers, fetchDailyLogs, upsertDailyLog, deleteDailyLogEntry, DailyLog, fetchCrewByAssignment, fetchFutureUnlock, unlockFutureDate, lockFutureDate } from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { isCrewPaidHolidayOrSunday } from "@/lib/holidays";
import { supabase } from "@/lib/supabaseClient";

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

const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

export function CrewDailyInput({ role }: CrewDailyInputProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Check project context and URL fallback
    const projectCtx = useContext(ProjectContext);
    const forceProjectCode = projectCtx?.project?.code || null;
    const forceProjectSuffix = forceProjectCode 
        ? (forceProjectCode.includes("-") ? forceProjectCode.split("-")[1] : forceProjectCode)
        : null;

    const isProjectUrl = pathname.includes("/project/");
    const urlProjectId = isProjectUrl ? pathname.split("/")[2] : null;

    // Data state
    const [selectedProject, setSelectedProject] = useState(() => {
        return forceProjectSuffix || searchParams.get("project") || searchParams.get("projects")?.split(",")[0] || "";
    });
    const [projects, setProjects] = useState<{ id?: string; code: string; name: string }[]>([]);

    // Auto-select when projects load
    useEffect(() => {
        if (urlProjectId && projects.length > 0) {
            const activeProj = projects.find(p => p.id === urlProjectId);
            if (activeProj) {
                const parts = activeProj.code.split("-");
                const suffix = parts.length > 1 ? parts[1] : activeProj.code;
                setSelectedProject(suffix);
            }
        }
    }, [urlProjectId, projects]);

    // Sync project FROM URL
    useEffect(() => {
        const project = forceProjectSuffix || searchParams.get("project") || searchParams.get("projects")?.split(",")[0];
        if (project && project !== selectedProject) {
            setSelectedProject(project);
        }
    }, [searchParams, forceProjectSuffix]);

    // Sync project TO URL (both singular and plural for compatibility)
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        const activeProj = forceProjectSuffix || selectedProject;
        if (activeProj) {
            params.set("project", activeProj);
            params.set("projects", activeProj); // Sync plural for consistency
        }
        else {
            params.delete("project");
            params.delete("projects");
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [selectedProject, forceProjectSuffix]);
    const [selectedDate, setSelectedDate] = useState(() => {
        const dateParam = searchParams.get("date");
        if (dateParam) {
            const parsed = new Date(dateParam);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date();
    });

    // Sync date FROM URL
    useEffect(() => {
        const dateParam = searchParams.get("date");
        if (dateParam) {
            const parsed = new Date(dateParam);
            if (!isNaN(parsed.getTime()) && parsed.toDateString() !== selectedDate.toDateString()) {
                setSelectedDate(parsed);
            }
        }
    }, [searchParams]);
    const [entries, setEntries] = useState<DailyEntry[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<"name" | "status">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [editingEntry, setEditingEntry] = useState<string | null>(null);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Bulk action advanced hours states
    const [showBulkHours, setShowBulkHours] = useState(false);
    const [bulkReg, setBulkReg] = useState(8);
    const [bulkOT1, setBulkOT1] = useState(0);
    const [bulkOT2, setBulkOT2] = useState(0);
    const [bulkOT3, setBulkOT3] = useState(0);

    // Auto-close bulk hours view when selections are empty
    useEffect(() => {
        if (selectedRows.size === 0) {
            setShowBulkHours(false);
        }
    }, [selectedRows.size]);

    // Urgent Advance Submission States
    const [urgentUnlocked, setUrgentUnlocked] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [loadingUnlock, setLoadingUnlock] = useState(false);

    // Check Role
    const isAuthorizedForUrgent = useMemo(() => {
        return !!(role && ["admin", "superadmin", "administrator", "supervisor"].includes(role.toLowerCase()));
    }, [role]);

    // 1. Load Projects
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const data = await fetchProjectsByWorkspace(wsId);
                    setProjects(data.map((p: any) => ({
                        id: p.id,
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
                setUrgentUnlocked(false);
                return;
            }

            try {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const projectSuffix = formatProjectCode(selectedProject);
                    
                    // Format date
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;

                    // Fetch unlock status from database
                    const isUnlocked = await fetchFutureUnlock(wsId, projectSuffix, dateStr);
                    setUrgentUnlocked(isUnlocked);

                    // 1. Fetch who WAS assigned on this date
                    const assignedCrew = await fetchCrewByAssignment(projectSuffix, dateStr);
                    
                    // 2. Fetch existing logs
                    const existingLogs = await fetchDailyLogs(wsId, projectSuffix, dateStr);
                    const logsMap = new Map(existingLogs.map(l => [l.crewId, l]));

                    // 3. Merge: Assigned crew + Anyone who already has a log (even if not assigned)
                    const logIds = new Set(existingLogs.map(l => l.crewId));
                    const assignedIds = new Set(assignedCrew.map(c => c.id));
                    
                    let finalCrew = [...assignedCrew];
                    const extraIds = Array.from(logIds).filter(id => !assignedIds.has(id));
                    
                    if (extraIds.length > 0) {
                        const allMembers = await fetchCrewMembers(wsId);
                        const extras = allMembers.filter(m => extraIds.includes(m.id));
                        finalCrew = [...finalCrew, ...extras];
                    }

                    // Map to entries
                    const newEntries: DailyEntry[] = finalCrew.map(c => {
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
    const isHolidayDay = isCrewPaidHolidayOrSunday(selectedDate);

    const toggleRowSelection = (id: string) => { const n = new Set(selectedRows); n.has(id) ? n.delete(id) : n.add(id); setSelectedRows(n); };
    const selectAll = () => { selectedRows.size === entries.length ? setSelectedRows(new Set()) : setSelectedRows(new Set(entries.map(e => e.id))); };



    const saveEntry = async (id: string) => {
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        let status = entry.status;
        if (!status) {
            if (entry.regularHrs > 0 || getTotalOT(entry) > 0) {
                status = (entry.regularHrs <= 4 && entry.regularHrs > 0) ? "HALF_DAY" : "PRESENT";
            } else {
                alert("Please select attendance status (Present, Half Day, Absent, or Cuti) first.");
                return;
            }
        }

        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId) return;

            const projectSuffix = formatProjectCode(selectedProject);
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            await upsertDailyLog({
                workspaceId: wsId,
                crewId: entry.id,
                projectCode: projectSuffix, // Using suffix for consistency
                date: dateStr,
                status: status,
                regularHours: entry.regularHrs,
                ot1Hours: entry.ot1Hrs,
                ot2Hours: entry.ot2Hrs,
                ot3Hours: entry.ot3Hrs
            });

            setEntries(prev => prev.map(e => e.id === id ? { ...e, status, saved: true } : e));
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

    const bulkSetHours = () => {
        setEntries(prev => prev.map(e => {
            if (!selectedRows.has(e.id)) return e;
            let status = e.status;
            if (status === "ABSENT" || status === "CUTI" || status === "") {
                status = bulkReg <= 4 && bulkReg > 0 ? "HALF_DAY" : "PRESENT";
            }
            return {
                ...e,
                status,
                regularHrs: bulkReg,
                ot1Hrs: bulkOT1,
                ot2Hrs: bulkOT2,
                ot3Hrs: bulkOT3,
                saved: false
            };
        }));
        setShowBulkHours(false);
    };

    const handleSort = (column: "name" | "status") => {
        if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(column); setSortOrder("asc"); }
    };

    const filteredEntries = useMemo(() => {
        let list = [...entries];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(e => e.crewName.toLowerCase().includes(q));
        }
        return list.sort((a, b) => {
            const cmp = sortBy === "name" ? a.crewName.localeCompare(b.crewName) : a.status.localeCompare(b.status);
            return sortOrder === "asc" ? cmp : -cmp;
        });
    }, [entries, sortBy, sortOrder, searchQuery]);

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
            const rows = filteredEntries.map(e => ({
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
        if (sortBy !== column) return null;
        return sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-neutral-600" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />;
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
    const futureLocked = isDateFuture(selectedDate) && !urgentUnlocked;

    const handleUnlock = async () => {
        if (!selectedProject) return;
        setLoadingUnlock(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId) return;

            const projectSuffix = formatProjectCode(selectedProject);
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const { data: { user } } = await supabase.auth.getUser();

            await unlockFutureDate(wsId, projectSuffix, dateStr, user?.id);
            setUrgentUnlocked(true);
            setShowUnlockModal(false);
        } catch (e) {
            console.error("Failed to unlock future date:", e);
            alert("Failed to unlock future date. Please try again.");
        } finally {
            setLoadingUnlock(false);
        }
    };

    const handleRelock = async () => {
        if (!selectedProject) return;
        setLoadingUnlock(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId) return;

            const projectSuffix = formatProjectCode(selectedProject);
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            await lockFutureDate(wsId, projectSuffix, dateStr);
            setUrgentUnlocked(false);
        } catch (e) {
            console.error("Failed to relock date:", e);
            alert("Failed to relock date. Please try again.");
        } finally {
            setLoadingUnlock(false);
        }
    };

    const getTotalOT = (e: DailyEntry) => e.ot1Hrs + e.ot2Hrs + e.ot3Hrs;

    const getRegHourBadge = (entry: DailyEntry, isMobile?: boolean) => {
        const h = entry.regularHrs;
        const s = entry.status;
        const classes = isMobile 
            ? "px-2 py-0.5 text-[10px] rounded font-semibold border"
            : "px-2.5 py-1 text-xs rounded-lg font-semibold border";
            
        if (s === "ABSENT") {
            return <span className={clsx(classes, "bg-red-50 text-red-600 border-red-100")}>{h}h</span>;
        }
        if (s === "CUTI") {
            return <span className={clsx(classes, "bg-purple-50 text-purple-600 border-purple-100")}>{h}h</span>;
        }
        if (s === "HALF_DAY") {
            return <span className={clsx(classes, "bg-amber-50 text-amber-700 border-amber-100")}>{h}h</span>;
        }
        if (s === "PRESENT") {
            return <span className={clsx(classes, "bg-emerald-50 text-emerald-700 border-emerald-100")}>{h}h</span>;
        }
        return <span className={clsx(isMobile ? "px-2 py-0.5 text-[10px] rounded" : "px-2.5 py-1 text-xs rounded-lg", "bg-neutral-100 text-neutral-700 font-semibold")}>{h}h</span>;
    };

    const getOTHourBadge = (entry: DailyEntry, isMobile?: boolean) => {
        const ot = getTotalOT(entry);
        const classes = isMobile 
            ? "px-2 py-0.5 text-[10px] rounded font-bold border"
            : "px-2.5 py-1 text-xs rounded-lg font-bold border";
            
        if (ot > 0) {
            return <span className={clsx(classes, "bg-blue-50 text-blue-600 border-blue-100")}>+{ot}h OT</span>;
        }
        return <span className={clsx(isMobile ? "px-2 py-0.5 text-[10px] rounded" : "px-2.5 py-1 text-xs rounded-lg", "bg-neutral-50 text-neutral-400 font-medium")}>0h OT</span>;
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            {/* HEADER REMOVED - Using Global PageHeader */}

            {/* TOOLBAR */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full">

                {/* 1. PROJECT SELECT */}
                {!urlProjectId && !forceProjectSuffix && projects.length > 0 && (
                    <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="appearance-none w-full pl-3 pr-7 py-2 text-sm border border-neutral-200 rounded-full bg-white font-medium focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,118,255,0.3)] transition-all">
                            <option value="">Select Project</option>
                            {projects.map(p => <option key={p.code} value={formatProjectCode(p.code)}>[{formatProjectCode(p.code)}] {p.name}</option>)}
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
                    {showSearch && (
                        <div className="relative animate-in slide-in-from-right-2 duration-200">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-blue-500 w-40 sm:w-48 transition-all"
                            />
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setShowSearch(!showSearch);
                            if (showSearch) setSearchQuery("");
                        }}
                        className={clsx(
                            "w-8 h-8 rounded-full border border-neutral-200 hover:bg-neutral-50 transition-colors flex items-center justify-center shrink-0",
                            showSearch ? "bg-neutral-100 text-neutral-600" : "bg-white text-neutral-500"
                        )}
                        title="Search"
                    >
                        {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    </button>
                    <Button
                        variant="secondary"
                        className="!rounded-full !py-1.5 !px-3"
                        icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={handleExport}
                        disabled={exporting || entries.length === 0}
                    >
                        {exporting ? "..." : "Export"}
                    </Button>
                    <Button variant="primary" className="!rounded-full !py-1.5 !px-4 !bg-blue-600 hover:!bg-blue-700 !border-blue-600 !text-white" icon={<Save className="w-4 h-4" />} onClick={saveAll} disabled={entries.length === 0}>Save {unsavedCount > 0 && `(${unsavedCount})`}</Button>
                </div>
            </div>

            {/* FUTURE DATE LOCK NOTICE */}
            {isDateFuture(selectedDate) && (
                <div className={clsx(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-300",
                    urgentUnlocked 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-amber-50 border-amber-200 text-amber-800"
                )}>
                    <div className="flex items-start gap-3">
                        <div className={clsx(
                            "p-2 rounded-xl flex-shrink-0 shadow-sm border bg-white",
                            urgentUnlocked ? "border-emerald-100 text-emerald-600" : "border-amber-100 text-amber-600"
                        )}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">
                                {urgentUnlocked ? "Future Date Unlocked" : "Future Date Locked"}
                            </h4>
                            <p className="text-xs opacity-90 mt-0.5">
                                {urgentUnlocked 
                                    ? "This future date is temporarily unlocked for urgent submission by Admin/Supervisor." 
                                    : "Filling logs for future dates is locked by default to prevent accidental entries."}
                            </p>
                        </div>
                    </div>
                    {isAuthorizedForUrgent ? (
                        urgentUnlocked ? (
                            <button
                                onClick={handleRelock}
                                disabled={loadingUnlock}
                                className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-sm border border-emerald-200 active:scale-95 transition-all w-fit disabled:opacity-50"
                            >
                                {loadingUnlock ? "Relocking..." : "Relock Date"}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowUnlockModal(true)}
                                className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all w-fit"
                            >
                                Fill in Advance? (Urgent)
                            </button>
                        )
                    ) : (
                        <div className="text-xs italic opacity-85 font-medium self-start sm:self-center">
                            Only Admin or Supervisor can unlock future dates.
                        </div>
                    )}
                </div>
            )}

            {/* BULK */}
            {selectedRows.size > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
                    {showBulkHours ? (
                        <div className="flex items-center gap-4 flex-wrap w-full animate-in fade-in duration-300">
                            <span className="text-sm font-bold text-blue-700">Set Hours for {selectedRows.size} selected:</span>
                            <div className="flex flex-wrap gap-4 bg-white px-4 py-2 rounded-xl border border-neutral-100 shadow-sm">
                                <HourInput label="REG" value={bulkReg} onChange={setBulkReg} max={8} />
                                <HourInput label="OT1" value={bulkOT1} onChange={setBulkOT1} max={2} />
                                <HourInput label="OT2" value={bulkOT2} onChange={setBulkOT2} max={4} />
                                <HourInput label="OT3" value={bulkOT3} onChange={setBulkOT3} max={6} />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={bulkSetHours}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-colors shadow-sm"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={() => setShowBulkHours(false)}
                                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold rounded-full transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-blue-700">{selectedRows.size} selected</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => bulkSetStatus("PRESENT")} className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors">Present</button>
                                    <button onClick={() => bulkSetStatus("ABSENT")} className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors">Absent</button>
                                    <button onClick={() => bulkSetStatus("HALF_DAY")} className="px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors">Half</button>
                                    <button onClick={() => bulkSetStatus("CUTI")} className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors">Cuti</button>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setBulkReg(8);
                                    setBulkOT1(0);
                                    setBulkOT2(0);
                                    setBulkOT3(0);
                                    setShowBulkHours(true);
                                }}
                                className="px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-100/50 hover:bg-blue-100 transition-colors rounded-full flex items-center gap-1.5"
                            >
                                Set Hours / OT
                            </button>
                        </div>
                    )}
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

            {/* CONTENT (TABLE & CARDS) */}
            {filteredEntries.length > 0 && (
                <div className="space-y-4">
                    {/* MOBILE CARDS */}
                    <div className="lg:hidden space-y-3">
                        {filteredEntries.map((entry) => {
                            const isOff = entry.status === "ABSENT" || entry.status === "CUTI";
                            const isHalf = entry.status === "HALF_DAY";
                            const isEditing = editingEntry === entry.id;
                            const maxReg = isHalf ? 4 : 8;

                            return (
                                <div
                                    key={entry.id}
                                    className={clsx(
                                        "bg-white/50 backdrop-blur-md rounded-2xl border p-4 shadow-sm active:scale-[0.98] transition-all",
                                        selectedRows.has(entry.id) ? "border-blue-300 ring-1 ring-blue-100" : "border-white/40",
                                        !entry.saved && "bg-amber-50/40 border-amber-200/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(entry.id)}
                                                onChange={() => toggleRowSelection(entry.id)}
                                                className="rounded border-neutral-300 w-4 h-4"
                                            />
                                            <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-semibold shadow-sm">
                                                {entry.initials}
                                            </div>
                                            <div>
                                                <div className="font-bold text-neutral-900">{toTitleCase(entry.crewName)}</div>
                                                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                                                    {CREW_ROLE_LABELS[entry.crewRole]?.en || entry.crewRole}
                                                </div>
                                            </div>
                                        </div>
                                        {entry.saved ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase italic">
                                                <Check className="w-3 h-3" strokeWidth={3} />
                                                Saved
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase italic">
                                                Unsaved
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        {/* Status Row */}
                                        <div className="flex items-center justify-between py-2 border-t border-black/[0.03]">
                                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Attendance</div>
                                            <div className="flex gap-1.5">
                                                {(["PRESENT", "HALF_DAY", "ABSENT", "CUTI"] as AttendanceStatus[]).map(s => {
                                                    const isDisabled = futureLocked && s !== "CUTI";
                                                    const isSelected = entry.status === s;
                                                    return (
                                                        <button
                                                            key={s}
                                                            onClick={() => !isDisabled && updateEntry(entry.id, "status", s)}
                                                            disabled={isDisabled}
                                                            className={clsx(
                                                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all text-xs font-bold ring-1",
                                                                isSelected
                                                                    ? (s === "PRESENT" ? "bg-emerald-500 text-white ring-emerald-600 shadow-lg shadow-emerald-500/20" : s === "HALF_DAY" ? "bg-amber-500 text-white ring-amber-600 shadow-lg shadow-amber-500/20" : s === "ABSENT" ? "bg-red-500 text-white ring-red-600 shadow-lg shadow-red-500/20" : "bg-purple-500 text-white ring-purple-600 shadow-lg shadow-purple-500/20")
                                                                    : (isDisabled ? "bg-neutral-50 text-neutral-300 ring-neutral-100 opacity-50" : "bg-white/50 text-neutral-500 ring-neutral-100 hover:bg-white")
                                                            )}
                                                        >
                                                            {s === "PRESENT" ? "P" : s === "HALF_DAY" ? "½" : s === "ABSENT" ? "A" : "C"}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Hours Row */}
                                        <div className="py-2 border-t border-black/[0.03]">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Working Hours</div>
                                                {!isEditing && (
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        {getRegHourBadge(entry, true)}
                                                        {getOTHourBadge(entry, true)}
                                                    </div>
                                                )}
                                            </div>

                                            {isEditing ? (
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-neutral-50/50 p-3 rounded-xl border border-neutral-100">
                                                    <HourInput label="REG" value={entry.regularHrs} onChange={(v) => updateEntry(entry.id, "regularHrs", v)} disabled={isOff} max={maxReg} />
                                                    <HourInput label="OT1" value={entry.ot1Hrs} onChange={(v) => updateEntry(entry.id, "ot1Hrs", v)} disabled={isOff} max={2} />
                                                    <HourInput label="OT2" value={entry.ot2Hrs} onChange={(v) => updateEntry(entry.id, "ot2Hrs", v)} disabled={isOff} max={4} />
                                                    <HourInput label="OT3" value={entry.ot3Hrs} onChange={(v) => updateEntry(entry.id, "ot3Hrs", v)} disabled={isOff} max={6} />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingEntry(entry.id)}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-xl transition-all border border-blue-100/50"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    Adjust Hours
                                                </button>
                                            )}
                                        </div>

                                        {isEditing && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => saveEntry(entry.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Save Changes
                                                </button>
                                                <button
                                                    onClick={() => setEditingEntry(null)}
                                                    className="px-4 py-3 bg-neutral-100 text-neutral-500 rounded-xl active:scale-95 transition-all"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* DESKTOP TABLE */}
                    <div className="hidden lg:block bg-white rounded-[22px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-neutral-100">
                                    <tr>
                                        <th className="px-4 py-3.5 w-8"><input type="checkbox" checked={selectedRows.size === entries.length} onChange={selectAll} className="rounded border-neutral-300" /></th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-neutral-400 cursor-pointer hover:bg-neutral-50/50" onClick={() => handleSort("name")}><div className="flex items-center gap-1">Name <SortIcon column="name" /></div></th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-neutral-400 cursor-pointer hover:bg-neutral-50/50" onClick={() => handleSort("status")}><div className="flex items-center gap-1">Status <SortIcon column="status" /></div></th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold text-neutral-400">Hours</th>
                                        <th className="text-right px-4 py-3.5 text-xs font-semibold text-neutral-400 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {filteredEntries.map((entry) => {
                                        const isOff = entry.status === "ABSENT" || entry.status === "CUTI";
                                        const isHalf = entry.status === "HALF_DAY";
                                        const isEditing = editingEntry === entry.id;
                                        const maxReg = isHalf ? 4 : 8;
                                        return (
                                            <tr key={entry.id} className={clsx("transition-colors", selectedRows.has(entry.id) ? "bg-blue-50 dark:bg-blue-950/20" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40", !entry.saved && "bg-amber-50/40 dark:bg-amber-950/10")}>
                                                <td className="px-4 py-3"><input type="checkbox" checked={selectedRows.has(entry.id)} onChange={() => toggleRowSelection(entry.id)} className="rounded border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700" /></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 text-sm font-semibold flex-shrink-0">{entry.initials}</div>
                                                        <div><div className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">{toTitleCase(entry.crewName)}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">{CREW_ROLE_LABELS[entry.crewRole]?.en || entry.crewRole}</div></div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
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
                                                                        "px-2.5 py-1 rounded-full transition-colors text-[10px] font-semibold",
                                                                        isSelected
                                                                            ? (s === "PRESENT" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : s === "HALF_DAY" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" : s === "ABSENT" ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400" : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400")
                                                                            : (isDisabled ? "bg-neutral-50 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 cursor-not-allowed" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700")
                                                                    )}
                                                                >
                                                                    {s === "PRESENT" ? "P" : s === "HALF_DAY" ? "½" : s === "ABSENT" ? "A" : "C"}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <HourInput label="Reg" value={entry.regularHrs} onChange={(v) => updateEntry(entry.id, "regularHrs", v)} disabled={isOff} max={maxReg} />
                                                            <HourInput label="OT1" value={entry.ot1Hrs} onChange={(v) => updateEntry(entry.id, "ot1Hrs", v)} disabled={isOff} max={2} />
                                                            <HourInput label="OT2" value={entry.ot2Hrs} onChange={(v) => updateEntry(entry.id, "ot2Hrs", v)} disabled={isOff} max={4} />
                                                            <HourInput label="OT3" value={entry.ot3Hrs} onChange={(v) => updateEntry(entry.id, "ot3Hrs", v)} disabled={isOff} max={6} />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1.5 font-medium">
                                                            {getRegHourBadge(entry)}
                                                            {getOTHourBadge(entry)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
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

            {/* URGENT UNLOCK CONFIRMATION MODAL */}
            {showUnlockModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-amber-50/50 border-amber-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-white shadow-sm border border-amber-100 text-amber-600">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <h2 className="font-bold text-neutral-900 text-lg">
                                    Urgent Advance Submission
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowUnlockModal(false)}
                                className="p-2 hover:bg-white/50 rounded-full transition-colors"
                                disabled={loadingUnlock}
                            >
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                You are about to unlock attendance input for <strong className="text-neutral-900">{selectedDate.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>, which is in the future.
                            </p>
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                This action bypasses the future lock for urgent payroll or submission requirements. Once unlocked, other users will also be able to edit this date.
                            </p>
                            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-500">
                                Authorized by: <span className="font-bold text-neutral-700 capitalize">{role || "Supervisor/Admin"}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowUnlockModal(false)}
                                className="px-4 py-2 hover:bg-neutral-100 text-neutral-600 rounded-xl text-sm font-semibold transition-all"
                                disabled={loadingUnlock}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUnlock}
                                disabled={loadingUnlock}
                                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 min-w-[120px]"
                            >
                                {loadingUnlock ? "Unlocking..." : "Confirm & Unlock"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
