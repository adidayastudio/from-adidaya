"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ProjectReport, ReportStatus } from "@/types/project";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { 
    ArrowLeft, 
    Save, 
    Plus, 
    Trash2, 
    Loader2, 
    Check, 
    FileText, 
    Calendar,
    Users,
    Sun,
    CalendarCheck,
    AlertTriangle,
    Camera,
    UploadCloud,
    X,
    Download,
    RefreshCw,
    Sparkles,
    Combine,
    Grid,
    CheckCircle2,
    CloudRain
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import clsx from "clsx";
import toast from "react-hot-toast";

interface ProjectDropdownOption {
    id: string;
    name: string;
    location?: string;
    project_code: string;
    project_number?: string;
}

interface PersonelWeeklyRow {
    role: string;
    unit: string;
    senin: number;
    selasa: number;
    rabu: number;
    kamis: number;
    jumat: number;
    sabtu: number;
    minggu: number;
}

interface PersonelMonthlyRow {
    role: string;
    unit: string;
    minggu1: number;
    minggu2: number;
    minggu3: number;
    minggu4: number;
    minggu5: number;
}

interface WeatherMonthlyRow {
    condition: string;
    minggu1Hours: number;
    minggu2Hours: number;
    minggu3Hours: number;
    minggu4Hours: number;
    minggu5Hours: number;
}

interface HourlyWeatherRow {
    hour: number;
    label: string;
    senin: string; // "C", "B", "H"
    selasa: string;
    rabu: string;
    kamis: string;
    jumat: string;
    sabtu: string;
    minggu: string;
    keterangan?: string;
}

interface KendalaItem {
    date: string;
    problem: string;
    solution: string;
    recommendation: string;
}

function EditorContentComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // URL Search Params
    const paramType = searchParams.get("type") as "daily" | "weekly" | "monthly" | null;
    const paramId = searchParams.get("id");
    const paramProjectId = searchParams.get("projectId");
    const paramExport = searchParams.get("export") === "true";
    const paramRevise = searchParams.get("revise") === "true";

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [projects, setProjects] = useState<ProjectDropdownOption[]>([]);
    
    // Core Form State
    const [reportId, setReportId] = useState<string | null>(paramId);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">(paramType || "daily");
    const [title, setTitle] = useState("");
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [progress, setProgress] = useState("0");
    const [status, setStatus] = useState<ReportStatus>("on-track");
    
    // Text Content (For Monthly or Legacy Rich Text)
    const [editorContent, setEditorContent] = useState("");

    // --- DAILY TEMPLATE STATES ---
    const [activeTab, setActiveTab] = useState<"general" | "workItems" | "personnel" | "cuaca" | "catatan" | "dokumentasi" | "material" | "ttd">("general");

    const [dayNumber, setDayNumber] = useState("");
    const [totalDays, setTotalDays] = useState("");
    const [remainingDays, setRemainingDays] = useState("");
    const [workPackage, setWorkPackage] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [revision, setRevision] = useState("00");

    // Dynamic Work Items (Daily)
    const [workItems, setWorkItems] = useState<{ description: string; position: string; volume: string }[]>([
        { description: "", position: "", volume: "" }
    ]);

    // Personnel (Daily)
    const [pmCount, setPmCount] = useState("");
    const [smCount, setSmCount] = useState("");
    const [supervisorCount, setSupervisorCount] = useState("");
    const [mandorCount, setMandorCount] = useState("");
    const [tukangCount, setTukangCount] = useState("");
    const [pekerjaCount, setPekerjaCount] = useState("");
    const [operatorCount, setOperatorCount] = useState("");

    // Work Hours (Daily)
    const [shiftReguler, setShiftReguler] = useState("");
    const [shiftOt1, setShiftOt1] = useState("");
    const [shiftOt2, setShiftOt2] = useState("");
    const [shiftOt3, setShiftOt3] = useState("");

    // Weather (Daily)
    const [weatherItems, setWeatherItems] = useState<{ timeRange: string; condition: string }[]>([
        { timeRange: "08.00 - 09.00", condition: "cerah" },
        { timeRange: "09.00 - 10.00", condition: "cerah" },
        { timeRange: "10.00 - 11.00", condition: "cerah" },
        { timeRange: "11.00 - 12.00", condition: "cerah" },
        { timeRange: "12.00 - 13.00", condition: "cerah" },
        { timeRange: "14.00 - 15.00", condition: "cerah" },
        { timeRange: "15.00 - 16.00", condition: "cerah" }
    ]);

    // Signatures and Notes
    const [approvedBy, setApprovedBy] = useState("");
    const [approvedByRole, setApprovedByRole] = useState("Project Manager / Direktur");
    const [preparedBy, setPreparedBy] = useState("");
    const [preparedByRole, setPreparedByRole] = useState("Project Officer / Pengawas");
    const [notes, setNotes] = useState("");

    // Additional Daily States
    const [photos, setPhotos] = useState<{ url: string; caption: string }[]>([]);
    const [allDailyPhotos, setAllDailyPhotos] = useState<{ url: string; caption: string; dateStr?: string }[]>([]);
    const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);

    const [nextActions, setNextActions] = useState("");
    const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
    const [isDocIdManuallyEdited, setIsDocIdManuallyEdited] = useState(false);
    const [locationOverride, setLocationOverride] = useState("");
    const [materialItems, setMaterialItems] = useState<{ name: string; category: string; unit: string; incoming: string; outgoing: string; stock: string }[]>([
        { name: "", category: "Material", unit: "unit", incoming: "", outgoing: "", stock: "" }
    ]);

    // --- WEEKLY (LM) TEMPLATE STATES ---
    const [weeklyTab, setWeeklyTab] = useState<"general" | "summary" | "kegiatan" | "personel" | "cuaca" | "dokumentasi" | "ttd">("general");

    const getPrevSundayDateStr = () => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay()); // Sunday
        return d.toISOString().split('T')[0];
    };

    const getNextSaturdayDateStr = () => {
        const d = new Date();
        d.setDate(d.getDate() + (6 - d.getDay())); // Saturday
        return d.toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getPrevSundayDateStr());
    const [endDate, setEndDate] = useState(getNextSaturdayDateStr());
    const [weekNumber, setWeekNumber] = useState("01");

    // Executive Summary Metrics (LM)
    const [progressLastWeek, setProgressLastWeek] = useState("0.000");
    const [progressThisWeek, setProgressThisWeek] = useState("0.000");
    const [progressTotal, setProgressTotal] = useState("0.000");
    const [progressRemaining, setProgressRemaining] = useState("100.000");

    const [summaryText, setSummaryText] = useState("");
    const [catatanUmum, setCatatanUmum] = useState("");

    // Personel Summary (LM / LBL)
    const [monthNumber, setMonthNumber] = useState("01");
    const [avgStaffInti, setAvgStaffInti] = useState("0");
    const [avgTukangPekerja, setAvgTukangPekerja] = useState("0");
    const [avgTotalPersonel, setAvgTotalPersonel] = useState("0");
    const [personelSummaryText, setPersonelSummaryText] = useState("");

    // Personel Detailed Grid Page (LMS-01-05 / LM-XX-06)
    const defaultPersonelRoles: PersonelWeeklyRow[] = [
        { role: "Project Manager", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Site Manager", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Supervisor / Field Engineer", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Quality Control (QC)", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Safety Officer / HSE", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Drafter / Quantity Surveyor", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Admin Proyek", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Logistik", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Mandor", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Tukang Batu / Sipil", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Tukang Kayu / Bekisting", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Tukang Besi / Pembesian", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Pekerja / Helper", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Operator Alat Berat", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
        { role: "Security / Guard", unit: "orang", senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0 },
    ];
    const [personelWeeklyGrid, setPersonelWeeklyGrid] = useState<PersonelWeeklyRow[]>(defaultPersonelRoles);

    // Personel Monthly Grid Page (LB-XX-06)
    const defaultPersonelMonthlyRoles: PersonelMonthlyRow[] = [
        { role: "Project Manager", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Site Manager", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Supervisor / Field Engineer", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Quality Control (QC)", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Safety Officer / HSE", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Drafter / Quantity Surveyor", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Admin Proyek", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Logistik", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Mandor", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Tukang Batu / Sipil", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Tukang Kayu / Bekisting", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Tukang Besi / Pembesian", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Pekerja / Helper", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Operator Alat Berat", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
        { role: "Security / Guard", unit: "orang", minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
    ];
    const [personelMonthlyGrid, setPersonelMonthlyGrid] = useState<PersonelMonthlyRow[]>(defaultPersonelMonthlyRoles);

    // Weather Monthly Page (LB-XX-07)
    const defaultWeatherMonthlyGrid: WeatherMonthlyRow[] = [
        { condition: "Cerah (C)", minggu1Hours: 0, minggu2Hours: 0, minggu3Hours: 0, minggu4Hours: 0, minggu5Hours: 0 },
        { condition: "Berawan (B)", minggu1Hours: 0, minggu2Hours: 0, minggu3Hours: 0, minggu4Hours: 0, minggu5Hours: 0 },
        { condition: "Hujan (H)", minggu1Hours: 0, minggu2Hours: 0, minggu3Hours: 0, minggu4Hours: 0, minggu5Hours: 0 },
    ];
    const [weatherMonthlyGrid, setWeatherMonthlyGrid] = useState<WeatherMonthlyRow[]>(defaultWeatherMonthlyGrid);

    // Effective Hours Table (Monthly LB)
    const defaultEffectiveHoursMonthlyTable = [
        { weekLabel: "Minggu 1", dateRangeStr: "—", totalHours: "56", effectiveHours: "48" },
        { weekLabel: "Minggu 2", dateRangeStr: "—", totalHours: "56", effectiveHours: "48" },
        { weekLabel: "Minggu 3", dateRangeStr: "—", totalHours: "56", effectiveHours: "48" },
        { weekLabel: "Minggu 4", dateRangeStr: "—", totalHours: "56", effectiveHours: "48" },
        { weekLabel: "Minggu 5", dateRangeStr: "—", totalHours: "56", effectiveHours: "48" },
    ];
    const [effectiveHoursMonthlyTable, setEffectiveHoursMonthlyTable] = useState(defaultEffectiveHoursMonthlyTable);

    // Weather 24h Matrix Page (LMS-01-06 / LM-XX-07)
    const createDefaultHourlyWeather = (): HourlyWeatherRow[] => {
        const rows: HourlyWeatherRow[] = [];
        for (let i = 1; i <= 24; i++) {
            const hourLabel = `${i < 10 ? '0' : ''}${i}.00`;
            const defCond = i >= 8 && i <= 16 ? "C" : i >= 17 && i <= 20 ? "B" : "H";
            rows.push({
                hour: i,
                label: hourLabel,
                senin: defCond,
                selasa: defCond,
                rabu: defCond,
                kamis: defCond,
                jumat: defCond,
                sabtu: defCond,
                minggu: defCond,
                keterangan: ""
            });
        }
        return rows;
    };
    const [weatherHourlyGrid, setWeatherHourlyGrid] = useState<HourlyWeatherRow[]>(createDefaultHourlyWeather());

    // Kendala Lapangan Page (LMS-01-06 / LM-XX-07)
    const [kendalaItems, setKendalaItems] = useState<KendalaItem[]>([
        { date: "", problem: "", solution: "", recommendation: "" }
    ]);

    // Helper for Generating Dates for Effective Hours Table (11 Senin, 12 Selasa, etc.)
    const generateEffectiveHoursDates = (startStr: string, existingTable?: any[]) => {
        if (!startStr) return existingTable || [];
        try {
            const start = new Date(startStr);
            const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const result = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const dateNum = d.getDate();
                const dayName = dayNames[d.getDay()];
                const formattedDayLabel = `${dateNum} ${dayName}`;
                
                const prev = existingTable?.[i] || {};
                result.push({
                    day: formattedDayLabel,
                    dateStr: d.toISOString().split('T')[0],
                    totalHours: prev.totalHours || "12",
                    effectiveHours: prev.effectiveHours || "8"
                });
            }
            return result;
        } catch(e) {
            return existingTable || [];
        }
    };

    // Effective Work Hours (LM)
    const [effectiveHoursTable, setEffectiveHoursTable] = useState<{ day: string; dateStr: string; totalHours: string; effectiveHours: string }[]>(() => 
        generateEffectiveHoursDates(getPrevSundayDateStr())
    );
    const [waktuKerjaSummaryText, setWaktuKerjaSummaryText] = useState("");

    // Update effective hours dates when startDate changes
    useEffect(() => {
        if (startDate) {
            setEffectiveHoursTable(prev => generateEffectiveHoursDates(startDate, prev));
        }
    }, [startDate]);

    // Weather Summary (LM)
    const [weatherSummaryTable, setWeatherSummaryTable] = useState<{ condition: string; hours: string; days: string }[]>([
        { condition: "Cerah", hours: "0", days: "0" },
        { condition: "Berawan", hours: "0", days: "0" },
        { condition: "Hujan", hours: "0", days: "0" },
    ]);
    const [weatherSummaryText, setWeatherSummaryText] = useState("");

    // Weekly Activities (LM)
    const [weeklyActivitiesThisWeek, setWeeklyActivitiesThisWeek] = useState<{ description: string; duration: string; position: string; volume: string }[]>([
        { description: "", duration: "1 hari", position: "", volume: "" }
    ]);
    const [weeklyActivitiesNextWeek, setWeeklyActivitiesNextWeek] = useState<{ description: string; duration: string; position: string; volume: string }[]>([
        { description: "", duration: "1 hari", position: "", volume: "" }
    ]);

    // Attached Daily Reports (LM)
    const [attachedDailyReports, setAttachedDailyReports] = useState<any[]>([]);

    // Load active projects
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data } = await supabase
                    .from("projects")
                    .select("id, project_name, project_code, project_number, location")
                    .order("project_name");

                const mapped = (data || []).map(p => ({
                    id: p.id,
                    name: p.project_name,
                    project_code: p.project_code || "",
                    project_number: p.project_number || "",
                    location: p.location ? `${p.location.address || ""}, ${p.location.city || ""}`.replace(/^,\s*/, "") : ""
                }));
                setProjects(mapped);

                if (paramProjectId) {
                    setSelectedProjectId(paramProjectId);
                }
            } catch (err) {
                console.error("Error fetching projects:", err);
            }
        };
        fetchProjects();
    }, [paramProjectId]);

    // Load report details if editing
    useEffect(() => {
        if (paramId) {
            const fetchReportDetails = async () => {
                setIsLoading(true);
                try {
                    const { data, error } = await supabase
                        .from("project_reports")
                        .select("*")
                        .eq("id", paramId)
                        .single();

                    if (error) throw error;
                    if (data) {
                        setReportId(data.id);
                        setSelectedProjectId(data.project_id);
                        setReportType(data.report_type as any || "daily");
                        setTitle(data.title || "");
                        setReportDate(data.report_date || "");
                        setProgress(data.progress?.toString() || "0");
                        setStatus(data.status || "on-track");

                        if (data.report_type === "daily") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setLocationOverride(parsed.locationOverride || "");
                                    setDayNumber(parsed.dayNumber?.toString() || "");
                                    setTotalDays(parsed.totalDays?.toString() || "");
                                    setRemainingDays(parsed.remainingDays?.toString() || "");
                                    setWorkPackage(parsed.workPackage || "");
                                    setDocumentId(parsed.documentId || "");
                                    setRevision(parsed.revision || "00");
                                    setWorkItems(parsed.workItems || [{ description: "", position: "", volume: "" }]);
                                    
                                    const p = parsed.personnel || {};
                                    setPmCount(p.projectManager?.toString() || "");
                                    setSmCount(p.siteManager?.toString() || "");
                                    setSupervisorCount(p.supervisor?.toString() || "");
                                    setMandorCount(p.mandor?.toString() || "");
                                    setTukangCount(p.tukang?.toString() || "");
                                    setPekerjaCount(p.pekerja?.toString() || "");
                                    setOperatorCount(p.operator?.toString() || "");

                                    const wh = parsed.workHours || {};
                                    setShiftReguler(wh.reguler?.toString() || wh.shift1?.toString() || "");
                                    setShiftOt1(wh.ot1?.toString() || wh.shift2?.toString() || "");
                                    setShiftOt2(wh.ot2?.toString() || wh.shift3?.toString() || "");
                                    setShiftOt3(wh.ot3?.toString() || "");

                                    if (parsed.weatherItems && Array.isArray(parsed.weatherItems) && parsed.weatherItems.length > 0) {
                                        setWeatherItems(parsed.weatherItems);
                                    }
                                    setApprovedBy(parsed.approvedBy || "");
                                    setApprovedByRole(parsed.approvedByRole || "Project Manager / Direktur");
                                    setPreparedBy(parsed.preparedBy || "");
                                    setPreparedByRole(parsed.preparedByRole || "Project Officer / Pengawas");
                                    setNotes(parsed.notes || "");
                                    setPhotos(parsed.photos || []);
                                    setMaterialItems(parsed.materialItems || []);
                                    setNextActions(parsed.nextActions || "");
                                    setIsTitleManuallyEdited(true);
                                    setIsDocIdManuallyEdited(true);
                                } else {
                                    setEditorContent(data.content || "");
                                }
                            } catch (e) {
                                setEditorContent(data.content || "");
                            }
                        } else if (data.report_type === "weekly" || data.report_type === "monthly") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    const sDate = parsed.startDate || getPrevSundayDateStr();
                                    setStartDate(sDate);
                                    setEndDate(parsed.endDate || getNextSaturdayDateStr());
                                    setWeekNumber(parsed.weekNumber || "01");
                                    setMonthNumber(parsed.monthNumber || "01");
                                    setDayNumber(parsed.dayNumber?.toString() || "");
                                    setTotalDays(parsed.totalDays?.toString() || "");
                                    setRemainingDays(parsed.remainingDays?.toString() || "");
                                    setWorkPackage(parsed.workPackage || "");
                                    
                                    const prefix = data.report_type === "monthly" ? "LB" : "LM";
                                    const formattedPeriod = (data.report_type === "monthly" ? (parsed.monthNumber || "01") : (parsed.weekNumber || "01")).padStart(2, "0");
                                    setDocumentId(parsed.documentId || `${prefix}-${formattedPeriod}-01`);
                                    setRevision(parsed.revision || "00");
                                    setLocationOverride(parsed.locationOverride || "");
                                    
                                    setProgressLastWeek(parsed.progressLastWeek?.toString() || "0.000");
                                    setProgressThisWeek(parsed.progressThisWeek?.toString() || "0.000");
                                    setProgressTotal(parsed.progressTotal?.toString() || "0.000");
                                    setProgressRemaining(parsed.progressRemaining?.toString() || "100.000");

                                    setSummaryText(parsed.summaryText || "");
                                    setCatatanUmum(parsed.catatanUmum || "");
                                    setAvgStaffInti(parsed.avgStaffInti?.toString() || "0");
                                    setAvgTukangPekerja(parsed.avgTukangPekerja?.toString() || "0");
                                    setAvgTotalPersonel(parsed.avgTotalPersonel?.toString() || "0");
                                    setPersonelSummaryText(parsed.personelSummaryText || "");

                                    if (parsed.personelWeeklyGrid && Array.isArray(parsed.personelWeeklyGrid)) {
                                        setPersonelWeeklyGrid(parsed.personelWeeklyGrid);
                                    }
                                    if (parsed.personelMonthlyGrid && Array.isArray(parsed.personelMonthlyGrid)) {
                                        setPersonelMonthlyGrid(parsed.personelMonthlyGrid);
                                    }
                                    if (parsed.weatherHourlyGrid && Array.isArray(parsed.weatherHourlyGrid)) {
                                        setWeatherHourlyGrid(parsed.weatherHourlyGrid);
                                    }
                                    if (parsed.weatherMonthlyGrid && Array.isArray(parsed.weatherMonthlyGrid)) {
                                        setWeatherMonthlyGrid(parsed.weatherMonthlyGrid);
                                    }
                                    if (parsed.kendalaItems && Array.isArray(parsed.kendalaItems)) {
                                        setKendalaItems(parsed.kendalaItems);
                                    }

                                    if (parsed.effectiveHoursTable && Array.isArray(parsed.effectiveHoursTable)) {
                                        setEffectiveHoursTable(generateEffectiveHoursDates(sDate, parsed.effectiveHoursTable));
                                    }
                                    if (parsed.effectiveHoursMonthlyTable && Array.isArray(parsed.effectiveHoursMonthlyTable)) {
                                        setEffectiveHoursMonthlyTable(parsed.effectiveHoursMonthlyTable);
                                    }
                                    setWaktuKerjaSummaryText(parsed.waktuKerjaSummaryText || "");

                                    if (parsed.weatherSummaryTable && Array.isArray(parsed.weatherSummaryTable)) {
                                        setWeatherSummaryTable(parsed.weatherSummaryTable);
                                    }
                                    setWeatherSummaryText(parsed.weatherSummaryText || "");

                                    setWeeklyActivitiesThisWeek(parsed.weeklyActivitiesThisWeek || []);
                                    setWeeklyActivitiesNextWeek(parsed.weeklyActivitiesNextWeek || []);
                                    setAttachedDailyReports(parsed.attachedDailyReports || []);

                                    setApprovedBy(parsed.approvedBy || "");
                                    setApprovedByRole(parsed.approvedByRole || "Project Manager / Direktur");
                                    setPreparedBy(parsed.preparedBy || "");
                                    setPreparedByRole(parsed.preparedByRole || "Project Officer / Pengawas");
                                    setPhotos(parsed.photos || []);

                                    setIsTitleManuallyEdited(true);
                                    setIsDocIdManuallyEdited(true);
                                } else {
                                    setEditorContent(data.content || "");
                                }
                            } catch(e) {
                                setEditorContent(data.content || "");
                            }
                        } else {
                            setEditorContent(data.content || "");
                        }

                        if (paramRevise) {
                            setReportId(null);
                            try {
                                const parsed = data.content ? JSON.parse(data.content || "{}") : {};
                                const curRev = parseInt(parsed.revision || "00", 10);
                                const nextRev = String(isNaN(curRev) ? 1 : curRev + 1).padStart(2, "0");
                                setRevision(nextRev);
                            } catch(e) {}
                        }
                    }
                } catch (err) {
                    console.error("Error loading report details:", err);
                    alert("Error loading report details");
                } finally {
                    setIsLoading(false);
                    if (paramExport) {
                        setTimeout(() => {
                            handleExportPdf();
                        }, 500);
                    }
                }
            };
            fetchReportDetails();
        }
    }, [paramId, paramRevise, paramExport]);

    // Auto-calculate Sisa Hari
    useEffect(() => {
        const total = parseInt(totalDays) || 0;
        const day = parseInt(dayNumber) || 0;
        if (total > 0 && day > 0) {
            setRemainingDays((total - day).toString());
        } else {
            setRemainingDays("");
        }
    }, [dayNumber, totalDays]);

    // Auto-generate Document Title and ID
    useEffect(() => {
        if (isLoading || paramId) return;

        const currentProj = projects.find(p => p.id === selectedProjectId);
        if (!currentProj) return;

        if (reportType === "daily") {
            if (!isDocIdManuallyEdited) {
                const weekVal = getWeekOfYear(reportDate);
                const dayOfWeekVal = getDayOfWeekNumber(reportDate);
                setDocumentId(`LH-${weekVal}-${dayOfWeekVal}`);
            }
            if (!isTitleManuallyEdited) {
                const dayVal = dayNumber || "1";
                setTitle(`LH - ${currentProj.project_code || currentProj.name} - H${dayVal}`);
            }
        } else if (reportType === "weekly") {
            const formattedWeek = weekNumber ? weekNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited) {
                setDocumentId(`LM-${formattedWeek}-01`);
            }
            if (!isTitleManuallyEdited) {
                setTitle(`Laporan Mingguan ${formattedWeek} - ${currentProj.project_code || currentProj.name}`);
            }
        }
    }, [selectedProjectId, dayNumber, reportDate, weekNumber, reportType, projects, isLoading, paramId, isTitleManuallyEdited, isDocIdManuallyEdited]);

    const getWeekOfYear = (dateStr: string) => {
        if (!dateStr) return "01";
        const date = new Date(dateStr);
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const diff = date.getTime() - startOfYear.getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        const dayOfYear = Math.floor(diff / oneDay) + 1;
        const week = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
        return week.toString().padStart(2, "0");
    };

    const getDayOfWeekNumber = (dateStr: string) => {
        if (!dateStr) return "01";
        const date = new Date(dateStr);
        const day = date.getDay();
        return (day + 1).toString().padStart(2, "0");
    };

    // Computes LM-XX-YY or LB-XX-YY for each page in Weekly / Monthly Report
    const getReportPageDocCode = (pageIndex: number) => {
        const pageStr = String(pageIndex).padStart(2, "0");
        if (reportType === "monthly") {
            const month = monthNumber ? monthNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited || !documentId) {
                return `LB-${month}-${pageStr}`;
            }
            const match = documentId.match(/^(.*?-)(\d{1,2})$/);
            if (match) {
                return `${match[1]}${pageStr}`;
            }
            return `${documentId}-${pageStr}`;
        } else {
            const week = weekNumber ? weekNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited || !documentId) {
                return `LM-${week}-${pageStr}`;
            }
            const match = documentId.match(/^(.*?-)(\d{1,2})$/);
            if (match) {
                return `${match[1]}${pageStr}`;
            }
            return `${documentId}-${pageStr}`;
        }
    };

    const getWeeklyPageDocCode = getReportPageDocCode;

    const getGeneratedFilename = () => {
        const datePart = reportDate ? reportDate.replace(/-/g, "") : "YYYYMMDD";
        const currentProj = projects.find(p => p.id === selectedProjectId);
        const codePart = currentProj?.project_code || "KODE";
        
        let docPart = "00_00";
        if (documentId) {
            docPart = documentId.replace(/[^A-Z0-9]/gi, "_").toUpperCase();
        }

        const revPart = revision ? `R${revision}` : "R0";
        const typePart = reportType === "daily" ? "LH" : reportType === "weekly" ? "LM" : "LB";
        return `${datePart}_${codePart}_${typePart}_${docPart}_${revPart}.pdf`;
    };

    // Auto Sync Weekly Data from Daily Reports
    const handleSyncFromDailyReports = async () => {
        if (!selectedProjectId) {
            toast.error("Pilih proyek terlebih dahulu.");
            return;
        }
        if (!startDate || !endDate) {
            toast.error("Tentukan rentang tanggal periode laporan.");
            return;
        }

        setIsSyncing(true);
        const syncToast = toast.loading("Mengambil & merangkum data Laporan Harian...");
        try {
            const { data: dailyReports, error } = await supabase
                .from("project_reports")
                .select("*")
                .eq("project_id", selectedProjectId)
                .eq("report_type", "daily")
                .gte("report_date", startDate)
                .lte("report_date", endDate)
                .order("report_date", { ascending: true });

            if (error) throw error;

            if (!dailyReports || dailyReports.length === 0) {
                toast.error("Tidak ditemukan Laporan Harian (LH) pada rentang tanggal ini.", { id: syncToast });
                setIsSyncing(false);
                return;
            }

            const parsedLogs = dailyReports.map(r => {
                let contentObj: any = {};
                try { contentObj = JSON.parse(r.content || "{}"); } catch(e) {}
                return {
                    id: r.id,
                    report_date: r.report_date,
                    title: r.title,
                    progress: r.progress || 0,
                    manpowerCount: r.manpower_count || 0,
                    weatherCondition: r.weather_condition || "",
                    content: contentObj,
                };
            });

            // 1. Progress & Days calculation
            const maxProgress = Math.max(...parsedLogs.map(l => l.progress), 0);
            const prevProg = parseFloat(progressLastWeek) || 0;
            const thisWeekProg = Math.max(0, maxProgress - prevProg);
            setProgressThisWeek(thisWeekProg.toFixed(3));
            setProgressTotal(maxProgress.toFixed(3));
            setProgressRemaining((Math.max(0, 100 - maxProgress)).toFixed(3));
            setProgress(maxProgress.toString());

            const lastLogWithDays = parsedLogs.slice().reverse().find(l => l.content?.dayNumber || l.content?.totalDays);
            if (lastLogWithDays?.content?.dayNumber) {
                setDayNumber(lastLogWithDays.content.dayNumber.toString());
            }
            if (lastLogWithDays?.content?.totalDays) {
                setTotalDays(lastLogWithDays.content.totalDays.toString());
            }

            // 2. Aggregate & Smart Group Work Items
            const rawWorkItems: { description: string; duration: string; position: string; volume: string }[] = [];
            const allNextActions: string[] = [];
            const extractedKendala: KendalaItem[] = [];
            let totalPm = 0, totalSm = 0, totalSv = 0, totalMd = 0, totalTk = 0, totalPk = 0, totalOp = 0;
            let totalCerahHours = 0, totalBerawanHours = 0, totalHujanHours = 0;

            const dayKeys: ("senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu")[] = [
                "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"
            ];

            const newPersonelGrid = [...defaultPersonelRoles.map(r => ({ ...r }))];
            const newWeatherHourlyGrid = createDefaultHourlyWeather();

            parsedLogs.forEach(log => {
                const logDate = new Date(log.report_date);
                const dayIndex = logDate.getDay() === 0 ? 6 : logDate.getDay() - 1; // 0=Senin, 6=Minggu
                const dayKey = dayKeys[dayIndex];

                const c = log.content;
                if (c.workItems && Array.isArray(c.workItems)) {
                    c.workItems.forEach((wi: any) => {
                        if (wi.description) {
                            rawWorkItems.push({
                                description: wi.description.trim(),
                                duration: "1 hari",
                                position: wi.position || "—",
                                volume: wi.volume || "—",
                            });
                        }
                    });
                }
                if (c.nextActions) {
                    allNextActions.push(c.nextActions);
                }
                if (c.notes) {
                    extractedKendala.push({
                        date: log.report_date,
                        problem: c.notes,
                        solution: c.nextActions || "Penanganan lapangan secara intensif",
                        recommendation: "Evaluasi pengawasan & penambahan sumber daya"
                    });
                }

                // Personnel breakdown into grid
                const p = c.personnel || {};
                const pm = parseInt(p.projectManager) || 0;
                const sm = parseInt(p.siteManager) || 0;
                const sv = parseInt(p.supervisor) || 0;
                const md = parseInt(p.mandor) || 0;
                const tk = parseInt(p.tukang) || 0;
                const pk = parseInt(p.pekerja) || 0;
                const op = parseInt(p.operator) || 0;

                totalPm += pm; totalSm += sm; totalSv += sv; totalMd += md; totalTk += tk; totalPk += pk; totalOp += op;

                if (dayKey) {
                    newPersonelGrid[0][dayKey] = pm;
                    newPersonelGrid[1][dayKey] = sm;
                    newPersonelGrid[2][dayKey] = sv;
                    newPersonelGrid[8][dayKey] = md;
                    newPersonelGrid[9][dayKey] = tk;
                    newPersonelGrid[12][dayKey] = pk;
                    newPersonelGrid[13][dayKey] = op;
                }

                // Weather 24h matrix mapping
                if (dayKey && c.weatherItems && Array.isArray(c.weatherItems)) {
                    c.weatherItems.forEach((w: any) => {
                        const timeStr = w.timeRange || "";
                        const match = timeStr.match(/(\d{1,2})[\.:](\d{2})\s*-\s*(\d{1,2})[\.:](\d{2})/);
                        if (match) {
                            const startHour = Math.max(1, Math.min(24, parseInt(match[1])));
                            const endHour = Math.max(startHour, Math.min(24, parseInt(match[3])));
                            const condCode = w.condition === "cerah" ? "C" : w.condition === "berawan" ? "B" : "H";
                            for (let h = startHour; h <= endHour; h++) {
                                const rowIdx = h - 1;
                                if (newWeatherHourlyGrid[rowIdx]) {
                                    newWeatherHourlyGrid[rowIdx][dayKey] = condCode;
                                }
                            }
                        }

                        // Weather duration count for summary
                        const matchDur = (w.timeRange || "").match(/(\d{2})[\.:](\d{2})\s*-\s*(\d{2})[\.:](\d{2})/);
                        const dur = matchDur ? (parseFloat(matchDur[3]) - parseFloat(matchDur[1]) || 1) : 1;
                        if (w.condition === "cerah") totalCerahHours += dur;
                        else if (w.condition === "berawan") totalBerawanHours += dur;
                        else if (w.condition === "hujan") totalHujanHours += dur;
                    });
                }
            });

            setPersonelWeeklyGrid(newPersonelGrid);
            setWeatherHourlyGrid(newWeatherHourlyGrid);

            if (reportType === "monthly") {
                const startT = new Date(startDate).getTime();
                const newPersonelMonthlyGrid = [...defaultPersonelMonthlyRoles.map(r => ({ ...r }))];
                const newWeatherMonthlyGrid = [...defaultWeatherMonthlyGrid.map(r => ({ ...r }))];
                const weekCounts = [0, 0, 0, 0, 0];

                parsedLogs.forEach(log => {
                    const lDate = new Date(log.report_date).getTime();
                    const diffDays = Math.floor((lDate - startT) / (86400000));
                    const wIdx = Math.max(0, Math.min(4, Math.floor(diffDays / 7)));
                    weekCounts[wIdx]++;

                    const c = log.content || {};
                    const p = c.personnel || {};
                    const pm = parseInt(p.projectManager) || 0;
                    const sm = parseInt(p.siteManager) || 0;
                    const sv = parseInt(p.supervisor) || 0;
                    const md = parseInt(p.mandor) || 0;
                    const tk = parseInt(p.tukang) || 0;
                    const pk = parseInt(p.pekerja) || 0;
                    const op = parseInt(p.operator) || 0;

                    const key = `minggu${wIdx + 1}` as "minggu1" | "minggu2" | "minggu3" | "minggu4" | "minggu5";
                    newPersonelMonthlyGrid[0][key] += pm;
                    newPersonelMonthlyGrid[1][key] += sm;
                    newPersonelMonthlyGrid[2][key] += sv;
                    newPersonelMonthlyGrid[8][key] += md;
                    newPersonelMonthlyGrid[9][key] += tk;
                    newPersonelMonthlyGrid[12][key] += pk;
                    newPersonelMonthlyGrid[13][key] += op;

                    if (c.weatherItems && Array.isArray(c.weatherItems)) {
                        c.weatherItems.forEach((w: any) => {
                            const timeStr = w.timeRange || "";
                            const matchDur = timeStr.match(/(\d{1,2})[\.:](\d{2})\s*-\s*(\d{1,2})[\.:](\d{2})/);
                            const dur = matchDur ? Math.max(1, parseInt(matchDur[3]) - parseInt(matchDur[1])) : 1;
                            const hKey = `minggu${wIdx + 1}Hours` as "minggu1Hours" | "minggu2Hours" | "minggu3Hours" | "minggu4Hours" | "minggu5Hours";
                            if (w.condition === "cerah") newWeatherMonthlyGrid[0][hKey] += dur;
                            else if (w.condition === "berawan") newWeatherMonthlyGrid[1][hKey] += dur;
                            else if (w.condition === "hujan") newWeatherMonthlyGrid[2][hKey] += dur;
                        });
                    }
                });

                for (let w = 0; w < 5; w++) {
                    const key = `minggu${w + 1}` as "minggu1" | "minggu2" | "minggu3" | "minggu4" | "minggu5";
                    const cnt = weekCounts[w] || 1;
                    newPersonelMonthlyGrid.forEach(row => {
                        row[key] = Math.round(row[key] / cnt);
                    });
                }

                setPersonelMonthlyGrid(newPersonelMonthlyGrid);
                setWeatherMonthlyGrid(newWeatherMonthlyGrid);

                const newEffectiveHoursMonthlyTable = [1, 2, 3, 4, 5].map((wNum) => {
                    const hKey = `minggu${wNum}Hours` as "minggu1Hours" | "minggu2Hours" | "minggu3Hours" | "minggu4Hours" | "minggu5Hours";
                    const cerahH = newWeatherMonthlyGrid[0][hKey];
                    const berawanH = newWeatherMonthlyGrid[1][hKey];
                    const totH = cerahH + berawanH + newWeatherMonthlyGrid[2][hKey];
                    const effH = cerahH + Math.round(berawanH * 0.8);
                    return {
                        weekLabel: `Minggu ${wNum}`,
                        dateRangeStr: `Minggu ${wNum}`,
                        totalHours: (totH || 56).toString(),
                        effectiveHours: (effH || 48).toString(),
                    };
                });
                setEffectiveHoursMonthlyTable(newEffectiveHoursMonthlyTable);
            }

            if (extractedKendala.length > 0) {
                setKendalaItems(extractedKendala);
            }

            // Smart group identical items
            const groupedItemsMap: { [key: string]: { description: string; duration: string; position: string; volume: string } } = {};
            rawWorkItems.forEach(item => {
                const normKey = item.description.toLowerCase().replace(/\s+/g, " ");
                if (!groupedItemsMap[normKey]) {
                    groupedItemsMap[normKey] = { ...item };
                } else {
                    const existing = groupedItemsMap[normKey];
                    const v1 = parseFloat(existing.volume);
                    const v2 = parseFloat(item.volume);
                    if (!isNaN(v1) && !isNaN(v2)) {
                        const unitMatch = existing.volume.match(/[a-zA-Z3²]+/);
                        const unit = unitMatch ? ` ${unitMatch[0]}` : "";
                        existing.volume = `${(v1 + v2).toFixed(1).replace(/\.0$/, "")}${unit}`;
                    } else if (item.volume && item.volume !== "—" && !existing.volume.includes(item.volume)) {
                        existing.volume = existing.volume && existing.volume !== "—" ? `${existing.volume}, ${item.volume}` : item.volume;
                    }
                }
            });

            const aggregatedWorkItems = Object.values(groupedItemsMap);

            const count = parsedLogs.length || 1;
            const staffIntiAvg = Math.round((totalPm + totalSm + totalSv) / count);
            const tukangPekerjaAvg = Math.round((totalMd + totalTk + totalPk + totalOp) / count);
            const totalAvg = staffIntiAvg + tukangPekerjaAvg;

            setAvgStaffInti(staffIntiAvg.toString());
            setAvgTukangPekerja(tukangPekerjaAvg.toString());
            setAvgTotalPersonel(totalAvg.toString());

            // Weather days calculation (8h/day standard)
            const cerahDays = (totalCerahHours / 8).toFixed(3);
            const berawanDays = (totalBerawanHours / 8).toFixed(3);
            const hujanDays = (totalHujanHours / 8).toFixed(3);

            setWeatherSummaryTable([
                { condition: "Cerah", hours: totalCerahHours.toString(), days: cerahDays },
                { condition: "Berawan", hours: totalBerawanHours.toString(), days: berawanDays },
                { condition: "Hujan", hours: totalHujanHours.toString(), days: hujanDays },
            ]);

            // Update effective hours table with exact dates
            setEffectiveHoursTable(generateEffectiveHoursDates(startDate, effectiveHoursTable));

            if (aggregatedWorkItems.length > 0) {
                setWeeklyActivitiesThisWeek(aggregatedWorkItems);
            }
            if (allNextActions.length > 0) {
                setWeeklyActivitiesNextWeek(allNextActions.map(na => ({
                    description: na,
                    duration: "1 hari",
                    position: "—",
                    volume: "—"
                })));
            }

            // Summaries text auto-generate
            setSummaryText(`Pekerjaan pada minggu ini mengalami kemajuan pekerjaan sebesar ${thisWeekProg.toFixed(3)}% sehingga total kemajuan yang telah dikerjakan hingga minggu ini adalah sebesar ${maxProgress.toFixed(3)}%.`);
            setPersonelSummaryText(`Dengan jumlah pekerja rata-rata ${totalAvg} orang per hari, sudah cukup efektif. Namun dengan sisa hari sebesar ${remainingDays || "—"} hari dari jadwal, maka perlu dipertimbangkan ketersediaan tenaga kerja.`);
            setWaktuKerjaSummaryText(`Waktu kerja efektif adalah rata-rata 8 jam per hari, atau 56 jam per minggu.`);
            setWeatherSummaryText(`Cuaca cenderung ${totalHujanHours > 0 ? `hujan selama ${hujanDays} hari/minggu atau sekitar ${Math.round((totalHujanHours/(totalCerahHours+totalBerawanHours+totalHujanHours||1))*100)}%, mengakibatkan waktu kerja efektif berkurang.` : 'cerah dan berawan, mendukung kelancaran pekerjaan.'}`);

            // Photos aggregation & limit 18
            const aggregatedPhotos: { url: string; caption: string; dateStr?: string }[] = [];
            parsedLogs.forEach(l => {
                if (l.content.photos && Array.isArray(l.content.photos)) {
                    l.content.photos.forEach((p: any) => {
                        if (p.url && !aggregatedPhotos.some(ap => ap.url === p.url)) {
                            aggregatedPhotos.push({ url: p.url, caption: p.caption || `Foto Lapangan ${l.report_date}`, dateStr: l.report_date });
                        }
                    });
                }
            });
            
            setAllDailyPhotos(aggregatedPhotos);
            if (aggregatedPhotos.length > 0) {
                setPhotos(aggregatedPhotos.slice(0, 18));
                if (aggregatedPhotos.length > 18) {
                    toast.success(`Ditemukan ${aggregatedPhotos.length} foto pada LH. 18 foto pertama otomatis dipilih untuk Laporan Utama.`, { duration: 5000 });
                }
            }

            setAttachedDailyReports(parsedLogs);
            toast.success(`Berhasil merangkum ${parsedLogs.length} Laporan Harian!`, { id: syncToast });
        } catch (err: any) {
            console.error("Sync error:", err);
            toast.error(`Gagal sinkron data: ${err.message}`, { id: syncToast });
        } finally {
            setIsSyncing(false);
        }
    };

    // Merging activity helper
    const handleMergeActivity = (sourceIdx: number, targetIdx: number) => {
        if (sourceIdx === targetIdx) return;
        const copy = [...weeklyActivitiesThisWeek];
        const source = copy[sourceIdx];
        const target = copy[targetIdx];

        const sourceVolNum = parseFloat(source.volume);
        const targetVolNum = parseFloat(target.volume);

        let newVol = target.volume;
        if (!isNaN(sourceVolNum) && !isNaN(targetVolNum)) {
            const unitMatch = target.volume.match(/[a-zA-Z3²]+/);
            const unit = unitMatch ? ` ${unitMatch[0]}` : "";
            newVol = `${(targetVolNum + sourceVolNum).toFixed(1).replace(/\.0$/, "")}${unit}`;
        } else if (source.volume && source.volume !== "—" && !target.volume.includes(source.volume)) {
            newVol = target.volume && target.volume !== "—" ? `${target.volume}, ${source.volume}` : source.volume;
        }

        copy[targetIdx] = {
            ...target,
            volume: newVol
        };

        copy.splice(sourceIdx, 1);
        setWeeklyActivitiesThisWeek(copy);
        toast.success(`Berhasil menggabungkan ke #${targetIdx + 1}`);
    };

    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (photos.length >= 18) {
            toast.error("Maksimal 18 foto dokumentasi pada Laporan Mingguan Utama. Foto selebihnya tersimpan pada lampiran Laporan Harian.");
            return;
        }

        setUploadingPhoto(true);
        try {
            const fileName = `report-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
            const { data, error } = await supabase.storage
                .from("attendance_photos")
                .upload(fileName, file, { contentType: file.type });

            if (error) throw error;

            const { data: pData } = supabase.storage.from("attendance_photos").getPublicUrl(fileName);
            const photoUrl = pData?.publicUrl;

            if (photoUrl) {
                setPhotos(prev => [...prev, { url: photoUrl, caption: "" }]);
            } else {
                alert("Gagal mendapatkan URL publik foto.");
            }
        } catch (err) {
            console.error("Error uploading photo:", err);
            alert("Gagal mengunggah foto.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handlePhotoCaptionChange = (index: number, caption: string) => {
        const copy = [...photos];
        copy[index].caption = caption;
        setPhotos(copy);
    };

    const togglePhotoSelection = (p: { url: string; caption: string }) => {
        const exists = photos.some(item => item.url === p.url);
        if (exists) {
            setPhotos(photos.filter(item => item.url !== p.url));
        } else {
            if (photos.length >= 18) {
                toast.error("Maksimal 18 foto dokumentasi pada Laporan Mingguan Utama.");
                return;
            }
            setPhotos([...photos, { url: p.url, caption: p.caption }]);
        }
    };

    const handleSave = async () => {
        if (!selectedProjectId) {
            alert("Pilih proyek terlebih dahulu.");
            return;
        }
        if (!title) {
            alert("Masukkan judul laporan.");
            return;
        }

        setIsSaving(true);
        try {
            let computedManpower: number | null = null;
            let summaryWeather: string | null = null;
            let finalContent = editorContent;

            if (reportType === "daily") {
                const pm = parseInt(pmCount) || 0;
                const sm = parseInt(smCount) || 0;
                const sv = parseInt(supervisorCount) || 0;
                const md = parseInt(mandorCount) || 0;
                const tk = parseInt(tukangCount) || 0;
                const pk = parseInt(pekerjaCount) || 0;
                const op = parseInt(operatorCount) || 0;
                computedManpower = pm + sm + sv + md + tk + pk + op;

                summaryWeather = weatherItems.length > 0 
                    ? weatherItems.map(w => `${w.timeRange}: ${w.condition}`).join(", ")
                    : "Cerah";

                const templateData = {
                    locationOverride,
                    dayNumber: dayNumber ? parseInt(dayNumber) : null,
                    totalDays: totalDays ? parseInt(totalDays) : null,
                    remainingDays: remainingDays ? parseInt(remainingDays) : null,
                    workPackage,
                    documentId,
                    revision,
                    workItems,
                    personnel: { projectManager: pm, siteManager: sm, supervisor: sv, mandor: md, tukang: tk, pekerja: pk, operator: op },
                    workHours: { reguler: shiftReguler ? parseFloat(shiftReguler) : 0, ot1: shiftOt1 ? parseFloat(shiftOt1) : 0, ot2: shiftOt2 ? parseFloat(shiftOt2) : 0, ot3: shiftOt3 ? parseFloat(shiftOt3) : 0 },
                    weatherItems,
                    notes,
                    approvedBy,
                    approvedByRole,
                    preparedBy,
                    preparedByRole,
                    photos,
                    materialItems,
                    nextActions
                };
                finalContent = JSON.stringify(templateData);
            } else if (reportType === "weekly" || reportType === "monthly") {
                const weeklyTemplateData = {
                    startDate,
                    endDate,
                    weekNumber,
                    monthNumber,
                    dayNumber: dayNumber ? parseInt(dayNumber) : null,
                    totalDays: totalDays ? parseInt(totalDays) : null,
                    remainingDays: remainingDays ? parseInt(remainingDays) : null,
                    workPackage,
                    documentId: documentId || (reportType === "monthly" ? `LB-${monthNumber.padStart(2, "0")}-01` : `LM-${weekNumber.padStart(2, "0")}-01`),
                    revision,
                    locationOverride,
                    progressLastWeek,
                    progressThisWeek,
                    progressTotal,
                    progressRemaining,
                    summaryText,
                    catatanUmum,
                    avgStaffInti,
                    avgTukangPekerja,
                    avgTotalPersonel,
                    personelSummaryText,
                    personelWeeklyGrid,
                    personelMonthlyGrid,
                    weatherHourlyGrid,
                    weatherMonthlyGrid,
                    kendalaItems,
                    effectiveHoursTable,
                    effectiveHoursMonthlyTable,
                    waktuKerjaSummaryText,
                    weatherSummaryTable,
                    weatherSummaryText,
                    weeklyActivitiesThisWeek,
                    weeklyActivitiesNextWeek,
                    attachedDailyReports,
                    approvedBy,
                    approvedByRole,
                    preparedBy,
                    preparedByRole,
                    photos
                };
                finalContent = JSON.stringify(weeklyTemplateData);
            }

            const payload = {
                project_id: selectedProjectId,
                report_type: reportType,
                title,
                report_date: reportDate,
                progress: parseFloat(progressTotal) || parseFloat(progress) || 0,
                status,
                manpower_count: reportType === "daily" ? computedManpower : parseInt(avgTotalPersonel) || null,
                weather_condition: reportType === "daily" ? summaryWeather : null,
                content: finalContent || null,
                updated_at: new Date().toISOString(),
            };

            const { data: { user } } = await supabase.auth.getUser();

            if (!reportId) {
                const { error } = await supabase.from("project_reports").insert({
                    ...payload,
                    created_by: user?.id
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from("project_reports").update(payload).eq("id", reportId);
                if (error) throw error;
            }

            router.push(`/flow/reports/${reportType}`);
        } catch (err: any) {
            console.error("Error saving report:", err);
            alert(`Gagal menyimpan laporan: ${err.message || err.details || JSON.stringify(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const currentProject = projects.find(p => p.id === selectedProjectId);

    const getFormattedDate = () => {
        if (!reportDate) return "-";
        try {
            const date = new Date(reportDate);
            return date.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: '2-digit' }).replace(/\./g, '');
        } catch(e) {
            return reportDate;
        }
    };

    const getPeriodFormattedDate = () => {
        if (!startDate || !endDate) return "-";
        try {
            const d1 = new Date(startDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\./g, '');
            const d2 = new Date(endDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\./g, '');
            return `${d1} s.d. ${d2}`;
        } catch(e) {
            return `${startDate} s.d. ${endDate}`;
        }
    };

    const getDayName = () => {
        if (!reportDate) return "-";
        try {
            return new Date(reportDate).toLocaleDateString("id-ID", { weekday: 'long' });
        } catch(e) { return "-"; }
    };

    const getDayDateOnly = () => {
        if (!reportDate) return "-";
        try {
            return new Date(reportDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\./g, '');
        } catch(e) { return "-"; }
    };

    // Shared Header Renderer for Adidaya Document Standard
    const renderPageHeader = (headerTypeLabel: string, pageDocCode: string, subLabel: string) => (
        <div className="flex items-center gap-4 border-b-2 border-neutral-900 pb-3">
            {/* Left: Logo */}
            <div className="flex items-center shrink-0">
                <img src="/logo-adidaya-red.svg" alt="Adidaya" className="h-8 w-auto object-contain filter brightness-0" />
            </div>

            {/* Center: Project Info */}
            <div className="flex-1 pl-4 border-l border-neutral-300 space-y-0.5">
                <div className="text-[6px] font-bold text-neutral-400 uppercase tracking-widest">Proyek</div>
                <div className="flex items-center gap-2">
                    {currentProject?.project_code && (
                        <span className="inline-block px-1.5 py-0.5 bg-neutral-900 text-white text-[7px] font-black uppercase tracking-widest rounded-sm leading-none shrink-0">
                            {currentProject.project_code}
                        </span>
                    )}
                    <span className="font-extrabold text-[11px] text-neutral-900 tracking-tight uppercase leading-tight">
                        {currentProject?.name || "NAMA PROYEK"}
                    </span>
                </div>
                <div className="text-[6px] font-bold text-neutral-400 uppercase tracking-widest pt-1">Lokasi</div>
                <div className="text-[8px] font-semibold text-neutral-700 uppercase leading-tight">
                    {locationOverride || currentProject?.location || "—"}
                </div>
                <div className="text-[6px] font-bold text-neutral-400 uppercase tracking-widest pt-1">Tahap Pekerjaan</div>
                <div className="text-[7.5px] font-bold text-neutral-800 uppercase leading-tight">{workPackage || "—"}</div>
            </div>

            {/* Right: Stamp Box */}
            <div className="w-[130px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
                <div className="font-black text-[34px] text-neutral-900 leading-none tracking-tighter">{headerTypeLabel}</div>
                <div className="text-[5px] font-black text-neutral-500 uppercase tracking-[0.15em] leading-none">{subLabel}</div>
                <div className="w-full border-t border-neutral-300 my-1" />
                <div className="font-black text-[12px] text-neutral-900 tracking-tight leading-none">{pageDocCode}</div>
                <div className="w-full border-t border-neutral-200 my-1" />
                <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                    <span className="text-left font-bold">TGL LAPORAN</span>
                    <span className="text-right font-bold">REV</span>
                    <span className="text-left font-black text-neutral-800">{getDayDateOnly()}</span>
                    <span className="text-right font-black text-neutral-800">{revision || "00"}</span>
                </div>
            </div>
        </div>
    );

    // Shared Date Meta Row Renderer
    const renderWeeklyDateMetaRow = () => (
        <div className="grid grid-cols-5 border border-neutral-300 rounded overflow-hidden text-center">
            {[
                { label: "Periode", value: getPeriodFormattedDate() },
                { label: reportType === "monthly" ? "Bulan Ke-" : "Minggu Ke-", value: reportType === "monthly" ? (monthNumber ? monthNumber.padStart(2, "0") : "01") : (weekNumber ? weekNumber.padStart(2, "0") : "01") },
                { label: "Hari Ke-", value: dayNumber || "—" },
                { label: "Total Hari", value: totalDays || "—" },
                { label: "Sisa Hari", value: remainingDays || "—" },
            ].map((cell, i) => (
                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{cell.label}</div>
                    <div className="text-[8px] font-bold text-neutral-800 py-1">{cell.value}</div>
                </div>
            ))}
        </div>
    );

    const handleExportPdf = async () => {
        if (!selectedProjectId) {
            alert("Pilih proyek terlebih dahulu.");
            return;
        }

        const previewElement = document.getElementById("document-preview-a4");
        if (!previewElement) {
            alert("Preview document tidak ditemukan.");
            return;
        }

        setIsExporting(true);
        const exportToast = toast.loading("Sedang memproses ekspor dokumen PDF...");

        try {
            const clone = previewElement.cloneNode(true) as HTMLElement;
            clone.style.width = "794px";
            clone.style.maxWidth = "794px";
            clone.style.margin = "0 auto";
            clone.style.transform = "none";
            clone.style.boxShadow = "none";
            clone.style.border = "none";

            // Strip drop shadow, outlines and page borders for clean PDF export
            const pageBreakEls = clone.querySelectorAll(".weekly-page-break, #document-preview-a4 > div");
            pageBreakEls.forEach((el) => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.boxShadow = "none";
                htmlEl.style.border = "none";
                htmlEl.style.outline = "none";
                htmlEl.classList.remove("shadow-xl", "border", "border-neutral-300");
            });

            const images = clone.querySelectorAll("img");
            images.forEach((img) => {
                const src = img.getAttribute("src");
                if (src && !src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:")) {
                    img.setAttribute("src", new URL(src, window.location.origin).href);
                }
            });

            let stylesHTML = "";
            document.head.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
                if (node.tagName.toLowerCase() === "link") {
                    const href = node.getAttribute("href");
                    if (href) {
                        const absoluteHref = href.startsWith("http") ? href : new URL(href, window.location.origin).href;
                        stylesHTML += `<link rel="stylesheet" href="${absoluteHref}">\n`;
                    }
                } else {
                    stylesHTML += node.outerHTML + "\n";
                }
            });

            const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${getGeneratedFilename()}</title>
    ${stylesHTML}
    <style>
        @page {
            size: A4 portrait;
            margin: 14mm 0mm 12mm 0mm;
        }
        * {
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
        }
        body {
            margin: 0;
            padding: 0;
            background-color: #ffffff !important;
            color: #1f2937 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .a4-wrapper {
            width: 794px !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
        }
        .weekly-page-break {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            outline: none !important;
            background: #ffffff !important;
        }
    </style>
</head>
<body>
    <div class="a4-wrapper">
        ${clone.outerHTML}
    </div>
</body>
</html>`;

            const response = await fetch("/api/flow/reports/export-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ html: fullHTML }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal membuat PDF dari server.");
            }

            const blob = await response.blob();
            const fileName = getGeneratedFilename();

            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success("PDF berhasil diexport!", { id: exportToast });
        } catch (error: any) {
            console.error("Export PDF error:", error);
            toast.error(error.message || "Gagal mengexport PDF.", { id: exportToast });
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-neutral-50 dark:bg-neutral-950">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <span className="text-sm font-semibold text-neutral-500">Memuat Editor Laporan...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col lg:overflow-hidden space-y-5 pb-6">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/40 dark:hover:bg-neutral-800/40 rounded-full text-neutral-500 border border-neutral-200/50 dark:border-neutral-800/60 bg-white/20 transition-colors"
                        title="Kembali"
                    >
                        <ArrowLeft className="w-4 h-4 text-neutral-800 dark:text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white leading-tight">
                            {reportId ? `Edit Laporan ${reportType === "daily" ? "Harian (LH)" : reportType === "weekly" ? "Mingguan (LM)" : "Bulanan"}` : `Buat Laporan ${reportType === "daily" ? "Harian (LH)" : reportType === "weekly" ? "Mingguan (LM)" : "Bulanan"}`}
                        </h1>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-0.5">
                            Sistem Laporan & Dokumen Proyek Adidaya Studio
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => router.back()} 
                        className="px-4 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                        Batal
                    </button>
                    <Button 
                        onClick={handleExportPdf}
                        disabled={isExporting}
                        className="bg-neutral-800 hover:bg-neutral-900 text-white font-bold"
                        icon={isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    >
                        Export PDF
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-[#0f172a] hover:bg-black text-white font-bold"
                        icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    >
                        Simpan Laporan
                    </Button>
                </div>
            </div>

            {/* Daily Tabs */}
            {reportType === "daily" && (
                <div className="flex border-b border-neutral-200/60 dark:border-neutral-800/60 px-2 overflow-x-auto shrink-0 gap-1">
                    {([
                        { key: "general", label: "Info Umum" },
                        { key: "workItems", label: `Uraian Kerja (${workItems.length})` },
                        { key: "personnel", label: "Tenaga & Shift" },
                        { key: "cuaca", label: "Cuaca" },
                        { key: "material", label: "Material" },
                        { key: "catatan", label: "Catatan" },
                        { key: "dokumentasi", label: "Dokumentasi" },
                        { key: "ttd", label: "TTD" },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={clsx(
                                "pb-2.5 pt-1 px-3 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all",
                                activeTab === tab.key
                                    ? "border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold"
                                    : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Weekly & Monthly Tabs */}
            {(reportType === "weekly" || reportType === "monthly") && (
                <div className="flex border-b border-neutral-200/60 dark:border-neutral-800/60 px-2 overflow-x-auto shrink-0 gap-1">
                    {([
                        { key: "general", label: "1. Info & Periode" },
                        { key: "summary", label: "2. Executive Summary" },
                        { key: "kegiatan", label: "3. Kegiatan Pekerjaan" },
                        { key: "personel", label: "4. Personel Harian" },
                        { key: "cuaca", label: "5. Cuaca 24j & Kendala" },
                        { key: "dokumentasi", label: "6. Dokumentasi" },
                        { key: "ttd", label: "7. TTD & Approval" },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setWeeklyTab(tab.key)}
                            className={clsx(
                                "pb-2.5 pt-1 px-3 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all",
                                weeklyTab === tab.key
                                    ? "border-neutral-900 text-neutral-900 dark:text-white font-extrabold"
                                    : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Split Screen Layout */}
            <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:overflow-hidden">
                
                {/* Left Form Card */}
                <div className="w-full lg:w-[45%] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl lg:overflow-y-auto p-6 space-y-6 shadow-sm lg:h-full shrink-0">
                    
                    {/* ==================== DAILY FORMS ==================== */}
                    {reportType === "daily" && (
                        <>
                            {activeTab === "general" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <Select
                                        label="Proyek *"
                                        value={selectedProjectId}
                                        onChange={(val) => {
                                            setSelectedProjectId(val);
                                            if (!paramId) {
                                                const proj = projects.find(p => p.id === val);
                                                if (proj?.location) setLocationOverride(proj.location);
                                            }
                                        }}
                                        options={[
                                            { value: "", label: "-- Pilih Proyek --" },
                                            ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))
                                        ]}
                                        disabled={!!paramProjectId}
                                        required
                                    />
                                    <Input
                                        label="Lokasi Proyek"
                                        value={locationOverride}
                                        onChange={(e) => setLocationOverride(e.target.value)}
                                        placeholder="e.g. Jl. Raya Utama No. 123, Kota"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Tanggal Laporan *"
                                            type="date"
                                            value={reportDate}
                                            onChange={(e) => setReportDate(e.target.value)}
                                            required
                                        />
                                        <Input
                                            label="Paket / Tahap Pekerjaan"
                                            value={workPackage}
                                            onChange={(e) => setWorkPackage(e.target.value)}
                                            placeholder="e.g. Pekerjaan Persiapan / Struktur"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Input label="Hari Ke-" type="number" value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} placeholder="e.g. 1" />
                                        <Input label="Total Hari" type="number" value={totalDays} onChange={(e) => setTotalDays(e.target.value)} placeholder="e.g. 150" />
                                        <Input label="Sisa Hari" type="number" value={remainingDays} onChange={(e) => setRemainingDays(e.target.value)} placeholder="Auto" readOnly />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Kode Dokumen"
                                            value={documentId}
                                            onChange={(e) => { setDocumentId(e.target.value); setIsDocIdManuallyEdited(true); }}
                                            placeholder="LH-01-01"
                                        />
                                        <Input
                                            label="Revisi (REV)"
                                            value={revision}
                                            onChange={(e) => setRevision(e.target.value)}
                                            placeholder="00"
                                        />
                                    </div>
                                    <Input
                                        label="Judul Laporan"
                                        value={title}
                                        onChange={(e) => { setTitle(e.target.value); setIsTitleManuallyEdited(true); }}
                                        placeholder="Judul laporan harian"
                                    />
                                </div>
                            )}

                            {activeTab === "workItems" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Uraian Pekerjaan</span>
                                    </div>
                                    {workItems.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-neutral-400 w-5 shrink-0">{idx + 1}.</span>
                                                <Input
                                                    label=""
                                                    value={item.description}
                                                    onChange={(e) => {
                                                        const copy = [...workItems];
                                                        copy[idx].description = e.target.value;
                                                        setWorkItems(copy);
                                                    }}
                                                    placeholder="Deskripsi kegiatan..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setWorkItems(workItems.filter((_, i) => i !== idx))}
                                                    className="text-neutral-300 hover:text-red-500 transition-colors shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pl-7">
                                                <Input label="Posisi / As" value={item.position} onChange={(e) => { const copy = [...workItems]; copy[idx].position = e.target.value; setWorkItems(copy); }} placeholder="Kolom A1-A3" />
                                                <Input label="Volume" value={item.volume} onChange={(e) => { const copy = [...workItems]; copy[idx].volume = e.target.value; setWorkItems(copy); }} placeholder="e.g. 10 m3" />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setWorkItems([...workItems, { description: "", position: "", volume: "" }])}
                                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-orange-600 bg-orange-50/50 rounded-xl border border-dashed border-orange-200"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Tambah Uraian Pekerjaan
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === "personnel" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Jumlah Tenaga Kerja</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input label="Project Manager" type="number" value={pmCount} onChange={(e) => setPmCount(e.target.value)} placeholder="0" />
                                        <Input label="Site Manager" type="number" value={smCount} onChange={(e) => setSmCount(e.target.value)} placeholder="0" />
                                        <Input label="Supervisor" type="number" value={supervisorCount} onChange={(e) => setSupervisorCount(e.target.value)} placeholder="0" />
                                        <Input label="Mandor" type="number" value={mandorCount} onChange={(e) => setMandorCount(e.target.value)} placeholder="0" />
                                        <Input label="Tukang" type="number" value={tukangCount} onChange={(e) => setTukangCount(e.target.value)} placeholder="0" />
                                        <Input label="Pekerja" type="number" value={pekerjaCount} onChange={(e) => setPekerjaCount(e.target.value)} placeholder="0" />
                                        <Input label="Operator" type="number" value={operatorCount} onChange={(e) => setOperatorCount(e.target.value)} placeholder="0" />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2 pt-3">Waktu Kerja (Jam)</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input label="Reguler (08.00-16.00)" type="number" value={shiftReguler} onChange={(e) => setShiftReguler(e.target.value)} placeholder="8" />
                                        <Input label="OT 1 (16.00-18.00)" type="number" value={shiftOt1} onChange={(e) => setShiftOt1(e.target.value)} placeholder="2" />
                                        <Input label="OT 2 (18.00-22.00)" type="number" value={shiftOt2} onChange={(e) => setShiftOt2(e.target.value)} placeholder="4" />
                                        <Input label="OT 3 (22.00-08.00)" type="number" value={shiftOt3} onChange={(e) => setShiftOt3(e.target.value)} placeholder="10" />
                                    </div>
                                </div>
                            )}

                            {activeTab === "cuaca" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Kondisi Cuaca Lapangan</span>
                                    <div className="space-y-2">
                                        {weatherItems.map((w, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input label="" value={w.timeRange} onChange={(e) => setWeatherItems(prev => prev.map((item, i) => i === idx ? { ...item, timeRange: e.target.value } : item))} placeholder="08.00 - 09.00" />
                                                <Select
                                                    label=""
                                                    value={w.condition}
                                                    onChange={(val) => setWeatherItems(prev => prev.map((item, i) => i === idx ? { ...item, condition: val } : item))}
                                                    options={[{ value: "cerah", label: "Cerah" }, { value: "berawan", label: "Berawan" }, { value: "hujan", label: "Hujan" }]}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === "catatan" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Catatan / Kendala</label>
                                        <textarea
                                            className="w-full min-h-[120px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Tulis kendala teknis atau isu di lapangan..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Rencana Pekerjaan Lanjutan</label>
                                        <textarea
                                            className="w-full min-h-[120px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                            value={nextActions}
                                            onChange={(e) => setNextActions(e.target.value)}
                                            placeholder="Rencana pekerjaan besok..."
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === "dokumentasi" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Dokumentasi Foto Lapangan</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        {photos.map((photo, idx) => (
                                            <div key={idx} className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 group">
                                                <img src={photo.url} alt={`Foto ${idx+1}`} className="w-full h-28 object-cover" />
                                                <button type="button" onClick={() => handleRemovePhoto(idx)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">×</button>
                                                <input type="text" placeholder="Keterangan foto..." value={photo.caption} onChange={(e) => handlePhotoCaptionChange(idx, e.target.value)} className="w-full text-xs p-2 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
                                            </div>
                                        ))}
                                    </div>
                                    <label className="cursor-pointer border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center flex flex-col items-center gap-2 hover:border-orange-400">
                                        <Camera className="w-6 h-6 text-neutral-400" />
                                        <span className="text-xs font-bold text-neutral-600">{uploadingPhoto ? "Uploading..." : "+ Upload Foto Lapangan"}</span>
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                    </label>
                                </div>
                            )}

                            {activeTab === "ttd" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Tanda Tangan & Persetujuan</span>
                                    <Input label="Disusun Oleh" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Nama penyusun" />
                                    <Input label="Jabatan Penyusun" value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} placeholder="Project Officer / Pengawas" />
                                    <Input label="Disetujui Oleh" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Nama penanggung jawab" />
                                    <Input label="Jabatan Penyetuju" value={approvedByRole} onChange={(e) => setApprovedByRole(e.target.value)} placeholder="Project Manager / Direktur" />
                                </div>
                            )}
                        </>
                    )}

                    {/* ==================== WEEKLY & MONTHLY (LM/LBL) FORMS ==================== */}
                    {(reportType === "weekly" || reportType === "monthly") && (
                        <>
                            {weeklyTab === "general" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    {/* Auto Sync Banner */}
                                    <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
                                            <div>
                                                <h4 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">Auto-Sync Dari Laporan Harian</h4>
                                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">Tarik dan rangkum data otomatis dari Laporan Harian (LH) sesuai proyek & periode minggu ini.</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleSyncFromDailyReports}
                                            disabled={isSyncing}
                                            className="bg-neutral-900 hover:bg-black text-white font-bold text-xs w-full py-2"
                                            icon={isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                        >
                                            {isSyncing ? "Menyinkronkan..." : "Sync Data dari Laporan Harian (LH)"}
                                        </Button>
                                    </div>

                                    <Select
                                        label="Proyek *"
                                        value={selectedProjectId}
                                        onChange={(val) => {
                                            setSelectedProjectId(val);
                                            if (!paramId) {
                                                const proj = projects.find(p => p.id === val);
                                                if (proj?.location) setLocationOverride(proj.location);
                                            }
                                        }}
                                        options={[
                                            { value: "", label: "-- Pilih Proyek --" },
                                            ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))
                                        ]}
                                        disabled={!!paramProjectId}
                                        required
                                    />

                                    <Input
                                        label="Lokasi Proyek"
                                        value={locationOverride}
                                        onChange={(e) => setLocationOverride(e.target.value)}
                                        placeholder="e.g. Jl. Raya Utama No. 123, Kota"
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Periode Mulai (Minggu/Senin)"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                        <Input
                                            label="Periode Selesai (Sabtu/Minggu)"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {reportType === "monthly" ? (
                                            <Input label="Bulan Ke-" value={monthNumber} onChange={(e) => setMonthNumber(e.target.value)} placeholder="01" />
                                        ) : (
                                            <Input label="Minggu Ke-" value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} placeholder="01" />
                                        )}
                                        <Input label="Hari Ke-" type="number" value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} placeholder="e.g. 30" />
                                        <Input label="Total Hari" type="number" value={totalDays} onChange={(e) => setTotalDays(e.target.value)} placeholder="150" />
                                        <Input label="Sisa Hari" type="number" value={remainingDays} onChange={(e) => setRemainingDays(e.target.value)} placeholder="Auto / Manual" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Tanggal Laporan *"
                                            type="date"
                                            value={reportDate}
                                            onChange={(e) => setReportDate(e.target.value)}
                                            required
                                        />
                                        <Input
                                            label="Tahap / Paket Pekerjaan"
                                            value={workPackage}
                                            onChange={(e) => setWorkPackage(e.target.value)}
                                            placeholder="Pekerjaan Persiapan / Struktur"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Kode Dokumen Cover"
                                            value={documentId}
                                            onChange={(e) => { setDocumentId(e.target.value); setIsDocIdManuallyEdited(true); }}
                                            placeholder="LM-01-01"
                                        />
                                        <Input
                                            label="Revisi (REV)"
                                            value={revision}
                                            onChange={(e) => setRevision(e.target.value)}
                                            placeholder="00"
                                        />
                                    </div>

                                    <Input
                                        label="Judul Laporan Mingguan"
                                        value={title}
                                        onChange={(e) => { setTitle(e.target.value); setIsTitleManuallyEdited(true); }}
                                        placeholder="e.g. Laporan Mingguan Progres Struktur"
                                    />
                                </div>
                            )}

                            {weeklyTab === "summary" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Rekapitulasi Kemajuan Pekerjaan (%)</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input label="Kemajuan Hingga Minggu Lalu (%)" type="number" step="0.001" value={progressLastWeek} onChange={(e) => setProgressLastWeek(e.target.value)} placeholder="0.000" />
                                        <Input label="Kemajuan Minggu Ini (%)" type="number" step="0.001" value={progressThisWeek} onChange={(e) => setProgressThisWeek(e.target.value)} placeholder="50.000" />
                                        <Input label="Kemajuan Hingga Minggu Ini (%)" type="number" step="0.001" value={progressTotal} onChange={(e) => setProgressTotal(e.target.value)} placeholder="50.000" />
                                        <Input label="Sisa Pekerjaan (%)" type="number" step="0.001" value={progressRemaining} onChange={(e) => setProgressRemaining(e.target.value)} placeholder="50.000" />
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Ringkasan Executive Summary (Narasi Right Box)</label>
                                        <textarea
                                            className="w-full min-h-[100px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                            value={summaryText}
                                            onChange={(e) => setSummaryText(e.target.value)}
                                            placeholder="Tuliskan narasi pencapaian kemajuan minggu ini..."
                                        />
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Catatan / Rekomendasi Umum (Bottom Banner)</label>
                                        <textarea
                                            className="w-full min-h-[100px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                            value={catatanUmum}
                                            onChange={(e) => setCatatanUmum(e.target.value)}
                                            placeholder="Tuliskan catatan evaluasi atau rekomendasi tindakan..."
                                        />
                                    </div>
                                </div>
                            )}

                            {weeklyTab === "kegiatan" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                            <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Kegiatan Dilaksanakan Minggu Ini</span>
                                            <span className="text-[10px] text-neutral-400 font-normal">Otomatis tersinkron dari LH (bisa digabungkan)</span>
                                        </div>
                                        {weeklyActivitiesThisWeek.map((act, idx) => (
                                            <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-neutral-400 w-5 shrink-0">{idx + 1}.</span>
                                                    <Input
                                                        label=""
                                                        value={act.description}
                                                        onChange={(e) => {
                                                            const copy = [...weeklyActivitiesThisWeek];
                                                            copy[idx].description = e.target.value;
                                                            setWeeklyActivitiesThisWeek(copy);
                                                        }}
                                                        placeholder="Uraian pekerjaan minggu ini..."
                                                    />
                                                    <button type="button" onClick={() => setWeeklyActivitiesThisWeek(weeklyActivitiesThisWeek.filter((_, i) => i !== idx))} className="text-neutral-300 hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 pl-7">
                                                    <Input label="Durasi" value={act.duration} onChange={(e) => { const copy = [...weeklyActivitiesThisWeek]; copy[idx].duration = e.target.value; setWeeklyActivitiesThisWeek(copy); }} placeholder="7 hari" />
                                                    <Input label="Posisi/As" value={act.position} onChange={(e) => { const copy = [...weeklyActivitiesThisWeek]; copy[idx].position = e.target.value; setWeeklyActivitiesThisWeek(copy); }} placeholder="Kolom A7-A9" />
                                                    <Input label="Volume Total" value={act.volume} onChange={(e) => { const copy = [...weeklyActivitiesThisWeek]; copy[idx].volume = e.target.value; setWeeklyActivitiesThisWeek(copy); }} placeholder="8 m3" />
                                                </div>

                                                {/* Merge Option Dropdown */}
                                                {weeklyActivitiesThisWeek.length > 1 && (
                                                    <div className="pl-7 pt-1 flex items-center gap-2 text-xs">
                                                        <Combine className="w-3.5 h-3.5 text-neutral-400" />
                                                        <span className="text-[10px] font-semibold text-neutral-400">Gabungkan item ini ke:</span>
                                                        <select
                                                            className="text-[11px] p-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded font-medium"
                                                            onChange={(e) => {
                                                                if (e.target.value !== "") {
                                                                    handleMergeActivity(idx, parseInt(e.target.value));
                                                                    e.target.value = "";
                                                                }
                                                            }}
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled>-- Pilih Item Tujuan --</option>
                                                            {weeklyActivitiesThisWeek.map((otherAct, otherIdx) => {
                                                                if (otherIdx === idx) return null;
                                                                return (
                                                                    <option key={otherIdx} value={otherIdx}>
                                                                        #{otherIdx + 1}: {otherAct.description.substring(0, 30)}...
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setWeeklyActivitiesThisWeek([...weeklyActivitiesThisWeek, { description: "", duration: "1 hari", position: "", volume: "" }])} className="text-xs font-bold text-neutral-800 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Tambah Kegiatan Minggu Ini</button>
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                            <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Rencana Kegiatan Minggu Depan</span>
                                            <span className="text-[10px] text-neutral-400 font-normal">Diisi manual</span>
                                        </div>
                                        {weeklyActivitiesNextWeek.map((act, idx) => (
                                            <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-neutral-400 w-5 shrink-0">{idx + 1}.</span>
                                                    <Input
                                                        label=""
                                                        value={act.description}
                                                        onChange={(e) => {
                                                            const copy = [...weeklyActivitiesNextWeek];
                                                            copy[idx].description = e.target.value;
                                                            setWeeklyActivitiesNextWeek(copy);
                                                        }}
                                                        placeholder="Rencana uraian pekerjaan minggu depan..."
                                                    />
                                                    <button type="button" onClick={() => setWeeklyActivitiesNextWeek(weeklyActivitiesNextWeek.filter((_, i) => i !== idx))} className="text-neutral-300 hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 pl-7">
                                                    <Input label="Durasi" value={act.duration} onChange={(e) => { const copy = [...weeklyActivitiesNextWeek]; copy[idx].duration = e.target.value; setWeeklyActivitiesNextWeek(copy); }} placeholder="7 hari" />
                                                    <Input label="Posisi/As" value={act.position} onChange={(e) => { const copy = [...weeklyActivitiesNextWeek]; copy[idx].position = e.target.value; setWeeklyActivitiesNextWeek(copy); }} placeholder="Kolom A7-A9" />
                                                    <Input label="Volume Total" value={act.volume} onChange={(e) => { const copy = [...weeklyActivitiesNextWeek]; copy[idx].volume = e.target.value; setWeeklyActivitiesNextWeek(copy); }} placeholder="8 m3" />
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setWeeklyActivitiesNextWeek([...weeklyActivitiesNextWeek, { description: "", duration: "1 hari", position: "", volume: "" }])} className="text-xs font-bold text-neutral-800 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Tambah Rencana Minggu Depan</button>
                                    </div>
                                </div>
                            )}

                            {weeklyTab === "personel" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex items-start gap-3">
                                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">Otomatis Dari Laporan Harian / Mingguan</h4>
                                            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed mt-0.5">
                                                Tabel Laporan Personel ({reportType === "monthly" ? "LB-XX-06" : "LM-XX-06"}) terisi dan terakumulasi secara otomatis saat Anda menekan tombol <strong>Sync Data</strong> pada tab Info & Periode.
                                            </p>
                                        </div>
                                    </div>

                                    <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        Detail Laporan Personel {reportType === "monthly" ? "Bulanan (Minggu 1 - 5)" : "Harian (Senin - Minggu)"}
                                    </span>
                                    
                                    {reportType === "monthly" ? (
                                        <div className="space-y-3 overflow-x-auto">
                                            {personelMonthlyGrid.map((row, idx) => (
                                                <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-neutral-400 w-5">{idx + 1}.</span>
                                                        <Input label="" value={row.role} onChange={(e) => { const copy = [...personelMonthlyGrid]; copy[idx].role = e.target.value; setPersonelMonthlyGrid(copy); }} placeholder="Nama Peran / Personel" />
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-1 pl-7">
                                                        {(["minggu1", "minggu2", "minggu3", "minggu4", "minggu5"] as const).map((wKey, wIdx) => (
                                                            <div key={wIdx} className="text-center">
                                                                <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5">M{wIdx + 1}</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    className="w-full text-center p-1 border border-neutral-200 dark:border-neutral-700 rounded text-xs bg-white dark:bg-neutral-900 font-bold"
                                                                    value={row[wKey]}
                                                                    onChange={(e) => {
                                                                        const copy = [...personelMonthlyGrid];
                                                                        copy[idx][wKey] = parseInt(e.target.value) || 0;
                                                                        setPersonelMonthlyGrid(copy);
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3 overflow-x-auto">
                                            {personelWeeklyGrid.map((row, idx) => (
                                                <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-neutral-400 w-5">{idx + 1}.</span>
                                                        <Input label="" value={row.role} onChange={(e) => { const copy = [...personelWeeklyGrid]; copy[idx].role = e.target.value; setPersonelWeeklyGrid(copy); }} placeholder="Nama Peran / Personel" />
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1 pl-7">
                                                        {(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] as const).map((dayKey, dIdx) => (
                                                            <div key={dIdx} className="text-center">
                                                                <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5">{dayKey.substring(0,3)}</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    className="w-full text-center p-1 border border-neutral-200 dark:border-neutral-700 rounded text-xs bg-white dark:bg-neutral-900 font-bold"
                                                                    value={row[dayKey]}
                                                                    onChange={(e) => {
                                                                        const copy = [...personelWeeklyGrid];
                                                                        copy[idx][dayKey] = parseInt(e.target.value) || 0;
                                                                        setPersonelWeeklyGrid(copy);
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {weeklyTab === "cuaca" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 flex items-start gap-3">
                                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">Otomatis Dari Laporan Harian / Mingguan</h4>
                                            <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed mt-0.5">
                                                Laporan Cuaca & Kendala ({reportType === "monthly" ? "LB-XX-07" : "LM-XX-07"}) dipetakan secara otomatis saat Anda menekan <strong>Sync Data</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    {reportType === "monthly" && (
                                        <div className="space-y-3">
                                            <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                Jam Cuaca Per Minggu (8 Jam = 1 Hari Ekuivalen)
                                            </span>
                                            <div className="space-y-2">
                                                {weatherMonthlyGrid.map((row, idx) => (
                                                    <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                                        <span className="text-xs font-bold text-neutral-800 dark:text-white block">{row.condition}</span>
                                                        <div className="grid grid-cols-5 gap-1">
                                                            {(["minggu1Hours", "minggu2Hours", "minggu3Hours", "minggu4Hours", "minggu5Hours"] as const).map((wKey, wIdx) => (
                                                                <div key={wIdx} className="text-center">
                                                                    <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5">M{wIdx + 1} (Jam)</span>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        className="w-full text-center p-1 border border-neutral-200 dark:border-neutral-700 rounded text-xs bg-white dark:bg-neutral-900 font-bold"
                                                                        value={row[wKey]}
                                                                        onChange={(e) => {
                                                                            const copy = [...weatherMonthlyGrid];
                                                                            copy[idx][wKey] = parseInt(e.target.value) || 0;
                                                                            setWeatherMonthlyGrid(copy);
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2 pt-2">Detail Laporan Kendala Lapangan</span>
                                    <div className="space-y-3">
                                        {kendalaItems.map((k, idx) => (
                                            <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Input label="Tanggal" type="date" value={k.date} onChange={(e) => { const copy = [...kendalaItems]; copy[idx].date = e.target.value; setKendalaItems(copy); }} />
                                                    <button type="button" onClick={() => setKendalaItems(kendalaItems.filter((_, i) => i !== idx))} className="text-neutral-300 hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                                                </div>
                                                <Input label="Uraian Kendala / Masalah" value={k.problem} onChange={(e) => { const copy = [...kendalaItems]; copy[idx].problem = e.target.value; setKendalaItems(copy); }} placeholder="e.g. Hujan lebat mengguyur area bor pile..." />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input label="Solusi" value={k.solution} onChange={(e) => { const copy = [...kendalaItems]; copy[idx].solution = e.target.value; setKendalaItems(copy); }} placeholder="Solusi penanganan..." />
                                                    <Input label="Rekomendasi" value={k.recommendation} onChange={(e) => { const copy = [...kendalaItems]; copy[idx].recommendation = e.target.value; setKendalaItems(copy); }} placeholder="Rekomendasi..." />
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setKendalaItems([...kendalaItems, { date: "", problem: "", solution: "", recommendation: "" }])} className="text-xs font-bold text-neutral-800 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Tambah Kendala Lapangan</button>
                                    </div>
                                </div>
                            )}

                            {weeklyTab === "dokumentasi" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        <div>
                                            <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider block">Dokumentasi Foto Mingguan Utama</span>
                                            <span className="text-[10px] text-neutral-400 font-semibold">Tersedia {photos.length}/18 foto terpilih (Maksimal 18 Foto)</span>
                                        </div>
                                        {allDailyPhotos.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPhotoPickerOpen(true)}
                                                className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-black"
                                            >
                                                <Grid className="w-3.5 h-3.5" /> Pilih Dari LH ({allDailyPhotos.length})
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {photos.map((photo, idx) => (
                                            <div key={idx} className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 group">
                                                <img src={photo.url} alt={`Foto ${idx+1}`} className="w-full h-28 object-cover" />
                                                <button type="button" onClick={() => handleRemovePhoto(idx)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">×</button>
                                                <input type="text" placeholder="Keterangan foto..." value={photo.caption} onChange={(e) => handlePhotoCaptionChange(idx, e.target.value)} className="w-full text-xs p-2 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
                                            </div>
                                        ))}
                                    </div>
                                    <label className={clsx(
                                        "cursor-pointer border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center gap-2 transition-colors",
                                        photos.length >= 18 ? "border-neutral-200 opacity-50 cursor-not-allowed" : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                                    )}>
                                        <Camera className="w-6 h-6 text-neutral-400" />
                                        <span className="text-xs font-bold text-neutral-600">
                                            {photos.length >= 18 ? "Maksimal 18 foto tercapai" : uploadingPhoto ? "Uploading..." : "+ Upload Foto Baru Lapangan"}
                                        </span>
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto || photos.length >= 18} />
                                    </label>
                                </div>
                            )}

                            {weeklyTab === "ttd" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Tanda Tangan & Persetujuan Mingguan</span>
                                    <Input label="Disusun Oleh" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Nama penyusun laporan" />
                                    <Input label="Jabatan Penyusun" value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} placeholder="Project Officer / Pengawas" />
                                    <Input label="Disetujui Oleh" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Nama yang menyetujui" />
                                    <Input label="Jabatan Penyetuju" value={approvedByRole} onChange={(e) => setApprovedByRole(e.target.value)} placeholder="Project Manager / Direktur" />
                                </div>
                            )}
                        </>
                    )}

                    {/* ==================== MONTHLY FORMS ==================== */}
                    {reportType === "monthly" && (
                        <div className="space-y-5">
                            <Select
                                label="Proyek *"
                                value={selectedProjectId}
                                onChange={(val) => setSelectedProjectId(val)}
                                options={[
                                    { value: "", label: "-- Pilih Proyek --" },
                                    ...projects.map(p => ({ value: p.id, label: p.name }))
                                ]}
                                disabled={!!paramProjectId}
                                required
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Tanggal Laporan *" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
                                <Input label="Progres Fisik (%) *" type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} required />
                            </div>
                            <Input label="Judul Laporan *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Laporan Bulanan Progres Struktur" required />
                            <Select
                                label="Status *"
                                value={status}
                                onChange={(val) => setStatus(val as ReportStatus)}
                                options={[
                                    { value: "on-track", label: "On Track" },
                                    { value: "delayed", label: "Delayed" },
                                    { value: "critical", label: "Critical" },
                                    { value: "completed", label: "Completed" },
                                ]}
                            />
                            <div className="space-y-1.5 pt-2">
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Deskripsi Laporan</label>
                                <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden min-h-[300px]">
                                    <RichTextEditor value={editorContent} onChange={setEditorContent} />
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Card: Live Document Preview */}
                <div className="flex-1 w-full bg-neutral-100/80 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl lg:overflow-y-auto flex flex-col items-center gap-6 shadow-sm lg:h-full py-6 px-4">
                    
                    <div className="text-[10px] text-neutral-400 font-mono tracking-tight text-center">
                        📄 {getGeneratedFilename()}
                    </div>

                    <div id="document-preview-a4" className="w-full max-w-[680px]">
                        
                        {/* ===================== DAILY PREVIEW (1 Page) ===================== */}
                        {reportType === "daily" && (
                            <div className="bg-white text-neutral-800 shadow-xl w-full p-8 flex flex-col gap-3" style={{ fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
                                {renderPageHeader("LH", documentId || "LH-00-01", "Laporan Harian")}

                                {/* Date Meta */}
                                <div className="grid grid-cols-5 border border-neutral-300 rounded overflow-hidden text-center">
                                    {[
                                        { label: "Hari", value: getDayName() },
                                        { label: "Tanggal", value: getDayDateOnly() },
                                        { label: "Hari Ke-", value: dayNumber || "—" },
                                        { label: "Total Hari", value: totalDays || "—" },
                                        { label: "Sisa Hari", value: remainingDays || "—" },
                                    ].map((cell, i) => (
                                        <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                            <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{cell.label}</div>
                                            <div className="text-[8px] font-bold text-neutral-800 py-1">{cell.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Main Tables */}
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Uraian Pekerjaan</div>
                                        <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                                                    <th className="p-1 w-5 text-center border-r border-neutral-300">No</th>
                                                    <th className="p-1 border-r border-neutral-300">Uraian Pekerjaan</th>
                                                    <th className="p-1 w-16 border-r border-neutral-300">Lokasi</th>
                                                    <th className="p-1 w-12 text-center">Volume</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {workItems.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-neutral-200 text-[6.5px] leading-tight">
                                                        <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{idx + 1}</td>
                                                        <td className="p-1 border-r border-neutral-200 text-neutral-800 font-bold">{item.description || ""}</td>
                                                        <td className="p-1 border-r border-neutral-200 text-neutral-600 font-semibold">{item.position || ""}</td>
                                                        <td className="p-1 text-center text-neutral-800 font-bold">{item.volume || ""}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="w-[200px] shrink-0 flex flex-col gap-2">
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Personel</div>
                                            <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                                <tbody className="text-[6px]">
                                                    {[
                                                        ["Project Manager", pmCount], ["Site Manager", smCount], ["Supervisor", supervisorCount],
                                                        ["Mandor", mandorCount], ["Tukang", tukangCount], ["Pekerja", pekerjaCount], ["Operator", operatorCount]
                                                    ].map(([label, val], i) => (
                                                        <tr key={i} className="border-b border-neutral-200">
                                                            <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">{label}</td>
                                                            <td className="p-0.5 text-center font-black text-neutral-900 w-8">{val || "0"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Signatures */}
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="text-center border-t border-neutral-300 pt-2">
                                        <div className="text-[7px] font-bold text-neutral-500 uppercase">Disetujui Oleh</div>
                                        <div className="h-10"></div>
                                        <div className="text-[8px] font-black text-neutral-900">{approvedBy || "( Nama Terang )"}</div>
                                        <div className="text-[6px] text-neutral-500">{approvedByRole || "Project Manager"}</div>
                                    </div>
                                    <div className="text-center border-t border-neutral-300 pt-2">
                                        <div className="text-[7px] font-bold text-neutral-500 uppercase">Disusun Oleh</div>
                                        <div className="h-10"></div>
                                        <div className="text-[8px] font-black text-neutral-900">{preparedBy || "( Nama Terang )"}</div>
                                        <div className="text-[6px] text-neutral-500">{preparedByRole || "Pengawas"}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== WEEKLY & MONTHLY PREVIEW (Multi-Page LM/LBL Code Format) ===================== */}
                        {(reportType === "weekly" || reportType === "monthly") && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                
                                {/* ---------------- PAGE 1: COVER (LM-XX-01 / LB-XX-01) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(1), reportType === "monthly" ? "Laporan Bulanan" : "Laporan Mingguan")}

                                    {/* Center Title Box */}
                                    <div className="text-center my-auto space-y-4 px-4 py-12">
                                        <div className="font-extrabold text-[12px] text-neutral-400 uppercase tracking-widest">PROYEK</div>
                                        <div className="font-black text-[20px] text-neutral-900 uppercase tracking-wide leading-tight">
                                            {workPackage || "PEKERJAAN PEMBANGUNAN"}
                                        </div>
                                        <div className="font-black text-[24px] text-neutral-900 uppercase tracking-tight leading-tight">
                                            {currentProject?.name || "NAMA PROYEK"}
                                        </div>
                                        <div className="font-bold text-[10px] text-neutral-600 uppercase tracking-wider max-w-lg mx-auto leading-relaxed pt-2">
                                            {locationOverride || currentProject?.location || "—"}
                                        </div>

                                        <div className="pt-16 font-extrabold text-[11px] text-neutral-900 tracking-widest uppercase">
                                            ADIDAYA STUDIO
                                        </div>
                                    </div>

                                    {/* Signatures Box */}
                                    <div className="grid grid-cols-2 gap-3 border-t border-neutral-300 pt-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="text-[7px] font-bold text-neutral-600 uppercase tracking-wider">Disetujui Oleh</div>
                                            <div className="w-full border border-neutral-300 rounded h-16 bg-neutral-50/50 my-2"></div>
                                            <div className="text-[8px] font-black text-neutral-900">{approvedBy || "( Nama Terang )"}</div>
                                            <div className="text-[6px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">{approvedByRole || "Project Manager / Direktur"}</div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-[7px] font-bold text-neutral-600 uppercase tracking-wider">Disusun Oleh</div>
                                            <div className="w-full border border-neutral-300 rounded h-16 bg-neutral-50/50 my-2"></div>
                                            <div className="text-[8px] font-black text-neutral-900">{preparedBy || "( Nama Terang )"}</div>
                                            <div className="text-[6px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">{preparedByRole || "Project Officer / Pengawas"}</div>
                                        </div>
                                    </div>
                                </div>


                                {/* ---------------- PAGE 2: EXECUTIVE SUMMARY (LM-XX-02 / LB-XX-02) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(2), reportType === "monthly" ? "Executive Summary Bulanan" : "Executive Summary")}
                                    {renderWeeklyDateMetaRow()}

                                    {/* Section Banner */}
                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        EXECUTIVE SUMMARY {reportType === "monthly" ? "BULANAN" : "MINGGUAN"}
                                    </div>

                                    {/* 2-Column Content */}
                                    <div className="flex gap-3">
                                        
                                        {/* Left Column Tables */}
                                        <div className="w-1/2 flex flex-col gap-2.5 text-[6.5px]">
                                            
                                            {/* A. Kemajuan Pekerjaan */}
                                            <div>
                                                <div className="font-extrabold text-[7px] text-neutral-900 uppercase border-b border-neutral-300 pb-0.5 mb-1">A. KEMAJUAN PEKERJAAN</div>
                                                <table className="w-full text-left border border-neutral-300" style={{ borderCollapse: "collapse" }}>
                                                    <tbody>
                                                        <tr className="border-b border-neutral-200"><td className="p-1 text-neutral-700 font-semibold">Kemajuan Hingga {reportType === "monthly" ? "Bulan" : "Minggu"} Lalu</td><td className="p-1 text-right font-bold text-neutral-900">{progressLastWeek} %</td></tr>
                                                        <tr className="border-b border-neutral-200"><td className="p-1 text-neutral-700 font-semibold">Kemajuan {reportType === "monthly" ? "Bulan" : "Minggu"} Ini</td><td className="p-1 text-right font-bold text-neutral-900">{progressThisWeek} %</td></tr>
                                                        <tr className="border-b border-neutral-200 bg-neutral-100"><td className="p-1 font-black text-neutral-900">Kemajuan Hingga {reportType === "monthly" ? "Bulan" : "Minggu"} Ini</td><td className="p-1 text-right font-black text-neutral-900">{progressTotal} %</td></tr>
                                                        <tr><td className="p-1 text-neutral-700 font-semibold">Sisa Pekerjaan</td><td className="p-1 text-right font-bold text-neutral-900">{progressRemaining} %</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* B. Personel */}
                                            <div>
                                                <div className="font-extrabold text-[7px] text-neutral-900 uppercase border-b border-neutral-300 pb-0.5 mb-1">B. RATA-RATA JUMLAH PERSONEL</div>
                                                <table className="w-full text-left border border-neutral-300" style={{ borderCollapse: "collapse" }}>
                                                    <tbody>
                                                        <tr className="border-b border-neutral-200"><td className="p-1 text-neutral-700 font-semibold">Staf Inti</td><td className="p-1 text-right font-bold text-neutral-900">{avgStaffInti} orang/hari</td></tr>
                                                        <tr className="border-b border-neutral-200"><td className="p-1 text-neutral-700 font-semibold">Tukang dan Pekerja</td><td className="p-1 text-right font-bold text-neutral-900">{avgTukangPekerja} orang/hari</td></tr>
                                                        <tr className="bg-neutral-100"><td className="p-1 font-black text-neutral-900">Total</td><td className="p-1 text-right font-black text-neutral-900">{avgTotalPersonel} orang/hari</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* C. Waktu Kerja Efektif */}
                                            <div>
                                                <div className="font-extrabold text-[7px] text-neutral-900 uppercase border-b border-neutral-300 pb-0.5 mb-1">C. WAKTU KERJA EFEKTIF</div>
                                                <table className="w-full text-left border border-neutral-300" style={{ borderCollapse: "collapse" }}>
                                                    <tbody>
                                                        {reportType === "monthly" ? (
                                                            effectiveHoursMonthlyTable.map((h, i) => (
                                                                <tr key={i} className="border-b border-neutral-200">
                                                                    <td className="p-0.5 pl-1 font-semibold text-neutral-700">{h.weekLabel}</td>
                                                                    <td className="p-0.5 text-center text-neutral-600">{h.totalHours} jam</td>
                                                                    <td className="p-0.5 text-right pr-1 font-bold text-neutral-900">efektif {h.effectiveHours} jam</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            effectiveHoursTable.map((h, i) => (
                                                                <tr key={i} className="border-b border-neutral-200">
                                                                    <td className="p-0.5 pl-1 font-semibold text-neutral-700">{h.day}</td>
                                                                    <td className="p-0.5 text-center text-neutral-600">{h.totalHours} jam</td>
                                                                    <td className="p-0.5 text-right pr-1 font-bold text-neutral-900">efektif {h.effectiveHours} jam</td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* D. Cuaca */}
                                            <div>
                                                <div className="font-extrabold text-[7px] text-neutral-900 uppercase border-b border-neutral-300 pb-0.5 mb-1">D. CUACA</div>
                                                <table className="w-full text-left border border-neutral-300" style={{ borderCollapse: "collapse" }}>
                                                    <tbody>
                                                        {weatherSummaryTable.map((w, i) => (
                                                            <tr key={i} className="border-b border-neutral-200">
                                                                <td className="p-1 font-semibold text-neutral-700">{w.condition}</td>
                                                                <td className="p-1 text-center text-neutral-600">{w.hours} jam</td>
                                                                <td className="p-1 text-right font-bold text-neutral-900">ekuivalen {w.days} hari</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Right Summary Box */}
                                        <div className="w-1/2 flex flex-col gap-2 border border-neutral-300 p-2.5 text-[7px] leading-relaxed bg-neutral-50/50">
                                            <div className="font-extrabold text-[8px] text-neutral-900 uppercase border-b border-neutral-300 pb-1">SUMMARY</div>
                                            <p className="text-neutral-800 font-semibold">{summaryText || "—"}</p>
                                            <p className="text-neutral-800 font-semibold">{personelSummaryText || "—"}</p>
                                            <p className="text-neutral-800 font-semibold">{waktuKerjaSummaryText || "—"}</p>
                                            <p className="text-neutral-800 font-semibold">{weatherSummaryText || "—"}</p>
                                        </div>
                                    </div>

                                    {/* Bottom Catatan / Rekomendasi Umum */}
                                    <div className="mt-auto space-y-0.5">
                                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                            CATATAN / REKOMENDASI UMUM
                                        </div>
                                        <div className="border border-neutral-300 border-t-0 p-2 text-[7px] text-neutral-800 min-h-[60px] whitespace-pre-wrap">
                                            {catatanUmum || "— (Belum ada catatan atau rekomendasi khusus) —"}
                                        </div>
                                    </div>
                                </div>


                                {/* ---------------- PAGE 3: WBS (LM-XX-03 / LB-XX-03) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(3), "Work Breakdown Structure")}
                                    {renderWeeklyDateMetaRow()}

                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        WORK BREAKDOWN STRUCTURE (WBS)
                                    </div>

                                    <div className="border border-neutral-300 border-t-0 flex-1 flex flex-col items-center justify-center p-10 text-center bg-neutral-50/40 rounded-b-sm">
                                        <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3 border border-neutral-200">
                                            <FileText className="w-6 h-6 text-neutral-600" />
                                        </div>
                                        <span className="px-2.5 py-0.5 bg-neutral-900 text-white text-[7px] font-black uppercase tracking-widest rounded-full mb-2">
                                            STRUKTUR RINCIAN KERJA PROYEK
                                        </span>
                                        <h3 className="text-[12px] font-black text-neutral-900 uppercase tracking-wide">Lampiran Work Breakdown Structure (WBS)</h3>
                                        <p className="text-[8px] text-neutral-600 font-medium max-w-md mt-2 leading-relaxed">
                                            Halaman ini dialokasikan untuk pemetaan rincian struktur paket pekerjaan utama, hierarki sub-pekerjaan, serta indikator pencapaian fisik secara sistematis. Rincian tabel WBS interaktif akan disajikan secara otomatis pada modul jadwal proyek berikutnya.
                                        </p>
                                    </div>
                                </div>


                                {/* ---------------- PAGE 4: KURVA S (LM-XX-04 / LB-XX-04) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(4), "Kurva S")}
                                    {renderWeeklyDateMetaRow()}

                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        GRAFIK PROGRES FISIK (KURVA S)
                                    </div>

                                    <div className="border border-neutral-300 border-t-0 flex-1 flex flex-col items-center justify-center p-10 text-center bg-neutral-50/40 rounded-b-sm">
                                        <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3 border border-neutral-200">
                                            <CalendarCheck className="w-6 h-6 text-neutral-600" />
                                        </div>
                                        <span className="px-2.5 py-0.5 bg-neutral-900 text-white text-[7px] font-black uppercase tracking-widest rounded-full mb-2">
                                            VISUALISASI KURVA S RENCANA VS REALISASI
                                        </span>
                                        <h3 className="text-[12px] font-black text-neutral-900 uppercase tracking-wide">Grafik Kemajuan Fisik Kumulatif</h3>
                                        <p className="text-[8px] text-neutral-600 font-medium max-w-md mt-2 leading-relaxed">
                                            Halaman ini dialokasikan khusus untuk grafik Kurva S (S-Curve) perbandingan rencana bobot vs realisasi kumulatif fisik per {reportType === "monthly" ? "bulan" : "minggu"}. Visualisasi Kurva S dinamis akan terintegrasi langsung dengan modul jadwal dan master progres proyek.
                                        </p>
                                    </div>
                                </div>


                                {/* ---------------- PAGE 5: KEGIATAN PEKERJAAN (LM-XX-05 / LB-XX-05) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(5), "Kegiatan Pekerjaan")}
                                    {renderWeeklyDateMetaRow()}

                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        LAPORAN KEGIATAN PEKERJAAN {reportType === "monthly" ? "BULANAN" : ""}
                                    </div>

                                    {/* Table 1: KEGIATAN MINGGU/BULAN INI */}
                                    <div className="space-y-0.5">
                                        <div className="bg-neutral-800 text-white font-bold text-[7px] py-0.5 px-2 uppercase tracking-wider">
                                            KEGIATAN YANG DILAKSANAKAN {reportType === "monthly" ? "BULAN" : "MINGGU"} INI
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 border-t-0 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-50 border-b border-neutral-300 font-extrabold text-neutral-500 uppercase">
                                                    <th className="p-1 w-5 text-center border-r border-neutral-300">NO.</th>
                                                    <th className="p-1 border-r border-neutral-300">URAIAN PEKERJAAN</th>
                                                    <th className="p-1 w-16 text-center border-r border-neutral-300">DURASI</th>
                                                    <th className="p-1 w-20 border-r border-neutral-300">POSISI/AS</th>
                                                    <th className="p-1 w-16 text-center">VOLUME TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {weeklyActivitiesThisWeek.map((act, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{i+1}</td>
                                                        <td className="p-1 border-r border-neutral-200 font-bold text-neutral-900">{act.description || "—"}</td>
                                                        <td className="p-1 text-center border-r border-neutral-200 font-semibold">{act.duration || "—"}</td>
                                                        <td className="p-1 border-r border-neutral-200 text-neutral-700">{act.position || "—"}</td>
                                                        <td className="p-1 text-center font-bold text-neutral-900">{act.volume || "—"}</td>
                                                    </tr>
                                                ))}
                                                {weeklyActivitiesThisWeek.length === 0 && (
                                                    <tr><td colSpan={5} className="p-3 text-center text-neutral-300 italic">Belum ada data kegiatan {reportType === "monthly" ? "bulan" : "minggu"} ini.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Table 2: RENCANA MINGGU/BULAN DEPAN */}
                                    <div className="space-y-0.5 pt-3">
                                        <div className="bg-neutral-800 text-white font-bold text-[7px] py-0.5 px-2 uppercase tracking-wider">
                                            RENCANA KEGIATAN {reportType === "monthly" ? "BULAN" : "MINGGU"} DEPAN
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 border-t-0 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-50 border-b border-neutral-300 font-extrabold text-neutral-500 uppercase">
                                                    <th className="p-1 w-5 text-center border-r border-neutral-300">NO.</th>
                                                    <th className="p-1 border-r border-neutral-300">URAIAN PEKERJAAN</th>
                                                    <th className="p-1 w-16 text-center border-r border-neutral-300">DURASI</th>
                                                    <th className="p-1 w-20 border-r border-neutral-300">POSISI/AS</th>
                                                    <th className="p-1 w-16 text-center">VOLUME TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {weeklyActivitiesNextWeek.map((act, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{i+1}</td>
                                                        <td className="p-1 border-r border-neutral-200 font-bold text-neutral-900">{act.description || "—"}</td>
                                                        <td className="p-1 text-center border-r border-neutral-200 font-semibold">{act.duration || "—"}</td>
                                                        <td className="p-1 border-r border-neutral-200 text-neutral-700">{act.position || "—"}</td>
                                                        <td className="p-1 text-center font-bold text-neutral-900">{act.volume || "—"}</td>
                                                    </tr>
                                                ))}
                                                {weeklyActivitiesNextWeek.length === 0 && (
                                                    <tr><td colSpan={5} className="p-3 text-center text-neutral-300 italic">Belum ada data rencana {reportType === "monthly" ? "bulan" : "minggu"} depan.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>


                                {/* ---------------- PAGE 6: LAPORAN PERSONEL (LM-XX-06 / LB-XX-06) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(6), "Laporan Personel")}
                                    {renderWeeklyDateMetaRow()}

                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        LAPORAN PERSONEL {reportType === "monthly" ? "BULANAN (RATA-RATA MINGGUAN)" : "MINGGUAN"}
                                    </div>

                                    {reportType === "monthly" ? (
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase text-center">
                                                    <th className="p-1 w-5 border-r border-neutral-300">NO.</th>
                                                    <th className="p-1 border-r border-neutral-300 text-left">PERSONEL</th>
                                                    <th className="p-1 w-12 border-r border-neutral-300">SATUAN</th>
                                                    <th className="p-1 border-r border-neutral-200">MINGGU 1</th>
                                                    <th className="p-1 border-r border-neutral-200">MINGGU 2</th>
                                                    <th className="p-1 border-r border-neutral-200">MINGGU 3</th>
                                                    <th className="p-1 border-r border-neutral-200">MINGGU 4</th>
                                                    <th className="p-1 border-r border-neutral-300">MINGGU 5</th>
                                                    <th className="p-1 w-16 border-l border-neutral-300 bg-neutral-200 font-black text-neutral-900">RATA-RATA</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {personelMonthlyGrid.map((row, i) => {
                                                    const vals = [row.minggu1, row.minggu2, row.minggu3, row.minggu4, row.minggu5].filter(v => v > 0);
                                                    const avgVal = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                                                    return (
                                                        <tr key={i} className="border-b border-neutral-200 text-center">
                                                            <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{i + 1}</td>
                                                            <td className="p-1 text-left border-r border-neutral-200 font-bold text-neutral-800">{row.role}</td>
                                                            <td className="p-1 text-center border-r border-neutral-200 text-neutral-500">{row.unit}</td>
                                                            <td className="p-1 border-r border-neutral-200">{row.minggu1 || 0}</td>
                                                            <td className="p-1 border-r border-neutral-200">{row.minggu2 || 0}</td>
                                                            <td className="p-1 border-r border-neutral-200">{row.minggu3 || 0}</td>
                                                            <td className="p-1 border-r border-neutral-200">{row.minggu4 || 0}</td>
                                                            <td className="p-1 border-r border-neutral-300">{row.minggu5 || 0}</td>
                                                            <td className="p-1 font-black text-neutral-900 bg-neutral-50">{avgVal}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-neutral-100 font-black text-neutral-900 text-center border-t border-neutral-300">
                                                    <td colSpan={3} className="p-1 text-right pr-2 border-r border-neutral-300 uppercase">RATA-RATA TOTAL</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelMonthlyGrid.reduce((a, r) => a + r.minggu1, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelMonthlyGrid.reduce((a, r) => a + r.minggu2, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelMonthlyGrid.reduce((a, r) => a + r.minggu3, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelMonthlyGrid.reduce((a, r) => a + r.minggu4, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-300">{personelMonthlyGrid.reduce((a, r) => a + r.minggu5, 0)}</td>
                                                    <td className="p-1 bg-neutral-200 text-neutral-900">
                                                        {Math.round(personelMonthlyGrid.reduce((a, r) => {
                                                            const vals = [r.minggu1, r.minggu2, r.minggu3, r.minggu4, r.minggu5].filter(v => v > 0);
                                                            return a + (vals.length > 0 ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : 0);
                                                        }, 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    ) : (
                                        <table className="w-full text-left border border-neutral-300 text-[6px]" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase text-center">
                                                    <th className="p-1 w-5 border-r border-neutral-300" rowSpan={2}>NO.</th>
                                                    <th className="p-1 border-r border-neutral-300 text-left" rowSpan={2}>PERSONEL</th>
                                                    <th className="p-1 w-12 border-r border-neutral-300" rowSpan={2}>SATUAN</th>
                                                    <th className="p-0.5 border-r border-neutral-300" colSpan={7}>HARI & TANGGAL</th>
                                                    <th className="p-1 w-12 border-l border-neutral-300" rowSpan={2}>JUMLAH</th>
                                                </tr>
                                                <tr className="bg-neutral-50 border-b border-neutral-300 font-bold text-neutral-500 text-center text-[5.5px]">
                                                    <th className="p-0.5 border-r border-neutral-200">SENIN<br/>1</th>
                                                    <th className="p-0.5 border-r border-neutral-200">SELASA<br/>2</th>
                                                    <th className="p-0.5 border-r border-neutral-200">RABU<br/>3</th>
                                                    <th className="p-0.5 border-r border-neutral-200">KAMIS<br/>4</th>
                                                    <th className="p-0.5 border-r border-neutral-200">JUMAT<br/>5</th>
                                                    <th className="p-0.5 border-r border-neutral-200">SABTU<br/>6</th>
                                                    <th className="p-0.5 border-r border-neutral-300">MINGGU<br/>7</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {personelWeeklyGrid.map((row, i) => {
                                                    const rowTotal = row.senin + row.selasa + row.rabu + row.kamis + row.jumat + row.sabtu + row.minggu;
                                                    return (
                                                        <tr key={i} className="border-b border-neutral-200">
                                                            <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{i + 1}</td>
                                                            <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800">{row.role}</td>
                                                            <td className="p-1 text-center border-r border-neutral-200 text-neutral-500">{row.unit}</td>
                                                            <td className="p-1 text-center border-r border-neutral-200">{row.senin || 0}</td>
                                                            <td className="p-1 text-center border-r border-neutral-200">{row.selasa || 0}</td>
                                                            <td className="p-1 text-center border-r border-neutral-200">{row.rabu || 0}</td>
                                                            <td className="p-1 text-center border-r border-neutral-200">{row.kamis || 0}</td>
                                                            <td className="p-1 text-center border-r border-neutral-200">{row.jumat || 0}</td>
                                                            <td className="p-1 text-center border-r border-neutral-200">{row.sabtu || 0}</td>
                                                            <td className="p-1 text-center border-r border-neutral-300">{row.minggu || 0}</td>
                                                            <td className="p-1 text-center font-black text-neutral-900 bg-neutral-50/50">{rowTotal}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-neutral-100 font-black text-neutral-900 text-center border-t border-neutral-300">
                                                    <td colSpan={3} className="p-1 text-right pr-2 border-r border-neutral-300 uppercase">JUMLAH</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelWeeklyGrid.reduce((a, r) => a + r.senin, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelWeeklyGrid.reduce((a, r) => a + r.selasa, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelWeeklyGrid.reduce((a, r) => a + r.rabu, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelWeeklyGrid.reduce((a, r) => a + r.kamis, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelWeeklyGrid.reduce((a, r) => a + r.jumat, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-200">{personelWeeklyGrid.reduce((a, r) => a + r.sabtu, 0)}</td>
                                                    <td className="p-1 border-r border-neutral-300">{personelWeeklyGrid.reduce((a, r) => a + r.minggu, 0)}</td>
                                                    <td className="p-1 bg-neutral-200 text-neutral-900">{personelWeeklyGrid.reduce((a, r) => a + r.senin + r.selasa + r.rabu + r.kamis + r.jumat + r.sabtu + r.minggu, 0)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    )}
                                </div>


                                {/* ---------------- PAGE 7: LAPORAN CUACA (LM-XX-07 / LB-XX-07) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(7), "Laporan Cuaca")}
                                    {renderWeeklyDateMetaRow()}

                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        LAPORAN CUACA {reportType === "monthly" ? "BULANAN (REKAP MINGGUAN)" : "MINGGUAN"}
                                    </div>

                                    {reportType === "monthly" ? (
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase text-center">
                                                    <th className="p-1 border-r border-neutral-300 text-left">KONDISI CUACA</th>
                                                    <th className="p-1 border-r border-neutral-200">MINGGU 1 (JAM)</th>
                                                    <th className="p-1 border-r border-neutral-200">MINGGU 2 (JAM)</th>
                                                    <th className="p-1 border-r border-neutral-200">MINGGU 3 (JAM)</th>
                                                    <th className="p-1 border-r border-neutral-200">MINGGU 4 (JAM)</th>
                                                    <th className="p-1 border-r border-neutral-300">MINGGU 5 (JAM)</th>
                                                    <th className="p-1 border-r border-neutral-300 bg-neutral-200 font-black text-neutral-900">TOTAL (JAM)</th>
                                                    <th className="p-1 bg-neutral-900 text-white font-black">EKUIVALEN (HARI @ 8 JAM)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {weatherMonthlyGrid.map((row, i) => {
                                                    const totalHours = row.minggu1Hours + row.minggu2Hours + row.minggu3Hours + row.minggu4Hours + row.minggu5Hours;
                                                    const eqDays = (totalHours / 8).toFixed(1);
                                                    return (
                                                        <tr key={i} className="border-b border-neutral-200 text-center">
                                                            <td className="p-1 font-bold text-left text-neutral-800 border-r border-neutral-200 pl-2 bg-neutral-50/50">{row.condition}</td>
                                                            <td className="p-1 border-r border-neutral-200">{row.minggu1Hours || 0}</td>
                                                            <td className="p-1 border-r border-neutral-200">{row.minggu2Hours || 0}</td>
                                                            <td className="p-1 border-r border-neutral-200">{row.minggu3Hours || 0}</td>
                                                            <td className="p-1 border-r border-neutral-200">{row.minggu4Hours || 0}</td>
                                                            <td className="p-1 border-r border-neutral-300">{row.minggu5Hours || 0}</td>
                                                            <td className="p-1 font-black text-neutral-900 border-r border-neutral-300 bg-neutral-100">{totalHours} jam</td>
                                                            <td className="p-1 font-black text-neutral-900 bg-amber-100/70">{eqDays} hari</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-neutral-100 font-black text-neutral-900 text-center border-t border-neutral-300 text-[6.5px]">
                                                    <td className="p-1 text-left pl-2 border-r border-neutral-300 uppercase">TOTAL WAKTU</td>
                                                    <td className="p-1 border-r border-neutral-200">{weatherMonthlyGrid.reduce((a, r) => a + r.minggu1Hours, 0)} jam</td>
                                                    <td className="p-1 border-r border-neutral-200">{weatherMonthlyGrid.reduce((a, r) => a + r.minggu2Hours, 0)} jam</td>
                                                    <td className="p-1 border-r border-neutral-200">{weatherMonthlyGrid.reduce((a, r) => a + r.minggu3Hours, 0)} jam</td>
                                                    <td className="p-1 border-r border-neutral-200">{weatherMonthlyGrid.reduce((a, r) => a + r.minggu4Hours, 0)} jam</td>
                                                    <td className="p-1 border-r border-neutral-300">{weatherMonthlyGrid.reduce((a, r) => a + r.minggu5Hours, 0)} jam</td>
                                                    <td className="p-1 border-r border-neutral-300 bg-neutral-200 text-neutral-900">
                                                        {weatherMonthlyGrid.reduce((a, r) => a + r.minggu1Hours + r.minggu2Hours + r.minggu3Hours + r.minggu4Hours + r.minggu5Hours, 0)} jam
                                                    </td>
                                                    <td className="p-1 bg-amber-200 text-neutral-900">
                                                        {(weatherMonthlyGrid.reduce((a, r) => a + r.minggu1Hours + r.minggu2Hours + r.minggu3Hours + r.minggu4Hours + r.minggu5Hours, 0) / 8).toFixed(1)} hari
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    ) : (
                                        <table className="w-full text-left border border-neutral-300 text-[5.5px]" style={{ borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase text-center">
                                                <th className="p-0.5 w-10 border-r border-neutral-300">JAM</th>
                                                <th className="p-0.5 border-r border-neutral-200">SENIN<br/>1</th>
                                                <th className="p-0.5 border-r border-neutral-200">SELASA<br/>2</th>
                                                <th className="p-0.5 border-r border-neutral-200">RABU<br/>3</th>
                                                <th className="p-0.5 border-r border-neutral-200">KAMIS<br/>4</th>
                                                <th className="p-0.5 border-r border-neutral-200">JUMAT<br/>5</th>
                                                <th className="p-0.5 border-r border-neutral-200">SABTU<br/>6</th>
                                                <th className="p-0.5 border-r border-neutral-300">MINGGU<br/>7</th>
                                                <th className="p-0.5 border-l border-neutral-300">KETERANGAN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {weatherHourlyGrid.map((row, i) => (
                                                <tr key={i} className="border-b border-neutral-200 text-center">
                                                    <td className="p-0.5 font-bold text-neutral-600 border-r border-neutral-200 bg-neutral-50/50">{row.hour}</td>
                                                    {(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] as const).map((dayKey, dIdx) => {
                                                        const val = row[dayKey] || "C";
                                                        return (
                                                            <td key={dIdx} className={clsx(
                                                                "p-0.5 border-r border-neutral-200 font-black text-[6px]",
                                                                val === "C" ? "bg-amber-100/70 text-amber-800" : val === "B" ? "bg-neutral-100 text-neutral-800" : "bg-blue-100/80 text-blue-900"
                                                            )}>
                                                                {val}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="p-0.5 text-left text-neutral-500 pl-1">{row.keterangan || ""}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            {(["C", "B", "H"] as const).map((code, cIdx) => {
                                                const label = code === "C" ? "CERAH C" : code === "B" ? "BERAWAN B" : "HUJAN H";
                                                const counts = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"].map(
                                                    dk => weatherHourlyGrid.filter(r => (r as any)[dk] === code).length
                                                );
                                                const totalCount = counts.reduce((a, b) => a + b, 0);
                                                return (
                                                    <tr key={cIdx} className="font-extrabold text-[6px] text-center border-t border-neutral-200">
                                                        <td className="p-1 text-left font-black text-neutral-800 bg-neutral-100 border-r border-neutral-300">{label}</td>
                                                        {counts.map((cnt, i) => (
                                                            <td key={i} className="p-1 border-r border-neutral-200 font-bold">{cnt}</td>
                                                        ))}
                                                        <td className="p-1 font-black text-neutral-900 bg-neutral-100">{totalCount}</td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="font-black text-[6px] text-center border-t border-neutral-300 bg-neutral-100">
                                                <td className="p-1 text-left uppercase border-r border-neutral-300">TOTAL</td>
                                                <td className="p-1 border-r border-neutral-200">24</td>
                                                <td className="p-1 border-r border-neutral-200">24</td>
                                                <td className="p-1 border-r border-neutral-200">24</td>
                                                <td className="p-1 border-r border-neutral-200">24</td>
                                                <td className="p-1 border-r border-neutral-200">24</td>
                                                <td className="p-1 border-r border-neutral-200">24</td>
                                                <td className="p-1 border-r border-neutral-300">24</td>
                                                <td className="p-1 bg-neutral-200">168</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>


                                {/* ---------------- PAGE 8: LAPORAN KENDALA (LM-XX-08 / LB-XX-08) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(8), "Laporan Kendala")}
                                    {renderWeeklyDateMetaRow()}

                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        LAPORAN KENDALA {reportType === "monthly" ? "BULANAN" : ""}
                                    </div>

                                    <table className="w-full text-left border border-neutral-300 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr className="bg-neutral-50 border-b border-neutral-300 font-extrabold text-neutral-500 uppercase">
                                                <th className="p-1 w-5 text-center border-r border-neutral-300">NO.</th>
                                                <th className="p-1 w-20 text-center border-r border-neutral-300">TANGGAL</th>
                                                <th className="p-1 border-r border-neutral-300">URAIAN KENDALA / MASALAH</th>
                                                <th className="p-1 border-r border-neutral-300">SOLUSI</th>
                                                <th className="p-1">REKOMENDASI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {kendalaItems.map((k, i) => (
                                                <tr key={i} className="border-b border-neutral-200">
                                                    <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{i + 1}</td>
                                                    <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-800">{k.date || "—"}</td>
                                                    <td className="p-1 border-r border-neutral-200 text-neutral-900 font-semibold">{k.problem || "—"}</td>
                                                    <td className="p-1 border-r border-neutral-200 text-neutral-700">{k.solution || "—"}</td>
                                                    <td className="p-1 text-neutral-700">{k.recommendation || "—"}</td>
                                                </tr>
                                            ))}
                                            {kendalaItems.length === 0 && (
                                                <tr><td colSpan={5} className="p-3 text-center text-neutral-300 italic">Tidak ada catatan kendala lapangan {reportType === "monthly" ? "bulan" : "minggu"} ini.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>


                                {/* ---------------- PAGE 9: DOKUMENTASI (LM-XX-09 / LB-XX-09) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(9), "Dokumentasi Pekerjaan")}
                                    {renderWeeklyDateMetaRow()}

                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        DOKUMENTASI FOTO {reportType === "monthly" ? "BULANAN" : "MINGGUAN"}
                                    </div>

                                    <div className="border border-neutral-300 border-t-0 p-3">
                                        {photos.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                {photos.map((p, idx) => (
                                                    <div key={idx} className="space-y-1">
                                                        <img src={p.url} crossOrigin="anonymous" alt={`Dokumentasi ${idx+1}`} className="w-full rounded border border-neutral-200" style={{ aspectRatio: "4/3", objectFit: "cover" }} />
                                                        {p.caption && <p className="text-[6px] text-neutral-600 font-bold text-center">{p.caption}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-40 flex items-center justify-center text-[7px] text-neutral-300 italic border border-dashed border-neutral-200">
                                                [ Belum ada foto dokumentasi disinkronkan ]
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {/* ---------------- PAGE 10: LAMPIRAN (LM-XX-10 / LB-XX-10) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader(reportType === "monthly" ? "LB" : "LM", getReportPageDocCode(10), reportType === "monthly" ? "Lampiran Laporan Mingguan / Harian" : "Lampiran Laporan Harian")}
                                    {renderWeeklyDateMetaRow()}

                                    <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                        LAMPIRAN LAPORAN {reportType === "monthly" ? "MINGGUAN / HARIAN" : "HARIAN"} (PERIODE {reportType === "monthly" ? `BULAN KE-${monthNumber.padStart(2,'0')}` : `MINGGU KE-${weekNumber.padStart(2,'0')}`})
                                    </div>

                                    <div className="space-y-2">
                                        <table className="w-full text-left border border-neutral-300 border-t-0 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-50 border-b border-neutral-300 font-extrabold text-neutral-500 uppercase">
                                                    <th className="p-1 w-5 text-center border-r border-neutral-300">NO</th>
                                                    <th className="p-1 w-24 border-r border-neutral-300">TANGGAL LAPORAN</th>
                                                    <th className="p-1 border-r border-neutral-300">JUDUL LAPORAN HARIAN</th>
                                                    <th className="p-1 w-16 text-center border-r border-neutral-300">MANPOWER</th>
                                                    <th className="p-1 w-16 text-center">PROGRES (%)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attachedDailyReports.map((lh, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{i+1}</td>
                                                        <td className="p-1 border-r border-neutral-200 font-bold text-neutral-900">{lh.report_date}</td>
                                                        <td className="p-1 border-r border-neutral-200 text-neutral-800">{lh.title}</td>
                                                        <td className="p-1 text-center border-r border-neutral-200 font-bold">{lh.manpowerCount || "0"} org</td>
                                                        <td className="p-1 text-center font-bold text-neutral-900">{lh.progress || 0} %</td>
                                                    </tr>
                                                ))}
                                                {attachedDailyReports.length === 0 && (
                                                    <tr><td colSpan={5} className="p-3 text-center text-neutral-300 italic">Belum ada Laporan Harian disinkronkan untuk periode ini.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                </div>

                            </div>
                        )}

                        {/* ===================== MONTHLY PREVIEW ===================== */}
                        {reportType === "monthly" && (
                            <div className="bg-white text-neutral-800 shadow-xl w-full p-8 flex flex-col justify-between" style={{ minHeight: "920px", fontFamily: "Arial, sans-serif" }}>
                                <div>
                                    <div className="border-b border-neutral-800 pb-3 mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <img src="/logo-adidaya-red.svg" alt="Adidaya" className="w-5 h-5 object-contain filter brightness-0" />
                                            <div>
                                                <h1 className="font-black text-[11px] text-neutral-900 tracking-wider">ADIDAYA STUDIO</h1>
                                                <p className="text-[6px] text-neutral-400 font-bold uppercase tracking-widest leading-none mt-0.5">Laporan Rekapitulasi Progres Bulanan</p>
                                            </div>
                                        </div>
                                        <span className="inline-block px-2 py-0.5 text-[6px] font-black uppercase tracking-widest rounded bg-neutral-900 text-white leading-none">MONTHLY</span>
                                    </div>
                                    <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 mb-4 grid grid-cols-2 gap-3 text-[7px] font-semibold text-neutral-600">
                                        <div>
                                            <span className="text-[5px] font-bold text-neutral-400 block uppercase">Proyek</span>
                                            <span className="text-[8px] font-bold text-neutral-800 uppercase block">{currentProject?.name || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[5px] font-bold text-neutral-400 block uppercase">Tanggal</span>
                                            <span className="text-[8px] font-bold text-neutral-800 block">{getFormattedDate()}</span>
                                        </div>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-neutral-800 text-[8px] leading-relaxed" dangerouslySetInnerHTML={{ __html: editorContent || "<p>Belum ada isi laporan.</p>" }} />
                                </div>
                            </div>
                        )}

                    </div>

                </div>

            </div>

            {/* ===================== PHOTO PICKER MODAL (Max 18 Photos) ===================== */}
            {isPhotoPickerOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl space-y-0">
                        {/* Header */}
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
                            <div>
                                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">Pilih Foto Dari Laporan Harian</h3>
                                <p className="text-xs text-neutral-400 font-semibold mt-0.5">Pilih foto mana yang ingin dimasukkan ke Laporan Mingguan Utama (Maksimal 18 Foto).</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                                    photos.length >= 18 
                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400" 
                                        : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200"
                                )}>
                                    {photos.length} / 18 Terpilih
                                </span>
                                <button onClick={() => setIsPhotoPickerOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Photo Grid */}
                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-3 gap-4">
                            {allDailyPhotos.map((p, idx) => {
                                const isSelected = photos.some(item => item.url === p.url);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => togglePhotoSelection(p)}
                                        className={clsx(
                                            "relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all group",
                                            isSelected 
                                                ? "border-neutral-900 dark:border-white ring-2 ring-neutral-900/20" 
                                                : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <img src={p.url} alt={`Photo ${idx}`} className="w-full h-36 object-cover" />
                                        <div className="absolute top-2 right-2">
                                            {isSelected ? (
                                                <div className="bg-neutral-900 text-white rounded-full p-1 shadow-md">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 rounded-full border-2 border-white bg-black/40" />
                                            )}
                                        </div>
                                        <div className="p-2 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
                                            <span className="font-bold text-neutral-800 dark:text-neutral-200 block truncate">{p.caption || "Tanpa Keterangan"}</span>
                                            {p.dateStr && <span className="text-[9px] text-neutral-400 block mt-0.5">{p.dateStr}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
                            <span className="text-xs font-semibold text-neutral-500">Foto selebihnya tetap aman tersimpan pada lampiran Laporan Harian.</span>
                            <Button onClick={() => setIsPhotoPickerOpen(false)} className="bg-neutral-900 hover:bg-black text-white font-bold text-xs px-6 py-2">
                                Selesai Pilih Foto
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function ReportsEditorPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-neutral-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        }>
            <EditorContentComponent />
        </Suspense>
    );
}
