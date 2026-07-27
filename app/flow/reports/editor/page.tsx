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
    CloudRain,
    Globe,
    ChevronUp,
    ChevronDown
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
    const paramType = searchParams.get("type") as ExtendedReportType | null;
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
    const [reportType, setReportType] = useState<ExtendedReportType | string>(paramType || "daily");
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

    // --- SCH (PROJECT SCHEDULE) SPECIFIC STATES & BILINGUAL DATA ---
    const [schActiveTab, setSchActiveTab] = useState<"setup" | "wbs_activities" | "progress_update" | "critical_path" | "scurve_forecast">("setup");
    const [schLangMode, setSchLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1. Schedule Setup
    const [schBaselineVersion, setSchBaselineVersion] = useState("Baseline Rev 1.0");
    const [schDataDate, setSchDataDate] = useState(new Date().toISOString().split('T')[0]);
    const [schWorkCalendar, setSchWorkCalendar] = useState("7 Hari Kerja / 7-Day Working Calendar");
    const [schCutoffDate, setSchCutoffDate] = useState(new Date().toISOString().split('T')[0]);
    const [schRevision, setSchRevision] = useState("REV-01");

    // 2. WBS & Activities
    const [schActivities, setSchActivities] = useState<{
        wbs: string;
        activity: string;
        duration: string;
        dependency: string;
        milestone: string;
        weight: string;
    }[]>([
        { wbs: "1.1", activity: "Pekerjaan Persiapan & Mobilisasi / Site Setup & Mobilization", duration: "14 Hari", dependency: "—", milestone: "Start Project", weight: "5.00%" },
        { wbs: "1.2", activity: "Pekerjaan Pondasi & Substructure / Foundation Work", duration: "30 Hari", dependency: "1.1 (FS+0)", milestone: "Groundbreaking", weight: "25.00%" },
        { wbs: "2.1", activity: "Struktur Utama Lantai 1-3 / Main Superstructure Level 1-3", duration: "60 Hari", dependency: "1.2 (FS+0)", milestone: "Topping Off", weight: "40.00%" },
        { wbs: "3.1", activity: "Pekerjaan Arsitektur & MEP / Architecture & MEP", duration: "45 Hari", dependency: "2.1 (SS+10)", milestone: "BAST Phase 1", weight: "30.00%" },
    ]);

    // 3. Progress Update
    const [schBaselineStartDate, setSchBaselineStartDate] = useState(getPrevSundayDateStr());
    const [schBaselineFinishDate, setSchBaselineFinishDate] = useState(getNextSaturdayDateStr());
    const [schActualStartDate, setSchActualStartDate] = useState(getPrevSundayDateStr());
    const [schActualFinishDate, setSchActualFinishDate] = useState("");
    const [schRemainingDuration, setSchRemainingDuration] = useState("45 Hari / Days");
    const [schProgress, setSchProgress] = useState("65.50%");
    const [schForecastFinishDate, setSchForecastFinishDate] = useState(getNextSaturdayDateStr());

    // 4. Critical Path & Delay
    const [schTotalFloat, setSchTotalFloat] = useState("-5 Hari / Days");
    const [schCriticalActivities, setSchCriticalActivities] = useState("Struktur Utama Lantai 2 & Eresi Rangka Baja Atap / Main Structure Floor 2 & Steel Roof Erection");
    const [schDelayEvent, setSchDelayEvent] = useState("Keterlambatan pengiriman material struktur baja akibat cuaca ekstrem / Structural steel delivery delay due to severe weather");
    const [schScheduleImpact, setSchScheduleImpact] = useState("Potensi keterlambatan 5 hari kerja pada lintasan kritis / Potential 5-day delay on the critical path");
    const [schRecoveryAction, setSchRecoveryAction] = useState("Penambahan shift malam & optimalisasi jumlah tenaga kerja pembesian / Night shift addition & rebar crew optimization");

    // 5. S-Curve & Forecast
    const [schPlanned, setSchPlanned] = useState("70.00%");
    const [schActual, setSchActual] = useState("65.50%");
    const [schEarned, setSchEarned] = useState("Rp 1.450.000.000 (EV)");
    const [schVariance, setSchVariance] = useState("-4.50% (Behind Schedule / Keterlambatan)");
    const [schForecastCompletion, setSchForecastCompletion] = useState(getNextSaturdayDateStr());

    // SCH Dynamic Approvals (Max 4 columns: Disusun, Dicek, Mengetahui, Disetujui)
    const [schApprovals, setSchApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui";
        name: string;
        role: string;
    }[]>([
        { type: "disusun", name: "", role: "Project Scheduler / Planner" },
        { type: "dicek", name: "", role: "Site Manager / Lead Engineer" },
        { type: "disetujui", name: "", role: "Project Director / Client" }
    ]);

    // --- CST (COST & BUDGET REPORT) SPECIFIC STATES & BILINGUAL DATA ---
    const [cstActiveTab, setCstActiveTab] = useState<"setup" | "commitment_actual" | "cost_by_wp" | "variance_ev" | "cashflow_forecast">("setup");
    const [cstLangMode, setCstLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1. Budget Baseline
    const [cstContractValue, setCstContractValue] = useState("Rp 15.000.000.000");
    const [cstApprovedRAB, setCstApprovedRAB] = useState("Rp 14.250.000.000");
    const [cstContingency, setCstContingency] = useState("5.00%");
    const [cstBudgetRevision, setCstBudgetRevision] = useState("REV-00");
    const [cstCostCodeStructure, setCstCostCodeStructure] = useState("WBS-Based / Struktur Berbasis WBS");

    // 2. Commitment & Actual Cost
    const [cstCommitments, setCstCommitments] = useState<{
        poSpk: string; vendor: string; value: string; invoiced: string; paid: string; accrual: string;
    }[]>([
        { poSpk: "PO-001", vendor: "PT Baja Nusantara / Nusantara Steel Co.", value: "Rp 2.500.000.000", invoiced: "Rp 1.800.000.000", paid: "Rp 1.500.000.000", accrual: "Rp 300.000.000" },
        { poSpk: "SPK-002", vendor: "CV Beton Mandiri / Mandiri Concrete", value: "Rp 1.200.000.000", invoiced: "Rp 900.000.000", paid: "Rp 750.000.000", accrual: "Rp 150.000.000" },
    ]);

    // 3. Cost by Work Package
    const [cstWorkPackages, setCstWorkPackages] = useState<{
        costCode: string; description: string; originalBudget: string; revisedBudget: string; committed: string; actual: string; remaining: string;
    }[]>([
        { costCode: "1.1", description: "Persiapan & Mobilisasi / Preparation & Mobilization", originalBudget: "Rp 750.000.000", revisedBudget: "Rp 750.000.000", committed: "Rp 700.000.000", actual: "Rp 680.000.000", remaining: "Rp 70.000.000" },
        { costCode: "1.2", description: "Pekerjaan Pondasi / Foundation Work", originalBudget: "Rp 3.500.000.000", revisedBudget: "Rp 3.500.000.000", committed: "Rp 3.200.000.000", actual: "Rp 2.900.000.000", remaining: "Rp 600.000.000" },
    ]);

    // 4. Variance & Earned Value
    const [cstPV, setCstPV] = useState("Rp 9.800.000.000");
    const [cstEV, setCstEV] = useState("Rp 9.200.000.000");
    const [cstAC, setCstAC] = useState("Rp 9.500.000.000");
    const [cstCV, setCstCV] = useState("Rp -300.000.000");
    const [cstCPI, setCstCPI] = useState("0.968");
    const [cstEAC, setCstEAC] = useState("Rp 14.720.000.000");

    // 5. Cashflow & Forecast
    const [cstPlannedCashflow, setCstPlannedCashflow] = useState("Rp 3.200.000.000");
    const [cstActualCashflow, setCstActualCashflow] = useState("Rp 2.950.000.000");
    const [cstOutstandingPayment, setCstOutstandingPayment] = useState("Rp 450.000.000");
    const [cstForecast, setCstForecast] = useState("Rp 14.720.000.000 (EAC)");
    const [cstCorrectiveAction, setCstCorrectiveAction] = useState("Optimalisasi penggunaan material & negosiasi ulang vendor / Material optimization & vendor re-negotiation");

    // CST Dynamic Approvals
    const [cstApprovals, setCstApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Quantity Surveyor / Cost Controller" },
        { type: "dicek", name: "", role: "Finance Manager / Manajer Keuangan" },
        { type: "disetujui", name: "", role: "Project Director / Direktur Proyek" },
    ]);

    // --- CRW (MANPOWER & PAYROLL) SPECIFIC STATES & BILINGUAL DATA ---
    const [crwActiveTab, setCrwActiveTab] = useState<"setup" | "attendance_mandays" | "payroll_calc" | "crew_allocation" | "payroll_verify">("setup");
    const [crwLangMode, setCrwLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1. Workforce Setup
    const [crwWorkforce, setCrwWorkforce] = useState<{
        perusahaan: string; crew: string; jabatan: string; rate: string; shift: string; employmentType: string;
    }[]>([
        { perusahaan: "PT Adidaya Konstruksi", crew: "Tim Pembesian / Rebar Crew", jabatan: "Mandor / Foreman", rate: "Rp 350.000/hari", shift: "Shift Pagi / Day Shift", employmentType: "Harian Tetap / Regular Daily" },
        { perusahaan: "CV Subkon Beton", crew: "Tim Cor / Concrete Crew", jabatan: "Pekerja / Worker", rate: "Rp 250.000/hari", shift: "Shift Pagi / Day Shift", employmentType: "Harian Lepas / Casual Daily" },
    ]);

    // 2. Attendance & Mandays
    const [crwAttendanceTotal, setCrwAttendanceTotal] = useState("142");
    const [crwNormalHours, setCrwNormalHours] = useState("1.136 Jam / Hours");
    const [crwOvertime, setCrwOvertime] = useState("284 Jam / Hours");
    const [crwAbsence, setCrwAbsence] = useState("8 Orang / People");
    const [crwMandays, setCrwMandays] = useState("710 MD");

    // 3. Payroll Calculation
    const [crwBaseWage, setCrwBaseWage] = useState("Rp 42.600.000");
    const [crwOvertimePay, setCrwOvertimePay] = useState("Rp 8.520.000");
    const [crwAllowance, setCrwAllowance] = useState("Rp 4.260.000");
    const [crwDeduction, setCrwDeduction] = useState("Rp 1.200.000");
    const [crwNetPayroll, setCrwNetPayroll] = useState("Rp 54.180.000");

    // 4. Crew Allocation
    const [crwAllocations, setCrwAllocations] = useState<{
        area: string; wbs: string; supervisor: string; jumlah: string; produktivitas: string; utilisation: string;
    }[]>([
        { area: "Zona A — Struktur Utama / Main Structure", wbs: "2.1", supervisor: "Pak Ahmad / Mr. Ahmad", jumlah: "45 Orang", produktivitas: "92%", utilisation: "88%" },
        { area: "Zona B — MEP & Arsitektur / MEP & Architecture", wbs: "3.1", supervisor: "Pak Budi / Mr. Budi", jumlah: "32 Orang", produktivitas: "85%", utilisation: "80%" },
    ]);

    // 5. Payroll Verification
    const [crwDispute, setCrwDispute] = useState("Tidak ada / None");
    const [crwPayrollApproval, setCrwPayrollApproval] = useState("Approved / Disetujui");
    const [crwPaymentStatus, setCrwPaymentStatus] = useState("Lunas / Paid");
    const [crwPaymentDate, setCrwPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    // CRW Dynamic Approvals
    const [crwApprovals, setCrwApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "HR & Payroll Admin" },
        { type: "dicek", name: "", role: "Site Manager / Manajer Lapangan" },
        { type: "disetujui", name: "", role: "Project Manager / Manajer Proyek" },
    ]);

    // --- PRC (PROCUREMENT & STOCK) SPECIFIC STATES & BILINGUAL DATA ---
    const [prcActiveTab, setPrcActiveTab] = useState<"setup" | "rfq_po" | "delivery_inspection" | "stock_consumption" | "shortage_expediting">("setup");
    const [prcLangMode, setPrcLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1. Procurement Plan
    const [prcPlanItems, setPrcPlanItems] = useState<{
        material: string; wbs: string; requiredDate: string; leadTime: string; method: string;
    }[]>([
        { material: "Besi Beton D16 / Rebar D16mm", wbs: "2.1", requiredDate: "2026-08-15", leadTime: "14 Hari / Days", method: "Direct Purchase / Pembelian Langsung" },
        { material: "Semen PPC 50kg / PPC Cement 50kg", wbs: "1.2", requiredDate: "2026-08-01", leadTime: "7 Hari / Days", method: "Kontrak Payung / Blanket Order" },
    ]);

    // 2. RFQ, Selection & PO
    const [prcOrders, setPrcOrders] = useState<{
        vendor: string; quotation: string; comparison: string; selectedVendor: string; poSpk: string; contractValue: string;
    }[]>([
        { vendor: "PT Krakatau Steel / Krakatau Steel Corp.", quotation: "Rp 2.450.000.000", comparison: "3 Vendor Dibandingkan / 3 Vendors Compared", selectedVendor: "PT Krakatau Steel", poSpk: "PO-2026-001", contractValue: "Rp 2.450.000.000" },
    ]);

    // 3. Delivery & Inspection
    const [prcDeliveries, setPrcDeliveries] = useState<{
        item: string; schedule: string; receivedQty: string; inspectionResult: string; rejectedQty: string; status: string;
    }[]>([
        { item: "Besi Beton D16 / Rebar D16mm", schedule: "2026-08-10", receivedQty: "25 Ton", inspectionResult: "Pass / Lolos", rejectedQty: "0", status: "Delivered / Terkirim" },
    ]);

    // 4. Stock & Consumption
    const [prcOpeningStock, setPrcOpeningStock] = useState("45 Ton");
    const [prcReceived, setPrcReceived] = useState("25 Ton");
    const [prcIssued, setPrcIssued] = useState("32 Ton");
    const [prcReturned, setPrcReturned] = useState("2 Ton");
    const [prcClosingStock, setPrcClosingStock] = useState("40 Ton");
    const [prcStorageLocation, setPrcStorageLocation] = useState("Gudang Utama Site A / Main Warehouse Site A");

    // 5. Shortage & Expediting
    const [prcLateDelivery, setPrcLateDelivery] = useState("1 Item (Pipa HDPE PN10 / HDPE Pipe PN10)");
    const [prcShortage, setPrcShortage] = useState("5 Ton Besi D10 / 5 Ton Rebar D10");
    const [prcLeadTimeVariance, setPrcLeadTimeVariance] = useState("+3 Hari / +3 Days Late");
    const [prcExpeditingAction, setPrcExpeditingAction] = useState("Koordinasi ulang vendor & pengiriman dipercepat / Re-coordinate with vendor & expedite delivery");
    const [prcPIC, setPrcPIC] = useState("Logistic Manager / Manajer Logistik");

    // PRC Dynamic Approvals
    const [prcApprovals, setPrcApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Procurement Officer / Staf Pengadaan" },
        { type: "dicek", name: "", role: "Logistic Manager / Manajer Logistik" },
        { type: "disetujui", name: "", role: "Project Manager / Manajer Proyek" },
    ]);

    // --- FIN (FINANCE REGISTER) SPECIFIC STATES & BILINGUAL DATA ---
    const [finActiveTab, setFinActiveTab] = useState<"setup" | "transactions" | "receivable_payable" | "reconciliation" | "closing_audit">("setup");
    const [finLangMode, setFinLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1. Account & Opening Balance
    const [finBankAccount, setFinBankAccount] = useState("BCA 123-456-7890 — Rekening Operasional Proyek / Project Operating Account");
    const [finOpeningBalance, setFinOpeningBalance] = useState("Rp 2.500.000.000");
    const [finCurrency, setFinCurrency] = useState("IDR (Rupiah)");
    const [finCustodian, setFinCustodian] = useState("Finance Manager / Manajer Keuangan Proyek");

    // 2. Cash & Bank Transactions
    const [finTransactions, setFinTransactions] = useState<{
        voucher: string; date: string; description: string; debit: string; credit: string; balance: string;
    }[]>([
        { voucher: "BKK-001", date: "2026-07-01", description: "Pembayaran Material Besi / Rebar Material Payment", debit: "", credit: "Rp 1.500.000.000", balance: "Rp 1.000.000.000" },
        { voucher: "BKM-001", date: "2026-07-05", description: "Pencairan Termin 2 / Progress Payment Tranche 2", debit: "Rp 3.000.000.000", credit: "", balance: "Rp 4.000.000.000" },
    ]);

    // 3. Receivable & Payable
    const [finReceivables, setFinReceivables] = useState<{
        party: string; invoice: string; dueDate: string; outstanding: string; status: string;
    }[]>([
        { party: "Owner / PT ABC Developer", invoice: "INV-TERMIN-03", dueDate: "2026-08-15", outstanding: "Rp 4.500.000.000", status: "Pending / Belum Dibayar" },
    ]);

    // 4. Reconciliation
    const [finBookBalance, setFinBookBalance] = useState("Rp 4.000.000.000");
    const [finBankBalance, setFinBankBalance] = useState("Rp 3.985.000.000");
    const [finDifference, setFinDifference] = useState("Rp 15.000.000");
    const [finSupportingEvidence, setFinSupportingEvidence] = useState("Selisih karena biaya admin bank & cek beredar / Difference due to bank charges & outstanding checks");

    // 5. Closing & Audit Review
    const [finCutOff, setFinCutOff] = useState(new Date().toISOString().split('T')[0]);
    const [finExceptions, setFinExceptions] = useState("Tidak ada / None");
    const [finMissingEvidence, setFinMissingEvidence] = useState("Tidak ada / None");
    const [finReviewerComments, setFinReviewerComments] = useState("");
    const [finClosingApproval, setFinClosingApproval] = useState("Pending Review / Menunggu Review");

    // FIN Dynamic Approvals
    const [finApprovals, setFinApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Finance Staff / Staf Keuangan" },
        { type: "dicek", name: "", role: "Finance Manager / Manajer Keuangan" },
        { type: "disetujui", name: "", role: "Project Director / Direktur Proyek" },
    ]);

    // --- RSC (EQUIPMENT & ASSET REGISTER) SPECIFIC STATES & BILINGUAL DATA ---
    const [rscActiveTab, setRscActiveTab] = useState<"setup" | "mobilisation" | "operation_log" | "inspection_maintenance" | "demobilisation_cost">("setup");
    const [rscLangMode, setRscLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1. Asset Master
    const [rscAssets, setRscAssets] = useState<{
        assetCode: string; ownership: string; type: string; brandModel: string; capacity: string; location: string;
    }[]>([
        { assetCode: "EXC-001", ownership: "Sewa / Rental", type: "Excavator", brandModel: "Komatsu PC200-8", capacity: "20 Ton", location: "Zona A — Galian Pondasi / Foundation Excavation" },
        { assetCode: "TC-001", ownership: "Milik Sendiri / Owned", type: "Tower Crane", brandModel: "Potain MC 85B", capacity: "5 Ton / 50m", location: "Area Tengah / Central Area" },
    ]);

    // 2. Mobilisation & Assignment
    const [rscMobilisations, setRscMobilisations] = useState<{
        assetCode: string; mobilDate: string; assignedArea: string; operator: string; plannedDuration: string;
    }[]>([
        { assetCode: "EXC-001", mobilDate: "2026-07-01", assignedArea: "Zona A — Galian Pondasi / Foundation Zone", operator: "Operator Ujang / Mr. Ujang", plannedDuration: "90 Hari / Days" },
    ]);

    // 3. Operation Log
    const [rscOperations, setRscOperations] = useState<{
        assetCode: string; workingHours: string; idleHours: string; hourMeter: string; output: string; fuelUse: string;
    }[]>([
        { assetCode: "EXC-001", workingHours: "8 Jam / Hours", idleHours: "2 Jam / Hours", hourMeter: "3.450 HM", output: "120 m3/hari", fuelUse: "45 Liter/hari" },
    ]);

    // 4. Inspection & Maintenance
    const [rscInspections, setRscInspections] = useState<{
        assetCode: string; checklist: string; serviceSchedule: string; breakdown: string; repairAction: string;
    }[]>([
        { assetCode: "EXC-001", checklist: "Lolos / Pass — OK", serviceSchedule: "Service 500 HM: 2026-08-10", breakdown: "Tidak ada / None", repairAction: "Ganti filter oli & hydraulic / Oil & hydraulic filter replacement" },
    ]);

    // 5. Demobilisation & Cost
    const [rscDemobilisations, setRscDemobilisations] = useState<{
        assetCode: string; offHireDate: string; rentalCost: string; fuelCost: string; repairCost: string; finalCondition: string;
    }[]>([
        { assetCode: "EXC-001", offHireDate: "—", rentalCost: "Rp 45.000.000/bln", fuelCost: "Rp 12.500.000", repairCost: "Rp 3.200.000", finalCondition: "Baik / Good Condition" },
    ]);

    // RSC Dynamic Approvals
    const [rscApprovals, setRscApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Equipment Coordinator / Koordinator Alat" },
        { type: "dicek", name: "", role: "Site Manager / Manajer Lapangan" },
        { type: "disetujui", name: "", role: "Project Manager / Manajer Proyek" },
    ]);

    // --- QAC (QUALITY CONTROL) SPECIFIC STATES & BILINGUAL DATA ---
    const [qacActiveTab, setQacActiveTab] = useState<"setup" | "inspection_req" | "inspection_res" | "ncr_defect" | "reinspection_closure">("setup");
    const [qacLangMode, setQacLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1. Inspection Plan
    const [qacPlans, setQacPlans] = useState<{
        itpRef: string; workItem: string; stage: string; holdPoint: string; criteria: string;
    }[]>([
        { itpRef: "ITP-STR-001", workItem: "Pengecoran Beton Slab Lt. 2 / Floor Slab Concrete Pouring L2", stage: "Pre-pour / Sebelum Cor", holdPoint: "Hold Point (Client Inspection Required)", criteria: "Slump test 12±2 cm, Slump & Cube sample 3 set / 28 days" },
    ]);

    // 2. Inspection Request
    const [qacRequests, setQacRequests] = useState<{
        area: string; grid: string; drawingSpec: string; inspectionDate: string; inspector: string;
    }[]>([
        { area: "Zona A — Lantai 2 / Zone A — 2nd Floor", grid: "Grid A1 - C5", drawingSpec: "DWG-STR-201 Rev 2 & SPECS-03300", inspectionDate: new Date().toISOString().split('T')[0], inspector: "QC Engineer (Pak Andi / Mr. Andi)" },
    ]);

    // 3. Inspection Result
    const [qacResults, setQacResults] = useState<{
        checklist: string; measurement: string; testResult: string; status: string; evidence: string;
    }[]>([
        { checklist: "Pembesian & Bekisting / Rebar & Formwork", measurement: "Selimut beton 30mm / Concrete cover 30mm", testResult: "K-350 Slump 12cm PASS", status: "Pass / Lolos", evidence: "IMG_QC_001.jpg" },
    ]);

    // 4. NCR & Defect
    const [qacNcrs, setQacNcrs] = useState<{
        ncrNumber: string; nonconformity: string; rootCause: string; correctiveAction: string; targetDate: string;
    }[]>([
        { ncrNumber: "NCR-2026-003", nonconformity: "Sarang lebah pada kolom K-04 / Honeycomb on Column K-04", rootCause: "Vibrator tidak merata / Insufficient vibration", correctiveAction: "Grouting dengan bahan Grout Non-Shrink SikaGrout 215", targetDate: "2026-08-05" },
    ]);

    // 5. Reinspection & Closure
    const [qacClosure, setQacClosure] = useState({
        repairEvidence: "Hasil Repair Grouting Foto & Test Hammer OK / Grout Repair Photos & Hammer Test OK",
        retestResult: "Pass 35 MPa (Hammer Test Grade OK)",
        verification: "Verified by QA/QC Manager & Client Representative",
        closedBy: "Pak Bambang (QA/QC Lead)",
        closureDate: new Date().toISOString().split('T')[0]
    });

    // QAC Dynamic Approvals
    const [qacApprovals, setQacApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "QA/QC Inspector / Engineer" },
        { type: "dicek", name: "", role: "QA/QC Manager / Site Manager" },
        { type: "disetujui", name: "", role: "MK / Client Representative" },
    ]);

    // --- HSE (HEALTH, SAFETY & ENVIRONMENT) SPECIFIC STATES & BILINGUAL DATA ---
    const [hseActiveTab, setHseActiveTab] = useState<"setup" | "hazard_inspection" | "incident_nearmiss" | "permit_tbm_competency" | "corrective_closure">("setup");
    const [hseLangMode, setHseLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1. Workforce & Safe Hours
    const [hseWorkforce, setHseWorkforce] = useState("145 Orang / People");
    const [hseHoursWorked, setHseHoursWorked] = useState("1.160 Jam / Hours");
    const [hseCumulativeSafeHours, setHseCumulativeSafeHours] = useState("128.450 Jam / Safe Hours");
    const [hseLostTimeStatus, setHseLostTimeStatus] = useState("Zero LTI (Zero Lost Time Injury)");

    // 2. Hazard & Site Inspection
    const [hseHazards, setHseHazards] = useState<{
        area: string; activity: string; hazard: string; riskLevel: string; condition: string;
    }[]>([
        { area: "Scaffolding Zone B", activity: "Eresi Rangka Baja Atap / Steel Roof Erection", hazard: "Bekerja di Ketinggian > 2m / Work at Height", riskLevel: "Tinggi / High Risk", condition: "Pekerja tidak menggunakan Full Body Harness ganda / Unsafe Act" },
    ]);

    // 3. Incident & Near Miss
    const [hseIncidents, setHseIncidents] = useState<{
        event: string; classification: string; damage: string; immediateAction: string; investigation: string;
    }[]>([
        { event: "Material Besi Terjatuh dari Crane / Material Dropped from Crane", classification: "Near Miss (Hampir Celaka)", damage: "Kerusakan kecil pada pagar pembatas / Minor Barrier Damage", immediateAction: "Hentikan pengangkatan & sterilisasi area gantung", investigation: "Sling kawat tergelincir due to unbalanced rigging setup" },
    ]);

    // 4. Permit, TBM & Competency
    const [hsePermit, setHsePermit] = useState("PTW-HOT-012 (Hot Work & Work at Height Approved)");
    const [hseTbm, setHseTbm] = useState("TBM-082 (Bahaya Bekerja di Ketinggian & Penggunaan Harness — 145 Peserta)");
    const [hseOperatorLicence, setHseOperatorLicence] = useState("SIO Tower Crane Class 1 Active (Valid until 2027)");
    const [hseTraining, setHseTraining] = useState("Pelatihan K3 Ketinggian & Rigger Sertifikasi Kemnaker");
    const [hseApdCompliance, setHseApdCompliance] = useState("98.5% (Full Safety Helmet, Vest, Boot & Harness Compliance)");

    // 5. Corrective Action & Closure
    const [hseClosure, setHseClosure] = useState({
        finding: "Perlu penambahan barikade pengaman pada opening void lantai 3",
        rootCause: "Pengaman sementara terlepas saat pemindahan material",
        action: "Pasang barikade rigid & safety net pada seluruh area void lantai 3",
        pic: "HSE Officer (Pak Deni) & Mandor General",
        dueDate: new Date().toISOString().split('T')[0],
        verification: "Verified & Closed — Safety Net & Barikade Terpasang 100%"
    });

    // HSE Dynamic Approvals
    const [hseApprovals, setHseApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "HSE Officer / Inspector" },
        { type: "dicek", name: "", role: "HSE Manager / Coordinator" },
        { type: "disetujui", name: "", role: "Project Manager / Manajer Proyek" },
    ]);

    // --- IRK (ISSUE & RISK REGISTER) SPECIFIC STATES & BILINGUAL DATA ---
    const [irkActiveTab, setIrkActiveTab] = useState<"setup" | "risk_assessment" | "risk_response" | "issue_mgmt" | "monitoring_closure">("setup");
    const [irkLangMode, setIrkLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    // 1-3. Risk Management (Potensial / Belum Terjadi)
    const [irkRisks, setIrkRisks] = useState<{
        riskCode: string; statement: string; cause: string; event: string; effect: string; category: string;
        probability: string; impact: string; score: string; priority: string; strategy: string; contingencyPlan: string;
    }[]>([
        { riskCode: "RSK-001", statement: "Potensi keterlambatan pasokan semen akibat kelangkaan bahan baku nasional", cause: "Krisis pasokan klinker di pabrik utama", event: "Pengiriman semen terlambat > 7 hari", effect: "Pengecoran terhenti & delay jadwal 5 hari", category: "Supply Chain / Pengadaan", probability: "Moderat / 3", impact: "Tinggi / 4", score: "12 (High)", priority: "Tinggi / High", strategy: "Mitigate (Mitigasi)", contingencyPlan: "Kontrak cadangan dengan 2 supplier semen alternatif" },
        { riskCode: "RSK-002", statement: "Potensi lonjakan harga besi beton akibat fluktuasi nilai tukar", cause: "Kenaikan harga pasar global", event: "Kenaikan harga > 15%", effect: "Cost overrun RAB material", category: "Finansial / Commercial", probability: "Tinggi / 4", impact: "Tinggi / 4", score: "16 (High)", priority: "Sangat Tinggi / Very High", strategy: "Transfer / Blanket Order", contingencyPlan: "Lock price melalui Kontrak Payung 6 bulan" },
    ]);

    // 4. Issue Management (Aktual / Sudah Terjadi) — Separated from Risks!
    const [irkIssues, setIrkIssues] = useState<{
        issueCode: string; currentIssue: string; impact: string; escalation: string; resolutionAction: string; status: string;
    }[]>([
        { issueCode: "ISU-001", currentIssue: "Galian pondasi Zona A tergenang air hujan deras akibat rembesan air tanah", impact: "Pekerjaan penulangan pondasi terhenti selama 2 hari", escalation: "Escalated to Site Manager & Client Representative", resolutionAction: "Mobilisasi 3 unit pompa submersible 4 inch untuk dewatering 24 jam", status: "In Progress / Sedang Penanganan" },
    ]);

    // 5. Monitoring & Closure
    const [irkMonitorings, setIrkMonitorings] = useState<{
        code: string; owner: string; dueDate: string; residualRisk: string; trend: string; criteria: string;
    }[]>([
        { code: "RSK-001", owner: "Procurement Manager (Pak Herman)", dueDate: "2026-08-31", residualRisk: "Rendah / Low (Score 4)", trend: "Decreasing / Menurun", criteria: "Supplier cadangan sudah menanda-tangani MOU" },
        { code: "ISU-001", owner: "Site Engineer (Pak Eko)", dueDate: "2026-07-30", residualRisk: "Rendah / Low", trend: "Resolved", criteria: "Air galian surut total & pengecoran dapat berlanjut" },
    ]);

    // IRK Dynamic Approvals
    const [irkApprovals, setIrkApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Risk & Quality Engineer" },
        { type: "dicek", name: "", role: "Project Controls Manager" },
        { type: "disetujui", name: "", role: "Project Director / Client" },
    ]);

    // --- DOC (DOCUMENT CONTROL) SPECIFIC STATES ---
    const [docActiveTab, setDocActiveTab] = useState<"setup" | "doc_submission" | "doc_approval" | "doc_distribution" | "doc_archive">("setup");
    const [docLangMode, setDocLangMode] = useState<"bilingual" | "id" | "en">("bilingual");
    const [docRegister, setDocRegister] = useState<{
        docNumber: string; title: string; discipline: string; type: string; originator: string; filterTag: "General" | "RFI" | "ShopDrawing";
    }[]>([
        { docNumber: "DWG-STR-201", title: "Detail Penulangan Balok & Kolom Lantai 2", discipline: "Struktur / Structural", type: "Shop Drawing", originator: "PT Adidaya Konstruksi", filterTag: "ShopDrawing" },
        { docNumber: "RFI-ARC-005", title: "Klarifikasi Spesifikasi Dinding Drywall Partisi", discipline: "Arsitektur / Architecture", type: "RFI (Request for Info)", originator: "Site Engineer", filterTag: "RFI" },
    ]);
    const [docSubmissions, setDocSubmissions] = useState<{
        revision: string; subDate: string; transmittalNo: string; purposeOfIssue: string;
    }[]>([
        { revision: "Rev-01", subDate: "2026-07-20", transmittalNo: "TR-ADI-STR-012", purposeOfIssue: "For Approval / Untuk Persetujuan" },
    ]);
    const [docApprovals, setDocApprovals] = useState<{
        reviewer: string; status: string; comments: string; approvalDate: string;
    }[]>([
        { reviewer: "PT Konsultan Cipta (MK)", status: "Code A (Approved / Disetujui)", comments: "Disetujui tanpa catatan perbaikan", approvalDate: "2026-07-24" },
    ]);
    const [docDistributions, setDocDistributions] = useState<{
        recipient: string; controlledCopy: string; distDate: string; acknowledgement: string;
    }[]>([
        { recipient: "Site Supervisor (Pak Supri)", controlledCopy: "Copy #02 (Controlled)", distDate: "2026-07-25", acknowledgement: "Received / Diterima" },
    ]);
    const [docArchives, setDocArchives] = useState<{
        supersededRev: string; replacementDoc: string; retentionYears: string; archiveLocation: string;
    }[]>([
        { supersededRev: "Rev-00", replacementDoc: "DWG-STR-201 Rev-01", retentionYears: "5 Tahun", archiveLocation: "Server Vault / Rak Arsip A-04" },
    ]);
    const [docApprovalsMeta, setDocApprovalsMeta] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Document Controller (DC)" },
        { type: "dicek", name: "", role: "Lead Engineer / Coordinator" },
        { type: "disetujui", name: "", role: "Project Manager / Client Representative" },
    ]);

    // --- CCO (CONTRACT CHANGE ORDER / VO) SPECIFIC STATES ---
    const [ccoActiveTab, setCcoActiveTab] = useState<"setup" | "cco_scope" | "cco_cost" | "cco_impact" | "cco_approval">("setup");
    const [ccoLangMode, setCcoLangMode] = useState<"bilingual" | "id" | "en">("bilingual");
    const [ccoInitiation, setCcoInitiation] = useState<{
        origin: string; reference: string; description: string; reason: string;
    }>({
        origin: "Owner Request / Permintaan Owner",
        reference: "Site Instruction SI-004",
        description: "Penambahan pekerjaan dinding lapis peredam suara pada Hall Utama",
        reason: "Perubahan fungsi ruangan menjadi Multifunction Auditorium"
    });
    const [ccoScopeItems, setCcoScopeItems] = useState<{
        workItem: string; originalQty: string; changeQty: string; drawingRef: string;
    }[]>([
        { workItem: "Pekerjaan Akustik Rockwool 50mm", originalQty: "0 m2", changeQty: "+450 m2", drawingRef: "DWG-ARC-SK-08" },
        { workItem: "Pekerjaan Partisi Gypsum Board 2 Lapis", originalQty: "300 m2", changeQty: "+150 m2", drawingRef: "DWG-ARC-SK-08" },
    ]);
    const [ccoCosts, setCcoCosts] = useState<{
        unitRate: string; directCost: string; markup: string; totalImpact: string;
    }[]>([
        { unitRate: "Rp 350.000 / m2", directCost: "Rp 157.500.000", markup: "10% (Overhead & Profit)", totalImpact: "Rp 173.250.000" },
    ]);
    const [ccoTimeImpact, setCcoTimeImpact] = useState<{
        delayDays: string; affectedActivities: string; eotGranted: string; contractClauses: string;
    }>({
        delayDays: "7 Hari Kerja",
        affectedActivities: "Finishing Interior Hall & Testing Akustik",
        eotGranted: "Granted 7 Days (Extension of Time)",
        contractClauses: "Klausul 14.2 Perubahan Lingkup Pekerjaan & Tambah Kurang"
    });
    const [ccoNegotiation, setCcoNegotiation] = useState<{
        proposedValue: string; negotiatedValue: string; approvalStatus: string; approvedCO: string;
    }>({
        proposedValue: "Rp 173.250.000",
        negotiatedValue: "Rp 168.000.000",
        approvalStatus: "Approved / Disetujui",
        approvedCO: "CCO-002 / VO-002"
    });
    const [ccoApprovals, setCcoApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Quantity Surveyor (QS)" },
        { type: "dicek", name: "", role: "Commercial Manager" },
        { type: "disetujui", name: "", role: "Project Director / Owner Representative" },
    ]);

    // --- MOU (AGREEMENT & CONTRACT) SPECIFIC STATES ---
    const [mouActiveTab, setMouActiveTab] = useState<"setup" | "mou_scope" | "mou_commercial" | "mou_risk" | "mou_execution">("setup");
    const [mouLangMode, setMouLangMode] = useState<"bilingual" | "id" | "en">("bilingual");
    const [mouIdentity, setMouIdentity] = useState<{
        parties: string; legalEntity: string; contractNumber: string; effectiveDate: string;
    }>({
        parties: "PT Adidaya Studio & PT Cipta Bangun Utama",
        legalEntity: "Perseroan Terbatas (PT) / Badan Hukum Resmı",
        contractNumber: "AGR-2026-ADI-088",
        effectiveDate: "2026-08-01"
    });
    const [mouScopeDeliverables, setMouScopeDeliverables] = useState<{
        scope: string; exclusions: string; deliverables: string; acceptanceCriteria: string;
    }>({
        scope: "Pelaksanaan Pekerjaan Struktur Utama, Finishing Arsitektur & MEP",
        exclusions: "Pekerjaan Lansekap Luar & Penyambungan Daya Utama PLN",
        deliverables: "Bangunan 3 Lantai Siap Huni (Handover BAST 100%)",
        acceptanceCriteria: "Sesuai Spesifikasi Teknis, Lolos Commissioning & Uji Kelayakan"
    });
    const [mouCommercialTerms, setMouCommercialTerms] = useState<{
        contractValue: string; paymentTerms: string; taxDetails: string; retentionRate: string; variationMechanism: string;
    }>({
        contractValue: "Rp 4.850.000.000",
        paymentTerms: "DP 20%, Progress Monthly Termijn 75%, Retensi 5%",
        taxDetails: "Termasuk PPN 11% & PPh Pasal 4(2) Konstruksi",
        retentionRate: "5% (Masa Pemeliharaan 180 Hari Kalender)",
        variationMechanism: "Tertulis melalui CCO / VO disetujui kedua belah pihak"
    });
    const [mouTimeRisk, setMouTimeRisk] = useState<{
        contractPeriod: string; milestones: string; responsibilities: string; insuranceDetails: string; warrantyPeriod: string;
    }>({
        contractPeriod: "180 Hari Kalender (01 Aug 2026 - 27 Jan 2027)",
        milestones: "Struktur Topping Off (Bulan 3), Handover BAST-1 (Bulan 6)",
        responsibilities: "Kontraktor: Mutu & K3 | Employer: Pembayaran tepat waktu & Akses Site",
        insuranceDetails: "CAR (Contractor's All Risk) & TPL (Third Party Liability)",
        warrantyPeriod: "180 Hari Masa Pemeliharaan setelah BAST-1"
    });
    const [mouClausesExecution, setMouClausesExecution] = useState<{
        terminationClause: string; disputeResolution: string; governingLaw: string; signatories: string; executionStatus: string;
    }>({
        terminationClause: "Default 30 hari penanganan cedera janji",
        disputeResolution: "Musyawarah Mufakat / BANI (Badan Arbitrase Nasional Indonesia)",
        governingLaw: "Hukum Republik Indonesia",
        signatories: "Direktur Utama PT Adidaya Studio & PT Cipta Bangun Utama",
        executionStatus: "Executed & Stamped / Sah & Bermaterai"
    });
    const [mouApprovals, setMouApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Legal & Contract Counsel" },
        { type: "dicek", name: "", role: "VP Commercial / Finance" },
        { type: "disetujui", name: "", role: "Chief Executive Officer (CEO)" },
    ]);

    // --- EXE (EXECUTIVE REPORT) SPECIFIC STATES ---
    const [exeActiveTab, setExeActiveTab] = useState<"setup" | "exe_highlights" | "exe_risks" | "exe_forecast" | "exe_decisions">("setup");
    const [exeLangMode, setExeLangMode] = useState<"bilingual" | "id" | "en">("bilingual");
    const [exeHealth, setExeHealth] = useState<{
        overallRAG: "Green" | "Amber" | "Red"; timeStatus: string; costStatus: string; qualityStatus: string; safetyStatus: string; scopeStatus: string;
    }>({
        overallRAG: "Green",
        timeStatus: "On Schedule / Sesuai Jadwal (+0.8% Variance)",
        costStatus: "Under Budget / Di bawah Plafon (CPI 1.04)",
        qualityStatus: "Pass (Zero Open Critical NCR)",
        safetyStatus: "128,450 Safe Hours (Zero LTI)",
        scopeStatus: "1 Change Order In Progress"
    });
    const [exeHighlights, setExeHighlights] = useState<{
        keyAchievements: string; milestones: string; kpiSummary: string; performanceTrend: string;
    }>({
        keyAchievements: "Pengecoran Plat Lantai 2 Selesai 100% tepat waktu tanpa kendala teknis",
        milestones: "Milestone-02 Topping Off Balok Utama Tercapai lebih cepat 3 hari",
        kpiSummary: "SPI 1.02 | CPI 1.04 | Safe Hours 128.4k | Client Satisfaction 94%",
        performanceTrend: "Positive / Tren Meningkat & Stabil"
    });
    const [exeStrategicRisks, setExeStrategicRisks] = useState<{
        topRisk: string; criticalIssue: string; commercialExposure: string; clientConcern: string;
    }[]>([
        { topRisk: "Potensi kenaikan harga besi beton global Q4", criticalIssue: "Dewatering galian saat musim hujan", commercialExposure: "Rp 168.000.000 (CCO-002 Auditorium)", clientConcern: "Waktu penyelesaian interior akustik" },
    ]);
    const [exeForecast, setExeForecast] = useState<{
        completionForecast: string; costForecast: string; recoveryMeasures: string; opportunities: string;
    }>({
        completionForecast: "25 Januari 2027 (2 hari lebih cepat dari Target Kontrak)",
        costForecast: "Rp 4.780.000.000 (Under budget Rp 70.000.000)",
        recoveryMeasures: "Tambah shift malam untuk pekerjaan MEP interior",
        opportunities: "Efisiensi pengadaan material massal melalui jaringan mitra"
    });
    const [exeDecisions, setExeDecisions] = useState<{
        decision: string; options: string; recommendation: string; requiredByDate: string; owner: string;
    }[]>([
        { decision: "Persetujuan CCO-002 Pekerjaan Akustik Hall Utama", options: "Option A: Disetujui Rp 168jt | Option B: Re-design material", recommendation: "Option A — Menjaga standar kualitas auditorium", requiredByDate: "2026-08-05", owner: "Board of Directors / Owner" },
    ]);
    const [exeApprovals, setExeApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Project Control Specialist" },
        { type: "dicek", name: "", role: "Operations Director" },
        { type: "disetujui", name: "", role: "Chief Executive Officer (CEO)" },
    ]);

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
                        } else if (data.report_type === "schedule") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setSchLangMode(parsed.schLangMode || "bilingual");
                                    setSchBaselineVersion(parsed.schBaselineVersion || "");
                                    setSchDataDate(parsed.schDataDate || "");
                                    setSchWorkCalendar(parsed.schWorkCalendar || "");
                                    setSchCutoffDate(parsed.schCutoffDate || "");
                                    setSchRevision(parsed.schRevision || "REV-01");
                                    if (parsed.schActivities && Array.isArray(parsed.schActivities)) setSchActivities(parsed.schActivities);
                                    if (parsed.schApprovals && Array.isArray(parsed.schApprovals) && parsed.schApprovals.length > 0) setSchApprovals(parsed.schApprovals);
                                    setSchBaselineStartDate(parsed.schBaselineStartDate || "");
                                    setSchBaselineFinishDate(parsed.schBaselineFinishDate || "");
                                    setSchActualStartDate(parsed.schActualStartDate || "");
                                    setSchActualFinishDate(parsed.schActualFinishDate || "");
                                    setSchRemainingDuration(parsed.schRemainingDuration || "");
                                    setSchProgress(parsed.schProgress || "");
                                    setSchForecastFinishDate(parsed.schForecastFinishDate || "");
                                    setSchTotalFloat(parsed.schTotalFloat || "");
                                    setSchCriticalActivities(parsed.schCriticalActivities || "");
                                    setSchDelayEvent(parsed.schDelayEvent || "");
                                    setSchScheduleImpact(parsed.schScheduleImpact || "");
                                    setSchRecoveryAction(parsed.schRecoveryAction || "");
                                    setSchPlanned(parsed.schPlanned || "");
                                    setSchActual(parsed.schActual || "");
                                    setSchEarned(parsed.schEarned || "");
                                    setSchVariance(parsed.schVariance || "");
                                    setSchForecastCompletion(parsed.schForecastCompletion || "");
                                    setIsTitleManuallyEdited(true);
                                    setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "cost") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setCstLangMode(parsed.cstLangMode || "bilingual");
                                    setCstContractValue(parsed.cstContractValue || "");
                                    setCstApprovedRAB(parsed.cstApprovedRAB || "");
                                    setCstContingency(parsed.cstContingency || "");
                                    setCstBudgetRevision(parsed.cstBudgetRevision || "");
                                    setCstCostCodeStructure(parsed.cstCostCodeStructure || "");
                                    if (parsed.cstCommitments && Array.isArray(parsed.cstCommitments)) setCstCommitments(parsed.cstCommitments);
                                    if (parsed.cstWorkPackages && Array.isArray(parsed.cstWorkPackages)) setCstWorkPackages(parsed.cstWorkPackages);
                                    if (parsed.cstApprovals && Array.isArray(parsed.cstApprovals)) setCstApprovals(parsed.cstApprovals);
                                    setCstPV(parsed.cstPV || ""); setCstEV(parsed.cstEV || ""); setCstAC(parsed.cstAC || "");
                                    setCstCV(parsed.cstCV || ""); setCstCPI(parsed.cstCPI || ""); setCstEAC(parsed.cstEAC || "");
                                    setCstPlannedCashflow(parsed.cstPlannedCashflow || ""); setCstActualCashflow(parsed.cstActualCashflow || "");
                                    setCstOutstandingPayment(parsed.cstOutstandingPayment || ""); setCstForecast(parsed.cstForecast || "");
                                    setCstCorrectiveAction(parsed.cstCorrectiveAction || "");
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "manpower") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setCrwLangMode(parsed.crwLangMode || "bilingual");
                                    if (parsed.crwWorkforce && Array.isArray(parsed.crwWorkforce)) setCrwWorkforce(parsed.crwWorkforce);
                                    if (parsed.crwAllocations && Array.isArray(parsed.crwAllocations)) setCrwAllocations(parsed.crwAllocations);
                                    if (parsed.crwApprovals && Array.isArray(parsed.crwApprovals)) setCrwApprovals(parsed.crwApprovals);
                                    setCrwAttendanceTotal(parsed.crwAttendanceTotal || ""); setCrwNormalHours(parsed.crwNormalHours || "");
                                    setCrwOvertime(parsed.crwOvertime || ""); setCrwAbsence(parsed.crwAbsence || ""); setCrwMandays(parsed.crwMandays || "");
                                    setCrwBaseWage(parsed.crwBaseWage || ""); setCrwOvertimePay(parsed.crwOvertimePay || "");
                                    setCrwAllowance(parsed.crwAllowance || ""); setCrwDeduction(parsed.crwDeduction || ""); setCrwNetPayroll(parsed.crwNetPayroll || "");
                                    setCrwDispute(parsed.crwDispute || ""); setCrwPayrollApproval(parsed.crwPayrollApproval || "");
                                    setCrwPaymentStatus(parsed.crwPaymentStatus || ""); setCrwPaymentDate(parsed.crwPaymentDate || "");
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "procurement") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setPrcLangMode(parsed.prcLangMode || "bilingual");
                                    if (parsed.prcPlanItems && Array.isArray(parsed.prcPlanItems)) setPrcPlanItems(parsed.prcPlanItems);
                                    if (parsed.prcOrders && Array.isArray(parsed.prcOrders)) setPrcOrders(parsed.prcOrders);
                                    if (parsed.prcDeliveries && Array.isArray(parsed.prcDeliveries)) setPrcDeliveries(parsed.prcDeliveries);
                                    if (parsed.prcApprovals && Array.isArray(parsed.prcApprovals)) setPrcApprovals(parsed.prcApprovals);
                                    setPrcOpeningStock(parsed.prcOpeningStock || ""); setPrcReceived(parsed.prcReceived || "");
                                    setPrcIssued(parsed.prcIssued || ""); setPrcReturned(parsed.prcReturned || "");
                                    setPrcClosingStock(parsed.prcClosingStock || ""); setPrcStorageLocation(parsed.prcStorageLocation || "");
                                    setPrcLateDelivery(parsed.prcLateDelivery || ""); setPrcShortage(parsed.prcShortage || "");
                                    setPrcLeadTimeVariance(parsed.prcLeadTimeVariance || ""); setPrcExpeditingAction(parsed.prcExpeditingAction || "");
                                    setPrcPIC(parsed.prcPIC || "");
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "finance") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setFinLangMode(parsed.finLangMode || "bilingual");
                                    setFinBankAccount(parsed.finBankAccount || ""); setFinOpeningBalance(parsed.finOpeningBalance || "");
                                    setFinCurrency(parsed.finCurrency || ""); setFinCustodian(parsed.finCustodian || "");
                                    if (parsed.finTransactions && Array.isArray(parsed.finTransactions)) setFinTransactions(parsed.finTransactions);
                                    if (parsed.finReceivables && Array.isArray(parsed.finReceivables)) setFinReceivables(parsed.finReceivables);
                                    if (parsed.finApprovals && Array.isArray(parsed.finApprovals)) setFinApprovals(parsed.finApprovals);
                                    setFinBookBalance(parsed.finBookBalance || ""); setFinBankBalance(parsed.finBankBalance || "");
                                    setFinDifference(parsed.finDifference || ""); setFinSupportingEvidence(parsed.finSupportingEvidence || "");
                                    setFinCutOff(parsed.finCutOff || ""); setFinExceptions(parsed.finExceptions || "");
                                    setFinMissingEvidence(parsed.finMissingEvidence || ""); setFinReviewerComments(parsed.finReviewerComments || "");
                                    setFinClosingApproval(parsed.finClosingApproval || "");
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "resources") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setRscLangMode(parsed.rscLangMode || "bilingual");
                                    if (parsed.rscAssets && Array.isArray(parsed.rscAssets)) setRscAssets(parsed.rscAssets);
                                    if (parsed.rscMobilisations && Array.isArray(parsed.rscMobilisations)) setRscMobilisations(parsed.rscMobilisations);
                                    if (parsed.rscOperations && Array.isArray(parsed.rscOperations)) setRscOperations(parsed.rscOperations);
                                    if (parsed.rscInspections && Array.isArray(parsed.rscInspections)) setRscInspections(parsed.rscInspections);
                                    if (parsed.rscDemobilisations && Array.isArray(parsed.rscDemobilisations)) setRscDemobilisations(parsed.rscDemobilisations);
                                    if (parsed.rscApprovals && Array.isArray(parsed.rscApprovals)) setRscApprovals(parsed.rscApprovals);
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "quality") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setQacLangMode(parsed.qacLangMode || "bilingual");
                                    if (parsed.qacPlans && Array.isArray(parsed.qacPlans)) setQacPlans(parsed.qacPlans);
                                    if (parsed.qacRequests && Array.isArray(parsed.qacRequests)) setQacRequests(parsed.qacRequests);
                                    if (parsed.qacResults && Array.isArray(parsed.qacResults)) setQacResults(parsed.qacResults);
                                    if (parsed.qacNcrs && Array.isArray(parsed.qacNcrs)) setQacNcrs(parsed.qacNcrs);
                                    if (parsed.qacClosure && typeof parsed.qacClosure === "object") setQacClosure(parsed.qacClosure);
                                    if (parsed.qacApprovals && Array.isArray(parsed.qacApprovals)) setQacApprovals(parsed.qacApprovals);
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "safety") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setHseLangMode(parsed.hseLangMode || "bilingual");
                                    setHseWorkforce(parsed.hseWorkforce || ""); setHseHoursWorked(parsed.hseHoursWorked || "");
                                    setHseCumulativeSafeHours(parsed.hseCumulativeSafeHours || ""); setHseLostTimeStatus(parsed.hseLostTimeStatus || "");
                                    if (parsed.hseHazards && Array.isArray(parsed.hseHazards)) setHseHazards(parsed.hseHazards);
                                    if (parsed.hseIncidents && Array.isArray(parsed.hseIncidents)) setHseIncidents(parsed.hseIncidents);
                                    setHsePermit(parsed.hsePermit || ""); setHseTbm(parsed.hseTbm || "");
                                    setHseOperatorLicence(parsed.hseOperatorLicence || ""); setHseTraining(parsed.hseTraining || "");
                                    setHseApdCompliance(parsed.hseApdCompliance || "");
                                    if (parsed.hseClosure && typeof parsed.hseClosure === "object") setHseClosure(parsed.hseClosure);
                                    if (parsed.hseApprovals && Array.isArray(parsed.hseApprovals)) setHseApprovals(parsed.hseApprovals);
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "issue_risk") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setIrkLangMode(parsed.irkLangMode || "bilingual");
                                    if (parsed.irkRisks && Array.isArray(parsed.irkRisks)) setIrkRisks(parsed.irkRisks);
                                    if (parsed.irkIssues && Array.isArray(parsed.irkIssues)) setIrkIssues(parsed.irkIssues);
                                    if (parsed.irkMonitorings && Array.isArray(parsed.irkMonitorings)) setIrkMonitorings(parsed.irkMonitorings);
                                    if (parsed.irkApprovals && Array.isArray(parsed.irkApprovals)) setIrkApprovals(parsed.irkApprovals);
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "doc_control") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setDocLangMode(parsed.docLangMode || "bilingual");
                                    if (parsed.docRegister && Array.isArray(parsed.docRegister)) setDocRegister(parsed.docRegister);
                                    if (parsed.docSubmissions && Array.isArray(parsed.docSubmissions)) setDocSubmissions(parsed.docSubmissions);
                                    if (parsed.docApprovals && Array.isArray(parsed.docApprovals)) setDocApprovals(parsed.docApprovals);
                                    if (parsed.docDistributions && Array.isArray(parsed.docDistributions)) setDocDistributions(parsed.docDistributions);
                                    if (parsed.docArchives && Array.isArray(parsed.docArchives)) setDocArchives(parsed.docArchives);
                                    if (parsed.docApprovalsMeta && Array.isArray(parsed.docApprovalsMeta)) setDocApprovalsMeta(parsed.docApprovalsMeta);
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "change_order") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setCcoLangMode(parsed.ccoLangMode || "bilingual");
                                    if (parsed.ccoInitiation) setCcoInitiation(parsed.ccoInitiation);
                                    if (parsed.ccoScopeItems && Array.isArray(parsed.ccoScopeItems)) setCcoScopeItems(parsed.ccoScopeItems);
                                    if (parsed.ccoCosts && Array.isArray(parsed.ccoCosts)) setCcoCosts(parsed.ccoCosts);
                                    if (parsed.ccoTimeImpact) setCcoTimeImpact(parsed.ccoTimeImpact);
                                    if (parsed.ccoNegotiation) setCcoNegotiation(parsed.ccoNegotiation);
                                    if (parsed.ccoApprovals && Array.isArray(parsed.ccoApprovals)) setCcoApprovals(parsed.ccoApprovals);
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "mou_contract") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setMouLangMode(parsed.mouLangMode || "bilingual");
                                    if (parsed.mouIdentity) setMouIdentity(parsed.mouIdentity);
                                    if (parsed.mouScopeDeliverables) setMouScopeDeliverables(parsed.mouScopeDeliverables);
                                    if (parsed.mouCommercialTerms) setMouCommercialTerms(parsed.mouCommercialTerms);
                                    if (parsed.mouTimeRisk) setMouTimeRisk(parsed.mouTimeRisk);
                                    if (parsed.mouClausesExecution) setMouClausesExecution(parsed.mouClausesExecution);
                                    if (parsed.mouApprovals && Array.isArray(parsed.mouApprovals)) setMouApprovals(parsed.mouApprovals);
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
                        } else if (data.report_type === "executive") {
                            try {
                                const parsed = JSON.parse(data.content || "");
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    setExeLangMode(parsed.exeLangMode || "bilingual");
                                    if (parsed.exeHealth) setExeHealth(parsed.exeHealth);
                                    if (parsed.exeHighlights) setExeHighlights(parsed.exeHighlights);
                                    if (parsed.exeStrategicRisks && Array.isArray(parsed.exeStrategicRisks)) setExeStrategicRisks(parsed.exeStrategicRisks);
                                    if (parsed.exeForecast) setExeForecast(parsed.exeForecast);
                                    if (parsed.exeDecisions && Array.isArray(parsed.exeDecisions)) setExeDecisions(parsed.exeDecisions);
                                    if (parsed.exeApprovals && Array.isArray(parsed.exeApprovals)) setExeApprovals(parsed.exeApprovals);
                                    setIsTitleManuallyEdited(true); setIsDocIdManuallyEdited(true);
                                } else setEditorContent(data.content || "");
                            } catch(e) { setEditorContent(data.content || ""); }
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

    const REPORT_PREFIX_MAP: Record<string, { code: string; title: string }> = {
        daily: { code: "RDL", title: "Laporan Harian" },
        weekly: { code: "RWK", title: "Laporan Mingguan" },
        monthly: { code: "RMN", title: "Laporan Bulanan" },
        schedule: { code: "SCH", title: "Project Schedule / Jadwal Pelaksanaan Proyek" },
        cost: { code: "CST", title: "Cost & Budget Realization" },
        manpower: { code: "CRW", title: "Manpower & Payroll (Crew)" },
        procurement: { code: "PRC", title: "Procurement & Stock" },
        quality: { code: "QAC", title: "Quality Control (QA/QC)" },
        safety: { code: "HSE", title: "Safety & K3 Report" },
        issue_risk: { code: "RIK", title: "Risk & Issue Register" },
        doc_control: { code: "DOC", title: "Document Control Register" },
        change_order: { code: "CCO", title: "Contract Change Order (VO)" },
        executive: { code: "EXE", title: "Executive Summary Report" },
        site_survey: { code: "SUR", title: "Site Survey & Field Investigation" },
        mom: { code: "MOM", title: "Minute of Meeting (Notula Rapat)" },
        mou_contract: { code: "MOU", title: "MOU & Contract Agreement" },
        memo_correspondence: { code: "NOT", title: "Field Notice & Memo" },
        punch_list: { code: "PCH", title: "Punch List & BAST Handover" },
        commissioning: { code: "COM", title: "Commissioning & Testing" },
        environmental: { code: "ENV", title: "Environmental Management" },
        // Module codes
        finance: { code: "FIN", title: "Finance Register / Register Keuangan" },
        resources: { code: "RSC", title: "Equipment & Asset Register / Register Alat & Aset" },
        people: { code: "PPL", title: "People & HR Register" },
        clock: { code: "CLK", title: "Clock & Attendance" },
    };

    const getLangText = (mode: "bilingual" | "id" | "en", enStr: string, idStr: string) => {
        if (mode === "id") return idStr;
        if (mode === "en") return enStr;
        if (enStr === idStr) return enStr;
        return `${enStr} / ${idStr}`;
    };

    const getReportMeta = (type: string) => {
        return REPORT_PREFIX_MAP[type] || { code: "DOC", title: "Laporan Proyek" };
    };

    interface ReportTabDef {
        generalTitle: string;
        summaryTitleShort: string;
        itemsTitleShort: string;
        notesTitleShort: string;
        summaryTitle: string;
        summaryFields: {
            metric1Label: string;
            metric2Label: string;
            metric3Label: string;
            narrativeLabel: string;
            narrativePlaceholder: string;
            notesLabel: string;
            notesPlaceholder: string;
        };
        itemsTitle: string;
        itemsPlaceholder: string;
        personnelTitle: string;
        evalTitle: string;
    }

    const REPORT_SPECIFIC_CONFIGS: Record<string, ReportTabDef> = {
        schedule: {
            generalTitle: "Info & Timeline Schedule",
            summaryTitle: "Schedule & Kurva-S — Monitoring & Milestone",
            summaryFields: {
                metric1Label: "Target S-Curve (%)",
                metric2Label: "Realisasi S-Curve (%)",
                metric3Label: "Deviasi Schedule (%)",
                narrativeLabel: "Ringkasan Progres Schedule & Milestone",
                narrativePlaceholder: "Tuliskan evaluasi pencapaian milestone dan kurva-S...",
                notesLabel: "Analisis Critical Path & Risiko Keterlambatan",
                notesPlaceholder: "Tuliskan analisis jalur kritis (critical path) dan rekomendasi percepatan...",
            },
            itemsTitle: "Timeline Task & Milestone Utama",
            itemsPlaceholder: "Nama Task / WBS (e.g. Pekerjaan Pondasi Bored Pile)",
            personnelTitle: "Tim Schedule & Planner",
            evalTitle: "Evaluasi Varian Waktu & Float",
        },
        cost: {
            generalTitle: "Info & Anggaran Proyek",
            summaryTitle: "Cost & Budget Realization — Analisis Keuangan & RAB",
            summaryFields: {
                metric1Label: "Total RAB Kontrak (Rp / %)",
                metric2Label: "Realisasi Biaya Lapangan (Rp / %)",
                metric3Label: "Sisa Anggaran (Rp / %)",
                narrativeLabel: "Ringkasan Cashflow & Performa Biaya (CPI)",
                narrativePlaceholder: "Tuliskan ringkasan realisasi biaya dan analisis CPI...",
                notesLabel: "Catatan Variansi Biaya & Rekomendasi Efisiensi",
                notesPlaceholder: "Tuliskan analisis variansi biaya dan potensi penghematan...",
            },
            itemsTitle: "Rincian Realisasi Biaya Per Pos Pekerjaan",
            itemsPlaceholder: "Item Pos Biaya (e.g. Pembelian Besi Beton Rebar)",
            personnelTitle: "Tim Finance & Quantity Surveyor",
            evalTitle: "Evaluasi Potensi Overbudget & Risk Biaya",
        },
        manpower: {
            generalTitle: "Info Tenaga Kerja & Subkon",
            summaryTitle: "Manpower & Payroll — Rekapitulasi Tenaga Kerja",
            summaryFields: {
                metric1Label: "Target Jumlah Tenaga (Orang)",
                metric2Label: "Realisasi Tenaga Lapangan (Orang)",
                metric3Label: "Total Akumulasi Mandays",
                narrativeLabel: "Ringkasan Alokasi & Produktivitas Tenaga Kerja",
                narrativePlaceholder: "Tuliskan narasi produktivitas dan alokasi tim subkon...",
                notesLabel: "Catatan Evaluasi Shift & Pembayaran Gaji/Upah",
                notesPlaceholder: "Tuliskan catatan absensi, shift malam, atau payroll...",
            },
            itemsTitle: "Rincian Alokasi Tim & Subkon Lapangan",
            itemsPlaceholder: "Kategori / Tim Subkon (e.g. Tim Pembesian Subkon A)",
            personnelTitle: "Rincian Personel & Mandor Lapangan",
            evalTitle: "Evaluasi Kebutuhan Tambahan Tenaga Kerja",
        },
        procurement: {
            generalTitle: "Info Logistik & Pengadaan",
            summaryTitle: "Procurement & Stock — Monitoring Logistik & PO",
            summaryFields: {
                metric1Label: "Total Target Material (Unit/m3)",
                metric2Label: "Material Diterima (Unit/m3)",
                metric3Label: "Stok Sisa Lapangan (Unit/m3)",
                narrativeLabel: "Ringkasan Delivery & Status Purchase Order",
                narrativePlaceholder: "Tuliskan status pengiriman material utama & kendala PO...",
                notesLabel: "Catatan Quality Control & Inspection Material Masuk",
                notesPlaceholder: "Tuliskan hasil verifikasi sampel material diterima...",
            },
            itemsTitle: "Log Pengadaan & Stok Opname Material",
            itemsPlaceholder: "Nama Material / Alat (e.g. Semen PPC 50kg)",
            personnelTitle: "Tim Logistik & Logistiker Site",
            evalTitle: "Evaluasi Lead Time & Stok Kritis",
        },
        quality: {
            generalTitle: "Info QA/QC & Inspeksi Mutu",
            summaryTitleShort: "Inspection Plan",
            itemsTitleShort: "Request & Result",
            notesTitleShort: "NCR & Closure",
            summaryTitle: "Quality Control (QA/QC) — Log Inspeksi & Defect",
            summaryFields: {
                metric1Label: "Target Inspeksi (Item)",
                metric2Label: "Lolos Inspeksi / Pass (%)",
                metric3Label: "Temuan Defect / Open NCR",
                narrativeLabel: "Ringkasan Mutu & Inspeksi Pekerjaan",
                narrativePlaceholder: "Tuliskan hasil tes laboratorium & verifikasi checklist...",
                notesLabel: "Rencana Tindak Lanjut Perbaikan Defect (NCR)",
                notesPlaceholder: "Tuliskan instruksi perbaikan fisik untuk item defect...",
            },
            itemsTitle: "Daftar Inspeksi & Test Mutu Lapangan",
            itemsPlaceholder: "Item Inspeksi / Testing (e.g. Uji Slump Beton FC 30 MPa)",
            personnelTitle: "Tim QC & Inspector Lapangan",
            evalTitle: "Evaluasi Standar Spesifikasi Teknis",
        },
        safety: {
            generalTitle: "Info HSE & Keselamatan Kerja",
            summaryTitleShort: "Safe Hours & Hazard",
            itemsTitleShort: "Incident & Permit",
            notesTitleShort: "Action & Closure",
            summaryTitle: "Health Safety Environment (HSE) — K3 & Incident Log",
            summaryFields: {
                metric1Label: "Safe Man-Hours (Jam)",
                metric2Label: "Tingkat Kepatuhan APD (%)",
                metric3Label: "Jumlah Incident / LTI",
                narrativeLabel: "Ringkasan Pelaksanaan HSE & Toolbox Meeting",
                narrativePlaceholder: "Tuliskan pelaksanaan safety induction & TBM harian...",
                notesLabel: "Catatan Mitigasi Bahaya & Izin Kerja (PTW)",
                notesPlaceholder: "Tuliskan izin kerja khusus (Permit to Work) & potensi bahaya...",
            },
            itemsTitle: "Daftar Aktivitas Inspeksi HSE & K3",
            itemsPlaceholder: "Aktivitas K3 / Area Inspeksi (e.g. Pengecekan Scaffolding Lantai 3)",
            personnelTitle: "Tim HSE & Safety Officer",
            evalTitle: "Evaluasi Potensi Hazard & Housekeeping",
        },
        issue_risk: {
            generalTitle: "Info Register Risiko & Isu",
            summaryTitleShort: "Risk Identification & Score",
            itemsTitleShort: "Risk Response & Issue",
            notesTitleShort: "Monitoring & Closure",
            summaryTitle: "Issue & Risk Register — Mitigasi & Risk Level",
            summaryFields: {
                metric1Label: "Total Isu Teridentifikasi",
                metric2Label: "Jumlah Risiko High / Critical",
                metric3Label: "Mitigasi Selesai (%)",
                narrativeLabel: "Ringkasan Risiko Proyek & Isu Kritis",
                narrativePlaceholder: "Tuliskan isu utama yang mempengaruhi proyek saat ini...",
                notesLabel: "Rencana Kontingensi & Action Plan Mitigasi",
                notesPlaceholder: "Tuliskan langkah preventif & penanggung jawab (PIC)...",
            },
            itemsTitle: "Matriks Register Risiko & Isu Lapangan",
            itemsPlaceholder: "Deskripsi Risiko / Isu (e.g. Keterlambatan Pengiriman Transformer)",
            personnelTitle: "Tim Manajer Risiko & PIC",
            evalTitle: "Evaluasi Dampak Biaya & Waktu (Impact Score)",
        },
        doc_control: {
            generalTitle: "Info Dokumen & Submittal",
            summaryTitle: "Document Control Register — Submittal & Approval Status",
            summaryFields: {
                metric1Label: "Total Submittal Dokumen",
                metric2Label: "Disetujui / Code A (%)",
                metric3Label: "Pending Approval Konsultan",
                narrativeLabel: "Ringkasan Status Shop Drawing, RFI & MAR",
                narrativePlaceholder: "Tuliskan status pengajuan gambar kerja & sampel material...",
                notesLabel: "Catatan Distribusi Dokumen & Transmittal",
                notesPlaceholder: "Tuliskan nomor surat transmittal & penerima dokumen...",
            },
            itemsTitle: "Register Submittal Shop Drawing & RFI",
            itemsPlaceholder: "Judul / Nomor Dokumen (e.g. SD-ARC-101 Shop Drawing Fasad)",
            personnelTitle: "Tim Document Controller",
            evalTitle: "Evaluasi Keterlambatan Approval Konsultan",
        },
        change_order: {
            generalTitle: "Info Contract Change Order (VO)",
            summaryTitle: "Contract Change Order — Variation Order & Impact Cost",
            summaryFields: {
                metric1Label: "Total Estimasi Tambah (Rp)",
                metric2Label: "Total Estimasi Kurang (Rp)",
                metric3Label: "Perpanjangan Waktu (Hari)",
                narrativeLabel: "Ringkasan Perubahan Kontrak & Variation Order",
                narrativePlaceholder: "Tuliskan alasan perubahan spesifikasi atau desain dari Owner...",
                notesLabel: "Justifikasi Teknis & Field Notice Referensi",
                notesPlaceholder: "Tuliskan dasar hukum & instruksi lapangan terkait VO...",
            },
            itemsTitle: "Daftar Item Pekerjaan Tambah Kurang (VO)",
            itemsPlaceholder: "Item Perubahan (e.g. Penambahan Dinding Partisi Gypsum)",
            personnelTitle: "Tim Contract Admin & Commercial",
            evalTitle: "Evaluasi Dampak Addendum Kontrak",
        },
        site_survey: {
            generalTitle: "Info Survei & Investigasi Site",
            summaryTitle: "Site Survey & Investigation — Hasil & Data Site",
            summaryFields: {
                metric1Label: "Total Titik Benchmark (BM)",
                metric2Label: "Elevasi Rata-Rata (m)",
                metric3Label: "Cakupan Area Survey (%)",
                narrativeLabel: "Ringkasan Hasil Survei Topografi / Geoteknik",
                narrativePlaceholder: "Tuliskan hasil pengukuran koordinat, kontur, & data sondir...",
                notesLabel: "Rekomendasi Desain Berdasarkan Kondisi Site",
                notesPlaceholder: "Tuliskan rekomendasi struktur galian atau penanganan lahan...",
            },
            itemsTitle: "Log Titik Ukur & Elevasi Lapangan",
            itemsPlaceholder: "Titik / Grid Survey (e.g. BM-01 Area Utara)",
            personnelTitle: "Tim Surveyor & Geodesi",
            evalTitle: "Evaluasi Varian Elevasi Rencana vs Eksisting",
        },
        mom: {
            generalTitle: "Info Risalah Rapat (MOM)",
            summaryTitle: "Minute of Meeting (MOM) — Risalah & Action Items",
            summaryFields: {
                metric1Label: "Total Agenda Rapat",
                metric2Label: "Keputusan Disepakati",
                metric3Label: "Action Item Open",
                narrativeLabel: "Ringkasan Hasil Rapat Koordinasi",
                narrativePlaceholder: "Tuliskan poin-poin utama kesepakatan rapat...",
                notesLabel: "Action Items & Target Penyelesaian (PIC)",
                notesPlaceholder: "Tuliskan daftar tugas lanjutan beserta PIC dan deadline...",
            },
            itemsTitle: "Risalah Pembahasan & Action Item Rapat",
            itemsPlaceholder: "Topik Pembahasan (e.g. Koordinasi Penyambungan Listrik PLN)",
            personnelTitle: "Daftar Peserta Rapat (Hadiran)",
            evalTitle: "Evaluasi Progress Action Item Rapat Lalu",
        },
        mou_contract: {
            generalTitle: "Info Perjanjian Kontrak & MOU",
            summaryTitle: "MOU & Contract Agreement — Matriks Perjanjian",
            summaryFields: {
                metric1Label: "Nilai Total Kontrak (Rp)",
                metric2Label: "Termin Pembayaran (Jumlah)",
                metric3Label: "Masa Berlaku (Hari)",
                narrativeLabel: "Ringkasan Kesepakatan & Klausul Utama",
                narrativePlaceholder: "Tuliskan pokok-pokok klausul hukum & ruang lingkup...",
                notesLabel: "Catatan Jaminan & Ketentuan Khusus",
                notesPlaceholder: "Tuliskan ketentuan jaminan pelaksanaan / pemeliharaan...",
            },
            itemsTitle: "Matriks Lingkup Pekerjaan & Syarat Kontrak",
            itemsPlaceholder: "Pasal / Lingkup Pekerjaan (e.g. Pasal 4 Garansi Produk 2 Tahun)",
            personnelTitle: "Pihak Bersepakat & Tim Legal",
            evalTitle: "Evaluasi Risiko Hukum & Pembayaran",
        },
        memo_correspondence: {
            generalTitle: "Info Surat Notice & Memo Lapangan",
            summaryTitle: "Field Notice & Memo — Surat Instruksi Lapangan",
            summaryFields: {
                metric1Label: "No Surat Notice",
                metric2Label: "Sifat Surat (Kritis/Biasa)",
                metric3Label: "Batas Waktu Respon (Hari)",
                narrativeLabel: "Ringkasan Isi Instruksi Lapangan / Memo",
                narrativePlaceholder: "Tuliskan instruksi penanganan teknis yang wajib dilaksanakan...",
                notesLabel: "Respon & Tindakan Pembetulan Diperlukan",
                notesPlaceholder: "Tuliskan tindakan perbaikan yang diharapkan dari penerima...",
            },
            itemsTitle: "Log Poin Instruksi & Notice Lapangan",
            itemsPlaceholder: "Poin Instruksi (e.g. Pembersihan Sisa Galian Bekas Bored Pile)",
            personnelTitle: "Penerima & Pengirim Surat Memo",
            evalTitle: "Evaluasi Respon Surat Dinas Lapangan",
        },
        punch_list: {
            generalTitle: "Info Punch List & Serah Terima",
            summaryTitle: "Punch List & BAST Handover — Daftar Temuan Defect",
            summaryFields: {
                metric1Label: "Total Temuan Punch List",
                metric2Label: "Cacat Selesai Diperbaiki (%)",
                metric3Label: "Temuan Open / Pending",
                narrativeLabel: "Ringkasan Inspeksi Pre-BAST / BAST",
                narrativePlaceholder: "Tuliskan hasil joint inspection bersama Owner / Konsultan...",
                notesLabel: "Jadwal Target Retest & Final Handover",
                notesPlaceholder: "Tuliskan tanggal komitmen perbaikan akhir...",
            },
            itemsTitle: "Daftar Temuan Cacat Pekerjaan (Punch List)",
            itemsPlaceholder: "Deskripsi Defect / Temuan (e.g. Cat Dinding Mengelupas di R. Utama)",
            personnelTitle: "Tim Joint Inspection Handover",
            evalTitle: "Evaluasi Kesiapan Serah Terima BAST",
        },
        commissioning: {
            generalTitle: "Info Commissioning & Testing Sistem",
            summaryTitle: "Commissioning & Testing — Pengujian Fungsi Sistem",
            summaryFields: {
                metric1Label: "Total Parameter Tested",
                metric2Label: "Parameter Pass / Lolos (%)",
                metric3Label: "Status Sertifikasi System",
                narrativeLabel: "Ringkasan Testing & Commissioning Sistem",
                narrativePlaceholder: "Tuliskan hasil pengujian fungsi beban (load test), presisi, dll...",
                notesLabel: "Catatan Perbaikan Malfungsi & Re-testing",
                notesPlaceholder: "Tuliskan komponen yang memerlukan setting/penyesuaian ulang...",
            },
            itemsTitle: "Log Parameter Pengujian & Testing Sistem",
            itemsPlaceholder: "Parameter Testing (e.g. Pressure Test Pipa Hydrant 10 Bar 2 Jam)",
            personnelTitle: "Tim Engineer & Commissioning Specialist",
            evalTitle: "Evaluasi Kelaikan Operasional Sistem",
        },
        environmental: {
            generalTitle: "Info Pengelolaan Lingkungan Site",
            summaryTitle: "Environmental Management — Pengelolaan Lingkungan",
            summaryFields: {
                metric1Label: "Volume Limbah Terkelola (m3)",
                metric2Label: "Tingkat Kebisingan Rata-rata (dB)",
                metric3Label: "Kepatuhan AMDAL / UKL-UPL (%)",
                narrativeLabel: "Ringkasan Pengelolaan Lingkungan & Kebersihan",
                narrativePlaceholder: "Tuliskan penanganan air kotor, debu, & pembuangan sampah...",
                notesLabel: "Catatan Koordinasi Warga & Pihak Terkait",
                notesPlaceholder: "Tuliskan laporan sosialisasi atau pengaduan lingkungan...",
            },
            itemsTitle: "Log Pengukuran & Pengendalian Lingkungan",
            itemsPlaceholder: "Aspek Lingkungan (e.g. Penyiraman Debu Akses Jalan 3x Sehari)",
            personnelTitle: "Tim K3L & Pengawas Lingkungan",
            evalTitle: "Evaluasi Dampak Lingkungan Sekitar Site",
        },
        executive: {
            generalTitle: "Info Laporan Eksekutif",
            summaryTitle: "Executive Summary — High-Level Project Status",
            summaryFields: {
                metric1Label: "Overall Project Progress (%)",
                metric2Label: "Budget Spent / Burn Rate (%)",
                metric3Label: "Status Kesehatan Proyek",
                narrativeLabel: "Narasi Eksekutif untuk Manajemen (C-Level)",
                narrativePlaceholder: "Tuliskan ikhtisar eksekutif kinerja proyek secara komprehensif...",
                notesLabel: "Keputusan Strategis & Bantuan Diperlukan",
                notesPlaceholder: "Tuliskan arahan/keputusan dari Direksi yang dibutuhkan...",
            },
            itemsTitle: "Highlight Pencapaian & Keputusan Kunci",
            itemsPlaceholder: "Highlight Strategis (e.g. Penyelesaian Struktur Atas Toppping Off)",
            personnelTitle: "Tim Project Director & Management",
            evalTitle: "Evaluasi Kinerja Makro Proyek",
        },
        finance: {
            generalTitle: "Info Register Keuangan",
            summaryTitleShort: "Transaksi & Saldo",
            itemsTitleShort: "Piutang & Hutang",
            notesTitleShort: "Rekonsiliasi & Closing",
            summaryTitle: "Finance Register — Kas, Bank & Transaksi Keuangan",
            summaryFields: {
                metric1Label: "Saldo Kas & Bank (Rp)",
                metric2Label: "Total Debit Periode (Rp)",
                metric3Label: "Total Kredit Periode (Rp)",
                narrativeLabel: "Ringkasan Arus Kas & Transaksi Periode Ini",
                narrativePlaceholder: "Tuliskan ringkasan penerimaan & pengeluaran utama...",
                notesLabel: "Catatan Rekonsiliasi & Selisih Saldo",
                notesPlaceholder: "Tuliskan penjelasan selisih buku vs bank...",
            },
            itemsTitle: "Register Transaksi Kas & Bank",
            itemsPlaceholder: "Deskripsi Transaksi (e.g. Pembayaran Termin 3 Owner)",
            personnelTitle: "Tim Finance & Accounting",
            evalTitle: "Evaluasi Closing & Audit Review",
        },
        resources: {
            generalTitle: "Info Register Alat & Aset",
            summaryTitleShort: "Master Aset & Mobilisasi",
            itemsTitleShort: "Operasi & Log",
            notesTitleShort: "Inspeksi & Biaya",
            summaryTitle: "Equipment & Asset Register — Monitoring Alat Berat & Aset Proyek",
            summaryFields: {
                metric1Label: "Total Unit Alat Berat",
                metric2Label: "Utilisasi Rata-rata (%)",
                metric3Label: "Total Biaya Sewa (Rp)",
                narrativeLabel: "Ringkasan Operasi Alat & Produktivitas",
                narrativePlaceholder: "Tuliskan status operasional alat berat di lapangan...",
                notesLabel: "Catatan Maintenance & Breakdown",
                notesPlaceholder: "Tuliskan riwayat perbaikan & jadwal servis...",
            },
            itemsTitle: "Register Alat Berat & Aset Proyek",
            itemsPlaceholder: "Kode Aset / Alat (e.g. EXC-001 Excavator Komatsu PC200)",
            personnelTitle: "Tim Equipment & Operator",
            evalTitle: "Evaluasi Biaya Operasional & Efisiensi Alat",
        },
    };

    const getReportConfig = (type: string): ReportTabDef => {
        return REPORT_SPECIFIC_CONFIGS[type] || {
            generalTitle: "Info & Periode Dokumen",
            summaryTitleShort: "Ringkasan & Target",
            itemsTitleShort: "Item Pekerjaan",
            notesTitleShort: "Catatan & Evaluasi",
            summaryTitle: `${getReportMeta(type).title} — RINGKASAN & REALISASI LAPANGAN`,
            summaryFields: {
                metric1Label: "Target Rencana",
                metric2Label: "Realisasi Lapangan",
                metric3Label: "Deviasi / Sisa",
                narrativeLabel: "Ringkasan & Narasi Evaluasi",
                narrativePlaceholder: "Tuliskan ringkasan evaluasi...",
                notesLabel: "Catatan Teknis & Evaluasi Lapangan",
                notesPlaceholder: "Tuliskan catatan teknis atau kendala khusus...",
            },
            itemsTitle: "LOG RINCIAN PEKERJAAN / ITEM REPORT",
            itemsPlaceholder: "Deskripsi / Uraian Pekerjaan",
            personnelTitle: "Tim & Personel Lapangan",
            evalTitle: "Evaluasi Lapangan",
        };
    };

    // Reset manual edit flags when reportType changes for new reports
    useEffect(() => {
        if (!paramId) {
            setIsDocIdManuallyEdited(false);
            setIsTitleManuallyEdited(false);
        }
    }, [reportType, paramId]);

    // Auto-generate Document Title and ID
    useEffect(() => {
        if (isLoading || paramId) return;

        const currentProj = projects.find(p => p.id === selectedProjectId) || projects[0];
        const meta = getReportMeta(reportType);

        if (reportType === "daily") {
            if (!isDocIdManuallyEdited) {
                const weekVal = getWeekOfYear(reportDate);
                const dayOfWeekVal = getDayOfWeekNumber(reportDate);
                setDocumentId(`RDL-${weekVal}-${dayOfWeekVal}`);
            }
            if (!isTitleManuallyEdited) {
                const dayVal = dayNumber || "1";
                setTitle(`RDL - ${currentProj?.project_code || currentProj?.name || "PROYEK"} - H${dayVal}`);
            }
        } else if (reportType === "weekly") {
            const formattedWeek = weekNumber ? weekNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited) {
                setDocumentId(`RWK-${formattedWeek}-01`);
            }
            if (!isTitleManuallyEdited) {
                setTitle(`Laporan Mingguan ${formattedWeek} - ${currentProj?.project_code || currentProj?.name || "PROYEK"}`);
            }
        } else if (reportType === "monthly") {
            const formattedMonth = monthNumber ? monthNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited) {
                setDocumentId(`RMN-${formattedMonth}-01`);
            }
            if (!isTitleManuallyEdited) {
                setTitle(`Laporan Bulanan ${formattedMonth} - ${currentProj?.project_code || currentProj?.name || "PROYEK"}`);
            }
        } else {
            const formattedWeek = weekNumber ? weekNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited) {
                setDocumentId(`${meta.code}-${formattedWeek}-01`);
            }
            if (!isTitleManuallyEdited) {
                setTitle(`${meta.title} - ${currentProj?.project_code || currentProj?.name || "PROYEK"}`);
            }
        }
    }, [selectedProjectId, dayNumber, reportDate, weekNumber, monthNumber, reportType, projects, isLoading, paramId, isTitleManuallyEdited, isDocIdManuallyEdited]);

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

    // Computes XXX-YY-ZZ for each page in Report
    const getReportPageDocCode = (pageIndex: number) => {
        const pageStr = String(pageIndex).padStart(2, "0");
        const meta = getReportMeta(reportType);

        if (reportType === "monthly") {
            const month = monthNumber ? monthNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited || !documentId) {
                return `RMN-${month}-${pageStr}`;
            }
        } else if (reportType === "weekly") {
            const week = weekNumber ? weekNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited || !documentId) {
                return `RWK-${week}-${pageStr}`;
            }
        } else if (reportType === "daily") {
            if (!isDocIdManuallyEdited || !documentId) {
                const weekVal = getWeekOfYear(reportDate);
                const dayOfWeekVal = getDayOfWeekNumber(reportDate);
                return `RDL-${weekVal}-${dayOfWeekVal}`;
            }
        } else {
            const week = weekNumber ? weekNumber.padStart(2, "0") : "01";
            if (!isDocIdManuallyEdited || !documentId) {
                return `${meta.code}-${week}-${pageStr}`;
            }
        }

        if (documentId) {
            const match = documentId.match(/^(.*?-)(\d{1,2})$/);
            if (match) {
                return `${match[1]}${pageStr}`;
            }
            return `${documentId}-${pageStr}`;
        }
        return `${meta.code}-01-${pageStr}`;
    };

    const getWeeklyPageDocCode = getReportPageDocCode;

    const getGeneratedFilename = () => {
        const datePart = reportDate ? reportDate.replace(/-/g, "") : "20260727";
        const currentProj = projects.find(p => p.id === selectedProjectId);
        const codePart = currentProj?.project_code || "PROJ";
        const meta = getReportMeta(reportType);
        
        let docPart = documentId ? documentId.replace(/[^A-Z0-9-]/gi, "_").toUpperCase() : `${meta.code}_01_01`;
        const revPart = revision ? `R${revision}` : "R00";
        return `${datePart}_${codePart}_${docPart}_${revPart}.pdf`;
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
                    documentId: documentId || (reportType === "monthly" ? `LB-${monthNumber.padStart(2, "0")}-01` : `${getReportMeta(reportType).code}-${weekNumber.padStart(2, "0")}-01`),
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
            } else if (reportType === "schedule") {
                const scheduleTemplateData = {
                    schLangMode,
                    schBaselineVersion,
                    schDataDate,
                    schWorkCalendar,
                    schCutoffDate,
                    schRevision,
                    schActivities,
                    schApprovals,
                    schBaselineStartDate,
                    schBaselineFinishDate,
                    schActualStartDate,
                    schActualFinishDate,
                    schRemainingDuration,
                    schProgress,
                    schForecastFinishDate,
                    schTotalFloat,
                    schCriticalActivities,
                    schDelayEvent,
                    schScheduleImpact,
                    schRecoveryAction,
                    schPlanned,
                    schActual,
                    schEarned,
                    schVariance,
                    schForecastCompletion,
                    approvedBy,
                    approvedByRole,
                    preparedBy,
                    preparedByRole,
                    notes,
                    photos
                };
                finalContent = JSON.stringify(scheduleTemplateData);
            } else if (reportType === "cost") {
                finalContent = JSON.stringify({
                    cstLangMode, cstContractValue, cstApprovedRAB, cstContingency, cstBudgetRevision, cstCostCodeStructure,
                    cstCommitments, cstWorkPackages, cstApprovals, cstPV, cstEV, cstAC, cstCV, cstCPI, cstEAC,
                    cstPlannedCashflow, cstActualCashflow, cstOutstandingPayment, cstForecast, cstCorrectiveAction
                });
            } else if (reportType === "manpower") {
                finalContent = JSON.stringify({
                    crwLangMode, crwWorkforce, crwAllocations, crwApprovals, crwAttendanceTotal, crwNormalHours,
                    crwOvertime, crwAbsence, crwMandays, crwBaseWage, crwOvertimePay, crwAllowance, crwDeduction,
                    crwNetPayroll, crwDispute, crwPayrollApproval, crwPaymentStatus, crwPaymentDate
                });
            } else if (reportType === "procurement") {
                finalContent = JSON.stringify({
                    prcLangMode, prcPlanItems, prcOrders, prcDeliveries, prcApprovals, prcOpeningStock, prcReceived,
                    prcIssued, prcReturned, prcClosingStock, prcStorageLocation, prcLateDelivery, prcShortage,
                    prcLeadTimeVariance, prcExpeditingAction, prcPIC
                });
            } else if (reportType === "finance") {
                finalContent = JSON.stringify({
                    finLangMode, finBankAccount, finOpeningBalance, finCurrency, finCustodian, finTransactions,
                    finReceivables, finApprovals, finBookBalance, finBankBalance, finDifference, finSupportingEvidence,
                    finCutOff, finExceptions, finMissingEvidence, finReviewerComments, finClosingApproval
                });
            } else if (reportType === "resources") {
                finalContent = JSON.stringify({
                    rscLangMode, rscAssets, rscMobilisations, rscOperations, rscInspections, rscDemobilisations, rscApprovals
                });
            } else if (reportType === "quality") {
                finalContent = JSON.stringify({
                    qacLangMode, qacPlans, qacRequests, qacResults, qacNcrs, qacClosure, qacApprovals
                });
            } else if (reportType === "safety") {
                finalContent = JSON.stringify({
                    hseLangMode, hseWorkforce, hseHoursWorked, hseCumulativeSafeHours, hseLostTimeStatus,
                    hseHazards, hseIncidents, hsePermit, hseTbm, hseOperatorLicence, hseTraining,
                    hseApdCompliance, hseClosure, hseApprovals
                });
            } else if (reportType === "issue_risk") {
                finalContent = JSON.stringify({
                    irkLangMode, irkRisks, irkIssues, irkMonitorings, irkApprovals
                });
            } else if (reportType === "doc_control") {
                finalContent = JSON.stringify({
                    docLangMode, docRegister, docSubmissions, docApprovals, docDistributions, docArchives, docApprovalsMeta
                });
            } else if (reportType === "change_order") {
                finalContent = JSON.stringify({
                    ccoLangMode, ccoInitiation, ccoScopeItems, ccoCosts, ccoTimeImpact, ccoNegotiation, ccoApprovals
                });
            } else if (reportType === "mou_contract") {
                finalContent = JSON.stringify({
                    mouLangMode, mouIdentity, mouScopeDeliverables, mouCommercialTerms, mouTimeRisk, mouClausesExecution, mouApprovals
                });
            } else if (reportType === "executive") {
                finalContent = JSON.stringify({
                    exeLangMode, exeHealth, exeHighlights, exeStrategicRisks, exeForecast, exeDecisions, exeApprovals
                });
            }

            const getCategoryForReportType = (typeStr: string): string => {
                if (["daily", "weekly", "monthly", "schedule"].includes(typeStr)) return "progress_control";
                if (["cost", "manpower", "procurement", "finance", "resources"].includes(typeStr)) return "financial_resources";
                if (["quality", "safety", "issue_risk"].includes(typeStr)) return "quality_safety_risk";
                if (["doc_control", "change_order", "executive"].includes(typeStr)) return "governance_change";
                return "site_formal";
            };

            const payload = {
                project_id: selectedProjectId,
                report_type: reportType,
                report_category: getCategoryForReportType(reportType),
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

    const REPORT_BILINGUAL_TITLES: Record<string, { en: string; id: string }> = {
        RDL: { en: "DAILY REPORT", id: "Laporan Harian" },
        RWK: { en: "WEEKLY REPORT", id: "Laporan Mingguan" },
        RMN: { en: "MONTHLY REPORT", id: "Laporan Bulanan" },
        SCH: { en: "PROJECT SCHEDULE", id: "Jadwal Pelaksanaan Proyek" },
        CST: { en: "COST & BUDGET REPORT", id: "Realisasi Biaya & RAB" },
        CRW: { en: "MANPOWER & PAYROLL", id: "Tenaga Kerja & Penggajian" },
        PRC: { en: "PROCUREMENT & STOCK", id: "Pengadaan & Stok Material" },
        QAC: { en: "QUALITY CONTROL (QA/QC)", id: "Mutu & Inspeksi Pekerjaan" },
        HSE: { en: "HEALTH SAFETY ENVIRONMENT", id: "Keselamatan & K3 Lapangan" },
        RIK: { en: "RISK & ISSUE REGISTER", id: "Register Risiko & Isu Proyek" },
        DOC: { en: "DOCUMENT CONTROL REGISTER", id: "Register Kontrol Dokumen" },
        CCO: { en: "CONTRACT CHANGE ORDER", id: "Perubahan Kontrak & VO" },
        EXE: { en: "EXECUTIVE SUMMARY", id: "Ringkasan Eksekutif" },
        SUR: { en: "SITE SURVEY & FIELD LOG", id: "Survei & Investigasi Lapangan" },
        MOM: { en: "MINUTE OF MEETING", id: "Notula & Risalah Rapat" },
        MOU: { en: "MOU & CONTRACT AGREEMENT", id: "Kesepakatan & Kontrak Kerja" },
        NOT: { en: "FIELD NOTICE & MEMO", id: "Surat Dinas & Memo Lapangan" },
        PCH: { en: "PUNCH LIST & BAST HANDOVER", id: "Daftar Temuan & Serah Terima" },
        COM: { en: "COMMISSIONING & TESTING", id: "Pengujian & Commissioning" },
        ENV: { en: "ENVIRONMENTAL MANAGEMENT", id: "Pengelolaan Lingkungan Proyek" },
        FIN: { en: "FINANCE & ACCOUNTING", id: "Keuangan & Akuntansi" },
        RSC: { en: "RESOURCES REGISTER", id: "Register Sumber Daya" },
        PPL: { en: "PEOPLE & HR REGISTER", id: "Register SDM & Personel" },
        CLK: { en: "CLOCK & ATTENDANCE LOG", id: "Log Presensi & Kehadiran" },
    };

    // Shared Header Renderer for Adidaya Document Standard
    const renderPageHeader = (headerTypeLabel: string, pageDocCode: string, subLabel: string) => {
        const bTitle = REPORT_BILINGUAL_TITLES[headerTypeLabel] || {
            en: subLabel ? subLabel.toUpperCase() : "PROJECT REPORT",
            id: subLabel || "Laporan Proyek",
        };

        return (
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
                <div className="w-[140px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
                    <div className="font-black text-[30px] text-neutral-900 leading-none tracking-tighter">{headerTypeLabel}</div>
                    
                    {/* English Title (Top Line) */}
                    <div className="text-[5.5px] font-black text-neutral-900 uppercase tracking-wider leading-tight pt-1">
                        {bTitle.en}
                    </div>
                    
                    {/* Indonesian Title (Bottom Line) */}
                    <div className="text-[5px] font-semibold text-neutral-500 tracking-tight leading-tight">
                        {bTitle.id}
                    </div>

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
    };

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
                            {reportId ? `Edit ${getReportMeta(reportType).title} (${getReportMeta(reportType).code})` : `Buat ${getReportMeta(reportType).title} (${getReportMeta(reportType).code})`}
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
                <div className="flex border-b border-neutral-200/60 dark:border-neutral-800/60 px-2 overflow-x-auto shrink-0 gap-1 scroll-smooth">
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
                            onClick={(e) => {
                                setActiveTab(tab.key);
                                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                            }}
                            className={clsx(
                                "pb-2.5 pt-1 px-3 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer",
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
                <div className="flex border-b border-neutral-200/60 dark:border-neutral-800/60 px-2 overflow-x-auto shrink-0 gap-1 scroll-smooth">
                    {([
                        { key: "general", label: "1. Info & Periode" },
                        { key: "summary", label: "2. Executive Summary" },
                        { key: "kegiatan", label: "3. Kegiatan Pekerjaan" },
                        { key: "personel", label: "4. Personel Harian" },
                        { key: "cuaca", label: "5. Cuaca & Kendala" },
                        { key: "dokumentasi", label: "6. Dokumentasi" },
                        { key: "ttd", label: "7. TTD & Approval" },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={(e) => {
                                setWeeklyTab(tab.key);
                                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                            }}
                            className={clsx(
                                "pb-2.5 pt-1 px-3 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer",
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

            {/* Schedule Specific Tabs & Language Switcher */}
            {reportType === "schedule" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    
                    {/* Tab Navigation Segmented Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Schedule Setup" },
                            { key: "wbs_activities", num: "2", label: "WBS & Activities", count: schActivities.length },
                            { key: "progress_update", num: "3", label: "Progress Update" },
                            { key: "critical_path", num: "4", label: "Critical Path & Delay" },
                            { key: "scurve_forecast", num: "5", label: "S-Curve & Forecast" },
                        ].map(tab => {
                            const isActive = schActiveTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={(e) => {
                                        setSchActiveTab(tab.key as any);
                                        e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                                    }}
                                    className={clsx(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive
                                            ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm"
                                            : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}
                                >
                                    <span className={clsx(
                                        "w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0",
                                        isActive
                                            ? "bg-blue-600 text-white"
                                            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                                    )}>
                                        {tab.num}
                                    </span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (
                                        <span className={clsx(
                                            "px-1.5 py-0.2 text-[10px] font-black rounded-md",
                                            isActive
                                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                                                : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500"
                                        )}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Separate Language Switcher Card (Clean: No 'BAHASA:' text) */}
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[
                                { key: "bilingual", label: "Bilingual" },
                                { key: "id", label: "ID" },
                                { key: "en", label: "EN" },
                            ].map(lang => (
                                <button
                                    key={lang.key}
                                    type="button"
                                    onClick={() => setSchLangMode(lang.key as any)}
                                    className={clsx(
                                        "px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        schLangMode === lang.key
                                            ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                                            : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== CST (COST & BUDGET) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "cost" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Budget Baseline" },
                            { key: "commitment_actual", num: "2", label: "Commitment & Actual", count: cstCommitments.length },
                            { key: "cost_by_wp", num: "3", label: "Cost by Work Package", count: cstWorkPackages.length },
                            { key: "variance_ev", num: "4", label: "Variance & Earned Value" },
                            { key: "cashflow_forecast", num: "5", label: "Cashflow & Forecast" },
                        ].map(tab => {
                            const isActive = cstActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setCstActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setCstLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        cstLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== CRW (MANPOWER & PAYROLL) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "manpower" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Workforce Setup" },
                            { key: "attendance_mandays", num: "2", label: "Attendance & Mandays" },
                            { key: "payroll_calc", num: "3", label: "Payroll Calculation" },
                            { key: "crew_allocation", num: "4", label: "Crew Allocation", count: crwAllocations.length },
                            { key: "payroll_verify", num: "5", label: "Payroll Verification" },
                        ].map(tab => {
                            const isActive = crwActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setCrwActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setCrwLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        crwLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== PRC (PROCUREMENT & STOCK) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "procurement" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Procurement Plan", count: prcPlanItems.length },
                            { key: "rfq_po", num: "2", label: "RFQ, Selection & PO", count: prcOrders.length },
                            { key: "delivery_inspection", num: "3", label: "Delivery & Inspection", count: prcDeliveries.length },
                            { key: "stock_consumption", num: "4", label: "Stock & Consumption" },
                            { key: "shortage_expediting", num: "5", label: "Shortage & Expediting" },
                        ].map(tab => {
                            const isActive = prcActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setPrcActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setPrcLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        prcLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== FIN (FINANCE REGISTER) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "finance" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Account & Balance" },
                            { key: "transactions", num: "2", label: "Cash & Bank Transactions", count: finTransactions.length },
                            { key: "receivable_payable", num: "3", label: "Receivable & Payable", count: finReceivables.length },
                            { key: "reconciliation", num: "4", label: "Reconciliation" },
                            { key: "closing_audit", num: "5", label: "Closing & Audit" },
                        ].map(tab => {
                            const isActive = finActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setFinActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setFinLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        finLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== RSC (EQUIPMENT & ASSET) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "resources" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Asset Master", count: rscAssets.length },
                            { key: "mobilisation", num: "2", label: "Mobilisation & Assignment", count: rscMobilisations.length },
                            { key: "operation_log", num: "3", label: "Operation Log", count: rscOperations.length },
                            { key: "inspection_maintenance", num: "4", label: "Inspection & Maintenance", count: rscInspections.length },
                            { key: "demobilisation_cost", num: "5", label: "Demobilisation & Cost" },
                        ].map(tab => {
                            const isActive = rscActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setRscActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setRscLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        rscLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== QAC (QUALITY CONTROL) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "quality" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Inspection Plan", count: qacPlans.length },
                            { key: "inspection_req", num: "2", label: "Inspection Request", count: qacRequests.length },
                            { key: "inspection_res", num: "3", label: "Inspection Result", count: qacResults.length },
                            { key: "ncr_defect", num: "4", label: "NCR & Defect", count: qacNcrs.length },
                            { key: "reinspection_closure", num: "5", label: "Reinspection & Closure" },
                        ].map(tab => {
                            const isActive = qacActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setQacActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setQacLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        qacLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== HSE (SAFETY & K3) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "safety" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Workforce & Safe Hours" },
                            { key: "hazard_inspection", num: "2", label: "Hazard & Site Inspection", count: hseHazards.length },
                            { key: "incident_nearmiss", num: "3", label: "Incident & Near Miss", count: hseIncidents.length },
                            { key: "permit_tbm_competency", num: "4", label: "Permit, TBM & Competency" },
                            { key: "corrective_closure", num: "5", label: "Corrective Action & Closure" },
                        ].map(tab => {
                            const isActive = hseActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setHseActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setHseLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        hseLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== IRK (ISSUE & RISK REGISTER) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "issue_risk" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Risk Identification", count: irkRisks.length },
                            { key: "risk_assessment", num: "2", label: "Risk Assessment" },
                            { key: "risk_response", num: "3", label: "Risk Response Strategy" },
                            { key: "issue_mgmt", num: "4", label: "Issue Management (Active)", count: irkIssues.length },
                            { key: "monitoring_closure", num: "5", label: "Monitoring & Closure" },
                        ].map(tab => {
                            const isActive = irkActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setIrkActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setIrkLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        irkLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== DOC (DOCUMENT CONTROL) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "doc_control" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Document Register", count: docRegister.length },
                            { key: "doc_submission", num: "2", label: "Revision & Submission", count: docSubmissions.length },
                            { key: "doc_approval", num: "3", label: "Review & Approval", count: docApprovals.length },
                            { key: "doc_distribution", num: "4", label: "Distribution", count: docDistributions.length },
                            { key: "doc_archive", num: "5", label: "Superseded & Archive", count: docArchives.length },
                        ].map(tab => {
                            const isActive = docActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setDocActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setDocLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        docLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== CCO (CONTRACT CHANGE ORDER) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "change_order" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Change Initiation" },
                            { key: "cco_scope", num: "2", label: "Scope & Quantity", count: ccoScopeItems.length },
                            { key: "cco_cost", num: "3", label: "Cost Assessment", count: ccoCosts.length },
                            { key: "cco_impact", num: "4", label: "Time & Contract Impact" },
                            { key: "cco_approval", num: "5", label: "Negotiation & Approval" },
                        ].map(tab => {
                            const isActive = ccoActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setCcoActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setCcoLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        ccoLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== MOU (AGREEMENT & CONTRACT) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "mou_contract" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Parties & Identity" },
                            { key: "mou_scope", num: "2", label: "Scope & Deliverables" },
                            { key: "mou_commercial", num: "3", label: "Commercial Terms" },
                            { key: "mou_risk", num: "4", label: "Time, Obligation & Risk" },
                            { key: "mou_execution", num: "5", label: "Clauses & Execution" },
                        ].map(tab => {
                            const isActive = mouActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setMouActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setMouLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        mouLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== EXE (EXECUTIVE REPORT) TABS & LANGUAGE SWITCHER ==================== */}
            {reportType === "executive" && (
                <div className="flex flex-col sm:flex-row border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-2 bg-neutral-100/70 dark:bg-neutral-900/80 items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
                        {[
                            { key: "setup", num: "1", label: "Project Health (RAG)" },
                            { key: "exe_highlights", num: "2", label: "Performance Highlights" },
                            { key: "exe_risks", num: "3", label: "Strategic Risks & Issues", count: exeStrategicRisks.length },
                            { key: "exe_forecast", num: "4", label: "Forecast & Recovery" },
                            { key: "exe_decisions", num: "5", label: "Decisions Required", count: exeDecisions.length },
                        ].map(tab => {
                            const isActive = exeActiveTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={(e) => { setExeActiveTab(tab.key as any); e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }}
                                    className={clsx("px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                                        isActive ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
                                    )}>
                                    <span className={clsx("w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center shrink-0", isActive ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300")}>{tab.num}</span>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (<span className={clsx("px-1.5 py-0.2 text-[10px] font-black rounded-md", isActive ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500")}>{tab.count}</span>)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex items-center gap-1">
                            {[{ key: "bilingual", label: "Bilingual" }, { key: "id", label: "ID" }, { key: "en", label: "EN" }].map(lang => (
                                <button key={lang.key} type="button" onClick={() => setExeLangMode(lang.key as any)}
                                    className={clsx("px-2.5 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider border cursor-pointer",
                                        exeLangMode === lang.key ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" : "bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    )}>{lang.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Extended Reports ISO Domain Tabs (excludes daily, weekly, monthly, schedule, cluster 2, 3 & 4 types) */}
            {!["daily", "weekly", "monthly", "schedule", "cost", "manpower", "procurement", "finance", "resources", "quality", "safety", "issue_risk", "doc_control", "change_order", "mou_contract", "executive"].includes(reportType) && (
                <div className="flex border-b border-neutral-200/60 dark:border-neutral-800/60 px-2 overflow-x-auto shrink-0 gap-1">
                    {[
                        { key: "general", label: "1. Info & Periode" },
                        { key: "summary", label: `2. ${getReportConfig(reportType).summaryTitleShort || "Ringkasan & Target"}` },
                        { key: "kegiatan", label: `3. ${getReportConfig(reportType).itemsTitleShort || "Item Pekerjaan"}` },
                        { key: reportType === "manpower" ? "personel" : "cuaca", label: `4. ${getReportConfig(reportType).notesTitleShort || "Catatan & Evaluasi"}` },
                        { key: "dokumentasi", label: "5. Dokumentasi & TTD" },
                    ].map(tab => (
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
                                                <div className="flex-1">
                                                    <Input 
                                                        label="" 
                                                        value={w.timeRange} 
                                                        onChange={(e) => setWeatherItems(prev => prev.map((item, i) => i === idx ? { ...item, timeRange: e.target.value } : item))} 
                                                        placeholder="08.00 - 09.00" 
                                                    />
                                                </div>
                                                <div className="w-36">
                                                    <Select
                                                        label=""
                                                        value={w.condition}
                                                        onChange={(val) => setWeatherItems(prev => prev.map((item, i) => i === idx ? { ...item, condition: val } : item))}
                                                        options={[{ value: "cerah", label: "Cerah" }, { value: "berawan", label: "Berawan" }, { value: "hujan", label: "Hujan" }]}
                                                    />
                                                </div>
                                                {weatherItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setWeatherItems(weatherItems.filter((_, i) => i !== idx))}
                                                        className="p-2 text-neutral-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors shrink-0"
                                                        title="Hapus Baris Cuaca"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const lastItem = weatherItems[weatherItems.length - 1];
                                            let nextTime = "17.00 - 18.00";
                                            if (lastItem && lastItem.timeRange.includes("-")) {
                                                const endParts = lastItem.timeRange.split("-")[1].trim().split(".");
                                                const endHour = parseInt(endParts[0], 10);
                                                if (!isNaN(endHour)) {
                                                    const startStr = endHour.toString().padStart(2, "0") + ".00";
                                                    const endStr = (endHour + 1).toString().padStart(2, "0") + ".00";
                                                    nextTime = `${startStr} - ${endStr}`;
                                                }
                                            }
                                            setWeatherItems([...weatherItems, { timeRange: nextTime, condition: "cerah" }]);
                                        }}
                                        className="w-full py-2.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center justify-center gap-1.5 bg-orange-50/80 dark:bg-orange-950/30 rounded-xl border border-orange-200/60 dark:border-orange-900/40 hover:bg-orange-100/60 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah Jam / Baris Cuaca
                                    </button>
                                </div>
                            )}

                            {activeTab === "material" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Material / Alat / Jasa Lapangan</span>

                                    <div className="space-y-3">
                                        {materialItems.map((mat, idx) => (
                                            <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3 relative">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">Item #{idx + 1}</span>
                                                    {materialItems.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setMaterialItems(materialItems.filter((_, i) => i !== idx))}
                                                            className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"
                                                            title="Hapus Item"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <Select
                                                        label="Kategori"
                                                        value={mat.category}
                                                        onChange={(val) => setMaterialItems(prev => prev.map((item, i) => i === idx ? { ...item, category: val } : item))}
                                                        options={[
                                                            { value: "Material", label: "Material" },
                                                            { value: "Alat", label: "Alat" },
                                                            { value: "Jasa", label: "Jasa" }
                                                        ]}
                                                    />
                                                    <Input
                                                        label="Nama Item"
                                                        value={mat.name}
                                                        onChange={(e) => setMaterialItems(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                                                        placeholder="Semen / Excavator / Bor"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-4 gap-2">
                                                    <Input
                                                        label="Satuan"
                                                        value={mat.unit}
                                                        onChange={(e) => setMaterialItems(prev => prev.map((item, i) => i === idx ? { ...item, unit: e.target.value } : item))}
                                                        placeholder="sak / unit / m3"
                                                    />
                                                    <Input
                                                        label="Masuk"
                                                        type="number"
                                                        value={mat.incoming}
                                                        onChange={(e) => setMaterialItems(prev => prev.map((item, i) => i === idx ? { ...item, incoming: e.target.value } : item))}
                                                        placeholder="0"
                                                    />
                                                    <Input
                                                        label="Keluar / Pakai"
                                                        type="number"
                                                        value={mat.outgoing}
                                                        onChange={(e) => setMaterialItems(prev => prev.map((item, i) => i === idx ? { ...item, outgoing: e.target.value } : item))}
                                                        placeholder="0"
                                                    />
                                                    <Input
                                                        label="Sisa / Stok"
                                                        type="number"
                                                        value={mat.stock}
                                                        onChange={(e) => setMaterialItems(prev => prev.map((item, i) => i === idx ? { ...item, stock: e.target.value } : item))}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setMaterialItems([...materialItems, { name: "", category: "Material", unit: "unit", incoming: "0", outgoing: "0", stock: "0" }])}
                                        className="w-full py-2.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center justify-center gap-1.5 bg-orange-50/80 dark:bg-orange-950/30 rounded-xl border border-orange-200/60 dark:border-orange-900/40 hover:bg-orange-100/60 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah Material / Alat
                                    </button>
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

                    {/* ==================== PROJECT SCHEDULE (SCH) BILINGUAL FORMS ==================== */}
                    {reportType === "schedule" ? (
                        <>
                            {schActiveTab === "setup" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Schedule Setup / Pengaturan Jadwal</span>
                                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">SCH-SETUP</span>
                                    </div>

                                    <Select
                                        label="Proyek / Project *"
                                        value={selectedProjectId}
                                        onChange={(val) => {
                                            setSelectedProjectId(val);
                                            if (!paramId) {
                                                const proj = projects.find(p => p.id === val);
                                                if (proj?.location) setLocationOverride(proj.location);
                                            }
                                        }}
                                        options={[
                                            { value: "", label: "-- Pilih Proyek / Select Project --" },
                                            ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))
                                        ]}
                                        disabled={!!paramProjectId}
                                        required
                                    />

                                    <Input
                                        label="Lokasi Proyek / Project Location"
                                        value={locationOverride}
                                        onChange={(e) => setLocationOverride(e.target.value)}
                                        placeholder="e.g. Area Site Utama / Main Project Site"
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Baseline Version / Versi Baseline"
                                            value={schBaselineVersion}
                                            onChange={(e) => setSchBaselineVersion(e.target.value)}
                                            placeholder="e.g. Baseline Rev 1.0"
                                        />
                                        <Input
                                            label="Data Date / Tanggal Data"
                                            type="date"
                                            value={schDataDate}
                                            onChange={(e) => setSchDataDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Calendar Kerja / Work Calendar"
                                            value={schWorkCalendar}
                                            onChange={(e) => setSchWorkCalendar(e.target.value)}
                                            placeholder="e.g. 7 Hari Kerja / 7-Day Calendar"
                                        />
                                        <Input
                                            label="Cut-off Date / Tanggal Cut-off"
                                            type="date"
                                            value={schCutoffDate}
                                            onChange={(e) => setSchCutoffDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Schedule Revision / Revisi Jadwal"
                                            value={schRevision}
                                            onChange={(e) => setSchRevision(e.target.value)}
                                            placeholder="e.g. REV-01"
                                        />
                                        <Input
                                            label="Nomor Dokumen / Document ID"
                                            value={documentId}
                                            onChange={(e) => setDocumentId(e.target.value)}
                                            placeholder="SCH-01-01"
                                        />
                                    </div>

                                    {/* Dynamic Approval Setup (Max 4 Columns) */}
                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                                                Tanda Tangan & Persetujuan / Approvals ({schApprovals.length}/4)
                                            </span>
                                            {schApprovals.length < 4 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const;
                                                        const usedTypes = schApprovals.map(a => a.type);
                                                        const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui";
                                                        const newArr = [...schApprovals, { type: nextType as any, name: "", role: "" }];
                                                        const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
                                                        setSchApprovals(sorted);
                                                    }}
                                                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Tambah Kolom TTD
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 -mt-1">
                                            Urutan otomatis: Disusun → Dicek → Mengetahui → Disetujui. Gunakan ↑↓ untuk atur ulang manual.
                                        </p>

                                        <div className="space-y-3">
                                            {schApprovals.map((app, idx) => (
                                                <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5 relative">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Kolom TTD #{idx + 1}</span>
                                                        <div className="flex items-center gap-1">
                                                            {/* Move Up */}
                                                            <button
                                                                type="button"
                                                                disabled={idx === 0}
                                                                onClick={() => {
                                                                    const arr = [...schApprovals];
                                                                    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                                                    setSchApprovals(arr);
                                                                }}
                                                                className={clsx(
                                                                    "p-0.5 rounded transition-colors cursor-pointer",
                                                                    idx === 0
                                                                        ? "text-neutral-200 dark:text-neutral-700 cursor-not-allowed"
                                                                        : "text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                                )}
                                                                title="Pindah Ke Atas"
                                                            >
                                                                <ChevronUp className="w-4 h-4" />
                                                            </button>
                                                            {/* Move Down */}
                                                            <button
                                                                type="button"
                                                                disabled={idx === schApprovals.length - 1}
                                                                onClick={() => {
                                                                    const arr = [...schApprovals];
                                                                    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                                                    setSchApprovals(arr);
                                                                }}
                                                                className={clsx(
                                                                    "p-0.5 rounded transition-colors cursor-pointer",
                                                                    idx === schApprovals.length - 1
                                                                        ? "text-neutral-200 dark:text-neutral-700 cursor-not-allowed"
                                                                        : "text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                                )}
                                                                title="Pindah Ke Bawah"
                                                            >
                                                                <ChevronDown className="w-4 h-4" />
                                                            </button>
                                                            {/* Delete */}
                                                            {schApprovals.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSchApprovals(schApprovals.filter((_, i) => i !== idx))}
                                                                    className="text-neutral-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer ml-1"
                                                                    title="Hapus Kolom TTD"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        <Select
                                                            label="Peran / Role Type"
                                                            value={app.type}
                                                            onChange={(val) => {
                                                                const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const;
                                                                const updated = schApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item);
                                                                const sorted = [...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
                                                                setSchApprovals(sorted);
                                                            }}
                                                            options={[
                                                                { value: "disusun", label: "Disusun Oleh (Prepared By)" },
                                                                { value: "dicek", label: "Dicek Oleh (Checked By)" },
                                                                { value: "mengetahui", label: "Mengetahui (Acknowledged By)" },
                                                                { value: "disetujui", label: "Disetujui Oleh (Approved By / Klien)" },
                                                            ]}
                                                        />
                                                        <Input
                                                            label="Nama Personel / Client"
                                                            value={app.name}
                                                            onChange={(e) => setSchApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                                                            placeholder="Nama"
                                                        />
                                                        <Input
                                                            label="Jabatan / Title"
                                                            value={app.role}
                                                            onChange={(e) => setSchApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))}
                                                            placeholder="Jabatan"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {schActiveTab === "wbs_activities" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">2. WBS & Activities / Aktivitas Pekerjaan ({schActivities.length})</span>
                                    </div>

                                    <div className="space-y-3">
                                        {schActivities.map((act, idx) => (
                                            <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3 relative">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Task Item #{idx + 1}</span>
                                                    {schActivities.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSchActivities(schActivities.filter((_, i) => i !== idx))}
                                                            className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"
                                                            title="Hapus Task"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-3 gap-2.5">
                                                    <Input
                                                        label="Kode WBS / WBS Code"
                                                        value={act.wbs}
                                                        onChange={(e) => setSchActivities(prev => prev.map((item, i) => i === idx ? { ...item, wbs: e.target.value } : item))}
                                                        placeholder="e.g. 1.1.2"
                                                    />
                                                    <div className="col-span-2">
                                                        <Input
                                                            label="Aktivitas Pekerjaan / Activity Name"
                                                            value={act.activity}
                                                            onChange={(e) => setSchActivities(prev => prev.map((item, i) => i === idx ? { ...item, activity: e.target.value } : item))}
                                                            placeholder="e.g. Pekerjaan Pondasi Bored Pile / Foundation Work"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-4 gap-2">
                                                    <Input
                                                        label="Durasi / Duration"
                                                        value={act.duration}
                                                        onChange={(e) => setSchActivities(prev => prev.map((item, i) => i === idx ? { ...item, duration: e.target.value } : item))}
                                                        placeholder="14 Hari / Days"
                                                    />
                                                    <Input
                                                        label="Dependency"
                                                        value={act.dependency}
                                                        onChange={(e) => setSchActivities(prev => prev.map((item, i) => i === idx ? { ...item, dependency: e.target.value } : item))}
                                                        placeholder="1.1 (FS+0)"
                                                    />
                                                    <Input
                                                        label="Milestone"
                                                        value={act.milestone}
                                                        onChange={(e) => setSchActivities(prev => prev.map((item, i) => i === idx ? { ...item, milestone: e.target.value } : item))}
                                                        placeholder="Groundbreaking / —"
                                                    />
                                                    <Input
                                                        label="Bobot / Weight (%)"
                                                        value={act.weight}
                                                        onChange={(e) => setSchActivities(prev => prev.map((item, i) => i === idx ? { ...item, weight: e.target.value } : item))}
                                                        placeholder="5.00%"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSchActivities([...schActivities, { wbs: `${schActivities.length + 1}.1`, activity: "", duration: "7 Hari", dependency: "—", milestone: "—", weight: "0.00%" }])}
                                        className="w-full py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center justify-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 hover:bg-blue-100/60 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah Aktivitas / Add Activity
                                    </button>
                                </div>
                            )}

                            {schActiveTab === "progress_update" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">3. Progress Update / Pembaruan Progres</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Baseline Start / Tanggal Rencana Mulai"
                                            type="date"
                                            value={schBaselineStartDate}
                                            onChange={(e) => setSchBaselineStartDate(e.target.value)}
                                        />
                                        <Input
                                            label="Baseline Finish / Tanggal Rencana Selesai"
                                            type="date"
                                            value={schBaselineFinishDate}
                                            onChange={(e) => setSchBaselineFinishDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Actual Start / Tanggal Realisasi Mulai"
                                            type="date"
                                            value={schActualStartDate}
                                            onChange={(e) => setSchActualStartDate(e.target.value)}
                                        />
                                        <Input
                                            label="Actual Finish / Tanggal Realisasi Selesai"
                                            type="date"
                                            value={schActualFinishDate}
                                            onChange={(e) => setSchActualFinishDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <Input
                                            label="Remaining Duration / Sisa Durasi"
                                            value={schRemainingDuration}
                                            onChange={(e) => setSchRemainingDuration(e.target.value)}
                                            placeholder="e.g. 45 Hari / Days"
                                        />
                                        <Input
                                            label="Progress / Pencapaian (%)"
                                            value={schProgress}
                                            onChange={(e) => setSchProgress(e.target.value)}
                                            placeholder="e.g. 65.50%"
                                        />
                                        <Input
                                            label="Forecast Dates / Perkiraan Selesai"
                                            type="date"
                                            value={schForecastFinishDate}
                                            onChange={(e) => setSchForecastFinishDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {schActiveTab === "critical_path" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">4. Critical Path & Delay / Jalur Kritis & Keterlambatan</span>
                                    </div>

                                    <Input
                                        label="Total Float / Kelonggaran Waktu"
                                        value={schTotalFloat}
                                        onChange={(e) => setSchTotalFloat(e.target.value)}
                                        placeholder="e.g. -5 Hari / Days (Negative Float)"
                                    />

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Critical Activities / Aktivitas Jalur Kritis</label>
                                        <textarea
                                            className="w-full min-h-[75px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                            value={schCriticalActivities}
                                            onChange={(e) => setSchCriticalActivities(e.target.value)}
                                            placeholder="Daftar pekerjaan kritis..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Delay Event / Kejadian Keterlambatan</label>
                                        <textarea
                                            className="w-full min-h-[75px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                            value={schDelayEvent}
                                            onChange={(e) => setSchDelayEvent(e.target.value)}
                                            placeholder="Penyebab keterlambatan..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Schedule Impact / Dampak Jadwal</label>
                                            <textarea
                                                className="w-full min-h-[80px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                value={schScheduleImpact}
                                                onChange={(e) => setSchScheduleImpact(e.target.value)}
                                                placeholder="Estimasi dampak keterlambatan..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Recovery Action / Langkah Pemulihan</label>
                                            <textarea
                                                className="w-full min-h-[80px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                value={schRecoveryAction}
                                                onChange={(e) => setSchRecoveryAction(e.target.value)}
                                                placeholder="Upaya percepatan / catch-up plan..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {schActiveTab === "scurve_forecast" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">5. S-Curve & Forecast / Kurva-S & Perkiraan</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Planned Progress / Rencana (%)"
                                            value={schPlanned}
                                            onChange={(e) => setSchPlanned(e.target.value)}
                                            placeholder="70.00%"
                                        />
                                        <Input
                                            label="Actual Progress / Realisasi (%)"
                                            value={schActual}
                                            onChange={(e) => setSchActual(e.target.value)}
                                            placeholder="65.50%"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Earned Value / Nilai Hasil"
                                            value={schEarned}
                                            onChange={(e) => setSchEarned(e.target.value)}
                                            placeholder="Rp 1.450.000.000 (EV)"
                                        />
                                        <Input
                                            label="Schedule Variance / Variansi Waktu"
                                            value={schVariance}
                                            onChange={(e) => setSchVariance(e.target.value)}
                                            placeholder="-4.50% (Behind Schedule)"
                                        />
                                    </div>

                                    <Input
                                        label="Forecast Completion / Perkiraan Penyelesaian"
                                        type="date"
                                        value={schForecastCompletion}
                                        onChange={(e) => setSchForecastCompletion(e.target.value)}
                                    />

                                    <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Tanda Tangan & Approval</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input label="Disusun Oleh / Prepared By" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Nama Planner / Engineer" />
                                            <Input label="Jabatan Penyusun / Role" value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} placeholder="Project Scheduler" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input label="Disetujui Oleh / Approved By" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Nama Penanggung Jawab" />
                                            <Input label="Jabatan Penyetuju / Role" value={approvedByRole} onChange={(e) => setApprovedByRole(e.target.value)} placeholder="Project Manager" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : ["cost", "manpower", "procurement", "finance", "resources", "quality", "safety", "issue_risk", "doc_control", "change_order", "mou_contract", "executive"].includes(reportType) ? (
                        <>
                            {/* ==================== CLUSTER 2 & 3 BILINGUAL FORMS ==================== */}

                            {/* ====================== CST (COST & BUDGET) FORMS ====================== */}
                            {reportType === "cost" && (
                                <>
                                    {cstActiveTab === "setup" && (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Budget Baseline / Baseline Anggaran</span>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">CST-SETUP</span>
                                            </div>

                                            <Select label="Proyek / Project *" value={selectedProjectId}
                                                onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }}
                                                options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]}
                                                disabled={!!paramProjectId} required
                                            />
                                            <Input label="Lokasi Proyek / Project Location" value={locationOverride} onChange={(e) => setLocationOverride(e.target.value)} placeholder="e.g. Area Site Utama / Main Project Site" />

                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Contract Value / Nilai Kontrak" value={cstContractValue} onChange={(e) => setCstContractValue(e.target.value)} placeholder="Rp 15.000.000.000" />
                                                <Input label="Approved RAB / RAB Disetujui" value={cstApprovedRAB} onChange={(e) => setCstApprovedRAB(e.target.value)} placeholder="Rp 14.250.000.000" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="Contingency / Cadangan" value={cstContingency} onChange={(e) => setCstContingency(e.target.value)} placeholder="5.00%" />
                                                <Input label="Budget Revision / Revisi Anggaran" value={cstBudgetRevision} onChange={(e) => setCstBudgetRevision(e.target.value)} placeholder="REV-00" />
                                                <Input label="Cost Code Structure / Struktur Kode Biaya" value={cstCostCodeStructure} onChange={(e) => setCstCostCodeStructure(e.target.value)} placeholder="WBS-Based" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="CST-01-01" />
                                                <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                            </div>

                                            {/* Dynamic Approval Setup */}
                                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan & Persetujuan / Approvals ({cstApprovals.length}/4)</span>
                                                    {cstApprovals.length < 4 && (
                                                        <button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = cstApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...cstApprovals, { type: nextType as any, name: "", role: "" }]; const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setCstApprovals(sorted); }} className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah Kolom TTD</button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 -mt-1">Urutan otomatis: Disusun → Dicek → Mengetahui → Disetujui.</p>
                                                <div className="space-y-3">
                                                    {cstApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5 relative">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Kolom TTD #{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" disabled={idx === 0} onClick={() => { const arr = [...cstApprovals]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setCstApprovals(arr); }} className={clsx("p-0.5 rounded transition-colors cursor-pointer", idx === 0 ? "text-neutral-200 dark:text-neutral-700 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400")}><ChevronUp className="w-4 h-4" /></button>
                                                                    <button type="button" disabled={idx === cstApprovals.length - 1} onClick={() => { const arr = [...cstApprovals]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setCstApprovals(arr); }} className={clsx("p-0.5 rounded transition-colors cursor-pointer", idx === cstApprovals.length - 1 ? "text-neutral-200 dark:text-neutral-700 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400")}><ChevronDown className="w-4 h-4" /></button>
                                                                    {cstApprovals.length > 1 && (<button type="button" onClick={() => setCstApprovals(cstApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer ml-1"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select label="Peran / Role Type" value={app.type} onChange={(val) => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const updated = cstApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item); const sorted = [...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setCstApprovals(sorted); }} options={[{ value: "disusun", label: "Disusun Oleh (Prepared By)" }, { value: "dicek", label: "Dicek Oleh (Checked By)" }, { value: "mengetahui", label: "Mengetahui (Acknowledged By)" }, { value: "disetujui", label: "Disetujui Oleh (Approved By)" }]} />
                                                                <Input label="Nama / Name" value={app.name} onChange={(e) => setCstApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                <Input label="Jabatan / Title" value={app.role} onChange={(e) => setCstApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {cstActiveTab === "commitment_actual" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">2. Commitment & Actual Cost / Komitmen & Biaya Aktual ({cstCommitments.length})</span>
                                            </div>
                                            <div className="space-y-3">
                                                {cstCommitments.map((item, idx) => (
                                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3 relative">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">PO/SPK #{idx + 1}</span>
                                                            {cstCommitments.length > 1 && (<button type="button" onClick={() => setCstCommitments(cstCommitments.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>)}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            <Input label="No. PO/SPK" value={item.poSpk} onChange={(e) => setCstCommitments(prev => prev.map((it, i) => i === idx ? { ...it, poSpk: e.target.value } : it))} placeholder="PO-001" />
                                                            <Input label="Vendor / Supplier" value={item.vendor} onChange={(e) => setCstCommitments(prev => prev.map((it, i) => i === idx ? { ...it, vendor: e.target.value } : it))} placeholder="PT Vendor" />
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            <Input label="Nilai Kontrak / Value" value={item.value} onChange={(e) => setCstCommitments(prev => prev.map((it, i) => i === idx ? { ...it, value: e.target.value } : it))} placeholder="Rp" />
                                                            <Input label="Invoiced" value={item.invoiced} onChange={(e) => setCstCommitments(prev => prev.map((it, i) => i === idx ? { ...it, invoiced: e.target.value } : it))} placeholder="Rp" />
                                                            <Input label="Paid / Dibayar" value={item.paid} onChange={(e) => setCstCommitments(prev => prev.map((it, i) => i === idx ? { ...it, paid: e.target.value } : it))} placeholder="Rp" />
                                                            <Input label="Accrual" value={item.accrual} onChange={(e) => setCstCommitments(prev => prev.map((it, i) => i === idx ? { ...it, accrual: e.target.value } : it))} placeholder="Rp" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => setCstCommitments([...cstCommitments, { poSpk: "", vendor: "", value: "", invoiced: "", paid: "", accrual: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center justify-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah PO/SPK / Add Commitment</button>
                                        </div>
                                    )}

                                    {cstActiveTab === "cost_by_wp" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">3. Cost by Work Package / Biaya Per Paket Pekerjaan ({cstWorkPackages.length})</span>
                                            </div>
                                            <div className="space-y-3">
                                                {cstWorkPackages.map((wp, idx) => (
                                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3 relative">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Work Package #{idx + 1}</span>
                                                            {cstWorkPackages.length > 1 && (<button type="button" onClick={() => setCstWorkPackages(cstWorkPackages.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>)}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            <Input label="Cost Code / Kode Biaya" value={wp.costCode} onChange={(e) => setCstWorkPackages(prev => prev.map((it, i) => i === idx ? { ...it, costCode: e.target.value } : it))} placeholder="1.1" />
                                                            <div className="col-span-2"><Input label="Uraian Pekerjaan / Description" value={wp.description} onChange={(e) => setCstWorkPackages(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} placeholder="Pekerjaan Pondasi / Foundation Work" /></div>
                                                        </div>
                                                        <div className="grid grid-cols-5 gap-2">
                                                            <Input label="Original Budget" value={wp.originalBudget} onChange={(e) => setCstWorkPackages(prev => prev.map((it, i) => i === idx ? { ...it, originalBudget: e.target.value } : it))} placeholder="Rp" />
                                                            <Input label="Revised Budget" value={wp.revisedBudget} onChange={(e) => setCstWorkPackages(prev => prev.map((it, i) => i === idx ? { ...it, revisedBudget: e.target.value } : it))} placeholder="Rp" />
                                                            <Input label="Committed" value={wp.committed} onChange={(e) => setCstWorkPackages(prev => prev.map((it, i) => i === idx ? { ...it, committed: e.target.value } : it))} placeholder="Rp" />
                                                            <Input label="Actual" value={wp.actual} onChange={(e) => setCstWorkPackages(prev => prev.map((it, i) => i === idx ? { ...it, actual: e.target.value } : it))} placeholder="Rp" />
                                                            <Input label="Remaining / Sisa" value={wp.remaining} onChange={(e) => setCstWorkPackages(prev => prev.map((it, i) => i === idx ? { ...it, remaining: e.target.value } : it))} placeholder="Rp" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => setCstWorkPackages([...cstWorkPackages, { costCode: "", description: "", originalBudget: "", revisedBudget: "", committed: "", actual: "", remaining: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center justify-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Work Package / Add WP</button>
                                        </div>
                                    )}

                                    {cstActiveTab === "variance_ev" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">4. Variance & Earned Value / Variansi & Nilai Hasil</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="PV (Planned Value)" value={cstPV} onChange={(e) => setCstPV(e.target.value)} placeholder="Rp 9.800.000.000" />
                                                <Input label="EV (Earned Value)" value={cstEV} onChange={(e) => setCstEV(e.target.value)} placeholder="Rp 9.200.000.000" />
                                                <Input label="AC (Actual Cost)" value={cstAC} onChange={(e) => setCstAC(e.target.value)} placeholder="Rp 9.500.000.000" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="CV (Cost Variance)" value={cstCV} onChange={(e) => setCstCV(e.target.value)} placeholder="Rp -300.000.000" />
                                                <Input label="CPI (Cost Performance Index)" value={cstCPI} onChange={(e) => setCstCPI(e.target.value)} placeholder="0.968" />
                                                <Input label="EAC (Estimate at Completion)" value={cstEAC} onChange={(e) => setCstEAC(e.target.value)} placeholder="Rp 14.720.000.000" />
                                            </div>
                                        </div>
                                    )}

                                    {cstActiveTab === "cashflow_forecast" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">5. Cashflow & Forecast / Arus Kas & Perkiraan</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Planned Cashflow / Arus Kas Rencana" value={cstPlannedCashflow} onChange={(e) => setCstPlannedCashflow(e.target.value)} placeholder="Rp" />
                                                <Input label="Actual Cashflow / Arus Kas Aktual" value={cstActualCashflow} onChange={(e) => setCstActualCashflow(e.target.value)} placeholder="Rp" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Outstanding Payment / Pembayaran Tertunggak" value={cstOutstandingPayment} onChange={(e) => setCstOutstandingPayment(e.target.value)} placeholder="Rp" />
                                                <Input label="Forecast / Perkiraan Total" value={cstForecast} onChange={(e) => setCstForecast(e.target.value)} placeholder="Rp (EAC)" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Corrective Action / Tindakan Korektif</label>
                                                <textarea className="w-full min-h-[80px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" value={cstCorrectiveAction} onChange={(e) => setCstCorrectiveAction(e.target.value)} placeholder="Langkah penghematan / Cost saving measures..." />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ====================== CRW (MANPOWER & PAYROLL) FORMS ====================== */}
                            {reportType === "manpower" && (
                                <>
                                    {crwActiveTab === "setup" && (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Workforce Setup / Pengaturan Tenaga Kerja</span>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">CRW-SETUP</span>
                                            </div>
                                            <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                            <Input label="Lokasi Proyek / Project Location" value={locationOverride} onChange={(e) => setLocationOverride(e.target.value)} placeholder="e.g. Area Site Utama" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="CRW-01-01" />
                                                <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                            </div>

                                            <div className="space-y-3">
                                                <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Daftar Tenaga Kerja / Workforce List ({crwWorkforce.length})</span>
                                                {crwWorkforce.map((w, idx) => (
                                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3 relative">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Worker #{idx + 1}</span>
                                                            {crwWorkforce.length > 1 && (<button type="button" onClick={() => setCrwWorkforce(crwWorkforce.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>)}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            <Input label="Perusahaan / Company" value={w.perusahaan} onChange={(e) => setCrwWorkforce(prev => prev.map((it, i) => i === idx ? { ...it, perusahaan: e.target.value } : it))} placeholder="PT / CV" />
                                                            <Input label="Crew / Tim" value={w.crew} onChange={(e) => setCrwWorkforce(prev => prev.map((it, i) => i === idx ? { ...it, crew: e.target.value } : it))} placeholder="Tim Pembesian" />
                                                            <Input label="Jabatan / Position" value={w.jabatan} onChange={(e) => setCrwWorkforce(prev => prev.map((it, i) => i === idx ? { ...it, jabatan: e.target.value } : it))} placeholder="Mandor" />
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            <Input label="Rate / Tarif" value={w.rate} onChange={(e) => setCrwWorkforce(prev => prev.map((it, i) => i === idx ? { ...it, rate: e.target.value } : it))} placeholder="Rp 350.000/hari" />
                                                            <Input label="Shift" value={w.shift} onChange={(e) => setCrwWorkforce(prev => prev.map((it, i) => i === idx ? { ...it, shift: e.target.value } : it))} placeholder="Shift Pagi / Day" />
                                                            <Input label="Tipe Kontrak / Employment Type" value={w.employmentType} onChange={(e) => setCrwWorkforce(prev => prev.map((it, i) => i === idx ? { ...it, employmentType: e.target.value } : it))} placeholder="Harian Tetap" />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setCrwWorkforce([...crwWorkforce, { perusahaan: "", crew: "", jabatan: "", rate: "", shift: "", employmentType: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Tenaga Kerja / Add Worker</button>
                                            </div>

                                            {/* CRW Approvals */}
                                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan & Persetujuan / Approvals ({crwApprovals.length}/4)</span>
                                                    {crwApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = crwApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...crwApprovals, { type: nextType as any, name: "", role: "" }]; const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setCrwApprovals(sorted); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                </div>
                                                <div className="space-y-3">
                                                    {crwApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">TTD #{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" disabled={idx === 0} onClick={() => { const arr = [...crwApprovals]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setCrwApprovals(arr); }} className={clsx("p-0.5 rounded transition-colors cursor-pointer", idx === 0 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronUp className="w-4 h-4" /></button>
                                                                    <button type="button" disabled={idx === crwApprovals.length - 1} onClick={() => { const arr = [...crwApprovals]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setCrwApprovals(arr); }} className={clsx("p-0.5 rounded transition-colors cursor-pointer", idx === crwApprovals.length - 1 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronDown className="w-4 h-4" /></button>
                                                                    {crwApprovals.length > 1 && (<button type="button" onClick={() => setCrwApprovals(crwApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select label="Peran" value={app.type} onChange={(val) => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const updated = crwApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item); setCrwApprovals([...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))); }} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                <Input label="Nama" value={app.name} onChange={(e) => setCrwApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                <Input label="Jabatan" value={app.role} onChange={(e) => setCrwApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {crwActiveTab === "attendance_mandays" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">2. Attendance & Mandays / Kehadiran & Hari Kerja</span></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Total Kehadiran / Attendance Total" value={crwAttendanceTotal} onChange={(e) => setCrwAttendanceTotal(e.target.value)} placeholder="142" />
                                                <Input label="Normal Hours / Jam Kerja Normal" value={crwNormalHours} onChange={(e) => setCrwNormalHours(e.target.value)} placeholder="1.136 Jam" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="Overtime / Lembur" value={crwOvertime} onChange={(e) => setCrwOvertime(e.target.value)} placeholder="284 Jam" />
                                                <Input label="Absence / Ketidakhadiran" value={crwAbsence} onChange={(e) => setCrwAbsence(e.target.value)} placeholder="8 Orang" />
                                                <Input label="Mandays (MD)" value={crwMandays} onChange={(e) => setCrwMandays(e.target.value)} placeholder="710 MD" />
                                            </div>
                                        </div>
                                    )}

                                    {crwActiveTab === "payroll_calc" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">3. Payroll Calculation / Perhitungan Gaji</span></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Base Wage / Upah Pokok" value={crwBaseWage} onChange={(e) => setCrwBaseWage(e.target.value)} placeholder="Rp" />
                                                <Input label="Overtime Pay / Upah Lembur" value={crwOvertimePay} onChange={(e) => setCrwOvertimePay(e.target.value)} placeholder="Rp" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="Allowance / Tunjangan" value={crwAllowance} onChange={(e) => setCrwAllowance(e.target.value)} placeholder="Rp" />
                                                <Input label="Deduction / Potongan" value={crwDeduction} onChange={(e) => setCrwDeduction(e.target.value)} placeholder="Rp" />
                                                <Input label="Net Payroll / Gaji Bersih" value={crwNetPayroll} onChange={(e) => setCrwNetPayroll(e.target.value)} placeholder="Rp" />
                                            </div>
                                        </div>
                                    )}

                                    {crwActiveTab === "crew_allocation" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">4. Crew Allocation / Alokasi Tim ({crwAllocations.length})</span></div>
                                            <div className="space-y-3">
                                                {crwAllocations.map((alloc, idx) => (
                                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Allocation #{idx + 1}</span>
                                                            {crwAllocations.length > 1 && (<button type="button" onClick={() => setCrwAllocations(crwAllocations.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            <Input label="Area Kerja / Work Area" value={alloc.area} onChange={(e) => setCrwAllocations(prev => prev.map((it, i) => i === idx ? { ...it, area: e.target.value } : it))} placeholder="Zona A" />
                                                            <Input label="WBS" value={alloc.wbs} onChange={(e) => setCrwAllocations(prev => prev.map((it, i) => i === idx ? { ...it, wbs: e.target.value } : it))} placeholder="2.1" />
                                                            <Input label="Supervisor" value={alloc.supervisor} onChange={(e) => setCrwAllocations(prev => prev.map((it, i) => i === idx ? { ...it, supervisor: e.target.value } : it))} placeholder="Nama" />
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            <Input label="Jumlah / Headcount" value={alloc.jumlah} onChange={(e) => setCrwAllocations(prev => prev.map((it, i) => i === idx ? { ...it, jumlah: e.target.value } : it))} placeholder="45 Orang" />
                                                            <Input label="Produktivitas / Productivity" value={alloc.produktivitas} onChange={(e) => setCrwAllocations(prev => prev.map((it, i) => i === idx ? { ...it, produktivitas: e.target.value } : it))} placeholder="92%" />
                                                            <Input label="Utilisation" value={alloc.utilisation} onChange={(e) => setCrwAllocations(prev => prev.map((it, i) => i === idx ? { ...it, utilisation: e.target.value } : it))} placeholder="88%" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => setCrwAllocations([...crwAllocations, { area: "", wbs: "", supervisor: "", jumlah: "", produktivitas: "", utilisation: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Alokasi / Add Allocation</button>
                                        </div>
                                    )}

                                    {crwActiveTab === "payroll_verify" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">5. Payroll Verification / Verifikasi Gaji</span></div>
                                            <Input label="Dispute / Sengketa" value={crwDispute} onChange={(e) => setCrwDispute(e.target.value)} placeholder="Tidak ada / None" />
                                            <Input label="Approval Status / Status Persetujuan" value={crwPayrollApproval} onChange={(e) => setCrwPayrollApproval(e.target.value)} placeholder="Approved / Disetujui" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Payment Status / Status Pembayaran" value={crwPaymentStatus} onChange={(e) => setCrwPaymentStatus(e.target.value)} placeholder="Lunas / Paid" />
                                                <Input label="Payment Date / Tanggal Bayar" type="date" value={crwPaymentDate} onChange={(e) => setCrwPaymentDate(e.target.value)} />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ====================== PRC (PROCUREMENT & STOCK) FORMS ====================== */}
                            {reportType === "procurement" && (
                                <>
                                    {prcActiveTab === "setup" && (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Procurement Plan / Rencana Pengadaan</span>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">PRC-SETUP</span>
                                            </div>
                                            <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="PRC-01-01" />
                                                <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                            </div>

                                            <div className="space-y-3">
                                                {prcPlanItems.map((item, idx) => (
                                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Item #{idx + 1}</span>
                                                            {prcPlanItems.length > 1 && (<button type="button" onClick={() => setPrcPlanItems(prcPlanItems.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            <Input label="Material / Service" value={item.material} onChange={(e) => setPrcPlanItems(prev => prev.map((it, i) => i === idx ? { ...it, material: e.target.value } : it))} placeholder="Besi Beton D16" />
                                                            <Input label="WBS" value={item.wbs} onChange={(e) => setPrcPlanItems(prev => prev.map((it, i) => i === idx ? { ...it, wbs: e.target.value } : it))} placeholder="2.1" />
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <Input label="Required-on-Site Date" type="date" value={item.requiredDate} onChange={(e) => setPrcPlanItems(prev => prev.map((it, i) => i === idx ? { ...it, requiredDate: e.target.value } : it))} />
                                                            <Input label="Lead Time" value={item.leadTime} onChange={(e) => setPrcPlanItems(prev => prev.map((it, i) => i === idx ? { ...it, leadTime: e.target.value } : it))} placeholder="14 Hari" />
                                                            <Input label="Procurement Method / Metode" value={item.method} onChange={(e) => setPrcPlanItems(prev => prev.map((it, i) => i === idx ? { ...it, method: e.target.value } : it))} placeholder="Direct Purchase" />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setPrcPlanItems([...prcPlanItems, { material: "", wbs: "", requiredDate: "", leadTime: "", method: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Item / Add Item</button>
                                            </div>

                                            {/* PRC Approvals */}
                                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({prcApprovals.length}/4)</span>
                                                    {prcApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = prcApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...prcApprovals, { type: nextType as any, name: "", role: "" }]; const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setPrcApprovals(sorted); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                </div>
                                                <div className="space-y-3">
                                                    {prcApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">TTD #{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" disabled={idx === 0} onClick={() => { const arr = [...prcApprovals]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setPrcApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === 0 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronUp className="w-4 h-4" /></button>
                                                                    <button type="button" disabled={idx === prcApprovals.length - 1} onClick={() => { const arr = [...prcApprovals]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setPrcApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === prcApprovals.length - 1 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronDown className="w-4 h-4" /></button>
                                                                    {prcApprovals.length > 1 && (<button type="button" onClick={() => setPrcApprovals(prcApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select label="Peran" value={app.type} onChange={(val) => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const updated = prcApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item); setPrcApprovals([...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))); }} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                <Input label="Nama" value={app.name} onChange={(e) => setPrcApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                <Input label="Jabatan" value={app.role} onChange={(e) => setPrcApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {prcActiveTab === "rfq_po" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. RFQ, Selection & PO ({prcOrders.length})</span></div>
                                            {prcOrders.map((order, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Order #{idx + 1}</span>{prcOrders.length > 1 && (<button type="button" onClick={() => setPrcOrders(prcOrders.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Vendor" value={order.vendor} onChange={(e) => setPrcOrders(prev => prev.map((it, i) => i === idx ? { ...it, vendor: e.target.value } : it))} placeholder="PT Vendor" />
                                                        <Input label="Quotation / Penawaran" value={order.quotation} onChange={(e) => setPrcOrders(prev => prev.map((it, i) => i === idx ? { ...it, quotation: e.target.value } : it))} placeholder="Rp" />
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <Input label="Comparison" value={order.comparison} onChange={(e) => setPrcOrders(prev => prev.map((it, i) => i === idx ? { ...it, comparison: e.target.value } : it))} placeholder="3 Vendors" />
                                                        <Input label="Selected Vendor" value={order.selectedVendor} onChange={(e) => setPrcOrders(prev => prev.map((it, i) => i === idx ? { ...it, selectedVendor: e.target.value } : it))} placeholder="Vendor" />
                                                        <Input label="No. PO/SPK" value={order.poSpk} onChange={(e) => setPrcOrders(prev => prev.map((it, i) => i === idx ? { ...it, poSpk: e.target.value } : it))} placeholder="PO-001" />
                                                        <Input label="Contract Value" value={order.contractValue} onChange={(e) => setPrcOrders(prev => prev.map((it, i) => i === idx ? { ...it, contractValue: e.target.value } : it))} placeholder="Rp" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setPrcOrders([...prcOrders, { vendor: "", quotation: "", comparison: "", selectedVendor: "", poSpk: "", contractValue: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Order / Add PO</button>
                                        </div>
                                    )}

                                    {prcActiveTab === "delivery_inspection" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Delivery & Inspection / Pengiriman & Inspeksi ({prcDeliveries.length})</span></div>
                                            {prcDeliveries.map((del, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Delivery #{idx + 1}</span>{prcDeliveries.length > 1 && (<button type="button" onClick={() => setPrcDeliveries(prcDeliveries.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Item / Material" value={del.item} onChange={(e) => setPrcDeliveries(prev => prev.map((it, i) => i === idx ? { ...it, item: e.target.value } : it))} placeholder="Material" />
                                                        <Input label="Delivery Schedule" type="date" value={del.schedule} onChange={(e) => setPrcDeliveries(prev => prev.map((it, i) => i === idx ? { ...it, schedule: e.target.value } : it))} />
                                                        <Input label="Received Qty / Qty Diterima" value={del.receivedQty} onChange={(e) => setPrcDeliveries(prev => prev.map((it, i) => i === idx ? { ...it, receivedQty: e.target.value } : it))} placeholder="25 Ton" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Inspection Result / Hasil Inspeksi" value={del.inspectionResult} onChange={(e) => setPrcDeliveries(prev => prev.map((it, i) => i === idx ? { ...it, inspectionResult: e.target.value } : it))} placeholder="Pass / Lolos" />
                                                        <Input label="Rejected Qty / Qty Ditolak" value={del.rejectedQty} onChange={(e) => setPrcDeliveries(prev => prev.map((it, i) => i === idx ? { ...it, rejectedQty: e.target.value } : it))} placeholder="0" />
                                                        <Input label="Delivery Status / Status" value={del.status} onChange={(e) => setPrcDeliveries(prev => prev.map((it, i) => i === idx ? { ...it, status: e.target.value } : it))} placeholder="Delivered" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setPrcDeliveries([...prcDeliveries, { item: "", schedule: "", receivedQty: "", inspectionResult: "", rejectedQty: "", status: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Delivery / Add Delivery</button>
                                        </div>
                                    )}

                                    {prcActiveTab === "stock_consumption" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. Stock & Consumption / Stok & Konsumsi</span></div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="Opening Stock / Stok Awal" value={prcOpeningStock} onChange={(e) => setPrcOpeningStock(e.target.value)} placeholder="45 Ton" />
                                                <Input label="Received / Diterima" value={prcReceived} onChange={(e) => setPrcReceived(e.target.value)} placeholder="25 Ton" />
                                                <Input label="Issued / Dikeluarkan" value={prcIssued} onChange={(e) => setPrcIssued(e.target.value)} placeholder="32 Ton" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="Returned / Dikembalikan" value={prcReturned} onChange={(e) => setPrcReturned(e.target.value)} placeholder="2 Ton" />
                                                <Input label="Closing Stock / Stok Akhir" value={prcClosingStock} onChange={(e) => setPrcClosingStock(e.target.value)} placeholder="40 Ton" />
                                                <Input label="Storage Location / Lokasi Gudang" value={prcStorageLocation} onChange={(e) => setPrcStorageLocation(e.target.value)} placeholder="Gudang Utama" />
                                            </div>
                                        </div>
                                    )}

                                    {prcActiveTab === "shortage_expediting" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Shortage & Expediting / Kekurangan & Percepatan</span></div>
                                            <Input label="Late Delivery / Keterlambatan Pengiriman" value={prcLateDelivery} onChange={(e) => setPrcLateDelivery(e.target.value)} placeholder="Item yang terlambat" />
                                            <Input label="Shortage / Kekurangan Stok" value={prcShortage} onChange={(e) => setPrcShortage(e.target.value)} placeholder="Material yang kurang" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Lead-time Variance / Variansi Lead-time" value={prcLeadTimeVariance} onChange={(e) => setPrcLeadTimeVariance(e.target.value)} placeholder="+3 Hari" />
                                                <Input label="PIC / Penanggung Jawab" value={prcPIC} onChange={(e) => setPrcPIC(e.target.value)} placeholder="Logistic Manager" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Expediting Action / Tindakan Percepatan</label>
                                                <textarea className="w-full min-h-[80px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" value={prcExpeditingAction} onChange={(e) => setPrcExpeditingAction(e.target.value)} placeholder="Langkah percepatan pengiriman..." />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ====================== FIN (FINANCE REGISTER) FORMS ====================== */}
                            {reportType === "finance" && (
                                <>
                                    {finActiveTab === "setup" && (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Account & Opening Balance / Rekening & Saldo Awal</span>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">FIN-SETUP</span>
                                            </div>
                                            <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="FIN-01-01" />
                                                <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                            </div>
                                            <Input label="Bank / Cash Account / Rekening" value={finBankAccount} onChange={(e) => setFinBankAccount(e.target.value)} placeholder="BCA 123-456-7890" />
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="Opening Balance / Saldo Awal" value={finOpeningBalance} onChange={(e) => setFinOpeningBalance(e.target.value)} placeholder="Rp" />
                                                <Input label="Currency / Mata Uang" value={finCurrency} onChange={(e) => setFinCurrency(e.target.value)} placeholder="IDR" />
                                                <Input label="Responsible Custodian / Pemegang Kas" value={finCustodian} onChange={(e) => setFinCustodian(e.target.value)} placeholder="Finance Manager" />
                                            </div>

                                            {/* FIN Approvals */}
                                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({finApprovals.length}/4)</span>
                                                    {finApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = finApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...finApprovals, { type: nextType as any, name: "", role: "" }]; const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setFinApprovals(sorted); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                </div>
                                                <div className="space-y-3">
                                                    {finApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">TTD #{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" disabled={idx === 0} onClick={() => { const arr = [...finApprovals]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setFinApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === 0 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronUp className="w-4 h-4" /></button>
                                                                    <button type="button" disabled={idx === finApprovals.length - 1} onClick={() => { const arr = [...finApprovals]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setFinApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === finApprovals.length - 1 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronDown className="w-4 h-4" /></button>
                                                                    {finApprovals.length > 1 && (<button type="button" onClick={() => setFinApprovals(finApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select label="Peran" value={app.type} onChange={(val) => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const updated = finApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item); setFinApprovals([...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))); }} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                <Input label="Nama" value={app.name} onChange={(e) => setFinApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                <Input label="Jabatan" value={app.role} onChange={(e) => setFinApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {finActiveTab === "transactions" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Cash & Bank Transactions / Transaksi Kas & Bank ({finTransactions.length})</span></div>
                                            {finTransactions.map((tx, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Transaction #{idx + 1}</span>{finTransactions.length > 1 && (<button type="button" onClick={() => setFinTransactions(finTransactions.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Voucher No." value={tx.voucher} onChange={(e) => setFinTransactions(prev => prev.map((it, i) => i === idx ? { ...it, voucher: e.target.value } : it))} placeholder="BKK-001" />
                                                        <Input label="Date / Tanggal" type="date" value={tx.date} onChange={(e) => setFinTransactions(prev => prev.map((it, i) => i === idx ? { ...it, date: e.target.value } : it))} />
                                                        <Input label="Description / Keterangan" value={tx.description} onChange={(e) => setFinTransactions(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} placeholder="Pembayaran Material" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Debit (Masuk)" value={tx.debit} onChange={(e) => setFinTransactions(prev => prev.map((it, i) => i === idx ? { ...it, debit: e.target.value } : it))} placeholder="Rp" />
                                                        <Input label="Credit (Keluar)" value={tx.credit} onChange={(e) => setFinTransactions(prev => prev.map((it, i) => i === idx ? { ...it, credit: e.target.value } : it))} placeholder="Rp" />
                                                        <Input label="Balance / Saldo" value={tx.balance} onChange={(e) => setFinTransactions(prev => prev.map((it, i) => i === idx ? { ...it, balance: e.target.value } : it))} placeholder="Rp" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setFinTransactions([...finTransactions, { voucher: "", date: "", description: "", debit: "", credit: "", balance: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Transaksi / Add Transaction</button>
                                        </div>
                                    )}

                                    {finActiveTab === "receivable_payable" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Receivable & Payable / Piutang & Hutang ({finReceivables.length})</span></div>
                                            {finReceivables.map((rec, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Entry #{idx + 1}</span>{finReceivables.length > 1 && (<button type="button" onClick={() => setFinReceivables(finReceivables.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Vendor / Client" value={rec.party} onChange={(e) => setFinReceivables(prev => prev.map((it, i) => i === idx ? { ...it, party: e.target.value } : it))} placeholder="PT ABC" />
                                                        <Input label="Invoice No." value={rec.invoice} onChange={(e) => setFinReceivables(prev => prev.map((it, i) => i === idx ? { ...it, invoice: e.target.value } : it))} placeholder="INV-001" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Due Date / Jatuh Tempo" type="date" value={rec.dueDate} onChange={(e) => setFinReceivables(prev => prev.map((it, i) => i === idx ? { ...it, dueDate: e.target.value } : it))} />
                                                        <Input label="Outstanding / Sisa Tagihan" value={rec.outstanding} onChange={(e) => setFinReceivables(prev => prev.map((it, i) => i === idx ? { ...it, outstanding: e.target.value } : it))} placeholder="Rp" />
                                                        <Input label="Payment Status / Status" value={rec.status} onChange={(e) => setFinReceivables(prev => prev.map((it, i) => i === idx ? { ...it, status: e.target.value } : it))} placeholder="Pending" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setFinReceivables([...finReceivables, { party: "", invoice: "", dueDate: "", outstanding: "", status: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Entry / Add Entry</button>
                                        </div>
                                    )}

                                    {finActiveTab === "reconciliation" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. Reconciliation / Rekonsiliasi</span></div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input label="Book Balance / Saldo Buku" value={finBookBalance} onChange={(e) => setFinBookBalance(e.target.value)} placeholder="Rp" />
                                                <Input label="Bank Balance / Saldo Bank" value={finBankBalance} onChange={(e) => setFinBankBalance(e.target.value)} placeholder="Rp" />
                                                <Input label="Difference / Selisih" value={finDifference} onChange={(e) => setFinDifference(e.target.value)} placeholder="Rp" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Supporting Evidence / Bukti Pendukung</label>
                                                <textarea className="w-full min-h-[80px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" value={finSupportingEvidence} onChange={(e) => setFinSupportingEvidence(e.target.value)} placeholder="Penjelasan selisih saldo..." />
                                            </div>
                                        </div>
                                    )}

                                    {finActiveTab === "closing_audit" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Closing & Audit Review / Penutupan & Review Audit</span></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Cut-off Date / Tanggal Cut-off" type="date" value={finCutOff} onChange={(e) => setFinCutOff(e.target.value)} />
                                                <Input label="Closing Approval / Status Penutupan" value={finClosingApproval} onChange={(e) => setFinClosingApproval(e.target.value)} placeholder="Pending Review" />
                                            </div>
                                            <Input label="Exceptions / Pengecualian" value={finExceptions} onChange={(e) => setFinExceptions(e.target.value)} placeholder="Tidak ada / None" />
                                            <Input label="Missing Evidence / Bukti Hilang" value={finMissingEvidence} onChange={(e) => setFinMissingEvidence(e.target.value)} placeholder="Tidak ada / None" />
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Reviewer Comments / Komentar Reviewer</label>
                                                <textarea className="w-full min-h-[80px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" value={finReviewerComments} onChange={(e) => setFinReviewerComments(e.target.value)} placeholder="Catatan dari reviewer / auditor..." />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ====================== RSC (EQUIPMENT & ASSET) FORMS ====================== */}
                            {reportType === "resources" && (
                                <>
                                    {rscActiveTab === "setup" && (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Asset Master / Data Induk Aset</span>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">RSC-SETUP</span>
                                            </div>
                                            <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="RSC-01-01" />
                                                <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                            </div>

                                            <div className="space-y-3">
                                                <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Daftar Aset / Asset List ({rscAssets.length})</span>
                                                {rscAssets.map((asset, idx) => (
                                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                        <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Asset #{idx + 1}</span>{rscAssets.length > 1 && (<button type="button" onClick={() => setRscAssets(rscAssets.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            <Input label="Asset Code / Kode Aset" value={asset.assetCode} onChange={(e) => setRscAssets(prev => prev.map((it, i) => i === idx ? { ...it, assetCode: e.target.value } : it))} placeholder="EXC-001" />
                                                            <Input label="Ownership / Kepemilikan" value={asset.ownership} onChange={(e) => setRscAssets(prev => prev.map((it, i) => i === idx ? { ...it, ownership: e.target.value } : it))} placeholder="Sewa / Rental" />
                                                            <Input label="Type / Jenis" value={asset.type} onChange={(e) => setRscAssets(prev => prev.map((it, i) => i === idx ? { ...it, type: e.target.value } : it))} placeholder="Excavator" />
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            <Input label="Brand / Model / Merek" value={asset.brandModel} onChange={(e) => setRscAssets(prev => prev.map((it, i) => i === idx ? { ...it, brandModel: e.target.value } : it))} placeholder="Komatsu PC200-8" />
                                                            <Input label="Capacity / Kapasitas" value={asset.capacity} onChange={(e) => setRscAssets(prev => prev.map((it, i) => i === idx ? { ...it, capacity: e.target.value } : it))} placeholder="20 Ton" />
                                                            <Input label="Location / Lokasi" value={asset.location} onChange={(e) => setRscAssets(prev => prev.map((it, i) => i === idx ? { ...it, location: e.target.value } : it))} placeholder="Zona A" />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setRscAssets([...rscAssets, { assetCode: "", ownership: "", type: "", brandModel: "", capacity: "", location: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Aset / Add Asset</button>
                                            </div>

                                            {/* RSC Approvals */}
                                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({rscApprovals.length}/4)</span>
                                                    {rscApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = rscApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...rscApprovals, { type: nextType as any, name: "", role: "" }]; const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setRscApprovals(sorted); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                </div>
                                                <div className="space-y-3">
                                                    {rscApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">TTD #{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" disabled={idx === 0} onClick={() => { const arr = [...rscApprovals]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setRscApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === 0 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronUp className="w-4 h-4" /></button>
                                                                    <button type="button" disabled={idx === rscApprovals.length - 1} onClick={() => { const arr = [...rscApprovals]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setRscApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === rscApprovals.length - 1 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronDown className="w-4 h-4" /></button>
                                                                    {rscApprovals.length > 1 && (<button type="button" onClick={() => setRscApprovals(rscApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select label="Peran" value={app.type} onChange={(val) => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const updated = rscApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item); setRscApprovals([...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))); }} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                <Input label="Nama" value={app.name} onChange={(e) => setRscApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                <Input label="Jabatan" value={app.role} onChange={(e) => setRscApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {rscActiveTab === "mobilisation" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Mobilisation & Assignment / Mobilisasi & Penugasan ({rscMobilisations.length})</span></div>
                                            {rscMobilisations.map((mob, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Mobil. #{idx + 1}</span>{rscMobilisations.length > 1 && (<button type="button" onClick={() => setRscMobilisations(rscMobilisations.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Asset Code / Kode Aset" value={mob.assetCode} onChange={(e) => setRscMobilisations(prev => prev.map((it, i) => i === idx ? { ...it, assetCode: e.target.value } : it))} placeholder="EXC-001" />
                                                        <Input label="Mobilisation Date / Tgl Mobilisasi" type="date" value={mob.mobilDate} onChange={(e) => setRscMobilisations(prev => prev.map((it, i) => i === idx ? { ...it, mobilDate: e.target.value } : it))} />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Assigned Area / Area Penugasan" value={mob.assignedArea} onChange={(e) => setRscMobilisations(prev => prev.map((it, i) => i === idx ? { ...it, assignedArea: e.target.value } : it))} placeholder="Zona A" />
                                                        <Input label="Operator" value={mob.operator} onChange={(e) => setRscMobilisations(prev => prev.map((it, i) => i === idx ? { ...it, operator: e.target.value } : it))} placeholder="Nama Operator" />
                                                        <Input label="Planned Duration / Durasi Rencana" value={mob.plannedDuration} onChange={(e) => setRscMobilisations(prev => prev.map((it, i) => i === idx ? { ...it, plannedDuration: e.target.value } : it))} placeholder="90 Hari" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setRscMobilisations([...rscMobilisations, { assetCode: "", mobilDate: "", assignedArea: "", operator: "", plannedDuration: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Mobilisasi / Add Mobilisation</button>
                                        </div>
                                    )}

                                    {rscActiveTab === "operation_log" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Operation Log / Log Operasi ({rscOperations.length})</span></div>
                                            {rscOperations.map((op, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Log #{idx + 1}</span>{rscOperations.length > 1 && (<button type="button" onClick={() => setRscOperations(rscOperations.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Asset Code" value={op.assetCode} onChange={(e) => setRscOperations(prev => prev.map((it, i) => i === idx ? { ...it, assetCode: e.target.value } : it))} placeholder="EXC-001" />
                                                        <Input label="Working Hours / Jam Kerja" value={op.workingHours} onChange={(e) => setRscOperations(prev => prev.map((it, i) => i === idx ? { ...it, workingHours: e.target.value } : it))} placeholder="8 Jam" />
                                                        <Input label="Idle Hours / Jam Idle" value={op.idleHours} onChange={(e) => setRscOperations(prev => prev.map((it, i) => i === idx ? { ...it, idleHours: e.target.value } : it))} placeholder="2 Jam" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Hour Meter (HM)" value={op.hourMeter} onChange={(e) => setRscOperations(prev => prev.map((it, i) => i === idx ? { ...it, hourMeter: e.target.value } : it))} placeholder="3.450 HM" />
                                                        <Input label="Output / Hasil" value={op.output} onChange={(e) => setRscOperations(prev => prev.map((it, i) => i === idx ? { ...it, output: e.target.value } : it))} placeholder="120 m3/hari" />
                                                        <Input label="Fuel Use / BBM" value={op.fuelUse} onChange={(e) => setRscOperations(prev => prev.map((it, i) => i === idx ? { ...it, fuelUse: e.target.value } : it))} placeholder="45 Liter" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setRscOperations([...rscOperations, { assetCode: "", workingHours: "", idleHours: "", hourMeter: "", output: "", fuelUse: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Log / Add Log</button>
                                        </div>
                                    )}

                                    {rscActiveTab === "inspection_maintenance" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. Inspection & Maintenance / Inspeksi & Perawatan ({rscInspections.length})</span></div>
                                            {rscInspections.map((insp, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Inspection #{idx + 1}</span>{rscInspections.length > 1 && (<button type="button" onClick={() => setRscInspections(rscInspections.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Asset Code" value={insp.assetCode} onChange={(e) => setRscInspections(prev => prev.map((it, i) => i === idx ? { ...it, assetCode: e.target.value } : it))} placeholder="EXC-001" />
                                                        <Input label="Readiness Checklist / Kelayakan" value={insp.checklist} onChange={(e) => setRscInspections(prev => prev.map((it, i) => i === idx ? { ...it, checklist: e.target.value } : it))} placeholder="Lolos / Pass" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Service Schedule / Jadwal Servis" value={insp.serviceSchedule} onChange={(e) => setRscInspections(prev => prev.map((it, i) => i === idx ? { ...it, serviceSchedule: e.target.value } : it))} placeholder="Service 500 HM" />
                                                        <Input label="Breakdown / Kerusakan" value={insp.breakdown} onChange={(e) => setRscInspections(prev => prev.map((it, i) => i === idx ? { ...it, breakdown: e.target.value } : it))} placeholder="Tidak ada / None" />
                                                        <Input label="Repair Action / Tindakan Perbaikan" value={insp.repairAction} onChange={(e) => setRscInspections(prev => prev.map((it, i) => i === idx ? { ...it, repairAction: e.target.value } : it))} placeholder="Ganti filter" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setRscInspections([...rscInspections, { assetCode: "", checklist: "", serviceSchedule: "", breakdown: "", repairAction: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Inspeksi / Add Inspection</button>
                                        </div>
                                    )}

                                    {rscActiveTab === "demobilisation_cost" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Demobilisation & Cost / Demobilisasi & Biaya ({rscDemobilisations.length})</span></div>
                                            {rscDemobilisations.map((dem, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Demob #{idx + 1}</span>{rscDemobilisations.length > 1 && (<button type="button" onClick={() => setRscDemobilisations(rscDemobilisations.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Asset Code" value={dem.assetCode} onChange={(e) => setRscDemobilisations(prev => prev.map((it, i) => i === idx ? { ...it, assetCode: e.target.value } : it))} placeholder="EXC-001" />
                                                        <Input label="Off-hire Date / Tgl Selesai Sewa" value={dem.offHireDate} onChange={(e) => setRscDemobilisations(prev => prev.map((it, i) => i === idx ? { ...it, offHireDate: e.target.value } : it))} placeholder="—" />
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <Input label="Rental Cost / Biaya Sewa" value={dem.rentalCost} onChange={(e) => setRscDemobilisations(prev => prev.map((it, i) => i === idx ? { ...it, rentalCost: e.target.value } : it))} placeholder="Rp/bln" />
                                                        <Input label="Fuel Cost / Biaya BBM" value={dem.fuelCost} onChange={(e) => setRscDemobilisations(prev => prev.map((it, i) => i === idx ? { ...it, fuelCost: e.target.value } : it))} placeholder="Rp" />
                                                        <Input label="Repair Cost / Biaya Perbaikan" value={dem.repairCost} onChange={(e) => setRscDemobilisations(prev => prev.map((it, i) => i === idx ? { ...it, repairCost: e.target.value } : it))} placeholder="Rp" />
                                                        <Input label="Final Condition / Kondisi Akhir" value={dem.finalCondition} onChange={(e) => setRscDemobilisations(prev => prev.map((it, i) => i === idx ? { ...it, finalCondition: e.target.value } : it))} placeholder="Baik / Good" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setRscDemobilisations([...rscDemobilisations, { assetCode: "", offHireDate: "", rentalCost: "", fuelCost: "", repairCost: "", finalCondition: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Demobilisasi / Add Demob</button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ====================== QAC (QUALITY CONTROL) FORMS ====================== */}
                            {reportType === "quality" && (
                                <>
                                    {qacActiveTab === "setup" && (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Inspection Plan / Rencana Inspeksi & ITP</span>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">QAC-SETUP</span>
                                            </div>
                                            <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="QAC-01-01" />
                                                <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                            </div>

                                            <div className="space-y-3">
                                                <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Plan Rencana Inspeksi ({qacPlans.length})</span>
                                                {qacPlans.map((plan, idx) => (
                                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                        <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">ITP Item #{idx + 1}</span>{qacPlans.length > 1 && (<button type="button" onClick={() => setQacPlans(qacPlans.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            <Input label="ITP Reference / Acuan ITP" value={plan.itpRef} onChange={(e) => setQacPlans(prev => prev.map((it, i) => i === idx ? { ...it, itpRef: e.target.value } : it))} placeholder="ITP-STR-001" />
                                                            <Input label="Work Item / Pekerjaan" value={plan.workItem} onChange={(e) => setQacPlans(prev => prev.map((it, i) => i === idx ? { ...it, workItem: e.target.value } : it))} placeholder="Pengecoran Beton Slab" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            <Input label="Inspection Stage / Tahapan" value={plan.stage} onChange={(e) => setQacPlans(prev => prev.map((it, i) => i === idx ? { ...it, stage: e.target.value } : it))} placeholder="Pre-pour" />
                                                            <Input label="Hold/Witness Point" value={plan.holdPoint} onChange={(e) => setQacPlans(prev => prev.map((it, i) => i === idx ? { ...it, holdPoint: e.target.value } : it))} placeholder="Hold Point" />
                                                        </div>
                                                        <Input label="Acceptance Criteria / Kriteria Penerimaan" value={plan.criteria} onChange={(e) => setQacPlans(prev => prev.map((it, i) => i === idx ? { ...it, criteria: e.target.value } : it))} placeholder="Slump test 12±2 cm" />
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setQacPlans([...qacPlans, { itpRef: "", workItem: "", stage: "", holdPoint: "", criteria: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Item ITP / Add Plan Item</button>
                                            </div>

                                            {/* QAC Approvals */}
                                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({qacApprovals.length}/4)</span>
                                                    {qacApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = qacApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...qacApprovals, { type: nextType as any, name: "", role: "" }]; const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setQacApprovals(sorted); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                </div>
                                                <div className="space-y-3">
                                                    {qacApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">TTD #{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" disabled={idx === 0} onClick={() => { const arr = [...qacApprovals]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setQacApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === 0 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronUp className="w-4 h-4" /></button>
                                                                    <button type="button" disabled={idx === qacApprovals.length - 1} onClick={() => { const arr = [...qacApprovals]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setQacApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === qacApprovals.length - 1 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronDown className="w-4 h-4" /></button>
                                                                    {qacApprovals.length > 1 && (<button type="button" onClick={() => setQacApprovals(qacApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select label="Peran" value={app.type} onChange={(val) => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const updated = qacApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item); setQacApprovals([...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))); }} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                <Input label="Nama" value={app.name} onChange={(e) => setQacApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                <Input label="Jabatan" value={app.role} onChange={(e) => setQacApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {qacActiveTab === "inspection_req" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Inspection Request / Pengajuan Inspeksi ({qacRequests.length})</span></div>
                                            {qacRequests.map((req, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Request #{idx + 1}</span>{qacRequests.length > 1 && (<button type="button" onClick={() => setQacRequests(qacRequests.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Area Inspeksi" value={req.area} onChange={(e) => setQacRequests(prev => prev.map((it, i) => i === idx ? { ...it, area: e.target.value } : it))} placeholder="Zona A" />
                                                        <Input label="Grid Line" value={req.grid} onChange={(e) => setQacRequests(prev => prev.map((it, i) => i === idx ? { ...it, grid: e.target.value } : it))} placeholder="Grid A1-C5" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Drawing/Spec Ref" value={req.drawingSpec} onChange={(e) => setQacRequests(prev => prev.map((it, i) => i === idx ? { ...it, drawingSpec: e.target.value } : it))} placeholder="DWG-STR-201" />
                                                        <Input label="Inspection Date" type="date" value={req.inspectionDate} onChange={(e) => setQacRequests(prev => prev.map((it, i) => i === idx ? { ...it, inspectionDate: e.target.value } : it))} />
                                                        <Input label="Inspector Name" value={req.inspector} onChange={(e) => setQacRequests(prev => prev.map((it, i) => i === idx ? { ...it, inspector: e.target.value } : it))} placeholder="Pak Andi" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setQacRequests([...qacRequests, { area: "", grid: "", drawingSpec: "", inspectionDate: "", inspector: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Request / Add Request</button>
                                        </div>
                                    )}

                                    {qacActiveTab === "inspection_res" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Inspection Result / Hasil Inspeksi & Tes ({qacResults.length})</span></div>
                                            {qacResults.map((res, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Result #{idx + 1}</span>{qacResults.length > 1 && (<button type="button" onClick={() => setQacResults(qacResults.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Checklist Item" value={res.checklist} onChange={(e) => setQacResults(prev => prev.map((it, i) => i === idx ? { ...it, checklist: e.target.value } : it))} placeholder="Pembesian" />
                                                        <Input label="Measurement / Pengukuran" value={res.measurement} onChange={(e) => setQacResults(prev => prev.map((it, i) => i === idx ? { ...it, measurement: e.target.value } : it))} placeholder="Cover 30mm" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Test Result" value={res.testResult} onChange={(e) => setQacResults(prev => prev.map((it, i) => i === idx ? { ...it, testResult: e.target.value } : it))} placeholder="K-350 PASS" />
                                                        <Input label="Pass / Fail Status" value={res.status} onChange={(e) => setQacResults(prev => prev.map((it, i) => i === idx ? { ...it, status: e.target.value } : it))} placeholder="Pass / Lolos" />
                                                        <Input label="Evidence Photo File" value={res.evidence} onChange={(e) => setQacResults(prev => prev.map((it, i) => i === idx ? { ...it, evidence: e.target.value } : it))} placeholder="IMG_001.jpg" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setQacResults([...qacResults, { checklist: "", measurement: "", testResult: "", status: "", evidence: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Hasil / Add Result</button>
                                        </div>
                                    )}

                                    {qacActiveTab === "ncr_defect" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. NCR & Defect Management ({qacNcrs.length})</span></div>
                                            {qacNcrs.map((ncr, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">NCR #{idx + 1}</span>{qacNcrs.length > 1 && (<button type="button" onClick={() => setQacNcrs(qacNcrs.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="NCR Number" value={ncr.ncrNumber} onChange={(e) => setQacNcrs(prev => prev.map((it, i) => i === idx ? { ...it, ncrNumber: e.target.value } : it))} placeholder="NCR-001" />
                                                        <Input label="Target Date / Batas Waktu" type="date" value={ncr.targetDate} onChange={(e) => setQacNcrs(prev => prev.map((it, i) => i === idx ? { ...it, targetDate: e.target.value } : it))} />
                                                    </div>
                                                    <Input label="Nonconformity / Ketidaksesuaian" value={ncr.nonconformity} onChange={(e) => setQacNcrs(prev => prev.map((it, i) => i === idx ? { ...it, nonconformity: e.target.value } : it))} placeholder="Sarang lebah pada kolom K-04" />
                                                    <Input label="Root Cause / Penyebab" value={ncr.rootCause} onChange={(e) => setQacNcrs(prev => prev.map((it, i) => i === idx ? { ...it, rootCause: e.target.value } : it))} placeholder="Vibrator tidak merata" />
                                                    <Input label="Corrective Action / Perbaikan" value={ncr.correctiveAction} onChange={(e) => setQacNcrs(prev => prev.map((it, i) => i === idx ? { ...it, correctiveAction: e.target.value } : it))} placeholder="Grouting dengan SikaGrout 215" />
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setQacNcrs([...qacNcrs, { ncrNumber: "", nonconformity: "", rootCause: "", correctiveAction: "", targetDate: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah NCR / Add NCR</button>
                                        </div>
                                    )}

                                    {qacActiveTab === "reinspection_closure" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Reinspection & Closure / Re-inspeksi & Penutupan</span></div>
                                            <Input label="Repair Evidence / Bukti Perbaikan" value={qacClosure.repairEvidence} onChange={(e) => setQacClosure({ ...qacClosure, repairEvidence: e.target.value })} placeholder="Foto hasil perbaikan & hammer test" />
                                            <Input label="Retest Result / Hasil Tes Ulang" value={qacClosure.retestResult} onChange={(e) => setQacClosure({ ...qacClosure, retestResult: e.target.value })} placeholder="Pass 35 MPa" />
                                            <Input label="Verification Status / Verifikasi" value={qacClosure.verification} onChange={(e) => setQacClosure({ ...qacClosure, verification: e.target.value })} placeholder="Verified by QA/QC Manager" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Closed By / Ditutup Oleh" value={qacClosure.closedBy} onChange={(e) => setQacClosure({ ...qacClosure, closedBy: e.target.value })} placeholder="Nama QA/QC Lead" />
                                                <Input label="Closure Date / Tgl Penutupan" type="date" value={qacClosure.closureDate} onChange={(e) => setQacClosure({ ...qacClosure, closureDate: e.target.value })} />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ====================== HSE (SAFETY & K3) FORMS ====================== */}
                            {reportType === "safety" && (
                                <>
                                    {hseActiveTab === "setup" && (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Workforce & Safe Hours / Tenaga Kerja & Jam Safe</span>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">HSE-SETUP</span>
                                            </div>
                                            <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="HSE-01-01" />
                                                <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Workforce / Total Pekerja" value={hseWorkforce} onChange={(e) => setHseWorkforce(e.target.value)} placeholder="145 Orang" />
                                                <Input label="Hours Worked Periode / Jam Kerja" value={hseHoursWorked} onChange={(e) => setHseHoursWorked(e.target.value)} placeholder="1.160 Jam" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Cumulative Safe Hours / Jam Safe Kumulatif" value={hseCumulativeSafeHours} onChange={(e) => setHseCumulativeSafeHours(e.target.value)} placeholder="128.450 Jam" />
                                                <Input label="Lost-time Status (LTI)" value={hseLostTimeStatus} onChange={(e) => setHseLostTimeStatus(e.target.value)} placeholder="Zero LTI" />
                                            </div>

                                            {/* HSE Approvals */}
                                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({hseApprovals.length}/4)</span>
                                                    {hseApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = hseApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...hseApprovals, { type: nextType as any, name: "", role: "" }]; const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setHseApprovals(sorted); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                </div>
                                                <div className="space-y-3">
                                                    {hseApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">TTD #{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" disabled={idx === 0} onClick={() => { const arr = [...hseApprovals]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setHseApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === 0 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronUp className="w-4 h-4" /></button>
                                                                    <button type="button" disabled={idx === hseApprovals.length - 1} onClick={() => { const arr = [...hseApprovals]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setHseApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === hseApprovals.length - 1 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronDown className="w-4 h-4" /></button>
                                                                    {hseApprovals.length > 1 && (<button type="button" onClick={() => setHseApprovals(hseApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select label="Peran" value={app.type} onChange={(val) => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const updated = hseApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item); setHseApprovals([...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))); }} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                <Input label="Nama" value={app.name} onChange={(e) => setHseApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                <Input label="Jabatan" value={app.role} onChange={(e) => setHseApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hseActiveTab === "hazard_inspection" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Hazard & Site Inspection / Temuan Bahaya ({hseHazards.length})</span></div>
                                            {hseHazards.map((haz, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Hazard #{idx + 1}</span>{hseHazards.length > 1 && (<button type="button" onClick={() => setHseHazards(hseHazards.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Area" value={haz.area} onChange={(e) => setHseHazards(prev => prev.map((it, i) => i === idx ? { ...it, area: e.target.value } : it))} placeholder="Scaffolding Zone B" />
                                                        <Input label="Activity / Pekerjaan" value={haz.activity} onChange={(e) => setHseHazards(prev => prev.map((it, i) => i === idx ? { ...it, activity: e.target.value } : it))} placeholder="Eresi Rangka Baja" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Potensi Bahaya / Hazard" value={haz.hazard} onChange={(e) => setHseHazards(prev => prev.map((it, i) => i === idx ? { ...it, hazard: e.target.value } : it))} placeholder="Bekerja di ketinggian" />
                                                        <Input label="Tingkat Risiko / Risk Level" value={haz.riskLevel} onChange={(e) => setHseHazards(prev => prev.map((it, i) => i === idx ? { ...it, riskLevel: e.target.value } : it))} placeholder="Tinggi / High" />
                                                    </div>
                                                    <Input label="Kondisi Unsafe / Unsafe Act/Condition" value={haz.condition} onChange={(e) => setHseHazards(prev => prev.map((it, i) => i === idx ? { ...it, condition: e.target.value } : it))} placeholder="Pekerja tanpa harness" />
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setHseHazards([...hseHazards, { area: "", activity: "", hazard: "", riskLevel: "", condition: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Temuan Bahaya / Add Hazard</button>
                                        </div>
                                    )}

                                    {hseActiveTab === "incident_nearmiss" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Incident & Near Miss Log ({hseIncidents.length})</span></div>
                                            {hseIncidents.map((inc, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Incident #{idx + 1}</span>{hseIncidents.length > 1 && (<button type="button" onClick={() => setHseIncidents(hseIncidents.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Kejadian / Event" value={inc.event} onChange={(e) => setHseIncidents(prev => prev.map((it, i) => i === idx ? { ...it, event: e.target.value } : it))} placeholder="Material terjatuh" />
                                                        <Input label="Klasifikasi / Classification" value={inc.classification} onChange={(e) => setHseIncidents(prev => prev.map((it, i) => i === idx ? { ...it, classification: e.target.value } : it))} placeholder="Near Miss" />
                                                    </div>
                                                    <Input label="Injury / Damage Status" value={inc.damage} onChange={(e) => setHseIncidents(prev => prev.map((it, i) => i === idx ? { ...it, damage: e.target.value } : it))} placeholder="Minor barrier damage" />
                                                    <Input label="Immediate Action / Tindakan Langsung" value={inc.immediateAction} onChange={(e) => setHseIncidents(prev => prev.map((it, i) => i === idx ? { ...it, immediateAction: e.target.value } : it))} placeholder="Hentikan pengangkatan" />
                                                    <Input label="Investigation Result / Hasil Investigasi" value={inc.investigation} onChange={(e) => setHseIncidents(prev => prev.map((it, i) => i === idx ? { ...it, investigation: e.target.value } : it))} placeholder="Sling kawat tergelincir" />
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setHseIncidents([...hseIncidents, { event: "", classification: "", damage: "", immediateAction: "", investigation: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Insiden / Add Incident</button>
                                        </div>
                                    )}

                                    {hseActiveTab === "permit_tbm_competency" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. Permit (PTW), TBM & Competency / Izin Kerja & Kompetensi</span></div>
                                            <Input label="Permit to Work (PTW)" value={hsePermit} onChange={(e) => setHsePermit(e.target.value)} placeholder="PTW-HOT-012 Approved" />
                                            <Input label="Toolbox Meeting (TBM)" value={hseTbm} onChange={(e) => setHseTbm(e.target.value)} placeholder="TBM-082 Bahaya Ketinggian" />
                                            <Input label="Operator SIO Licence" value={hseOperatorLicence} onChange={(e) => setHseOperatorLicence(e.target.value)} placeholder="SIO Tower Crane Active" />
                                            <Input label="Safety Training" value={hseTraining} onChange={(e) => setHseTraining(e.target.value)} placeholder="Pelatihan K3 Ketinggian" />
                                            <Input label="APD Compliance Rate" value={hseApdCompliance} onChange={(e) => setHseApdCompliance(e.target.value)} placeholder="98.5%" />
                                        </div>
                                    )}

                                    {hseActiveTab === "corrective_closure" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Corrective Action & Closure / Tindakan Perbaikan K3</span></div>
                                            <Input label="Finding / Temuan Inspeksi" value={hseClosure.finding} onChange={(e) => setHseClosure({ ...hseClosure, finding: e.target.value })} placeholder="Penambahan barikade void" />
                                            <Input label="Root Cause / Penyebab" value={hseClosure.rootCause} onChange={(e) => setHseClosure({ ...hseClosure, rootCause: e.target.value })} placeholder="Pengaman sementara lepas" />
                                            <Input label="Action / Tindakan Perbaikan" value={hseClosure.action} onChange={(e) => setHseClosure({ ...hseClosure, action: e.target.value })} placeholder="Pasang safety net 100%" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="PIC / Penanggung Jawab" value={hseClosure.pic} onChange={(e) => setHseClosure({ ...hseClosure, pic: e.target.value })} placeholder="HSE Officer (Pak Deni)" />
                                                <Input label="Due Date / Batas Waktu" type="date" value={hseClosure.dueDate} onChange={(e) => setHseClosure({ ...hseClosure, dueDate: e.target.value })} />
                                            </div>
                                            <Input label="Verification Status / Verifikasi" value={hseClosure.verification} onChange={(e) => setHseClosure({ ...hseClosure, verification: e.target.value })} placeholder="Verified & Closed 100%" />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ====================== IRK (ISSUE & RISK REGISTER) FORMS ====================== */}
                            {reportType === "issue_risk" && (
                                <>
                                    {irkActiveTab === "setup" && (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Risk Identification / Identifikasi Risiko (Potensial / Belum Terjadi)</span>
                                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">RIK-SETUP</span>
                                            </div>
                                            <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="RIK-01-01" />
                                                <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                            </div>

                                            <div className="space-y-3">
                                                <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Daftar Potensi Risiko ({irkRisks.length})</span>
                                                {irkRisks.map((rsk, idx) => (
                                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                        <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Risk #{idx + 1} ({rsk.riskCode})</span>{irkRisks.length > 1 && (<button type="button" onClick={() => setIrkRisks(irkRisks.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            <Input label="Kode Risiko" value={rsk.riskCode} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, riskCode: e.target.value } : it))} placeholder="RSK-001" />
                                                            <Input label="Kategori" value={rsk.category} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, category: e.target.value } : it))} placeholder="Supply Chain" />
                                                        </div>
                                                        <Input label="Pernyataan Risiko (Risk Statement)" value={rsk.statement} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, statement: e.target.value } : it))} placeholder="Potensi keterlambatan pasokan..." />
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            <Input label="Penyebab (Cause)" value={rsk.cause} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, cause: e.target.value } : it))} placeholder="Krisis pasokan" />
                                                            <Input label="Kejadian (Event)" value={rsk.event} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, event: e.target.value } : it))} placeholder="Semen terlambat > 7 hari" />
                                                            <Input label="Dampak (Effect)" value={rsk.effect} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, effect: e.target.value } : it))} placeholder="Delay jadwal 5 hari" />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setIrkRisks([...irkRisks, { riskCode: `RSK-00${irkRisks.length + 1}`, statement: "", cause: "", event: "", effect: "", category: "", probability: "Moderat / 3", impact: "Moderat / 3", score: "9 (Medium)", priority: "Sedang", strategy: "Mitigate", contingencyPlan: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Identifikasi Risiko / Add Risk</button>
                                            </div>

                                            {/* IRK Approvals */}
                                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({irkApprovals.length}/4)</span>
                                                    {irkApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = irkApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...irkApprovals, { type: nextType as any, name: "", role: "" }]; const sorted = [...newArr].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)); setIrkApprovals(sorted); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                </div>
                                                <div className="space-y-3">
                                                    {irkApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">TTD #{idx + 1}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" disabled={idx === 0} onClick={() => { const arr = [...irkApprovals]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setIrkApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === 0 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronUp className="w-4 h-4" /></button>
                                                                    <button type="button" disabled={idx === irkApprovals.length - 1} onClick={() => { const arr = [...irkApprovals]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setIrkApprovals(arr); }} className={clsx("p-0.5 rounded cursor-pointer", idx === irkApprovals.length - 1 ? "text-neutral-200 cursor-not-allowed" : "text-neutral-400 hover:text-blue-600")}><ChevronDown className="w-4 h-4" /></button>
                                                                    {irkApprovals.length > 1 && (<button type="button" onClick={() => setIrkApprovals(irkApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <Select label="Peran" value={app.type} onChange={(val) => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const updated = irkApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item); setIrkApprovals([...updated].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))); }} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                <Input label="Nama" value={app.name} onChange={(e) => setIrkApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                <Input label="Jabatan" value={app.role} onChange={(e) => setIrkApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {irkActiveTab === "risk_assessment" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Risk Assessment Matrix / Penilaian Risiko ({irkRisks.length})</span></div>
                                            {irkRisks.map((rsk, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <span className="text-[11px] font-extrabold text-blue-600 uppercase block">[{rsk.riskCode}] {rsk.statement || "Pernyataan Risiko"}</span>
                                                    <div className="grid grid-cols-4 gap-2.5">
                                                        <Input label="Probability (P)" value={rsk.probability} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, probability: e.target.value } : it))} placeholder="3" />
                                                        <Input label="Impact (I)" value={rsk.impact} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, impact: e.target.value } : it))} placeholder="4" />
                                                        <Input label="Risk Score (P x I)" value={rsk.score} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, score: e.target.value } : it))} placeholder="12" />
                                                        <Input label="Priority Level" value={rsk.priority} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, priority: e.target.value } : it))} placeholder="High" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {irkActiveTab === "risk_response" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Risk Response Strategy / Respon & Kontingensi Risiko ({irkRisks.length})</span></div>
                                            {irkRisks.map((rsk, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <span className="text-[11px] font-extrabold text-blue-600 uppercase block">[{rsk.riskCode}] {rsk.statement || "Pernyataan Risiko"}</span>
                                                    <Input label="Strategy (Avoid / Mitigate / Transfer / Accept)" value={rsk.strategy} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, strategy: e.target.value } : it))} placeholder="Mitigate" />
                                                    <Input label="Contingency Plan / Rencana Kontingensi" value={rsk.contingencyPlan} onChange={(e) => setIrkRisks(prev => prev.map((it, i) => i === idx ? { ...it, contingencyPlan: e.target.value } : it))} placeholder="Kontrak supplier alternatif" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {irkActiveTab === "issue_mgmt" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                <span className="text-xs font-black text-rose-600 uppercase tracking-wider">4. Active Issue Management / Manajemen Isu Aktif (Sudah Terjadi) ({irkIssues.length})</span>
                                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">OCCURRED ISSUES</span>
                                            </div>
                                            {irkIssues.map((isu, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-rose-700 uppercase">Issue #{idx + 1} ({isu.issueCode})</span>{irkIssues.length > 1 && (<button type="button" onClick={() => setIrkIssues(irkIssues.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <Input label="Kode Isu" value={isu.issueCode} onChange={(e) => setIrkIssues(prev => prev.map((it, i) => i === idx ? { ...it, issueCode: e.target.value } : it))} placeholder="ISU-001" />
                                                        <Input label="Status Resolusi" value={isu.status} onChange={(e) => setIrkIssues(prev => prev.map((it, i) => i === idx ? { ...it, status: e.target.value } : it))} placeholder="In Progress" />
                                                    </div>
                                                    <Input label="Current Issue / Deskripsi Isu Aktual" value={isu.currentIssue} onChange={(e) => setIrkIssues(prev => prev.map((it, i) => i === idx ? { ...it, currentIssue: e.target.value } : it))} placeholder="Galian tergenang air" />
                                                    <Input label="Real Impact / Dampak Nyata" value={isu.impact} onChange={(e) => setIrkIssues(prev => prev.map((it, i) => i === idx ? { ...it, impact: e.target.value } : it))} placeholder="Delay 2 hari" />
                                                    <Input label="Escalation / Eskalasi" value={isu.escalation} onChange={(e) => setIrkIssues(prev => prev.map((it, i) => i === idx ? { ...it, escalation: e.target.value } : it))} placeholder="Escalated to Site Manager" />
                                                    <Input label="Resolution Action / Tindakan Resolusi" value={isu.resolutionAction} onChange={(e) => setIrkIssues(prev => prev.map((it, i) => i === idx ? { ...it, resolutionAction: e.target.value } : it))} placeholder="Mobilisasi pompa submersible" />
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setIrkIssues([...irkIssues, { issueCode: `ISU-00${irkIssues.length + 1}`, currentIssue: "", impact: "", escalation: "", resolutionAction: "", status: "Open" }])} className="w-full py-2.5 text-xs font-bold text-rose-600 flex items-center justify-center gap-1.5 bg-rose-50 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors"><Plus className="w-4 h-4" /> Tambah Isu Aktif / Add Active Issue</button>
                                        </div>
                                    )}

                                    {irkActiveTab === "monitoring_closure" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Monitoring & Closure / Monitoring & Penutupan ({irkMonitorings.length})</span></div>
                                            {irkMonitorings.map((mon, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                    <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Monitoring #{idx + 1}</span>{irkMonitorings.length > 1 && (<button type="button" onClick={() => setIrkMonitorings(irkMonitorings.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Kode Risiko / Isu" value={mon.code} onChange={(e) => setIrkMonitorings(prev => prev.map((it, i) => i === idx ? { ...it, code: e.target.value } : it))} placeholder="RSK-001 / ISU-001" />
                                                        <Input label="Risk/Issue Owner (PIC)" value={mon.owner} onChange={(e) => setIrkMonitorings(prev => prev.map((it, i) => i === idx ? { ...it, owner: e.target.value } : it))} placeholder="Pak Herman" />
                                                        <Input label="Due Date" type="date" value={mon.dueDate} onChange={(e) => setIrkMonitorings(prev => prev.map((it, i) => i === idx ? { ...it, dueDate: e.target.value } : it))} />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Residual Risk" value={mon.residualRisk} onChange={(e) => setIrkMonitorings(prev => prev.map((it, i) => i === idx ? { ...it, residualRisk: e.target.value } : it))} placeholder="Low (Score 4)" />
                                                        <Input label="Trend / Tren Risiko" value={mon.trend} onChange={(e) => setIrkMonitorings(prev => prev.map((it, i) => i === idx ? { ...it, trend: e.target.value } : it))} placeholder="Decreasing" />
                                                        <Input label="Closure Criteria / Syarat Tutup" value={mon.criteria} onChange={(e) => setIrkMonitorings(prev => prev.map((it, i) => i === idx ? { ...it, criteria: e.target.value } : it))} placeholder="MOU TTD" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setIrkMonitorings([...irkMonitorings, { code: "", owner: "", dueDate: "", residualRisk: "", trend: "", criteria: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Monitoring / Add Monitoring Item</button>
                                        </div>
                                    )}
                                </>
                            )}
                            {/* ====================== DOC (DOCUMENT CONTROL) FORMS ====================== */}
                                    {reportType === "doc_control" && (
                                        <>
                                            {docActiveTab === "setup" && (
                                                <div className="space-y-5 animate-in fade-in duration-300">
                                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Document Register / Register Dokumen</span>
                                                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">DOC-SETUP</span>
                                                    </div>
                                                    <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="DOC-01-01" />
                                                        <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Register Dokumen ({docRegister.length})</span>
                                                        {docRegister.map((item, idx) => (
                                                            <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                                <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Dokumen #{idx + 1}</span>{docRegister.length > 1 && (<button type="button" onClick={() => setDocRegister(docRegister.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                                <div className="grid grid-cols-2 gap-2.5">
                                                                    <Input label="Document Number / No. Dokumen" value={item.docNumber} onChange={(e) => setDocRegister(prev => prev.map((it, i) => i === idx ? { ...it, docNumber: e.target.value } : it))} placeholder="DWG-STR-201" />
                                                                    <Input label="Title / Judul Dokumen" value={item.title} onChange={(e) => setDocRegister(prev => prev.map((it, i) => i === idx ? { ...it, title: e.target.value } : it))} placeholder="Detail Penulangan" />
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2.5">
                                                                    <Input label="Discipline / Disiplin" value={item.discipline} onChange={(e) => setDocRegister(prev => prev.map((it, i) => i === idx ? { ...it, discipline: e.target.value } : it))} placeholder="Struktur" />
                                                                    <Select label="Type / Tipe" value={item.type} onChange={(val) => setDocRegister(prev => prev.map((it, i) => i === idx ? { ...it, type: val } : it))} options={[{ value: "Shop Drawing", label: "Shop Drawing" }, { value: "As-Built Drawing", label: "As-Built Drawing" }, { value: "RFI (Request for Info)", label: "RFI" }, { value: "Method Statement", label: "Method Statement" }, { value: "Calculation / Hitingan", label: "Calculation" }]} />
                                                                    <Input label="Originator / Pembuat" value={item.originator} onChange={(e) => setDocRegister(prev => prev.map((it, i) => i === idx ? { ...it, originator: e.target.value } : it))} placeholder="PT Adidaya" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button type="button" onClick={() => setDocRegister([...docRegister, { docNumber: "", title: "", discipline: "", type: "Shop Drawing", originator: "", filterTag: "ShopDrawing" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Dokumen / Add Document</button>
                                                    </div>

                                                    {/* DOC Approvals */}
                                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({docApprovalsMeta.length}/4)</span>
                                                            {docApprovalsMeta.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = docApprovalsMeta.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...docApprovalsMeta, { type: nextType as any, name: "", role: "" }]; setDocApprovalsMeta(newArr); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {docApprovalsMeta.map((app, idx) => (
                                                                <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-neutral-400 uppercase">TTD #{idx + 1}</span>{docApprovalsMeta.length > 1 && (<button type="button" onClick={() => setDocApprovalsMeta(docApprovalsMeta.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>)}</div>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        <Select label="Peran" value={app.type} onChange={(val) => setDocApprovalsMeta(docApprovalsMeta.map((item, i) => i === idx ? { ...item, type: val as any } : item))} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                        <Input label="Nama" value={app.name} onChange={(e) => setDocApprovalsMeta(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                        <Input label="Jabatan" value={app.role} onChange={(e) => setDocApprovalsMeta(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {docActiveTab === "doc_submission" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Revision & Submission / Pengajuan & Revisi ({docSubmissions.length})</span></div>
                                                    {docSubmissions.map((sub, idx) => (
                                                        <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                            <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Submission #{idx + 1}</span>{docSubmissions.length > 1 && (<button type="button" onClick={() => setDocSubmissions(docSubmissions.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Revision / Revisi" value={sub.revision} onChange={(e) => setDocSubmissions(prev => prev.map((it, i) => i === idx ? { ...it, revision: e.target.value } : it))} placeholder="Rev-01" />
                                                                <Input label="Submission Date / Tgl Pengajuan" type="date" value={sub.subDate} onChange={(e) => setDocSubmissions(prev => prev.map((it, i) => i === idx ? { ...it, subDate: e.target.value } : it))} />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Transmittal No. / No. Surat Pengantar" value={sub.transmittalNo} onChange={(e) => setDocSubmissions(prev => prev.map((it, i) => i === idx ? { ...it, transmittalNo: e.target.value } : it))} placeholder="TR-ADI-STR-012" />
                                                                <Input label="Purpose of Issue / Tujuan Pengajuan" value={sub.purposeOfIssue} onChange={(e) => setDocSubmissions(prev => prev.map((it, i) => i === idx ? { ...it, purposeOfIssue: e.target.value } : it))} placeholder="For Approval" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setDocSubmissions([...docSubmissions, { revision: "", subDate: "", transmittalNo: "", purposeOfIssue: "For Approval" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Submisi / Add Submission</button>
                                                </div>
                                            )}

                                            {docActiveTab === "doc_approval" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Review & Approval / Review & Persetujuan MK ({docApprovals.length})</span></div>
                                                    {docApprovals.map((app, idx) => (
                                                        <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                            <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Review #{idx + 1}</span>{docApprovals.length > 1 && (<button type="button" onClick={() => setDocApprovals(docApprovals.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Reviewer / Peninjau" value={app.reviewer} onChange={(e) => setDocApprovals(prev => prev.map((it, i) => i === idx ? { ...it, reviewer: e.target.value } : it))} placeholder="Konsultan MK" />
                                                                <Select label="Status (Code A/B/C)" value={app.status} onChange={(val) => setDocApprovals(prev => prev.map((it, i) => i === idx ? { ...it, status: val } : it))} options={[{ value: "Code A (Approved / Disetujui)", label: "Code A (Disetujui)" }, { value: "Code B (Approved w/ Comments)", label: "Code B (Disetujui dg Catatan)" }, { value: "Code C (Revise & Resubmit)", label: "Code C (Ditolak & Revisi)" }]} />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Comments / Catatan Reviewer" value={app.comments} onChange={(e) => setDocApprovals(prev => prev.map((it, i) => i === idx ? { ...it, comments: e.target.value } : it))} placeholder="Disetujui tanpa perbaikan" />
                                                                <Input label="Approval Date / Tgl Persetujuan" type="date" value={app.approvalDate} onChange={(e) => setDocApprovals(prev => prev.map((it, i) => i === idx ? { ...it, approvalDate: e.target.value } : it))} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setDocApprovals([...docApprovals, { reviewer: "", status: "Code A (Approved / Disetujui)", comments: "", approvalDate: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Review / Add Review</button>
                                                </div>
                                            )}

                                            {docActiveTab === "doc_distribution" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. Distribution / Distribusi Dokumen ({docDistributions.length})</span></div>
                                                    {docDistributions.map((dis, idx) => (
                                                        <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                            <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Distribusi #{idx + 1}</span>{docDistributions.length > 1 && (<button type="button" onClick={() => setDocDistributions(docDistributions.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Recipient / Penerima" value={dis.recipient} onChange={(e) => setDocDistributions(prev => prev.map((it, i) => i === idx ? { ...it, recipient: e.target.value } : it))} placeholder="Site Supervisor" />
                                                                <Input label="Controlled Copy / No. Copy Termonitor" value={dis.controlledCopy} onChange={(e) => setDocDistributions(prev => prev.map((it, i) => i === idx ? { ...it, controlledCopy: e.target.value } : it))} placeholder="Copy #02" />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Distribution Date / Tgl Distribusi" type="date" value={dis.distDate} onChange={(e) => setDocDistributions(prev => prev.map((it, i) => i === idx ? { ...it, distDate: e.target.value } : it))} />
                                                                <Input label="Acknowledgement / Tanda Terdistribusi" value={dis.acknowledgement} onChange={(e) => setDocDistributions(prev => prev.map((it, i) => i === idx ? { ...it, acknowledgement: e.target.value } : it))} placeholder="Received / Diterima" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setDocDistributions([...docDistributions, { recipient: "", controlledCopy: "", distDate: "", acknowledgement: "Received" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Distribusi / Add Distribution</button>
                                                </div>
                                            )}

                                            {docActiveTab === "doc_archive" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Superseded & Archive / Pengarsipan & Dokumen Usang ({docArchives.length})</span></div>
                                                    {docArchives.map((arc, idx) => (
                                                        <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                            <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Arsip #{idx + 1}</span>{docArchives.length > 1 && (<button type="button" onClick={() => setDocArchives(docArchives.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Superseded Revision / Revisi Usang" value={arc.supersededRev} onChange={(e) => setDocArchives(prev => prev.map((it, i) => i === idx ? { ...it, supersededRev: e.target.value } : it))} placeholder="Rev-00" />
                                                                <Input label="Replacement Document / Dokumen Pengganti" value={arc.replacementDoc} onChange={(e) => setDocArchives(prev => prev.map((it, i) => i === idx ? { ...it, replacementDoc: e.target.value } : it))} placeholder="DWG-STR-201 Rev-01" />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Retention / Masa Simpan" value={arc.retentionYears} onChange={(e) => setDocArchives(prev => prev.map((it, i) => i === idx ? { ...it, retentionYears: e.target.value } : it))} placeholder="5 Tahun" />
                                                                <Input label="Archive Location / Lokasi Arsip" value={arc.archiveLocation} onChange={(e) => setDocArchives(prev => prev.map((it, i) => i === idx ? { ...it, archiveLocation: e.target.value } : it))} placeholder="Server Vault / Rak A-04" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setDocArchives([...docArchives, { supersededRev: "", replacementDoc: "", retentionYears: "5 Tahun", archiveLocation: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Lokasi Arsip / Add Archive Item</button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* ====================== CCO (CONTRACT CHANGE ORDER / VO) FORMS ====================== */}
                                    {reportType === "change_order" && (
                                        <>
                                            {ccoActiveTab === "setup" && (
                                                <div className="space-y-5 animate-in fade-in duration-300">
                                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Change Initiation / Inisiasi Perubahan Kontrak (VO)</span>
                                                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">CCO-SETUP</span>
                                                    </div>
                                                    <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="CCO-01-01" />
                                                        <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input label="Origin / Asal Usul Usulan" value={ccoInitiation.origin} onChange={(e) => setCcoInitiation({ ...ccoInitiation, origin: e.target.value })} placeholder="Owner Request" />
                                                        <Input label="Instruction / Acuan Instruksi" value={ccoInitiation.reference} onChange={(e) => setCcoInitiation({ ...ccoInitiation, reference: e.target.value })} placeholder="Site Instruction SI-004" />
                                                    </div>
                                                    <Input label="Change Description / Deskripsi Perubahan" value={ccoInitiation.description} onChange={(e) => setCcoInitiation({ ...ccoInitiation, description: e.target.value })} placeholder="Penambahan dinding peredam suara" />
                                                    <Input label="Reason / Alasan Perubahan" value={ccoInitiation.reason} onChange={(e) => setCcoInitiation({ ...ccoInitiation, reason: e.target.value })} placeholder="Perubahan fungsi ruangan" />

                                                    {/* CCO Approvals */}
                                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({ccoApprovals.length}/4)</span>
                                                            {ccoApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = ccoApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...ccoApprovals, { type: nextType as any, name: "", role: "" }]; setCcoApprovals(newArr); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {ccoApprovals.map((app, idx) => (
                                                                <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-neutral-400 uppercase">TTD #{idx + 1}</span>{ccoApprovals.length > 1 && (<button type="button" onClick={() => setCcoApprovals(ccoApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>)}</div>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        <Select label="Peran" value={app.type} onChange={(val) => setCcoApprovals(ccoApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item))} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                        <Input label="Nama" value={app.name} onChange={(e) => setCcoApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                        <Input label="Jabatan" value={app.role} onChange={(e) => setCcoApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {ccoActiveTab === "cco_scope" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Scope & Quantity / Rincian Pekerjaan Tambah Kurang ({ccoScopeItems.length})</span></div>
                                                    {ccoScopeItems.map((item, idx) => (
                                                        <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                            <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Item VO #{idx + 1}</span>{ccoScopeItems.length > 1 && (<button type="button" onClick={() => setCcoScopeItems(ccoScopeItems.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                            <Input label="Work Item / Pekerjaan" value={item.workItem} onChange={(e) => setCcoScopeItems(prev => prev.map((it, i) => i === idx ? { ...it, workItem: e.target.value } : it))} placeholder="Pekerjaan Akustik" />
                                                            <div className="grid grid-cols-3 gap-2.5">
                                                                <Input label="Original Qty" value={item.originalQty} onChange={(e) => setCcoScopeItems(prev => prev.map((it, i) => i === idx ? { ...it, originalQty: e.target.value } : it))} placeholder="0 m2" />
                                                                <Input label="Added/Omitted Qty (+/-)" value={item.changeQty} onChange={(e) => setCcoScopeItems(prev => prev.map((it, i) => i === idx ? { ...it, changeQty: e.target.value } : it))} placeholder="+450 m2" />
                                                                <Input label="Drawing Reference" value={item.drawingRef} onChange={(e) => setCcoScopeItems(prev => prev.map((it, i) => i === idx ? { ...it, drawingRef: e.target.value } : it))} placeholder="DWG-ARC-SK-08" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setCcoScopeItems([...ccoScopeItems, { workItem: "", originalQty: "0", changeQty: "+0", drawingRef: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Item Scope / Add Scope Item</button>
                                                </div>
                                            )}

                                            {ccoActiveTab === "cco_cost" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Cost Assessment / Penilaian & Perhitungan Biaya ({ccoCosts.length})</span></div>
                                                    {ccoCosts.map((cst, idx) => (
                                                        <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                            <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Cost Assessment #{idx + 1}</span>{ccoCosts.length > 1 && (<button type="button" onClick={() => setCcoCosts(ccoCosts.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Unit Rate / Harga Satuan" value={cst.unitRate} onChange={(e) => setCcoCosts(prev => prev.map((it, i) => i === idx ? { ...it, unitRate: e.target.value } : it))} placeholder="Rp 350.000 / m2" />
                                                                <Input label="Direct Cost / Biaya Langsung" value={cst.directCost} onChange={(e) => setCcoCosts(prev => prev.map((it, i) => i === idx ? { ...it, directCost: e.target.value } : it))} placeholder="Rp 157.500.000" />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <Input label="Markup (Profit/Overhead)" value={cst.markup} onChange={(e) => setCcoCosts(prev => prev.map((it, i) => i === idx ? { ...it, markup: e.target.value } : it))} placeholder="10%" />
                                                                <Input label="Total Cost Impact / Total Biaya" value={cst.totalImpact} onChange={(e) => setCcoCosts(prev => prev.map((it, i) => i === idx ? { ...it, totalImpact: e.target.value } : it))} placeholder="Rp 173.250.000" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setCcoCosts([...ccoCosts, { unitRate: "", directCost: "", markup: "10%", totalImpact: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Rincian Biaya / Add Cost Item</button>
                                                </div>
                                            )}

                                            {ccoActiveTab === "cco_impact" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. Time & Contract Impact / Dampak Waktu & Klausul Kontrak</span></div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input label="Delay Days / Estimasi Keterlambatan" value={ccoTimeImpact.delayDays} onChange={(e) => setCcoTimeImpact({ ...ccoTimeImpact, delayDays: e.target.value })} placeholder="7 Hari Kerja" />
                                                        <Input label="Extension of Time (EOT)" value={ccoTimeImpact.eotGranted} onChange={(e) => setCcoTimeImpact({ ...ccoTimeImpact, eotGranted: e.target.value })} placeholder="Granted 7 Days" />
                                                    </div>
                                                    <Input label="Affected Activities / Pekerjaan Terdampak" value={ccoTimeImpact.affectedActivities} onChange={(e) => setCcoTimeImpact({ ...ccoTimeImpact, affectedActivities: e.target.value })} placeholder="Finishing Interior Hall" />
                                                    <Input label="Contract Clauses / Klausul Kontrak Terkait" value={ccoTimeImpact.contractClauses} onChange={(e) => setCcoTimeImpact({ ...ccoTimeImpact, contractClauses: e.target.value })} placeholder="Klausul 14.2 Perubahan Lingkup" />
                                                </div>
                                            )}

                                            {ccoActiveTab === "cco_approval" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Negotiation & Approval / Negosiasi & Nilai Akhir Disetujui</span></div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input label="Proposed Value / Nilai Diajukan" value={ccoNegotiation.proposedValue} onChange={(e) => setCcoNegotiation({ ...ccoNegotiation, proposedValue: e.target.value })} placeholder="Rp 173.250.000" />
                                                        <Input label="Negotiated Value / Nilai Hasil Negosiasi" value={ccoNegotiation.negotiatedValue} onChange={(e) => setCcoNegotiation({ ...ccoNegotiation, negotiatedValue: e.target.value })} placeholder="Rp 168.000.000" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input label="Approval Status / Status Approval" value={ccoNegotiation.approvalStatus} onChange={(e) => setCcoNegotiation({ ...ccoNegotiation, approvalStatus: e.target.value })} placeholder="Approved / Disetujui" />
                                                        <Input label="Approved Change Order / Nomor CCO Disetujui" value={ccoNegotiation.approvedCO} onChange={(e) => setCcoNegotiation({ ...ccoNegotiation, approvedCO: e.target.value })} placeholder="CCO-002 / VO-002" />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* ====================== MOU (AGREEMENT & CONTRACT) FORMS ====================== */}
                                    {reportType === "mou_contract" && (
                                        <>
                                            {mouActiveTab === "setup" && (
                                                <div className="space-y-5 animate-in fade-in duration-300">
                                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Parties & Identity / Para Pihak & Identitas Kontrak</span>
                                                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">MOU-SETUP</span>
                                                    </div>
                                                    <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="MOU-01-01" />
                                                        <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                                    </div>
                                                    <Input label="Parties / Para Pihak Terlibat" value={mouIdentity.parties} onChange={(e) => setMouIdentity({ ...mouIdentity, parties: e.target.value })} placeholder="PT Adidaya & PT Cipta Bangun" />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input label="Legal Entity / Badan Hukum" value={mouIdentity.legalEntity} onChange={(e) => setMouIdentity({ ...mouIdentity, legalEntity: e.target.value })} placeholder="PT / Badan Hukum Resmi" />
                                                        <Input label="Contract Number / No. Perjanjian" value={mouIdentity.contractNumber} onChange={(e) => setMouIdentity({ ...mouIdentity, contractNumber: e.target.value })} placeholder="AGR-2026-ADI-088" />
                                                    </div>
                                                    <Input label="Effective Date / Tanggal Berlaku" type="date" value={mouIdentity.effectiveDate} onChange={(e) => setMouIdentity({ ...mouIdentity, effectiveDate: e.target.value })} />

                                                    {/* MOU Approvals */}
                                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({mouApprovals.length}/4)</span>
                                                            {mouApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = mouApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...mouApprovals, { type: nextType as any, name: "", role: "" }]; setMouApprovals(newArr); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {mouApprovals.map((app, idx) => (
                                                                <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-neutral-400 uppercase">TTD #{idx + 1}</span>{mouApprovals.length > 1 && (<button type="button" onClick={() => setMouApprovals(mouApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>)}</div>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        <Select label="Peran" value={app.type} onChange={(val) => setMouApprovals(mouApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item))} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                        <Input label="Nama" value={app.name} onChange={(e) => setMouApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                        <Input label="Jabatan" value={app.role} onChange={(e) => setMouApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {mouActiveTab === "mou_scope" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Scope & Deliverables / Lingkup Pekerjaan & Hasil Akhir</span></div>
                                                    <Input label="Scope of Work / Lingkup Pekerjaan" value={mouScopeDeliverables.scope} onChange={(e) => setMouScopeDeliverables({ ...mouScopeDeliverables, scope: e.target.value })} placeholder="Pelaksanaan Pekerjaan Struktur Utama" />
                                                    <Input label="Exclusions / Pengecualian Lingkup" value={mouScopeDeliverables.exclusions} onChange={(e) => setMouScopeDeliverables({ ...mouScopeDeliverables, exclusions: e.target.value })} placeholder="Pekerjaan Lansekap Luar" />
                                                    <Input label="Deliverables / Hasil Akhir Terkirim" value={mouScopeDeliverables.deliverables} onChange={(e) => setMouScopeDeliverables({ ...mouScopeDeliverables, deliverables: e.target.value })} placeholder="Bangunan 3 Lantai Siap Huni" />
                                                    <Input label="Acceptance Criteria / Kriteria Penerimaan" value={mouScopeDeliverables.acceptanceCriteria} onChange={(e) => setMouScopeDeliverables({ ...mouScopeDeliverables, acceptanceCriteria: e.target.value })} placeholder="Sesuai Spesifikasi Teknis" />
                                                </div>
                                            )}

                                            {mouActiveTab === "mou_commercial" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Commercial Terms / Ketentuan Nilai & Pembayaran</span></div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input label="Contract Value / Nilai Kontrak" value={mouCommercialTerms.contractValue} onChange={(e) => setMouCommercialTerms({ ...mouCommercialTerms, contractValue: e.target.value })} placeholder="Rp 4.850.000.000" />
                                                        <Input label="Retention Rate / Persentase Retensi" value={mouCommercialTerms.retentionRate} onChange={(e) => setMouCommercialTerms({ ...mouCommercialTerms, retentionRate: e.target.value })} placeholder="5%" />
                                                    </div>
                                                    <Input label="Payment Terms / Ketentuan Pembayaran" value={mouCommercialTerms.paymentTerms} onChange={(e) => setMouCommercialTerms({ ...mouCommercialTerms, paymentTerms: e.target.value })} placeholder="DP 20%, Monthly Termijn 75%" />
                                                    <Input label="Tax Details / Ketentuan Perpajakan" value={mouCommercialTerms.taxDetails} onChange={(e) => setMouCommercialTerms({ ...mouCommercialTerms, taxDetails: e.target.value })} placeholder="PPN 11% & PPh Pasal 4(2)" />
                                                    <Input label="Variation Mechanism / Mekanisme Tambah Kurang" value={mouCommercialTerms.variationMechanism} onChange={(e) => setMouCommercialTerms({ ...mouCommercialTerms, variationMechanism: e.target.value })} placeholder="Mekanisme CCO / VO" />
                                                </div>
                                            )}

                                            {mouActiveTab === "mou_risk" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. Time, Obligation & Risk / Jangka Waktu & Tanggung Jawab</span></div>
                                                    <Input label="Contract Period / Jangka Waktu Kontrak" value={mouTimeRisk.contractPeriod} onChange={(e) => setMouTimeRisk({ ...mouTimeRisk, contractPeriod: e.target.value })} placeholder="180 Hari Kalender" />
                                                    <Input label="Milestones / Target Tahapan Utama" value={mouTimeRisk.milestones} onChange={(e) => setMouTimeRisk({ ...mouTimeRisk, milestones: e.target.value })} placeholder="Topping Off (Bln 3)" />
                                                    <Input label="Responsibilities / Tanggung Jawab Para Pihak" value={mouTimeRisk.responsibilities} onChange={(e) => setMouTimeRisk({ ...mouTimeRisk, responsibilities: e.target.value })} placeholder="Kontraktor: Mutu | Employer: Akses" />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input label="Insurance / Asuransi (CAR/TPL)" value={mouTimeRisk.insuranceDetails} onChange={(e) => setMouTimeRisk({ ...mouTimeRisk, insuranceDetails: e.target.value })} placeholder="CAR & TPL" />
                                                        <Input label="Warranty Period / Masa Pemeliharaan" value={mouTimeRisk.warrantyPeriod} onChange={(e) => setMouTimeRisk({ ...mouTimeRisk, warrantyPeriod: e.target.value })} placeholder="180 Hari Kalender" />
                                                    </div>
                                                </div>
                                            )}

                                            {mouActiveTab === "mou_execution" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Clauses & Execution / Klausul Hukum & Status Eksekusi</span></div>
                                                    <Input label="Termination Clause / Pengakhiran Perjanjian" value={mouClausesExecution.terminationClause} onChange={(e) => setMouClausesExecution({ ...mouClausesExecution, terminationClause: e.target.value })} placeholder="Default 30 hari penanganan" />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input label="Dispute Resolution / Penyelesaian Sengketa" value={mouClausesExecution.disputeResolution} onChange={(e) => setMouClausesExecution({ ...mouClausesExecution, disputeResolution: e.target.value })} placeholder="Musyawarah / BANI" />
                                                        <Input label="Governing Law / Hukum Yang Berlaku" value={mouClausesExecution.governingLaw} onChange={(e) => setMouClausesExecution({ ...mouClausesExecution, governingLaw: e.target.value })} placeholder="Hukum Indonesia" />
                                                    </div>
                                                    <Input label="Signatories / Penanda Tangan Kontrak" value={mouClausesExecution.signatories} onChange={(e) => setMouClausesExecution({ ...mouClausesExecution, signatories: e.target.value })} placeholder="Direktur Utama Kedua Pihak" />
                                                    <Input label="Execution Status / Status Keabsahan" value={mouClausesExecution.executionStatus} onChange={(e) => setMouClausesExecution({ ...mouClausesExecution, executionStatus: e.target.value })} placeholder="Executed & Stamped" />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* ====================== EXE (EXECUTIVE REPORT) FORMS ====================== */}
                                    {reportType === "executive" && (
                                        <>
                                            {exeActiveTab === "setup" && (
                                                <div className="space-y-5 animate-in fade-in duration-300">
                                                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">1. Project Health (RAG Status) / Status Kesehatan Proyek</span>
                                                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">EXE-SETUP</span>
                                                    </div>
                                                    <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input label="Nomor Dokumen / Document ID" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="EXE-01-01" />
                                                        <Input label="Tanggal Laporan / Report Date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                                                    </div>
                                                    <Select label="Overall Project RAG Status *" value={exeHealth.overallRAG} onChange={(val) => setExeHealth({ ...exeHealth, overallRAG: val as any })} options={[{ value: "Green", label: "Green (Sesuai Track / Target Terapresiasi)" }, { value: "Amber", label: "Amber (Perlu Perhatian Khusus / At Risk)" }, { value: "Red", label: "Red (Kritis / Membutuhkan Intervensi Cepat)" }]} />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input label="Time Status / Jadwal" value={exeHealth.timeStatus} onChange={(e) => setExeHealth({ ...exeHealth, timeStatus: e.target.value })} placeholder="On Schedule (+0.8%)" />
                                                        <Input label="Cost Status / Biaya (CPI)" value={exeHealth.costStatus} onChange={(e) => setExeHealth({ ...exeHealth, costStatus: e.target.value })} placeholder="Under Budget (CPI 1.04)" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        <Input label="Quality Status" value={exeHealth.qualityStatus} onChange={(e) => setExeHealth({ ...exeHealth, qualityStatus: e.target.value })} placeholder="Pass" />
                                                        <Input label="Safety Status" value={exeHealth.safetyStatus} onChange={(e) => setExeHealth({ ...exeHealth, safetyStatus: e.target.value })} placeholder="Zero LTI" />
                                                        <Input label="Scope Status" value={exeHealth.scopeStatus} onChange={(e) => setExeHealth({ ...exeHealth, scopeStatus: e.target.value })} placeholder="1 CCO In Progress" />
                                                    </div>

                                                    {/* EXE Approvals */}
                                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Tanda Tangan / Approvals ({exeApprovals.length}/4)</span>
                                                            {exeApprovals.length < 4 && (<button type="button" onClick={() => { const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const; const usedTypes = exeApprovals.map(a => a.type); const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui"; const newArr = [...exeApprovals, { type: nextType as any, name: "", role: "" }]; setExeApprovals(newArr); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah TTD</button>)}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {exeApprovals.map((app, idx) => (
                                                                <div key={idx} className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2.5">
                                                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-neutral-400 uppercase">TTD #{idx + 1}</span>{exeApprovals.length > 1 && (<button type="button" onClick={() => setExeApprovals(exeApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>)}</div>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        <Select label="Peran" value={app.type} onChange={(val) => setExeApprovals(exeApprovals.map((item, i) => i === idx ? { ...item, type: val as any } : item))} options={[{ value: "disusun", label: "Disusun Oleh" }, { value: "dicek", label: "Dicek Oleh" }, { value: "mengetahui", label: "Mengetahui" }, { value: "disetujui", label: "Disetujui Oleh" }]} />
                                                                        <Input label="Nama" value={app.name} onChange={(e) => setExeApprovals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Nama" />
                                                                        <Input label="Jabatan" value={app.role} onChange={(e) => setExeApprovals(prev => prev.map((item, i) => i === idx ? { ...item, role: e.target.value } : item))} placeholder="Jabatan" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {exeActiveTab === "exe_highlights" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">2. Performance Highlights / Capaian & Ringkasan Performa</span></div>
                                                    <Input label="Key Achievements / Pencapaian Kunci" value={exeHighlights.keyAchievements} onChange={(e) => setExeHighlights({ ...exeHighlights, keyAchievements: e.target.value })} placeholder="Pengecoran Selesai 100%" />
                                                    <Input label="Milestones / Milestone Utama" value={exeHighlights.milestones} onChange={(e) => setExeHighlights({ ...exeHighlights, milestones: e.target.value })} placeholder="Topping Off Tercapai" />
                                                    <Input label="KPI Summary / Ringkasan Indikator Kinerja" value={exeHighlights.kpiSummary} onChange={(e) => setExeHighlights({ ...exeHighlights, kpiSummary: e.target.value })} placeholder="SPI 1.02 | CPI 1.04" />
                                                    <Input label="Performance Trend / Tren Performa" value={exeHighlights.performanceTrend} onChange={(e) => setExeHighlights({ ...exeHighlights, performanceTrend: e.target.value })} placeholder="Positive / Tren Meningkat" />
                                                </div>
                                            )}

                                            {exeActiveTab === "exe_risks" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">3. Strategic Risks & Issues / Risiko Strategis & Paparan Komersial ({exeStrategicRisks.length})</span></div>
                                                    {exeStrategicRisks.map((rsk, idx) => (
                                                        <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                            <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Strategic Risk #{idx + 1}</span>{exeStrategicRisks.length > 1 && (<button type="button" onClick={() => setExeStrategicRisks(exeStrategicRisks.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                            <Input label="Top Risk / Risiko Utama" value={rsk.topRisk} onChange={(e) => setExeStrategicRisks(prev => prev.map((it, i) => i === idx ? { ...it, topRisk: e.target.value } : it))} placeholder="Kenaikan harga material" />
                                                            <div className="grid grid-cols-3 gap-2.5">
                                                                <Input label="Critical Issue" value={rsk.criticalIssue} onChange={(e) => setExeStrategicRisks(prev => prev.map((it, i) => i === idx ? { ...it, criticalIssue: e.target.value } : it))} placeholder="Dewatering galian" />
                                                                <Input label="Commercial Exposure" value={rsk.commercialExposure} onChange={(e) => setExeStrategicRisks(prev => prev.map((it, i) => i === idx ? { ...it, commercialExposure: e.target.value } : it))} placeholder="Rp 168.000.000" />
                                                                <Input label="Client Concern" value={rsk.clientConcern} onChange={(e) => setExeStrategicRisks(prev => prev.map((it, i) => i === idx ? { ...it, clientConcern: e.target.value } : it))} placeholder="Waktu interior" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setExeStrategicRisks([...exeStrategicRisks, { topRisk: "", criticalIssue: "", commercialExposure: "", clientConcern: "" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Risiko Strategis / Add Strategic Risk</button>
                                                </div>
                                            )}

                                            {exeActiveTab === "exe_forecast" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">4. Forecast & Recovery / Proyeksi Akhir & Perencanaan Pemulihan</span></div>
                                                    <Input label="Completion Forecast / Proyeksi Selesai" value={exeForecast.completionForecast} onChange={(e) => setExeForecast({ ...exeForecast, completionForecast: e.target.value })} placeholder="25 Januari 2027" />
                                                    <Input label="Cost Forecast / Proyeksi Biaya Akhir" value={exeForecast.costForecast} onChange={(e) => setExeForecast({ ...exeForecast, costForecast: e.target.value })} placeholder="Rp 4.780.000.000" />
                                                    <Input label="Recovery Measures / Langkah Pemulihan" value={exeForecast.recoveryMeasures} onChange={(e) => setExeForecast({ ...exeForecast, recoveryMeasures: e.target.value })} placeholder="Tambah shift malam" />
                                                    <Input label="Opportunities / Peluang Efisiensi" value={exeForecast.opportunities} onChange={(e) => setExeForecast({ ...exeForecast, opportunities: e.target.value })} placeholder="Efisiensi pengadaan massal" />
                                                </div>
                                            )}

                                            {exeActiveTab === "exe_decisions" && (
                                                <div className="space-y-4 animate-in fade-in duration-300">
                                                    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-blue-600 uppercase tracking-wider">5. Decisions Required / Keputusan Strategis Yang Dibutuhkan ({exeDecisions.length})</span></div>
                                                    {exeDecisions.map((dec, idx) => (
                                                        <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3">
                                                            <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-blue-600 uppercase">Decision #{idx + 1}</span>{exeDecisions.length > 1 && (<button type="button" onClick={() => setExeDecisions(exeDecisions.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                                            <Input label="Decision Needed / Keputusan Dibutuhkan" value={dec.decision} onChange={(e) => setExeDecisions(prev => prev.map((it, i) => i === idx ? { ...it, decision: e.target.value } : it))} placeholder="Persetujuan CCO-002" />
                                                            <Input label="Recommendation / Rekomendasi" value={dec.recommendation} onChange={(e) => setExeDecisions(prev => prev.map((it, i) => i === idx ? { ...it, recommendation: e.target.value } : it))} placeholder="Option A" />
                                                            <Input label="Required By Date" type="date" value={dec.requiredByDate} onChange={(e) => setExeDecisions(prev => prev.map((it, i) => i === idx ? { ...it, requiredByDate: e.target.value } : it))} />
                                                            <Input label="Decision Owner / Penanggung Jawab" value={dec.owner} onChange={(e) => setExeDecisions(prev => prev.map((it, i) => i === idx ? { ...it, owner: e.target.value } : it))} placeholder="Board of Directors" />
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setExeDecisions([...exeDecisions, { decision: "", options: "", recommendation: "", requiredByDate: "", owner: "Board of Directors" }])} className="w-full py-2.5 text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 bg-blue-50/80 rounded-xl border border-blue-200/60 hover:bg-blue-100/60 transition-colors"><Plus className="w-4 h-4" /> Tambah Keputusan / Add Decision Item</button>
                                                </div>
                                            )}
                                        </>
                                    )}
                        </>
                    ) : !["daily", "weekly", "monthly", "schedule", "cost", "manpower", "procurement", "finance", "resources", "quality", "safety", "issue_risk", "doc_control", "change_order", "mou_contract", "executive"].includes(reportType) ? (
                        <>
                            {weeklyTab === "general" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    {/* Auto Sync Banner */}
                                    <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
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
                                            placeholder={`${getReportMeta(reportType).code}-01-01`}
                                        />
                                        <Input
                                            label="Revisi (REV)"
                                            value={revision}
                                            onChange={(e) => setRevision(e.target.value)}
                                            placeholder="00"
                                        />
                                    </div>

                                    <Input
                                        label={`Judul ${getReportMeta(reportType).title}`}
                                        value={title}
                                        onChange={(e) => { setTitle(e.target.value); setIsTitleManuallyEdited(true); }}
                                        placeholder={`e.g. ${getReportMeta(reportType).title} - Progres Proyek`}
                                    />
                                </div>
                            )}

                            {weeklyTab === "summary" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                        {getReportConfig(reportType).summaryTitle}
                                    </span>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input label={getReportConfig(reportType).summaryFields.metric1Label} type="number" step="0.001" value={progressTotal} onChange={(e) => setProgressTotal(e.target.value)} placeholder="0.000" />
                                        <Input label={getReportConfig(reportType).summaryFields.metric2Label} type="number" step="0.001" value={progressThisWeek} onChange={(e) => setProgressThisWeek(e.target.value)} placeholder="0.000" />
                                        <Input label={getReportConfig(reportType).summaryFields.metric3Label} type="number" step="0.001" value={progressRemaining} onChange={(e) => setProgressRemaining(e.target.value)} placeholder="0.000" />
                                        <Input label="Revisi / Status Target" value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="R00" />
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                                            {getReportConfig(reportType).summaryFields.narrativeLabel}
                                        </label>
                                        <textarea
                                            className="w-full min-h-[100px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                            value={summaryText}
                                            onChange={(e) => setSummaryText(e.target.value)}
                                            placeholder={getReportConfig(reportType).summaryFields.narrativePlaceholder}
                                        />
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                                            {getReportConfig(reportType).summaryFields.notesLabel}
                                        </label>
                                        <textarea
                                            className="w-full min-h-[100px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                            value={catatanUmum}
                                            onChange={(e) => setCatatanUmum(e.target.value)}
                                            placeholder={getReportConfig(reportType).summaryFields.notesPlaceholder}
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
                                    {(reportType === "weekly" || reportType === "monthly") ? (
                                        <>
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
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                    {getReportConfig(reportType).summaryFields.notesLabel}
                                                </label>
                                                <textarea
                                                    className="w-full min-h-[140px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    placeholder={getReportConfig(reportType).summaryFields.notesPlaceholder}
                                                />
                                            </div>
                                            <div className="space-y-1.5 pt-2">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                    Rekomendasi & Rencana Tindak Lanjut
                                                </label>
                                                <textarea
                                                    className="w-full min-h-[140px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                                    value={nextActions}
                                                    onChange={(e) => setNextActions(e.target.value)}
                                                    placeholder="Tuliskan langkah-langkah rekomendasi..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {weeklyTab === "dokumentasi" && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                            <div>
                                                <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider block">Dokumentasi Foto Lapangan</span>
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

                                    {/* Signatures for Extended Reports */}
                                    {reportType !== "weekly" && reportType !== "monthly" && (
                                        <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Tanda Tangan & Persetujuan Dokumen</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input label="Disusun Oleh" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Nama penyusun" />
                                                <Input label="Jabatan Penyusun" value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} placeholder="Inspector / Officer" />
                                                <Input label="Disetujui Oleh" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Nama penanggung jawab" />
                                                <Input label="Jabatan Penyetuju" value={approvedByRole} onChange={(e) => setApprovedByRole(e.target.value)} placeholder="Project Manager / Manager" />
                                            </div>
                                        </div>
                                    )}
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
                    ) : null}

                </div>

                {/* Right Card: Live Document Preview */}
                <div className="flex-1 w-full bg-neutral-100/80 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl lg:overflow-y-auto flex flex-col items-center gap-6 shadow-sm lg:h-full py-6 px-4">
                    
                    <div className="text-[10px] text-neutral-400 font-mono tracking-tight text-center">
                        📄 {getGeneratedFilename()}
                    </div>

                    <div id="document-preview-a4" className="w-full max-w-[680px]">
                        
                        {/* ===================== DAILY PREVIEW (2 Pages LH) ===================== */}
                        {reportType === "daily" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                
                                {/* ---------------- LH PAGE 1 ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col gap-3 border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    {renderPageHeader("RDL", documentId || "RDL-00-01", "Laporan Harian")}

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

                                    {/* Main Tables Grid */}
                                    <div className="flex gap-3">
                                        {/* Uraian Pekerjaan */}
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

                                        {/* Right Sidebar (Personel + Waktu Kerja + Cuaca) */}
                                        <div className="w-[200px] shrink-0 flex flex-col gap-2">
                                            {/* Personel */}
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
                                                        <tr className="bg-neutral-100 font-black">
                                                            <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-900">Total</td>
                                                            <td className="p-0.5 text-center font-black text-neutral-900 w-8">{
                                                                (parseInt(pmCount) || 0) + (parseInt(smCount) || 0) + (parseInt(supervisorCount) || 0) + 
                                                                (parseInt(mandorCount) || 0) + (parseInt(tukangCount) || 0) + (parseInt(pekerjaCount) || 0) + (parseInt(operatorCount) || 0)
                                                            }</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Waktu Kerja */}
                                            <div>
                                                <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Waktu Kerja</div>
                                                <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                                    <tbody className="text-[6px]">
                                                        <tr className="border-b border-neutral-200">
                                                            <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">Reguler 08.00–16.00</td>
                                                            <td className="p-0.5 text-center font-bold text-neutral-900 w-12">{shiftReguler || "0"} Jam</td>
                                                        </tr>
                                                        <tr className="border-b border-neutral-200">
                                                            <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">OT 1 16.00–18.00</td>
                                                            <td className="p-0.5 text-center font-bold text-neutral-900 w-12">{shiftOt1 || "0"} Jam</td>
                                                        </tr>
                                                        <tr className="border-b border-neutral-200">
                                                            <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">OT 2 18.00–22.00</td>
                                                            <td className="p-0.5 text-center font-bold text-neutral-900 w-12">{shiftOt2 || "0"} Jam</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">OT 3 22.00–08.00</td>
                                                            <td className="p-0.5 text-center font-bold text-neutral-900 w-12">{shiftOt3 || "0"} Jam</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Cuaca */}
                                            <div>
                                                <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Cuaca</div>
                                                <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr className="bg-neutral-50 border-b border-neutral-300 text-[5.5px] font-extrabold text-neutral-500 uppercase">
                                                            <th className="p-0.5 pl-1 border-r border-neutral-300">Waktu</th>
                                                            <th className="p-0.5 text-center border-r border-neutral-300 w-4">☀️</th>
                                                            <th className="p-0.5 text-center border-r border-neutral-300 w-4">⛅</th>
                                                            <th className="p-0.5 text-center border-r border-neutral-300 w-4">🌧️</th>
                                                            <th className="p-0.5 text-center w-8">Durasi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-[6px]">
                                                        {weatherItems.map((w, idx) => (
                                                            <tr key={idx} className="border-b border-neutral-200">
                                                                <td className="p-0.5 pl-1 border-r border-neutral-200 text-neutral-600 font-medium">{w.timeRange}</td>
                                                                <td className="p-0.5 text-center border-r border-neutral-200 font-black text-neutral-900">{w.condition === "cerah" ? "✓" : ""}</td>
                                                                <td className="p-0.5 text-center border-r border-neutral-200 font-black text-neutral-900">{w.condition === "berawan" ? "✓" : ""}</td>
                                                                <td className="p-0.5 text-center border-r border-neutral-200 font-black text-neutral-900">{w.condition === "hujan" ? "✓" : ""}</td>
                                                                <td className="p-0.5 text-center font-semibold text-neutral-600">1 Jam</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Material / Alat / Jasa */}
                                    <div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Material / Alat / Jasa Lapangan</div>
                                        <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                                                    <th className="p-1 w-5 text-center border-r border-neutral-300">No</th>
                                                    <th className="p-1 w-16 border-r border-neutral-300">Kategori</th>
                                                    <th className="p-1 border-r border-neutral-300">Nama Material / Alat / Jasa</th>
                                                    <th className="p-1 w-12 text-center border-r border-neutral-300">Satuan</th>
                                                    <th className="p-1 w-12 text-center border-r border-neutral-300">Masuk</th>
                                                    <th className="p-1 w-14 text-center border-r border-neutral-300">Keluar / Terpakai</th>
                                                    <th className="p-1 w-14 text-center">Sisa / Stok</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materialItems.map((mat, idx) => (
                                                    <tr key={idx} className="border-b border-neutral-200 text-[6.5px]">
                                                        <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{idx + 1}</td>
                                                        <td className="p-1 border-r border-neutral-200 font-bold text-neutral-600 uppercase">{mat.category || "MATERIAL"}</td>
                                                        <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800">{mat.name || ""}</td>
                                                        <td className="p-1 text-center border-r border-neutral-200 font-semibold text-neutral-600">{mat.unit || "unit"}</td>
                                                        <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-800">{mat.incoming || "0"}</td>
                                                        <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-800">{mat.outgoing || "0"}</td>
                                                        <td className="p-1 text-center font-bold text-neutral-800">{mat.stock || "0"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Dokumentasi Lapangan */}
                                    {photos.length > 0 && (
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Dokumentasi Lapangan</div>
                                            <div className="grid grid-cols-2 gap-2 p-2 border border-neutral-300 border-t-0 bg-neutral-50/30">
                                                {photos.slice(0, 2).map((ph, idx) => (
                                                    <div key={idx} className="flex flex-col gap-1">
                                                        <img src={ph.url} alt="Dokumentasi" className="w-full h-32 object-cover rounded border border-neutral-200" />
                                                        <div className="text-[6px] font-semibold text-neutral-700 leading-tight">{ph.caption || "Dokumentasi foto"}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ---------------- LH PAGE 2 ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {/* Extra Photos if > 2 */}
                                        {photos.length > 2 && (
                                            <div>
                                                <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Dokumentasi Lapangan (Lanjutan)</div>
                                                <div className="grid grid-cols-2 gap-2 p-2 border border-neutral-300 border-t-0 bg-neutral-50/30">
                                                    {photos.slice(2).map((ph, idx) => (
                                                        <div key={idx} className="flex flex-col gap-1">
                                                            <img src={ph.url} alt="Dokumentasi" className="w-full h-32 object-cover rounded border border-neutral-200" />
                                                            <div className="text-[6px] font-semibold text-neutral-700 leading-tight">{ph.caption || "Dokumentasi foto"}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Catatan / Kendala */}
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Catatan / Kendala</div>
                                            <div className="p-2 border border-neutral-300 border-t-0 min-h-[100px] text-[7px] font-semibold text-neutral-800 leading-relaxed whitespace-pre-wrap">
                                                {notes || "Tidak ada catatan / kendala."}
                                            </div>
                                        </div>

                                        {/* Rencana Pekerjaan Lanjutan */}
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Rencana Pekerjaan Lanjutan</div>
                                            <div className="p-2 border border-neutral-300 border-t-0 min-h-[100px] text-[7px] font-semibold text-neutral-800 leading-relaxed whitespace-pre-wrap">
                                                {nextActions || "Tidak ada rencana khusus."}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Signatures */}
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

                            </div>
                        )}

                        {/* ===================== WEEKLY & MONTHLY PREVIEW (Multi-Page LM/LBL Code Format) ===================== */}
                        {(reportType === "weekly" || reportType === "monthly") && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                
                                {/* ---------------- PAGE 1: COVER (LM-XX-01 / LB-XX-01) ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(1), reportType === "monthly" ? "Laporan Bulanan" : "Laporan Mingguan")}

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
                                    
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(2), reportType === "monthly" ? "Executive Summary Bulanan" : "Executive Summary")}
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
                                                            <>
                                                                {effectiveHoursMonthlyTable.map((h, i) => (
                                                                    <tr key={i} className="border-b border-neutral-200">
                                                                        <td className="p-0.5 pl-1 font-semibold text-neutral-700">{h.weekLabel}</td>
                                                                        <td className="p-0.5 text-center text-neutral-600">{h.totalHours} jam</td>
                                                                        <td className="p-0.5 text-right pr-1 font-bold text-neutral-900">efektif {h.effectiveHours} jam</td>
                                                                    </tr>
                                                                ))}
                                                                {(() => {
                                                                    const count = effectiveHoursMonthlyTable.length || 1;
                                                                    const avgTot = Math.round(effectiveHoursMonthlyTable.reduce((a, b) => a + (parseFloat(b.totalHours) || 0), 0) / count);
                                                                    const avgEff = Math.round(effectiveHoursMonthlyTable.reduce((a, b) => a + (parseFloat(b.effectiveHours) || 0), 0) / count);
                                                                    return (
                                                                        <tr className="bg-neutral-100 font-black text-neutral-900 border-t border-neutral-300">
                                                                            <td className="p-0.5 pl-1 uppercase font-black text-neutral-900">Rata-rata</td>
                                                                            <td className="p-0.5 text-center">{avgTot} jam</td>
                                                                            <td className="p-0.5 text-right pr-1 font-black text-neutral-900">efektif {avgEff} jam</td>
                                                                        </tr>
                                                                    );
                                                                })()}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {effectiveHoursTable.map((h, i) => (
                                                                    <tr key={i} className="border-b border-neutral-200">
                                                                        <td className="p-0.5 pl-1 font-semibold text-neutral-700">{h.day}</td>
                                                                        <td className="p-0.5 text-center text-neutral-600">{h.totalHours} jam</td>
                                                                        <td className="p-0.5 text-right pr-1 font-bold text-neutral-900">efektif {h.effectiveHours} jam</td>
                                                                    </tr>
                                                                ))}
                                                                {(() => {
                                                                    const count = effectiveHoursTable.length || 1;
                                                                    const avgTot = Math.round(effectiveHoursTable.reduce((a, b) => a + (parseFloat(b.totalHours) || 0), 0) / count);
                                                                    const avgEff = Math.round(effectiveHoursTable.reduce((a, b) => a + (parseFloat(b.effectiveHours) || 0), 0) / count);
                                                                    return (
                                                                        <tr className="bg-neutral-100 font-black text-neutral-900 border-t border-neutral-300">
                                                                            <td className="p-0.5 pl-1 uppercase font-black text-neutral-900">Rata-rata</td>
                                                                            <td className="p-0.5 text-center">{avgTot} jam</td>
                                                                            <td className="p-0.5 text-right pr-1 font-black text-neutral-900">efektif {avgEff} jam</td>
                                                                        </tr>
                                                                    );
                                                                })()}
                                                            </>
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
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(3), "Work Breakdown Structure")}
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
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(4), "Kurva S")}
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
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(5), "Kegiatan Pekerjaan")}
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
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(6), "Laporan Personel")}
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
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(7), "Laporan Cuaca")}
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
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(8), "Laporan Kendala")}
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
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(9), "Dokumentasi Pekerjaan")}
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
                                    {renderPageHeader(reportType === "monthly" ? "RMN" : "RWK", getReportPageDocCode(10), reportType === "monthly" ? "Lampiran Laporan Mingguan / Harian" : "Lampiran Laporan Harian")}
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

                        {/* ===================== SCH (PROJECT SCHEDULE) BILINGUAL PREVIEW ===================== */}
                        {reportType === "schedule" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                
                                {/* ---------------- PAGE 1: SETUP, PROGRESS UPDATE & WBS ACTIVITIES ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("SCH", documentId || "SCH-01-01", schLangMode === "en" ? "PROJECT SCHEDULE" : schLangMode === "id" ? "Jadwal Pelaksanaan Proyek" : "PROJECT SCHEDULE / Jadwal Pelaksanaan Proyek")}

                                        {/* Date Meta Row */}
                                        <div className="grid grid-cols-5 border border-neutral-300 rounded overflow-hidden text-center">
                                            {[
                                                { label: schLangMode === "en" ? "PROJECT" : schLangMode === "id" ? "PROYEK" : "PROYEK / PROJECT", value: currentProject?.project_code || "PROYEK" },
                                                { label: schLangMode === "en" ? "DATA DATE" : schLangMode === "id" ? "TGL DATA" : "DATA DATE / TGL DATA", value: schDataDate || getDayDateOnly() },
                                                { label: schLangMode === "en" ? "BASELINE" : schLangMode === "id" ? "BASELINE" : "BASELINE VER", value: schBaselineVersion || "Rev 1.0" },
                                                { label: schLangMode === "en" ? "REVISION" : schLangMode === "id" ? "REVISI" : "REVISI / REV", value: schRevision || "REV-01" },
                                                { label: schLangMode === "en" ? "CALENDAR" : schLangMode === "id" ? "KALENDER" : "CALENDAR", value: schWorkCalendar || "7-Day" },
                                            ].map((cell, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{cell.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{cell.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Section Banner 1: Setup & Progress Summary */}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
                                            <span>
                                                {schLangMode === "en" 
                                                    ? "1. SCHEDULE SETUP & PROGRESS UPDATE SUMMARY" 
                                                    : schLangMode === "id" 
                                                    ? "1. PENGATURAN JADWAL & RINGKASAN PEMBARUAN PROGRES" 
                                                    : "1. SCHEDULE SETUP & PROGRESS UPDATE / PENGATURAN & PEMBARUAN PROGRES"}
                                            </span>
                                            <span className="text-[6.5px] font-normal text-neutral-300">Cut-off: {schCutoffDate || "—"}</span>
                                        </div>

                                        {/* Progress Update Metric Cards */}
                                        <div className="grid grid-cols-4 gap-2 border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-center">
                                            <div className="border-r border-neutral-200 pr-2">
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "BASELINE DATES" : schLangMode === "id" ? "TGL RENCANA" : "BASELINE DATES / RENCANA"}
                                                </div>
                                                <div className="text-[7.5px] font-bold text-neutral-800 mt-1">
                                                    {schBaselineStartDate || "—"} s/d {schBaselineFinishDate || "—"}
                                                </div>
                                            </div>
                                            <div className="border-r border-neutral-200 pr-2">
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "ACTUAL DATES" : schLangMode === "id" ? "TGL REALISASI" : "ACTUAL DATES / REALISASI"}
                                                </div>
                                                <div className="text-[7.5px] font-bold text-neutral-800 mt-1">
                                                    {schActualStartDate || "—"} s/d {schActualFinishDate || "—"}
                                                </div>
                                            </div>
                                            <div className="border-r border-neutral-200 pr-2">
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "REMAINING DURATION" : schLangMode === "id" ? "SISA DURASI" : "REMAINING DURATION / SISA"}
                                                </div>
                                                <div className="text-[10px] font-black text-blue-600 mt-0.5">{schRemainingDuration || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "PROGRESS & FORECAST" : schLangMode === "id" ? "PROGRES & FORECAST" : "PROGRESS / FORECAST"}
                                                </div>
                                                <div className="text-[10px] font-black text-emerald-600 mt-0.5">{schProgress || "0%"}</div>
                                                <div className="text-[6px] font-bold text-neutral-500">{schForecastFinishDate ? `Est: ${schForecastFinishDate}` : ""}</div>
                                            </div>
                                        </div>

                                        {/* Section Banner 2: WBS & Activities Table */}
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between items-center">
                                            <span>
                                                {schLangMode === "en" 
                                                    ? "2. WORK BREAKDOWN STRUCTURE (WBS) & ACTIVITIES" 
                                                    : schLangMode === "id" 
                                                    ? "2. WBS & AKTIVITAS PEKERJAAN" 
                                                    : "2. WBS & ACTIVITIES / AKTIVITAS PEKERJAAN"}
                                            </span>
                                            <span className="text-[6.5px] font-mono">TOTAL TASK: {schActivities.length}</span>
                                        </div>

                                        <table className="w-full text-left border border-neutral-300 border-t-0 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="p-1.5 w-6 text-center border-r border-neutral-300">NO</th>
                                                    <th className="p-1.5 w-12 text-center border-r border-neutral-300">WBS</th>
                                                    <th className="p-1.5 border-r border-neutral-300">
                                                        {schLangMode === "en" ? "ACTIVITY DESCRIPTION" : schLangMode === "id" ? "AKTIVITAS PEKERJAAN" : "ACTIVITY / AKTIVITAS PEKERJAAN"}
                                                    </th>
                                                    <th className="p-1.5 w-16 text-center border-r border-neutral-300">
                                                        {schLangMode === "en" ? "DURATION" : schLangMode === "id" ? "DURASI" : "DURATION / DURASI"}
                                                    </th>
                                                    <th className="p-1.5 w-20 border-r border-neutral-300">
                                                        {schLangMode === "en" ? "DEPENDENCY" : schLangMode === "id" ? "KETERGANTUNGAN" : "DEPENDENCY"}
                                                    </th>
                                                    <th className="p-1.5 w-24 border-r border-neutral-300">MILESTONE</th>
                                                    <th className="p-1.5 w-14 text-center">
                                                        {schLangMode === "en" ? "WEIGHT (%)" : schLangMode === "id" ? "BOBOT (%)" : "WEIGHT / BOBOT"}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {schActivities.map((act, idx) => (
                                                    <tr key={idx} className="border-b border-neutral-200">
                                                        <td className="p-1.5 text-center border-r border-neutral-200 font-bold text-neutral-400">{idx + 1}</td>
                                                        <td className="p-1.5 text-center border-r border-neutral-200 font-mono font-bold text-blue-800">{act.wbs || "—"}</td>
                                                        <td className="p-1.5 border-r border-neutral-200 font-bold text-neutral-900">{act.activity || "—"}</td>
                                                        <td className="p-1.5 text-center border-r border-neutral-200 text-neutral-700 font-semibold">{act.duration || "—"}</td>
                                                        <td className="p-1.5 border-r border-neutral-200 text-neutral-600 font-mono text-[6px]">{act.dependency || "—"}</td>
                                                        <td className="p-1.5 border-r border-neutral-200 text-neutral-800 font-semibold">{act.milestone || "—"}</td>
                                                        <td className="p-1.5 text-center font-black text-neutral-900 bg-neutral-50/50">{act.weight || "0.00%"}</td>
                                                    </tr>
                                                ))}
                                                {schActivities.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="p-4 text-center text-neutral-400 italic">Belum ada item aktivitas ditambahkan.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Footer Brand */}
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — PROJECT SCHEDULE REPORT (SCH)</span>
                                        <span>{documentId || "SCH-01-01"}</span>
                                    </div>
                                </div>

                                {/* ---------------- PAGE 2: CRITICAL PATH, DELAY & S-CURVE FORECAST ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("SCH", `${documentId || "SCH-01-01"}-02`, schLangMode === "en" ? "CRITICAL PATH & FORECAST" : schLangMode === "id" ? "Jalur Kritis & Perkiraan Schedule" : "CRITICAL PATH & S-CURVE FORECAST")}

                                        {/* Section Banner 4: Critical Path & Delay */}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex items-center justify-between">
                                            <span>
                                                {schLangMode === "en" 
                                                    ? "4. CRITICAL PATH & DELAY ANALYSIS" 
                                                    : schLangMode === "id" 
                                                    ? "4. JALUR KRITIS & ANALISIS KETERLAMBATAN" 
                                                    : "4. CRITICAL PATH & DELAY / JALUR KRITIS & KETERLAMBATAN"}
                                            </span>
                                            <span className="text-[7px] font-bold text-amber-300">Float: {schTotalFloat || "0 Hari"}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50">
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase border-b border-neutral-200 pb-1">
                                                    {schLangMode === "en" ? "CRITICAL ACTIVITIES" : schLangMode === "id" ? "AKTIVITAS JALUR KRITIS" : "CRITICAL ACTIVITIES / JALUR KRITIS"}
                                                </div>
                                                <div className="text-[7.5px] font-bold text-neutral-900 mt-1.5 leading-relaxed whitespace-pre-wrap">
                                                    {schCriticalActivities || "—"}
                                                </div>
                                            </div>

                                            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50">
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase border-b border-neutral-200 pb-1">
                                                    {schLangMode === "en" ? "DELAY EVENT / CAUSE" : schLangMode === "id" ? "KEJADIAN KETERLAMBATAN" : "DELAY EVENT / KETERLAMBATAN"}
                                                </div>
                                                <div className="text-[7.5px] font-bold text-rose-700 mt-1.5 leading-relaxed whitespace-pre-wrap">
                                                    {schDelayEvent || "—"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50">
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase border-b border-neutral-200 pb-1">
                                                    {schLangMode === "en" ? "SCHEDULE IMPACT" : schLangMode === "id" ? "DAMPAK PADA JADWAL" : "SCHEDULE IMPACT / DAMPAK JADWAL"}
                                                </div>
                                                <div className="text-[7.5px] font-bold text-neutral-900 mt-1.5 leading-relaxed whitespace-pre-wrap">
                                                    {schScheduleImpact || "—"}
                                                </div>
                                            </div>

                                            <div className="border border-neutral-300 rounded p-2.5 bg-emerald-50/30">
                                                <div className="text-[6px] font-extrabold text-emerald-700 uppercase border-b border-emerald-200 pb-1">
                                                    {schLangMode === "en" ? "RECOVERY ACTION / CATCH-UP PLAN" : schLangMode === "id" ? "TINDAKAN PEMULIHAN & PERCEPATAN" : "RECOVERY ACTION / PEMULIHAN"}
                                                </div>
                                                <div className="text-[7.5px] font-bold text-emerald-900 mt-1.5 leading-relaxed whitespace-pre-wrap">
                                                    {schRecoveryAction || "—"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section Banner 5: S-Curve & Forecast */}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                            {schLangMode === "en" 
                                                ? "5. S-CURVE PERFORMANCE & FORECAST COMPLETION" 
                                                : schLangMode === "id" 
                                                ? "5. PERFORMA KURVA-S & PERKIRAAN SELESAI" 
                                                : "5. S-CURVE PERFORMANCE & FORECAST / KURVA-S & PERKIRAAN"}
                                        </div>

                                        <div className="grid grid-cols-5 gap-2 border border-neutral-300 rounded p-3 bg-neutral-50/50 text-center">
                                            <div className="border-r border-neutral-200 pr-1">
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "PLANNED" : schLangMode === "id" ? "RENCANA" : "PLANNED / RENCANA"}
                                                </div>
                                                <div className="text-[10px] font-black text-neutral-900 mt-0.5">{schPlanned || "0%"}</div>
                                            </div>
                                            <div className="border-r border-neutral-200 pr-1">
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "ACTUAL" : schLangMode === "id" ? "REALISASI" : "ACTUAL / REALISASI"}
                                                </div>
                                                <div className="text-[10px] font-black text-emerald-600 mt-0.5">{schActual || "0%"}</div>
                                            </div>
                                            <div className="border-r border-neutral-200 pr-1">
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "EARNED VALUE" : schLangMode === "id" ? "NILAI HASIL" : "EARNED VALUE"}
                                                </div>
                                                <div className="text-[9px] font-black text-blue-700 mt-0.5 truncate">{schEarned || "—"}</div>
                                            </div>
                                            <div className="border-r border-neutral-200 pr-1">
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "VARIANCE" : schLangMode === "id" ? "VARIANSI" : "VARIANCE / VARIANSI"}
                                                </div>
                                                <div className="text-[9px] font-black text-amber-600 mt-0.5 truncate">{schVariance || "0%"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">
                                                    {schLangMode === "en" ? "FORECAST COMPLETION" : schLangMode === "id" ? "ESTIMASI SELESAI" : "FORECAST COMPLETION"}
                                                </div>
                                                <div className="text-[9px] font-black text-purple-700 mt-0.5">{schForecastCompletion || "—"}</div>
                                            </div>
                                        </div>

                                        {/* Notes & Extra Observations */}
                                        {notes && (
                                            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/40">
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase border-b border-neutral-200 pb-1">
                                                    {schLangMode === "en" ? "TECHNICAL NOTES & RECOMMENDATIONS" : schLangMode === "id" ? "CATATAN TEKNIS & REKOMENDASI" : "TECHNICAL NOTES / CATATAN TEKNIS"}
                                                </div>
                                                <div className="text-[7.5px] font-bold text-neutral-800 mt-1 leading-relaxed whitespace-pre-wrap">
                                                    {notes}
                                                </div>
                                            </div>
                                        )}

                                        {/* Dynamic Approval Signatures (1 to 4 Columns) */}
                                        <div className={clsx(
                                            "grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300",
                                            schApprovals.length === 1 ? "grid-cols-1" :
                                            schApprovals.length === 2 ? "grid-cols-2" :
                                            schApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4"
                                        )}>
                                            {schApprovals.map((app, idx) => {
                                                let label = "PREPARED BY / DISUSUN OLEH";
                                                if (app.type === "disusun") {
                                                    label = schLangMode === "en" ? "PREPARED BY" : schLangMode === "id" ? "DISUSUN OLEH" : "PREPARED BY / DISUSUN OLEH";
                                                } else if (app.type === "dicek") {
                                                    label = schLangMode === "en" ? "CHECKED BY" : schLangMode === "id" ? "DICEK OLEH" : "CHECKED BY / DICEK OLEH";
                                                } else if (app.type === "mengetahui") {
                                                    label = schLangMode === "en" ? "ACKNOWLEDGED BY" : schLangMode === "id" ? "MENGETAHUI" : "ACKNOWLEDGED BY / MENGETAHUI";
                                                } else if (app.type === "disetujui") {
                                                    label = schLangMode === "en" ? "APPROVED BY" : schLangMode === "id" ? "DISETUJUI OLEH" : "APPROVED BY / DISETUJUI OLEH";
                                                }

                                                return (
                                                    <div key={idx} className={clsx("flex flex-col justify-between h-24", idx > 0 && "pl-3")}>
                                                        <div>
                                                            <div className="text-[6px] font-extrabold text-neutral-400 uppercase tracking-wider">
                                                                {label}
                                                            </div>
                                                            <div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[8.5px] font-black text-neutral-900 underline uppercase truncate px-1">
                                                                {app.name || "( .................... )"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Footer Brand */}
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — PROJECT SCHEDULE REPORT (SCH) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "SCH-01-01-02"}</span>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* ===================== CST (COST & BUDGET) BILINGUAL PREVIEW ===================== */}
                        {reportType === "cost" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("CST", documentId || "CST-01-01", cstLangMode === "en" ? "COST & BUDGET REPORT" : cstLangMode === "id" ? "LAPORAN BIAYA & ANGGARAN" : "COST & BUDGET REPORT / LAPORAN BIAYA & ANGGARAN")}
                                        <div className="grid grid-cols-5 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: "PROYEK / PROJECT", value: currentProject?.project_code || "PROYEK" },
                                                { label: "NILAI KONTRAK", value: cstContractValue || "—" },
                                                { label: "RAB DISETUJUI", value: cstApprovedRAB || "—" },
                                                { label: "CONTINGENCY", value: cstContingency || "—" },
                                                { label: "REVISI", value: cstBudgetRevision || "REV-00" },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">1. VARIANCE & EARNED VALUE ANALYSIS</div>
                                        <div className="grid grid-cols-6 gap-2 border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-center">
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">PV (PLANNED)</div><div className="text-[8px] font-black text-neutral-800 mt-0.5">{cstPV || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">EV (EARNED)</div><div className="text-[8px] font-black text-blue-600 mt-0.5">{cstEV || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">AC (ACTUAL)</div><div className="text-[8px] font-black text-neutral-900 mt-0.5">{cstAC || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">CV (VARIANCE)</div><div className="text-[8px] font-black text-amber-600 mt-0.5">{cstCV || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">CPI (INDEX)</div><div className="text-[8px] font-black text-purple-600 mt-0.5">{cstCPI || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">EAC (FORECAST)</div><div className="text-[8px] font-black text-emerald-600 mt-0.5">{cstEAC || "—"}</div></div>
                                        </div>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. COST BY WORK PACKAGE / BIAYA PER PAKET PEKERJAAN</span>
                                            <span className="font-mono">ITEMS: {cstWorkPackages.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 w-8">CODE</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">DESCRIPTION</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">ORIGINAL</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">REVISED</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">COMMITTED</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">ACTUAL</th>
                                                    <th className="py-1 px-1.5 text-right">REMAINING</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cstWorkPackages.map((wp, i) => (
                                                    <tr key={i} className="border-b border-neutral-200 hover:bg-neutral-50">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{wp.costCode || i + 1}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-medium">{wp.description || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono">{wp.originalBudget || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono">{wp.revisedBudget || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono">{wp.committed || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono font-bold text-neutral-900">{wp.actual || "—"}</td>
                                                        <td className="py-1 px-1.5 text-right font-mono font-bold text-blue-600">{wp.remaining || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — COST & BUDGET REPORT (CST) — PAGE 1</span>
                                        <span>{documentId || "CST-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("CST", `${documentId || "CST-01-01"}-02`, "COST & BUDGET REPORT — PAGE 2")}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>3. COMMITMENT & ACTUAL COST REGISTER</span>
                                            <span className="font-mono">PO/SPK: {cstCommitments.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">NO. PO/SPK</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">VENDOR / SUPPLIER</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">VALUE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">INVOICED</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">PAID</th>
                                                    <th className="py-1 px-1.5 text-right">ACCRUAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cstCommitments.map((c, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{c.poSpk || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-medium">{c.vendor || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono">{c.value || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono">{c.invoiced || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono text-emerald-600 font-bold">{c.paid || "—"}</td>
                                                        <td className="py-1 px-1.5 text-right font-mono text-amber-600">{c.accrual || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">4. CASHFLOW & FORECAST SUMMARY</div>
                                        <div className="grid grid-cols-4 gap-2 border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">PLANNED CASHFLOW</div><div className="text-[8.5px] font-bold text-neutral-800 mt-0.5">{cstPlannedCashflow || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">ACTUAL CASHFLOW</div><div className="text-[8.5px] font-bold text-blue-600 mt-0.5">{cstActualCashflow || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">OUTSTANDING PAYMENT</div><div className="text-[8.5px] font-bold text-amber-600 mt-0.5">{cstOutstandingPayment || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">FORECAST (EAC)</div><div className="text-[8.5px] font-black text-purple-700 mt-0.5">{cstForecast || "—"}</div></div>
                                        </div>
                                        {cstCorrectiveAction && (
                                            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50">
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase border-b border-neutral-200 pb-1">CORRECTIVE ACTION / TINDAKAN KOREKTIF</div>
                                                <div className="text-[7.5px] font-bold text-neutral-800 mt-1 leading-relaxed">{cstCorrectiveAction}</div>
                                            </div>
                                        )}
                                        {/* Dynamic Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", cstApprovals.length === 1 ? "grid-cols-1" : cstApprovals.length === 2 ? "grid-cols-2" : cstApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {cstApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{app.type.toUpperCase()} BY</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — COST & BUDGET REPORT (CST) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "CST-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== CRW (MANPOWER & PAYROLL) BILINGUAL PREVIEW ===================== */}
                        {reportType === "manpower" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("CRW", documentId || "CRW-01-01", crwLangMode === "en" ? "MANPOWER & PAYROLL REPORT" : crwLangMode === "id" ? "LAPORAN TENAGA KERJA & GAJI" : "MANPOWER & PAYROLL / LAPORAN TENAGA KERJA & GAJI")}
                                        <div className="grid grid-cols-5 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: "PROYEK", value: currentProject?.project_code || "PROYEK" },
                                                { label: "ATTENDANCE TOTAL", value: crwAttendanceTotal || "0" },
                                                { label: "NORMAL HOURS", value: crwNormalHours || "0 Jam" },
                                                { label: "OVERTIME", value: crwOvertime || "0 Jam" },
                                                { label: "MANDAYS", value: crwMandays || "0 MD" },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>1. WORKFORCE LIST & RATE SETUP</span>
                                            <span className="font-mono">TOTAL: {crwWorkforce.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">COMPANY / PERUSAHAAN</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">CREW / TIM</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">POSITION / JABATAN</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">RATE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">SHIFT</th>
                                                    <th className="py-1 px-1.5">EMPLOYMENT TYPE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {crwWorkforce.map((w, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold">{w.perusahaan || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300">{w.crew || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{w.jabatan || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono font-bold text-emerald-600">{w.rate || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{w.shift || "—"}</td>
                                                        <td className="py-1 px-1.5">{w.employmentType || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. CREW ALLOCATION BY AREA</span>
                                            <span className="font-mono">AREAS: {crwAllocations.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">WORK AREA</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">WBS</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">SUPERVISOR</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">HEADCOUNT</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">PRODUCTIVITY</th>
                                                    <th className="py-1 px-1.5 text-right">UTILISATION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {crwAllocations.map((a, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{a.area || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{a.wbs || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{a.supervisor || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-bold">{a.jumlah || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-bold text-blue-600">{a.produktivitas || "—"}</td>
                                                        <td className="py-1 px-1.5 text-right font-bold text-emerald-600">{a.utilisation || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — MANPOWER & PAYROLL (CRW) — PAGE 1</span>
                                        <span>{documentId || "CRW-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("CRW", `${documentId || "CRW-01-01"}-02`, "MANPOWER & PAYROLL — PAGE 2")}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">3. PAYROLL CALCULATION & VERIFICATION</div>
                                        <div className="grid grid-cols-5 gap-2 border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">BASE WAGE</div><div className="text-[8.5px] font-bold text-neutral-800 mt-0.5">{crwBaseWage || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">OVERTIME PAY</div><div className="text-[8.5px] font-bold text-blue-600 mt-0.5">{crwOvertimePay || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">ALLOWANCE</div><div className="text-[8.5px] font-bold text-emerald-600 mt-0.5">{crwAllowance || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">DEDUCTION</div><div className="text-[8.5px] font-bold text-rose-600 mt-0.5">{crwDeduction || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">NET PAYROLL</div><div className="text-[9px] font-black text-blue-700 mt-0.5">{crwNetPayroll || "—"}</div></div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 border border-neutral-300 rounded p-2.5 bg-neutral-50/50">
                                            <div><div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">DISPUTE STATUS</div><div className="text-[7.5px] font-bold text-neutral-800 mt-0.5">{crwDispute || "None"}</div></div>
                                            <div><div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">APPROVAL STATUS</div><div className="text-[7.5px] font-bold text-emerald-600 mt-0.5">{crwPayrollApproval || "Approved"}</div></div>
                                            <div><div className="text-[5.5px] font-extrabold text-neutral-400 uppercase">PAYMENT DATE</div><div className="text-[7.5px] font-bold text-neutral-800 mt-0.5">{crwPaymentStatus} ({crwPaymentDate})</div></div>
                                        </div>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-4 divide-x divide-neutral-300", crwApprovals.length === 1 ? "grid-cols-1" : crwApprovals.length === 2 ? "grid-cols-2" : crwApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {crwApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{app.type.toUpperCase()} BY</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — MANPOWER & PAYROLL (CRW) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "CRW-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== PRC (PROCUREMENT & STOCK) BILINGUAL PREVIEW ===================== */}
                        {reportType === "procurement" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("PRC", documentId || "PRC-01-01", prcLangMode === "en" ? "PROCUREMENT & STOCK REPORT" : prcLangMode === "id" ? "LAPORAN PENGADAAN & STOK" : "PROCUREMENT & STOCK / LAPORAN PENGADAAN & STOK")}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: "PROYEK", value: currentProject?.project_code || "PROYEK" },
                                                { label: "PLAN ITEMS", value: prcPlanItems.length },
                                                { label: "PO ORDERS", value: prcOrders.length },
                                                { label: "STORAGE LOCATION", value: prcStorageLocation || "—" },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>1. PROCUREMENT PLAN ITEMS</span>
                                            <span className="font-mono">ITEMS: {prcPlanItems.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">MATERIAL / SERVICE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">WBS</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">REQUIRED DATE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">LEAD TIME</th>
                                                    <th className="py-1 px-1.5">METHOD</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prcPlanItems.map((p, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{p.material || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{p.wbs || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{p.requiredDate || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{p.leadTime || "—"}</td>
                                                        <td className="py-1 px-1.5">{p.method || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. RFQ, SELECTION & PO REGISTER</span>
                                            <span className="font-mono">ORDERS: {prcOrders.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">VENDOR</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">QUOTATION</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">COMPARISON</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">PO/SPK NO.</th>
                                                    <th className="py-1 px-1.5 text-right">CONTRACT VALUE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prcOrders.map((o, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{o.vendor || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono">{o.quotation || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{o.comparison || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{o.poSpk || "—"}</td>
                                                        <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-600">{o.contractValue || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — PROCUREMENT & STOCK (PRC) — PAGE 1</span>
                                        <span>{documentId || "PRC-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("PRC", `${documentId || "PRC-01-01"}-02`, "PROCUREMENT & STOCK — PAGE 2")}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>3. DELIVERY & INSPECTION REGISTER</span>
                                            <span className="font-mono">DELIVERIES: {prcDeliveries.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">ITEM</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">SCHEDULE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">RCVD QTY</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">INSPECTION RESULT</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">REJECTED</th>
                                                    <th className="py-1 px-1.5">STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prcDeliveries.map((d, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{d.item || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{d.schedule || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-bold">{d.receivedQty || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold text-emerald-600">{d.inspectionResult || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right text-rose-600 font-bold">{d.rejectedQty || "0"}</td>
                                                        <td className="py-1 px-1.5 font-bold">{d.status || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">4. STOCK & CONSUMPTION BALANCE</div>
                                        <div className="grid grid-cols-5 gap-2 border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">OPENING</div><div className="text-[8.5px] font-bold text-neutral-800 mt-0.5">{prcOpeningStock || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">RECEIVED</div><div className="text-[8.5px] font-bold text-emerald-600 mt-0.5">{prcReceived || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">ISSUED</div><div className="text-[8.5px] font-bold text-blue-600 mt-0.5">{prcIssued || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">RETURNED</div><div className="text-[8.5px] font-bold text-amber-600 mt-0.5">{prcReturned || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">CLOSING STOCK</div><div className="text-[9px] font-black text-purple-700 mt-0.5">{prcClosingStock || "—"}</div></div>
                                        </div>
                                        {prcExpeditingAction && (
                                            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50">
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase border-b border-neutral-200 pb-1">SHORTAGE & EXPEDITING ACTION (PIC: {prcPIC || "Logistics"})</div>
                                                <div className="text-[7.5px] font-bold text-neutral-800 mt-1 leading-relaxed">{prcExpeditingAction} (Late: {prcLateDelivery || "None"}, Variance: {prcLeadTimeVariance || "—"})</div>
                                            </div>
                                        )}
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", prcApprovals.length === 1 ? "grid-cols-1" : prcApprovals.length === 2 ? "grid-cols-2" : prcApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {prcApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{app.type.toUpperCase()} BY</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — PROCUREMENT & STOCK (PRC) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "PRC-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== FIN (FINANCE REGISTER) BILINGUAL PREVIEW ===================== */}
                        {reportType === "finance" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("FIN", documentId || "FIN-01-01", finLangMode === "en" ? "FINANCE REGISTER" : finLangMode === "id" ? "REGISTER KEUANGAN" : "FINANCE REGISTER / REGISTER KEUANGAN")}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: "REKENING / BANK ACCOUNT", value: finBankAccount || "—" },
                                                { label: "SALDO AWAL", value: finOpeningBalance || "—" },
                                                { label: "MATA UANG", value: finCurrency || "IDR" },
                                                { label: "CUSTODIAN / PEMEGANG", value: finCustodian || "—" },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>1. CASH & BANK TRANSACTIONS REGISTER</span>
                                            <span className="font-mono">COUNT: {finTransactions.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">VOUCHER</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">DATE</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">DESCRIPTION</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">DEBIT (IN)</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">CREDIT (OUT)</th>
                                                    <th className="py-1 px-1.5 text-right">BALANCE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {finTransactions.map((tx, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{tx.voucher || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{tx.date || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-medium">{tx.description || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono text-emerald-600 font-bold">{tx.debit || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono text-rose-600 font-bold">{tx.credit || "—"}</td>
                                                        <td className="py-1 px-1.5 text-right font-mono font-bold text-blue-700">{tx.balance || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — FINANCE REGISTER (FIN) — PAGE 1</span>
                                        <span>{documentId || "FIN-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("FIN", `${documentId || "FIN-01-01"}-02`, "FINANCE REGISTER — PAGE 2")}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. RECEIVABLE & PAYABLE REGISTER</span>
                                            <span className="font-mono">ITEMS: {finReceivables.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">PARTY / VENDOR</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">INVOICE NO.</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">DUE DATE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">OUTSTANDING</th>
                                                    <th className="py-1 px-1.5">STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {finReceivables.map((r, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{r.party || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{r.invoice || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{r.dueDate || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono font-bold text-amber-600">{r.outstanding || "—"}</td>
                                                        <td className="py-1 px-1.5 font-bold">{r.status || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">3. BANK RECONCILIATION & CLOSING REVIEW</div>
                                        <div className="grid grid-cols-4 gap-2 border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">BOOK BALANCE</div><div className="text-[8.5px] font-bold text-neutral-800 mt-0.5">{finBookBalance || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">BANK BALANCE</div><div className="text-[8.5px] font-bold text-blue-600 mt-0.5">{finBankBalance || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">DIFFERENCE</div><div className="text-[8.5px] font-bold text-rose-600 mt-0.5">{finDifference || "—"}</div></div>
                                            <div><div className="text-[5px] font-extrabold text-neutral-400">CLOSING STATUS</div><div className="text-[8.5px] font-black text-emerald-600 mt-0.5">{finClosingApproval || "—"}</div></div>
                                        </div>
                                        {finSupportingEvidence && (
                                            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50">
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase border-b border-neutral-200 pb-1">RECONCILIATION EVIDENCE & AUDIT COMMENTS</div>
                                                <div className="text-[7.5px] font-bold text-neutral-800 mt-1 leading-relaxed">{finSupportingEvidence} {finReviewerComments && `| Audit Note: ${finReviewerComments}`}</div>
                                            </div>
                                        )}
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", finApprovals.length === 1 ? "grid-cols-1" : finApprovals.length === 2 ? "grid-cols-2" : finApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {finApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{app.type.toUpperCase()} BY</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — FINANCE REGISTER (FIN) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "FIN-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== RSC (EQUIPMENT & ASSET) BILINGUAL PREVIEW ===================== */}
                        {reportType === "resources" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("RSC", documentId || "RSC-01-01", rscLangMode === "en" ? "EQUIPMENT & ASSET REGISTER" : rscLangMode === "id" ? "REGISTER ALAT & ASET" : "EQUIPMENT & ASSET REGISTER / REGISTER ALAT & ASET")}
                                        <div className="grid grid-cols-3 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: "PROYEK", value: currentProject?.project_code || "PROYEK" },
                                                { label: "TOTAL ASSETS", value: rscAssets.length },
                                                { label: "MOBILISED UNITS", value: rscMobilisations.length },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>1. ASSET MASTER REGISTER</span>
                                            <span className="font-mono">UNITS: {rscAssets.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">CODE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">OWNERSHIP</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">TYPE</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">BRAND / MODEL</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">CAPACITY</th>
                                                    <th className="py-1 px-2">LOCATION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rscAssets.map((a, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{a.assetCode || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{a.ownership || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{a.type || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300">{a.brandModel || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{a.capacity || "—"}</td>
                                                        <td className="py-1 px-2">{a.location || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. MOBILISATION & ASSIGNMENT</span>
                                            <span className="font-mono">LOGS: {rscMobilisations.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">ASSET CODE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">MOBIL. DATE</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">ASSIGNED AREA</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">OPERATOR</th>
                                                    <th className="py-1 px-1.5">PLANNED DURATION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rscMobilisations.map((m, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{m.assetCode || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{m.mobilDate || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300">{m.assignedArea || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{m.operator || "—"}</td>
                                                        <td className="py-1 px-1.5">{m.plannedDuration || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — EQUIPMENT & ASSET (RSC) — PAGE 1</span>
                                        <span>{documentId || "RSC-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("RSC", `${documentId || "RSC-01-01"}-02`, "EQUIPMENT & ASSET REGISTER — PAGE 2")}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>3. OPERATION & MAINTENANCE LOG</span>
                                            <span className="font-mono font-normal">HM & Maintenance</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">ASSET</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">WORK/IDLE HRS</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">HM</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">OUTPUT</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">FUEL</th>
                                                    <th className="py-1 px-1.5">CHECKLIST / SERVICE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rscOperations.map((op, i) => {
                                                    const insp = rscInspections.find(inItem => inItem.assetCode === op.assetCode) || rscInspections[i];
                                                    return (
                                                        <tr key={i} className="border-b border-neutral-200">
                                                            <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{op.assetCode || "—"}</td>
                                                            <td className="py-1 px-1.5 border-r border-neutral-300">{op.workingHours || "—"} / {op.idleHours || "0"}</td>
                                                            <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold text-blue-600">{op.hourMeter || "—"}</td>
                                                            <td className="py-1 px-1.5 border-r border-neutral-300 font-bold">{op.output || "—"}</td>
                                                            <td className="py-1 px-1.5 border-r border-neutral-300 font-mono text-amber-600">{op.fuelUse || "—"}</td>
                                                            <td className="py-1 px-1.5 font-bold text-emerald-600">{insp?.checklist || "Pass"} ({insp?.serviceSchedule || "OK"})</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>4. DEMOBILISATION & RENTAL COST SUMMARY</span>
                                            <span className="font-mono font-normal">Costs & Conditions</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">ASSET CODE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">OFF-HIRE DATE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">RENTAL COST</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">FUEL COST</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 text-right">REPAIR COST</th>
                                                    <th className="py-1 px-1.5">FINAL CONDITION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rscDemobilisations.map((d, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{d.assetCode || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{d.offHireDate || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono font-bold text-blue-600">{d.rentalCost || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono">{d.fuelCost || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-right font-mono text-rose-600">{d.repairCost || "—"}</td>
                                                        <td className="py-1 px-1.5 font-bold text-emerald-600">{d.finalCondition || "Good"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", rscApprovals.length === 1 ? "grid-cols-1" : rscApprovals.length === 2 ? "grid-cols-2" : rscApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {rscApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{app.type.toUpperCase()} BY</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — EQUIPMENT & ASSET (RSC) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "RSC-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== QAC (QUALITY CONTROL) BILINGUAL PREVIEW ===================== */}
                        {reportType === "quality" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("QAC", documentId || "QAC-01-01", getLangText(qacLangMode, "QUALITY CONTROL REPORT", "LAPORAN INSPEKSI MUTU"))}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: getLangText(qacLangMode, "PROJECT", "PROYEK"), value: currentProject?.project_code || "PROYEK" },
                                                { label: getLangText(qacLangMode, "ITP PLAN ITEMS", "ITEM RENCANA ITP"), value: qacPlans.length },
                                                { label: getLangText(qacLangMode, "INSPECTION REQUESTS", "PERMINTAAN INSPEKSI"), value: qacRequests.length },
                                                { label: getLangText(qacLangMode, "OPEN NCR DEFECTS", "DEFECT NCR AKTIF"), value: qacNcrs.length },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>1. {getLangText(qacLangMode, "INSPECTION & TEST PLAN (ITP) REFERENCE", "ACUAN RENCANA INSPEKSI & PENGUJIAN (ITP)")}</span>
                                            <span className="font-mono">PLANS: {qacPlans.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 font-mono">ITP REF</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(qacLangMode, "WORK ITEM", "PEKERJAAN")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(qacLangMode, "STAGE", "TAHAPAN")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(qacLangMode, "HOLD/WITNESS", "TITIK HOLD/WITNESS")}</th>
                                                    <th className="py-1 px-1.5">{getLangText(qacLangMode, "ACCEPTANCE CRITERIA", "KRITERIA PENERIMAAN")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {qacPlans.map((p, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{p.itpRef || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{p.workItem || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{p.stage || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold text-blue-600">{p.holdPoint || "—"}</td>
                                                        <td className="py-1 px-1.5">{p.criteria || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. {getLangText(qacLangMode, "INSPECTION REQUEST & RESULT REGISTER", "REGISTER PERMINTAAN & HASIL INSPEKSI")}</span>
                                            <span className="font-mono">REQUESTS: {qacRequests.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(qacLangMode, "AREA / GRID", "AREA / GRID")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(qacLangMode, "DRAWING/SPEC", "GAMBAR/SPESIFIKASI")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(qacLangMode, "INSPECTOR", "INSPEKTOR")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(qacLangMode, "CHECKLIST / MEASUREMENT", "CHECKLIST / HASIL UJI")}</th>
                                                    <th className="py-1 px-1.5">{getLangText(qacLangMode, "STATUS", "STATUS")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {qacRequests.map((req, i) => {
                                                    const res = qacResults[i] || qacResults[0];
                                                    return (
                                                        <tr key={i} className="border-b border-neutral-200">
                                                            <td className="py-1 px-2 border-r border-neutral-300 font-bold">{req.area || "—"} ({req.grid || "—"})</td>
                                                            <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{req.drawingSpec || "—"}</td>
                                                            <td className="py-1 px-1.5 border-r border-neutral-300">{req.inspector || "—"}</td>
                                                            <td className="py-1 px-1.5 border-r border-neutral-300">{res?.checklist || "—"} ({res?.measurement || "—"})</td>
                                                            <td className="py-1 px-1.5 font-bold text-emerald-600">{res?.status || "Pass"}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — QUALITY CONTROL REPORT (QAC) — PAGE 1</span>
                                        <span>{documentId || "QAC-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("QAC", `${documentId || "QAC-01-01"}-02`, `${getLangText(qacLangMode, "QUALITY CONTROL REPORT", "LAPORAN INSPEKSI MUTU")} — PAGE 2`)}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>3. {getLangText(qacLangMode, "NCR & DEFECT MANAGEMENT", "MANAJEMEN NCR & DEFECT MUTU")}</span>
                                            <span className="font-mono">NCRS: {qacNcrs.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">NCR NO.</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(qacLangMode, "NONCONFORMITY", "KETIDAKSESUAIAN")}</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(qacLangMode, "ROOT CAUSE", "PENYEBAB UTAMA")}</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(qacLangMode, "CORRECTIVE ACTION", "TINDAKAN PERBAIKAN")}</th>
                                                    <th className="py-1 px-1.5">{getLangText(qacLangMode, "TARGET DATE", "TARGET SELESAI")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {qacNcrs.map((ncr, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold text-rose-600">{ncr.ncrNumber || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{ncr.nonconformity || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300">{ncr.rootCause || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 text-blue-600 font-bold">{ncr.correctiveAction || "—"}</td>
                                                        <td className="py-1 px-1.5 font-mono">{ncr.targetDate || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">4. {getLangText(qacLangMode, "REINSPECTION & CLOSING VERIFICATION", "VERIFIKASI REINSPEKSI & PENUTUPAN")}</div>
                                        <div className="grid grid-cols-2 gap-3 border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px]">
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(qacLangMode, "REPAIR EVIDENCE", "BUKTI PERBAIKAN")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{qacClosure.repairEvidence || "—"}</div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(qacLangMode, "RETEST RESULT", "HASIL UJI ULANG")}</div>
                                                <div className="font-bold text-emerald-600 mt-0.5">{qacClosure.retestResult || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(qacLangMode, "VERIFICATION STATUS", "STATUS VERIFIKASI")}</div>
                                                <div className="font-bold text-blue-600 mt-0.5">{qacClosure.verification || "—"}</div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(qacLangMode, "CLOSED BY & DATE", "DITUTUP OLEH & TANGGAL")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{qacClosure.closedBy} ({qacClosure.closureDate})</div>
                                            </div>
                                        </div>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", qacApprovals.length === 1 ? "grid-cols-1" : qacApprovals.length === 2 ? "grid-cols-2" : qacApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {qacApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getLangText(qacLangMode, `${app.type.toUpperCase()} BY`, app.type === "disusun" ? "DISUSUN OLEH" : app.type === "dicek" ? "DICEK OLEH" : app.type === "mengetahui" ? "MENGETAHUI" : "DISETUJUI OLEH")}</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — QUALITY CONTROL REPORT (QAC) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "QAC-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== HSE (SAFETY & K3) BILINGUAL PREVIEW ===================== */}
                        {reportType === "safety" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("HSE", documentId || "HSE-01-01", getLangText(hseLangMode, "HEALTH, SAFETY & ENVIRONMENT REPORT", "LAPORAN KESELAMATAN & K3"))}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: getLangText(hseLangMode, "PROJECT", "PROYEK"), value: currentProject?.project_code || "PROYEK" },
                                                { label: getLangText(hseLangMode, "TOTAL WORKFORCE", "TOTAL PEKERJA"), value: hseWorkforce || "—" },
                                                { label: getLangText(hseLangMode, "CUMULATIVE SAFE HOURS", "JAM SAFE KUMULATIF"), value: hseCumulativeSafeHours || "0 Jam" },
                                                { label: getLangText(hseLangMode, "LTI STATUS", "STATUS LTI"), value: hseLostTimeStatus || "Zero LTI" },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>1. {getLangText(hseLangMode, "HAZARD & SITE INSPECTION LOG", "LOG INSPEKSI BAHAYA & LAPANGAN")}</span>
                                            <span className="font-mono">FINDINGS: {hseHazards.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(hseLangMode, "AREA / ACTIVITY", "AREA / KEGIATAN")}</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(hseLangMode, "POTENTIAL HAZARD", "POTENSI BAHAYA")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(hseLangMode, "RISK LEVEL", "TINGKAT RISIKO")}</th>
                                                    <th className="py-1 px-2">{getLangText(hseLangMode, "UNSAFE ACT / CONDITION", "TINDAKAN / KONDISI BAHAYA")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {hseHazards.map((h, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{h.area || "—"} ({h.activity || "—"})</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300">{h.hazard || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold text-rose-600">{h.riskLevel || "—"}</td>
                                                        <td className="py-1 px-2">{h.condition || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. {getLangText(hseLangMode, "INCIDENT & NEAR MISS REGISTER", "REGISTER INSIDEN & NEAR MISS")}</span>
                                            <span className="font-mono">INCIDENTS: {hseIncidents.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(hseLangMode, "EVENT", "KEJADIAN")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(hseLangMode, "CLASSIFICATION", "KLASIFIKASI")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(hseLangMode, "DAMAGE / INJURY", "KERUSAKAN / CEDERA")}</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(hseLangMode, "IMMEDIATE ACTION", "TINDAKAN LANGSUNG")}</th>
                                                    <th className="py-1 px-2">{getLangText(hseLangMode, "INVESTIGATION", "INVESTIGASI")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {hseIncidents.map((inc, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{inc.event || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold text-amber-600">{inc.classification || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{inc.damage || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 text-blue-600">{inc.immediateAction || "—"}</td>
                                                        <td className="py-1 px-2">{inc.investigation || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — SAFETY & HSE REPORT (HSE) — PAGE 1</span>
                                        <span>{documentId || "HSE-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("HSE", `${documentId || "HSE-01-01"}-02`, `${getLangText(hseLangMode, "HEALTH, SAFETY & ENVIRONMENT REPORT", "LAPORAN KESELAMATAN & K3")} — PAGE 2`)}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">3. {getLangText(hseLangMode, "PERMIT (PTW), TBM & COMPETENCY STATUS", "STATUS PERIZINAN (PTW), TBM & KOMPETENSI")}</div>
                                        <div className="grid grid-cols-2 gap-3 border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px]">
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(hseLangMode, "PERMIT TO WORK (PTW)", "IZIN KERJA (PTW)")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{hsePermit || "—"}</div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(hseLangMode, "TOOLBOX MEETING (TBM)", "TOOLBOX MEETING (TBM)")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{hseTbm || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(hseLangMode, "SIO & SAFETY TRAINING", "SIO OPERATOR & PELATIHAN K3")}</div>
                                                <div className="font-bold text-blue-600 mt-0.5">{hseOperatorLicence} | {hseTraining}</div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(hseLangMode, "APD COMPLIANCE RATE", "TINGKAT KEPATUHAN APD")}</div>
                                                <div className="font-bold text-emerald-600 mt-0.5">{hseApdCompliance || "—"}</div>
                                            </div>
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">4. {getLangText(hseLangMode, "CORRECTIVE ACTION & CLOSING TRACKING", "TRACKING PERBAIKAN & PENUTUPAN TEMUAN")}</div>
                                        <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px] space-y-1.5">
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(hseLangMode, "FINDING & ROOT CAUSE:", "TEMUAN & PENYEBAB:")}</span> <span className="font-bold text-neutral-900">{hseClosure.finding} (Cause: {hseClosure.rootCause})</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(hseLangMode, "ACTION:", "TINDAKAN:")}</span> <span className="font-bold text-blue-600">{hseClosure.action}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(hseLangMode, "PIC & DUE DATE:", "PIC & TARGET SELESAI:")}</span> <span className="font-bold text-neutral-800">{hseClosure.pic} (Due: {hseClosure.dueDate})</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(hseLangMode, "VERIFICATION:", "VERIFIKASI:")}</span> <span className="font-bold text-emerald-600">{hseClosure.verification}</span></div>
                                        </div>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", hseApprovals.length === 1 ? "grid-cols-1" : hseApprovals.length === 2 ? "grid-cols-2" : hseApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {hseApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getLangText(hseLangMode, `${app.type.toUpperCase()} BY`, app.type === "disusun" ? "DISUSUN OLEH" : app.type === "dicek" ? "DICEK OLEH" : app.type === "mengetahui" ? "MENGETAHUI" : "DISETUJUI OLEH")}</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — SAFETY & HSE REPORT (HSE) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "HSE-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== RIK (RISK & ISSUE REGISTER) BILINGUAL PREVIEW ===================== */}
                        {reportType === "issue_risk" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("RIK", documentId || "RIK-01-01", getLangText(irkLangMode, "RISK & ISSUE REGISTER", "REGISTER RISIKO & ISU"))}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: getLangText(irkLangMode, "PROJECT", "PROYEK"), value: currentProject?.project_code || "PROYEK" },
                                                { label: getLangText(irkLangMode, "IDENTIFIED RISKS", "RISIKO TERIDENTIFIKASI"), value: irkRisks.length },
                                                { label: getLangText(irkLangMode, "ACTIVE ISSUES", "ISU AKTIF"), value: irkIssues.length },
                                                { label: getLangText(irkLangMode, "MONITORING ITEMS", "ITEM MONITORING"), value: irkMonitorings.length },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>1. {getLangText(irkLangMode, "RISK IDENTIFICATION & ASSESSMENT MATRIX (BELUM TERJADI)", "MATRIKS IDENTIFIKASI & PENILAIAN RISIKO (BELUM TERJADI)")}</span>
                                            <span className="font-mono">RISKS: {irkRisks.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 font-mono">CODE</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(irkLangMode, "RISK STATEMENT", "PERNYATAAN RISIKO")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(irkLangMode, "CAUSE / EVENT", "PENYEBAB / KEJADIAN")}</th>
                                                    <th className="py-1 px-1 border-r border-neutral-300 text-center">P x I</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 font-bold">SCORE</th>
                                                    <th className="py-1 px-1.5">{getLangText(irkLangMode, "STRATEGY", "STRATEGI MITIGASI")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {irkRisks.map((rsk, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{rsk.riskCode || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{rsk.statement || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{rsk.cause || "—"} / {rsk.event || "—"}</td>
                                                        <td className="py-1 px-1 border-r border-neutral-300 text-center font-mono">{rsk.probability}x{rsk.impact}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold text-rose-600">{rsk.score || "—"} ({rsk.priority})</td>
                                                        <td className="py-1 px-1.5 font-bold text-blue-600">{rsk.strategy || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm">2. {getLangText(irkLangMode, "RISK CONTINGENCY PLANS", "RENCANA KONTINGENSI RISIKO")}</div>
                                        <div className="space-y-1.5 border border-neutral-300 rounded p-2 bg-neutral-50/50 text-[6.5px]">
                                            {irkRisks.map((rsk, i) => (
                                                <div key={i} className="border-b border-neutral-200 last:border-b-0 pb-1">
                                                    <span className="font-extrabold text-blue-600">[{rsk.riskCode}] Contingency:</span> <span className="font-bold text-neutral-800">{rsk.contingencyPlan || "—"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — RISK & ISSUE REGISTER (RIK) — PAGE 1</span>
                                        <span>{documentId || "RIK-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("RIK", `${documentId || "RIK-01-01"}-02`, `${getLangText(irkLangMode, "RISK & ISSUE REGISTER", "REGISTER RISIKO & ISU")} — PAGE 2`)}
                                        <div className="bg-rose-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>3. {getLangText(irkLangMode, "ACTIVE OCCURRED ISSUE MANAGEMENT (SUDAH TERJADI)", "MANAJEMEN ISU AKTIF (SUDAH TERJADI)")}</span>
                                            <span className="font-mono">ACTIVE ISSUES: {irkIssues.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-rose-50 border-b border-rose-200 font-extrabold text-rose-900 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-rose-200 font-mono">CODE</th>
                                                    <th className="py-1 px-2 border-r border-rose-200">{getLangText(irkLangMode, "CURRENT ISSUE", "ISU AKTUAL")}</th>
                                                    <th className="py-1 px-1.5 border-r border-rose-200">{getLangText(irkLangMode, "IMPACT", "DAMPAK NYATA")}</th>
                                                    <th className="py-1 px-1.5 border-r border-rose-200">{getLangText(irkLangMode, "ESCALATION", "ESKALASI")}</th>
                                                    <th className="py-1 px-2 border-r border-rose-200">{getLangText(irkLangMode, "RESOLUTION ACTION", "TINDAKAN RESOLUSI")}</th>
                                                    <th className="py-1 px-1.5">STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {irkIssues.map((isu, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold text-rose-700">{isu.issueCode || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{isu.currentIssue || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-amber-700 font-bold">{isu.impact || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{isu.escalation || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 text-blue-700 font-bold">{isu.resolutionAction || "—"}</td>
                                                        <td className="py-1 px-1.5 font-bold text-rose-600">{isu.status || "Open"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>4. {getLangText(irkLangMode, "RISK & ISSUE MONITORING & CLOSURE TRACKING", "MONITORING & PENUTUPAN RISIKO/ISU")}</span>
                                            <span className="font-mono">ITEMS: {irkMonitorings.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 font-mono">CODE</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(irkLangMode, "OWNER (PIC)", "PENANGGUNG JAWAB")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(irkLangMode, "DUE DATE", "TARGET SELESAI")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(irkLangMode, "RESIDUAL RISK", "RISIKO SISA")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(irkLangMode, "TREND", "TREN")}</th>
                                                    <th className="py-1 px-2">{getLangText(irkLangMode, "CLOSURE CRITERIA", "SYARAT TUTUP")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {irkMonitorings.map((mon, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{mon.code || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold">{mon.owner || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{mon.dueDate || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 text-emerald-600 font-bold">{mon.residualRisk || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold">{mon.trend || "—"}</td>
                                                        <td className="py-1 px-2">{mon.criteria || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", irkApprovals.length === 1 ? "grid-cols-1" : irkApprovals.length === 2 ? "grid-cols-2" : irkApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {irkApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getLangText(irkLangMode, `${app.type.toUpperCase()} BY`, app.type === "disusun" ? "DISUSUN OLEH" : app.type === "dicek" ? "DICEK OLEH" : app.type === "mengetahui" ? "MENGETAHUI" : "DISETUJUI OLEH")}</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — RISK & ISSUE REGISTER (RIK) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "RIK-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== DOC (DOCUMENT CONTROL) BILINGUAL PREVIEW ===================== */}
                        {reportType === "doc_control" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("DOC", documentId || "DOC-01-01", getLangText(docLangMode, "DOCUMENT CONTROL REGISTER", "REGISTER KONTROL DOKUMEN"))}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: getLangText(docLangMode, "PROJECT", "PROYEK"), value: currentProject?.project_code || "PROYEK" },
                                                { label: getLangText(docLangMode, "REGISTERED DOCS", "TOTAL DOKUMEN"), value: docRegister.length },
                                                { label: getLangText(docLangMode, "SUBMISSIONS", "PENGAJUAN SUBMISI"), value: docSubmissions.length },
                                                { label: getLangText(docLangMode, "APPROVED REVIEWS", "REVIEW DISETUJUI"), value: docApprovals.length },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>1. {getLangText(docLangMode, "DOCUMENT REGISTER (SHOP DRAWINGS & RFI)", "REGISTER DOKUMEN (SHOP DRAWING & RFI)")}</span>
                                            <span className="font-mono">ITEMS: {docRegister.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 font-mono">DOC NO.</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(docLangMode, "TITLE", "JUDUL DOKUMEN")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(docLangMode, "DISCIPLINE", "DISIPLIN")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(docLangMode, "TYPE", "TIPE DOKUMEN")}</th>
                                                    <th className="py-1 px-1.5">{getLangText(docLangMode, "ORIGINATOR", "PEMBUAT")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {docRegister.map((d, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold text-blue-600">{d.docNumber || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{d.title || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{d.discipline || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{d.type || "—"}</td>
                                                        <td className="py-1 px-1.5">{d.originator || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. {getLangText(docLangMode, "REVISION & SUBMISSION LOG", "LOG PENGAJUAN & REVISI DOKUMEN")}</span>
                                            <span className="font-mono">SUBMISSIONS: {docSubmissions.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300 font-mono">REVISION</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(docLangMode, "SUBMISSION DATE", "TGL PENGAJUAN")}</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(docLangMode, "TRANSMITTAL NO.", "NO. SURAT PENGANTAR")}</th>
                                                    <th className="py-1 px-2">{getLangText(docLangMode, "PURPOSE OF ISSUE", "TUJUAN PENGAJUAN")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {docSubmissions.map((s, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold">{s.revision || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{s.subDate || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{s.transmittalNo || "—"}</td>
                                                        <td className="py-1 px-2">{s.purposeOfIssue || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — DOCUMENT CONTROL REGISTER (DOC) — PAGE 1</span>
                                        <span>{documentId || "DOC-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("DOC", `${documentId || "DOC-01-01"}-02`, `${getLangText(docLangMode, "DOCUMENT CONTROL REGISTER", "REGISTER KONTROL DOKUMEN")} — PAGE 2`)}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>3. {getLangText(docLangMode, "REVIEW & APPROVAL STATUS (MK / CLIENT)", "REVIEW & PERSETUJUAN (MK / CLIENT)")}</span>
                                            <span className="font-mono">REVIEWS: {docApprovals.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(docLangMode, "REVIEWER", "PENINJAU")}</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(docLangMode, "STATUS (CODE A/B/C)", "STATUS PERSETUJUAN")}</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(docLangMode, "COMMENTS", "CATATAN PERBAIKAN")}</th>
                                                    <th className="py-1 px-1.5">{getLangText(docLangMode, "APPROVAL DATE", "TGL PERSETUJUAN")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {docApprovals.map((a, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold">{a.reviewer || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold text-emerald-600">{a.status || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300">{a.comments || "—"}</td>
                                                        <td className="py-1 px-1.5 font-mono">{a.approvalDate || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">4. {getLangText(docLangMode, "CONTROLLED DISTRIBUTION & ARCHIVE", "DISTRIBUSI TERMONITOR & PENGARSIPAN")}</div>
                                        <div className="grid grid-cols-2 gap-3 border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px]">
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(docLangMode, "RECIPIENT & COPY NO.", "PENERIMA & NO. COPY")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{docDistributions[0]?.recipient || "—"} ({docDistributions[0]?.controlledCopy || "—"})</div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(docLangMode, "DISTRIBUTION DATE", "TANGGAL DISTRIBUSI")}</div>
                                                <div className="font-bold text-blue-600 mt-0.5">{docDistributions[0]?.distDate || "—"} ({docDistributions[0]?.acknowledgement || "Diterima"})</div>
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(docLangMode, "SUPERSEDED REVISION", "REVISI USANG / DIGANTIKAN")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{docArchives[0]?.supersededRev || "—"} (Replaced by: {docArchives[0]?.replacementDoc || "—"})</div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(docLangMode, "RETENTION & ARCHIVE LOCATION", "MASA SIMPAN & LOKASI ARSIP")}</div>
                                                <div className="font-bold text-emerald-600 mt-0.5">{docArchives[0]?.retentionYears || "5 Tahun"} | {docArchives[0]?.archiveLocation || "—"}</div>
                                            </div>
                                        </div>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", docApprovalsMeta.length === 1 ? "grid-cols-1" : docApprovalsMeta.length === 2 ? "grid-cols-2" : docApprovalsMeta.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {docApprovalsMeta.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getLangText(docLangMode, `${app.type.toUpperCase()} BY`, app.type === "disusun" ? "DISUSUN OLEH" : app.type === "dicek" ? "DICEK OLEH" : app.type === "mengetahui" ? "MENGETAHUI" : "DISETUJUI OLEH")}</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — DOCUMENT CONTROL REGISTER (DOC) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "DOC-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== CCO (CONTRACT CHANGE ORDER) BILINGUAL PREVIEW ===================== */}
                        {reportType === "change_order" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("CCO", documentId || "CCO-01-01", getLangText(ccoLangMode, "CONTRACT CHANGE ORDER (VO)", "PERUBAHAN KONTRAK & VO"))}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: getLangText(ccoLangMode, "PROJECT", "PROYEK"), value: currentProject?.project_code || "PROYEK" },
                                                { label: getLangText(ccoLangMode, "ORIGIN / INITIATION", "ASAL INISIASI"), value: ccoInitiation.origin || "—" },
                                                { label: getLangText(ccoLangMode, "PROPOSED VALUE", "NILAI DIAJUKAN"), value: ccoNegotiation.proposedValue || "—" },
                                                { label: getLangText(ccoLangMode, "APPROVED CO NO.", "NO. CCO DISETUJUI"), value: ccoNegotiation.approvedCO || "—" },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">1. {getLangText(ccoLangMode, "CHANGE INITIATION & REASON", "INISIASI PERUBAHAN & ALASAN")}</div>
                                        <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px] space-y-1">
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(ccoLangMode, "INSTRUCTION REFERENCE:", "ACUAN INSTRUKSI:")}</span> <span className="font-bold text-blue-600">{ccoInitiation.reference}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(ccoLangMode, "CHANGE DESCRIPTION:", "DESKRIPSI PERUBAHAN:")}</span> <span className="font-bold text-neutral-900">{ccoInitiation.description}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(ccoLangMode, "REASON FOR CHANGE:", "ALASAN PERUBAHAN:")}</span> <span className="font-bold text-neutral-700">{ccoInitiation.reason}</span></div>
                                        </div>
                                        <div className="bg-neutral-800 text-white font-extrabold text-[7.5px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>2. {getLangText(ccoLangMode, "SCOPE & QUANTITY IMPACT", "RINCIAN PEKERJAAN TAMBAH KURANG")}</span>
                                            <span className="font-mono">ITEMS: {ccoScopeItems.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(ccoLangMode, "WORK ITEM", "PEKERJAAN")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(ccoLangMode, "ORIGINAL QTY", "VOLUME AWAL")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(ccoLangMode, "ADDED/OMITTED QTY (+/-)", "VOLUME PERUBAHAN")}</th>
                                                    <th className="py-1 px-1.5">{getLangText(ccoLangMode, "DRAWING REF", "ACUAN GAMBAR")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ccoScopeItems.map((item, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{item.workItem || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{item.originalQty || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono font-bold text-blue-600">{item.changeQty || "—"}</td>
                                                        <td className="py-1 px-1.5 font-mono">{item.drawingRef || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — CONTRACT CHANGE ORDER (CCO) — PAGE 1</span>
                                        <span>{documentId || "CCO-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("CCO", `${documentId || "CCO-01-01"}-02`, `${getLangText(ccoLangMode, "CONTRACT CHANGE ORDER (VO)", "PERUBAHAN KONTRAK & VO")} — PAGE 2`)}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>3. {getLangText(ccoLangMode, "COST ASSESSMENT & MARKUP", "PENILAIAN & PERHITUNGAN BIAYA")}</span>
                                            <span className="font-mono">ITEMS: {ccoCosts.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(ccoLangMode, "UNIT RATE", "HARGA SATUAN")}</th>
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(ccoLangMode, "DIRECT COST", "BIAYA LANGSUNG")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(ccoLangMode, "MARKUP", "MARKUP (%)")}</th>
                                                    <th className="py-1 px-2">{getLangText(ccoLangMode, "TOTAL IMPACT", "TOTAL IMPACT BIAYA")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ccoCosts.map((c, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{c.unitRate || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-mono font-bold">{c.directCost || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300">{c.markup || "—"}</td>
                                                        <td className="py-1 px-2 font-mono font-bold text-emerald-600">{c.totalImpact || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">4. {getLangText(ccoLangMode, "TIME & NEGOTIATION APPROVAL", "DAMPAK WAKTU & NEGOSIASI AKHIR")}</div>
                                        <div className="grid grid-cols-2 gap-3 border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px]">
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(ccoLangMode, "DELAY DAYS & EOT", "DAPAK WAKTU & EXTENSION OF TIME")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{ccoTimeImpact.delayDays} ({ccoTimeImpact.eotGranted})</div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(ccoLangMode, "AFFECTED ACTIVITIES & CLAUSES", "PEKERJAAN TERDAMPAK & KLAUSUL")}</div>
                                                <div className="font-bold text-blue-600 mt-0.5">{ccoTimeImpact.affectedActivities} | {ccoTimeImpact.contractClauses}</div>
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(ccoLangMode, "PROPOSED VS NEGOTIATED VALUE", "NILAI USULAN VS NEGOSIASI")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{ccoNegotiation.proposedValue} $\rightarrow$ <span className="text-emerald-600 font-black">{ccoNegotiation.negotiatedValue}</span></div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(ccoLangMode, "STATUS & APPROVED CO", "STATUS & NO. CCO DISETUJUI")}</div>
                                                <div className="font-bold text-emerald-600 mt-0.5">{ccoNegotiation.approvalStatus} ({ccoNegotiation.approvedCO})</div>
                                            </div>
                                        </div>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", ccoApprovals.length === 1 ? "grid-cols-1" : ccoApprovals.length === 2 ? "grid-cols-2" : ccoApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {ccoApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getLangText(ccoLangMode, `${app.type.toUpperCase()} BY`, app.type === "disusun" ? "DISUSUN OLEH" : app.type === "dicek" ? "DICEK OLEH" : app.type === "mengetahui" ? "MENGETAHUI" : "DISETUJUI OLEH")}</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — CONTRACT CHANGE ORDER (CCO) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "CCO-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== MOU (AGREEMENT & CONTRACT) BILINGUAL PREVIEW ===================== */}
                        {reportType === "mou_contract" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("MOU", documentId || "MOU-01-01", getLangText(mouLangMode, "AGREEMENT & CONTRACT REPORT", "PERJANJIAN & KONTRAK KERJA"))}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: getLangText(mouLangMode, "PROJECT", "PROYEK"), value: currentProject?.project_code || "PROYEK" },
                                                { label: getLangText(mouLangMode, "CONTRACT NO.", "NO. KONTRAK"), value: mouIdentity.contractNumber || "—" },
                                                { label: getLangText(mouLangMode, "EFFECTIVE DATE", "TGL BERLAKU"), value: mouIdentity.effectiveDate || "—" },
                                                { label: getLangText(mouLangMode, "CONTRACT VALUE", "NILAI KONTRAK"), value: mouCommercialTerms.contractValue || "—" },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1 truncate px-1">{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">1. {getLangText(mouLangMode, "PARTIES & CONTRACT IDENTITY", "PARA PIHAK & IDENTITAS KONTRAK")}</div>
                                        <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px] space-y-1">
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "PARTIES:", "PARA PIHAK:")}</span> <span className="font-bold text-neutral-900">{mouIdentity.parties}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "LEGAL ENTITY:", "BADAN HUKUM:")}</span> <span className="font-bold text-neutral-700">{mouIdentity.legalEntity}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "CONTRACT NUMBER & DATE:", "NO. & TGL PERJANJIAN:")}</span> <span className="font-bold text-blue-600">{mouIdentity.contractNumber} (Effective: {mouIdentity.effectiveDate})</span></div>
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">2. {getLangText(mouLangMode, "SCOPE & DELIVERABLES", "LINGKUP PEKERJAAN & HASIL AKHIR")}</div>
                                        <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px] space-y-1.5">
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "SCOPE OF WORK:", "LINGKUP PEKERJAAN:")}</span> <span className="font-bold text-neutral-900">{mouScopeDeliverables.scope}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "EXCLUSIONS:", "PENGECUALIAN LINGKUP:")}</span> <span className="font-bold text-rose-600">{mouScopeDeliverables.exclusions}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "DELIVERABLES:", "HASIL AKHIR TERKIRIM:")}</span> <span className="font-bold text-blue-600">{mouScopeDeliverables.deliverables}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "ACCEPTANCE CRITERIA:", "KRITERIA PENERIMAAN:")}</span> <span className="font-bold text-emerald-600">{mouScopeDeliverables.acceptanceCriteria}</span></div>
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — AGREEMENT & CONTRACT (MOU) — PAGE 1</span>
                                        <span>{documentId || "MOU-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("MOU", `${documentId || "MOU-01-01"}-02`, `${getLangText(mouLangMode, "AGREEMENT & CONTRACT REPORT", "PERJANJIAN & KONTRAK KERJA")} — PAGE 2`)}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">3. {getLangText(mouLangMode, "COMMERCIAL & PAYMENT TERMS", "KETENTUAN BIAYA & PEMBAYARAN")}</div>
                                        <div className="grid grid-cols-2 gap-3 border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px]">
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "CONTRACT VALUE & RETENTION", "NILAI KONTRAK & RETENSI")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{mouCommercialTerms.contractValue} (Retensi: {mouCommercialTerms.retentionRate})</div>
                                                <div className="font-extrabold text-neutral-400 uppercase mt-2">{getLangText(mouLangMode, "PAYMENT TERMS", "KETENTUAN PEMBAYARAN")}</div>
                                                <div className="font-bold text-blue-600 mt-0.5">{mouCommercialTerms.paymentTerms}</div>
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "TAX & VARIATION MECHANISM", "PERPAJAKAN & MEKANISME CCO")}</div>
                                                <div className="font-bold text-neutral-800 mt-0.5">{mouCommercialTerms.taxDetails}</div>
                                                <div className="font-bold text-emerald-600 mt-1">{mouCommercialTerms.variationMechanism}</div>
                                            </div>
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">4. {getLangText(mouLangMode, "TIME, OBLIGATION, RISK & CLAUSES", "JANGKA WAKTU, RISIKO & KLAUSUL HUKUM")}</div>
                                        <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px] space-y-1.5">
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "PERIOD & MILESTONES:", "JANGKA WAKTU & TAHAPAN:")}</span> <span className="font-bold text-neutral-900">{mouTimeRisk.contractPeriod} ({mouTimeRisk.milestones})</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "INSURANCE & WARRANTY:", "ASURANSI & GARANSI:")}</span> <span className="font-bold text-blue-600">{mouTimeRisk.insuranceDetails} | Pemeliharaan {mouTimeRisk.warrantyPeriod}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "GOVERNING LAW & DISPUTE:", "HUKUM & SENGKETA:")}</span> <span className="font-bold text-neutral-800">{mouClausesExecution.governingLaw} ({mouClausesExecution.disputeResolution})</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, "SIGNATORIES & STATUS:", "PENANDA TANGAN & STATUS:")}</span> <span className="font-bold text-emerald-600">{mouClausesExecution.signatories} — {mouClausesExecution.executionStatus}</span></div>
                                        </div>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", mouApprovals.length === 1 ? "grid-cols-1" : mouApprovals.length === 2 ? "grid-cols-2" : mouApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {mouApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getLangText(mouLangMode, `${app.type.toUpperCase()} BY`, app.type === "disusun" ? "DISUSUN OLEH" : app.type === "dicek" ? "DICEK OLEH" : app.type === "mengetahui" ? "MENGETAHUI" : "DISETUJUI OLEH")}</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — AGREEMENT & CONTRACT (MOU) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "MOU-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== EXE (EXECUTIVE REPORT) BILINGUAL PREVIEW ===================== */}
                        {reportType === "executive" && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                {/* PAGE 1 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("EXE", documentId || "EXE-01-01", getLangText(exeLangMode, "EXECUTIVE SUMMARY REPORT", "RINGKASAN EKSEKUTIF PROYEK"))}
                                        <div className="grid grid-cols-4 border border-neutral-300 rounded text-center">
                                            {[
                                                { label: getLangText(exeLangMode, "PROJECT", "PROYEK"), value: currentProject?.project_code || "PROYEK" },
                                                { label: getLangText(exeLangMode, "OVERALL RAG", "STATUS RAG AKHIR"), value: exeHealth.overallRAG || "Green" },
                                                { label: getLangText(exeLangMode, "TIME STATUS", "STATUS JADWAL"), value: exeHealth.timeStatus || "—" },
                                                { label: getLangText(exeLangMode, "COST STATUS", "STATUS BIAYA"), value: exeHealth.costStatus || "—" },
                                            ].map((c, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{c.label}</div>
                                                    <div className={clsx("text-[8px] font-bold py-1 truncate px-1", c.label.includes("RAG") ? (exeHealth.overallRAG === "Red" ? "text-rose-600 font-black" : exeHealth.overallRAG === "Amber" ? "text-amber-600 font-black" : "text-emerald-600 font-black") : "text-neutral-800")}>{c.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">1. {getLangText(exeLangMode, "PROJECT HEALTH (RAG DASHBOARD)", "DASHBOARD KESEHATAN PROYEK (RAG)")}</div>
                                        <div className="grid grid-cols-3 gap-2.5 border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px]">
                                            <div><span className="font-extrabold text-neutral-400 uppercase">QUALITY:</span> <span className="font-bold text-emerald-600">{exeHealth.qualityStatus}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">SAFETY:</span> <span className="font-bold text-blue-600">{exeHealth.safetyStatus}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">SCOPE:</span> <span className="font-bold text-neutral-800">{exeHealth.scopeStatus}</span></div>
                                        </div>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">2. {getLangText(exeLangMode, "PERFORMANCE HIGHLIGHTS & KPI", "CAPAIAN UTAMA & INDIKATOR KINERJA")}</div>
                                        <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px] space-y-1.5">
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(exeLangMode, "KEY ACHIEVEMENTS:", "PENCAPAIAN KUNCI:")}</span> <span className="font-bold text-neutral-900">{exeHighlights.keyAchievements}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(exeLangMode, "MILESTONES:", "MILESTONE UTAMA:")}</span> <span className="font-bold text-blue-600">{exeHighlights.milestones}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(exeLangMode, "KPI SUMMARY:", "RINGKASAN KPI:")}</span> <span className="font-bold text-emerald-600">{exeHighlights.kpiSummary}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(exeLangMode, "PERFORMANCE TREND:", "TREN PERFORMA:")}</span> <span className="font-bold text-purple-600">{exeHighlights.performanceTrend}</span></div>
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — EXECUTIVE SUMMARY REPORT (EXE) — PAGE 1</span>
                                        <span>{documentId || "EXE-01-01"}</span>
                                    </div>
                                </div>
                                {/* PAGE 2 */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader("EXE", `${documentId || "EXE-01-01"}-02`, `${getLangText(exeLangMode, "EXECUTIVE SUMMARY REPORT", "RINGKASAN EKSEKUTIF PROYEK")} — PAGE 2`)}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>3. {getLangText(exeLangMode, "STRATEGIC RISKS & ISSUES", "RISIKO STRATEGIS & ISSUES")}</span>
                                            <span className="font-mono">RISKS: {exeStrategicRisks.length}</span>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-700 uppercase">
                                                    <th className="py-1 px-2 border-r border-neutral-300">{getLangText(exeLangMode, "TOP RISK", "RISIKO UTAMA")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(exeLangMode, "CRITICAL ISSUE", "ISU KRITIS")}</th>
                                                    <th className="py-1 px-1.5 border-r border-neutral-300">{getLangText(exeLangMode, "COMMERCIAL EXPOSURE", "PAPARAN BIAYA")}</th>
                                                    <th className="py-1 px-2">{getLangText(exeLangMode, "CLIENT CONCERN", "PERHATIAN CLIENT")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exeStrategicRisks.map((r, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold text-rose-600">{r.topRisk || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-bold">{r.criticalIssue || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono text-amber-600">{r.commercialExposure || "—"}</td>
                                                        <td className="py-1 px-2">{r.clientConcern || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                                            <span>4. {getLangText(exeLangMode, "FORECAST & DECISIONS REQUIRED", "PROYEKSI AKHIR & KEPUTUSAN DIBUTUHKAN")}</span>
                                            <span className="font-mono">DECISIONS: {exeDecisions.length}</span>
                                        </div>
                                        <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50/50 text-[7px] space-y-1">
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(exeLangMode, "COMPLETION FORECAST:", "PROYEKSI SELESAI:")}</span> <span className="font-bold text-emerald-600">{exeForecast.completionForecast}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(exeLangMode, "COST FORECAST:", "PROYEKSI BIAYA AKHIR:")}</span> <span className="font-bold text-blue-600">{exeForecast.costForecast}</span></div>
                                            <div><span className="font-extrabold text-neutral-400 uppercase">{getLangText(exeLangMode, "RECOVERY MEASURES:", "LANGKAH PEMULIHAN:")}</span> <span className="font-bold text-neutral-800">{exeForecast.recoveryMeasures}</span></div>
                                        </div>
                                        <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                                            <thead>
                                                <tr className="bg-amber-50 border-b border-amber-200 font-extrabold text-amber-900 uppercase">
                                                    <th className="py-1 px-2 border-r border-amber-200">{getLangText(exeLangMode, "DECISION NEEDED", "KEPUTUSAN DIBUTUHKAN")}</th>
                                                    <th className="py-1 px-2 border-r border-amber-200">{getLangText(exeLangMode, "OPTIONS", "PILIHAN OPSI")}</th>
                                                    <th className="py-1 px-2 border-r border-amber-200">{getLangText(exeLangMode, "RECOMMENDATION", "REKOMENDASI")}</th>
                                                    <th className="py-1 px-1.5 border-r border-amber-200">REQUIRED BY</th>
                                                    <th className="py-1 px-1.5">{getLangText(exeLangMode, "OWNER", "PENANGGUNG JAWAB")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exeDecisions.map((d, i) => (
                                                    <tr key={i} className="border-b border-neutral-200">
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold">{d.decision || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300">{d.options || "—"}</td>
                                                        <td className="py-1 px-2 border-r border-neutral-300 font-bold text-blue-600">{d.recommendation || "—"}</td>
                                                        <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{d.requiredByDate || "—"}</td>
                                                        <td className="py-1 px-1.5 font-bold text-neutral-800">{d.owner || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {/* Approvals */}
                                        <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", exeApprovals.length === 1 ? "grid-cols-1" : exeApprovals.length === 2 ? "grid-cols-2" : exeApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                                            {exeApprovals.map((app, idx) => (
                                                <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                                    <div><div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getLangText(exeLangMode, `${app.type.toUpperCase()} BY`, app.type === "disusun" ? "DISUSUN OLEH" : app.type === "dicek" ? "DICEK OLEH" : app.type === "mengetahui" ? "MENGETAHUI" : "DISETUJUI OLEH")}</div><div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div></div>
                                                    <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — EXECUTIVE SUMMARY REPORT (EXE) — PAGE 2</span>
                                        <span>{documentId ? `${documentId}-02` : "EXE-01-01-02"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===================== EXTENDED REPORTS PREVIEW (Multi-Page XXX-YY-ZZ Code Format) ===================== */}
                        {!["daily", "weekly", "monthly", "schedule", "cost", "manpower", "procurement", "finance", "resources", "quality", "safety", "issue_risk", "doc_control", "change_order", "mou_contract", "executive"].includes(reportType) && (
                            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                                
                                {/* ---------------- PAGE 1: EXECUTIVE SUMMARY & MAIN DATA TABLE ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader(getReportMeta(reportType).code, getReportPageDocCode(1), getReportMeta(reportType).title)}

                                        {/* Date Meta Row */}
                                        <div className="grid grid-cols-5 border border-neutral-300 rounded overflow-hidden text-center">
                                            {[
                                                { label: "Proyek", value: currentProject?.project_code || "PROYEK" },
                                                { label: "Tanggal", value: getDayDateOnly() },
                                                { label: "Periode / Minggu", value: `M-${weekNumber || "01"}` },
                                                { label: "Revisi", value: `R${revision || "00"}` },
                                                { label: "Status", value: "FINAL" },
                                            ].map((cell, i) => (
                                                <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                                    <div className="text-[5px] font-extrabold text-neutral-400 uppercase bg-neutral-50 border-b border-neutral-200 py-0.5 px-1">{cell.label}</div>
                                                    <div className="text-[8px] font-bold text-neutral-800 py-1">{cell.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Section Banner */}
                                        <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                            {getReportConfig(reportType).summaryTitle.toUpperCase()}
                                        </div>

                                        {/* Progress / Metric Summary Box */}
                                        <div className="grid grid-cols-3 gap-2 border border-neutral-300 rounded p-3 bg-neutral-50/50 text-center">
                                            <div>
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getReportConfig(reportType).summaryFields.metric1Label}</div>
                                                <div className="text-[12px] font-black text-neutral-900 mt-0.5">{progressTotal || "0.000"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getReportConfig(reportType).summaryFields.metric2Label}</div>
                                                <div className="text-[12px] font-black text-emerald-600 mt-0.5">{progressThisWeek || "0.000"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[6px] font-extrabold text-neutral-400 uppercase">{getReportConfig(reportType).summaryFields.metric3Label}</div>
                                                <div className="text-[12px] font-black text-amber-600 mt-0.5">{progressRemaining || "0.000"}</div>
                                            </div>
                                        </div>

                                        {/* Main Data Table / Manpower Table */}
                                        {reportType === "manpower" ? (
                                            <div>
                                                <div className="bg-neutral-800 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                                    REKAPITULASI TENAGA KERJA HARIAN (SENIN - MINGGU)
                                                </div>
                                                <table className="w-full text-left border border-neutral-300 border-t-0 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-600 uppercase text-center">
                                                            <th className="p-1 w-5 border-r border-neutral-300">NO</th>
                                                            <th className="p-1 text-left border-r border-neutral-300">KLASIFIKASI / PERAN TENAGA KERJA</th>
                                                            <th className="p-1 w-6 border-r border-neutral-300">SEN</th>
                                                            <th className="p-1 w-6 border-r border-neutral-300">SEL</th>
                                                            <th className="p-1 w-6 border-r border-neutral-300">RAB</th>
                                                            <th className="p-1 w-6 border-r border-neutral-300">KAM</th>
                                                            <th className="p-1 w-6 border-r border-neutral-300">JUM</th>
                                                            <th className="p-1 w-6 border-r border-neutral-300">SAB</th>
                                                            <th className="p-1 w-6 border-r border-neutral-300">MIN</th>
                                                            <th className="p-1 w-10 bg-neutral-200">TOTAL</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {personelWeeklyGrid.map((row, idx) => {
                                                            const totalRow = (row.senin || 0) + (row.selasa || 0) + (row.rabu || 0) + (row.kamis || 0) + (row.jumat || 0) + (row.sabtu || 0) + (row.minggu || 0);
                                                            return (
                                                                <tr key={idx} className="border-b border-neutral-200 text-center">
                                                                    <td className="p-1 border-r border-neutral-200 font-bold text-neutral-400">{idx + 1}</td>
                                                                    <td className="p-1 text-left border-r border-neutral-200 font-bold text-neutral-900">{row.role}</td>
                                                                    <td className="p-1 border-r border-neutral-200">{row.senin || "0"}</td>
                                                                    <td className="p-1 border-r border-neutral-200">{row.selasa || "0"}</td>
                                                                    <td className="p-1 border-r border-neutral-200">{row.rabu || "0"}</td>
                                                                    <td className="p-1 border-r border-neutral-200">{row.kamis || "0"}</td>
                                                                    <td className="p-1 border-r border-neutral-200">{row.jumat || "0"}</td>
                                                                    <td className="p-1 border-r border-neutral-200">{row.sabtu || "0"}</td>
                                                                    <td className="p-1 border-r border-neutral-200">{row.minggu || "0"}</td>
                                                                    <td className="p-1 font-black bg-neutral-50 text-neutral-900">{totalRow}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="bg-neutral-800 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                                    {getReportConfig(reportType).itemsTitle.toUpperCase()}
                                                </div>
                                                <table className="w-full text-left border border-neutral-300 border-t-0 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-600 uppercase">
                                                            <th className="p-1.5 w-6 text-center border-r border-neutral-300">NO</th>
                                                            <th className="p-1.5 border-r border-neutral-300">DESKRIPSI / URAIAN ITEM</th>
                                                            <th className="p-1.5 w-24 border-r border-neutral-300">LOKASI / AREA</th>
                                                            <th className="p-1.5 w-20 text-center">VOLUME / TARGET</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {workItems.map((item, idx) => (
                                                            <tr key={idx} className="border-b border-neutral-200">
                                                                <td className="p-1.5 text-center border-r border-neutral-200 font-bold text-neutral-400">{idx + 1}</td>
                                                                <td className="p-1.5 border-r border-neutral-200 font-bold text-neutral-900">{item.description || "—"}</td>
                                                                <td className="p-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">{item.position || "—"}</td>
                                                                <td className="p-1.5 text-center font-bold text-neutral-800">{item.volume || "—"}</td>
                                                            </tr>
                                                        ))}
                                                        {workItems.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="p-4 text-center text-neutral-400 italic font-medium">
                                                                    Belum ada item rincian pekerjaan ditambahkan.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Material / Equipment Summary if present */}
                                        {materialItems.length > 0 && (
                                            <div>
                                                <div className="bg-neutral-800 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                                    LOG LOGISTIK & RESOURCE TERHUBUNG
                                                </div>
                                                <table className="w-full text-left border border-neutral-300 border-t-0 text-[6.5px]" style={{ borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold text-neutral-600 uppercase">
                                                            <th className="p-1 w-6 text-center border-r border-neutral-300">NO</th>
                                                            <th className="p-1 w-16 border-r border-neutral-300">KATEGORI</th>
                                                            <th className="p-1 border-r border-neutral-300">NAMA ITEM</th>
                                                            <th className="p-1 w-12 text-center border-r border-neutral-300">SATUAN</th>
                                                            <th className="p-1 w-14 text-center">STOK / REALISASI</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {materialItems.map((mat, idx) => (
                                                            <tr key={idx} className="border-b border-neutral-200">
                                                                <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{idx + 1}</td>
                                                                <td className="p-1 border-r border-neutral-200 font-bold text-neutral-600 uppercase">{mat.category || "MATERIAL"}</td>
                                                                <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800">{mat.name || "—"}</td>
                                                                <td className="p-1 text-center border-r border-neutral-200 text-neutral-600">{mat.unit || "unit"}</td>
                                                                <td className="p-1 text-center font-bold text-neutral-800">{mat.stock || mat.incoming || "0"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Brand */}
                                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                                        <span>ADIDAYA STUDIO — DOKUMEN PROYEK RESMI</span>
                                        <span>{getReportPageDocCode(1)}</span>
                                    </div>
                                </div>

                                {/* ---------------- PAGE 2: NOTES, PHOTOS & SIGNATURES ---------------- */}
                                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                                    <div className="flex flex-col gap-4">
                                        {renderPageHeader(getReportMeta(reportType).code, getReportPageDocCode(2), `${getReportMeta(reportType).title} — LAMPIRAN & PERSETUJUAN`)}

                                        {/* Catatan / Kendala */}
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                                {getReportConfig(reportType).summaryFields.notesLabel.toUpperCase()}
                                            </div>
                                            <div className="p-2.5 border border-neutral-300 border-t-0 min-h-[100px] text-[7px] font-semibold text-neutral-800 leading-relaxed whitespace-pre-wrap">
                                                {notes || "Tidak ada catatan teknis / kendala khusus."}
                                            </div>
                                        </div>

                                        {/* Rencana Pekerjaan Lanjutan */}
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                                {getReportConfig(reportType).evalTitle.toUpperCase()} & RENCANA TINDAK LANJUT
                                            </div>
                                            <div className="p-2.5 border border-neutral-300 border-t-0 min-h-[100px] text-[7px] font-semibold text-neutral-800 leading-relaxed whitespace-pre-wrap">
                                                {nextActions || "Tidak ada rekomendasi khusus."}
                                            </div>
                                        </div>

                                        {/* Dokumentasi Lapangan */}
                                        {photos.length > 0 && (
                                            <div>
                                                <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                                                    DOKUMENTASI FOTO LAPANGAN
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 p-2 border border-neutral-300 border-t-0 bg-neutral-50/30">
                                                    {photos.slice(0, 4).map((ph, idx) => (
                                                        <div key={idx} className="flex flex-col gap-1">
                                                            <img src={ph.url} alt="Dokumentasi" className="w-full h-28 object-cover rounded border border-neutral-200" />
                                                            <div className="text-[6px] font-semibold text-neutral-700 leading-tight">{ph.caption || "Dokumentasi foto"}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Signatures */}
                                    <div className="grid grid-cols-2 gap-3 border-t border-neutral-300 pt-4 text-center mt-6">
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
