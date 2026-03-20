"use client";

import { useFinance } from "@/components/flow/finance/FinanceContext";
import {
    DollarSign, TrendingUp, Receipt, Briefcase, PieChart, Info,
    ChevronDown, CalendarRange, FileText, FileSpreadsheet, Clock, Loader2, X, Trash2, Eye
} from "lucide-react";
import { format, startOfMonth, startOfWeek, subMonths, isSameMonth, eachDayOfInterval, eachMonthOfInterval, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "@/components/flow/finance/FinanceSummaryCard";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { fetchPurchasingRequests, fetchReimburseRequests } from "@/lib/client/finance-api";
import { fetchAllProjects } from "@/lib/api/projects";
import { CATEGORY_OPTIONS, REIMBURSE_CATEGORY_OPTIONS } from "./modules/constants";
import { formatCurrency, formatShort, formatStatus, cleanEntityName, generateReportFileName } from "./modules/utils";
import { ReportGeneratorDrawer, ReportOptions } from "./modules/ReportGeneratorDrawer";
import { ExportManagerDrawer, GeneratedReport } from "./modules/ExportManagerDrawer";
import clsx from "clsx";
import * as XLSX from "xlsx";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';


// Unified record type from both purchasing and reimburse
interface FinanceRecord {
    id: string;
    date: string;
    created_at: string;
    amount: number;
    type?: string;        // purchasing category (MATERIAL, SERVICES, etc.)
    category?: string;    // reimburse category
    project_id?: string;
    project_code?: string;
    project_name?: string;
    project_number?: number;
    source: "purchasing" | "reimburse";
    approval_status?: string;
    financial_status?: string;
    status?: string; // for reimburse
}

function calculateReportStats(records: FinanceRecord[], options: {
    timeframe: "WEEK" | "MONTH" | "3M" | "1Y" | "ALL" | "CUSTOM";
    projectId?: string;
    projectIds?: string[];
    categories?: string[];
    customStart?: string;
    customEnd?: string;
}) {
    const now = new Date();

    // 1. Filter by Project(s)
    let filtered = records;
    const pIds = options.projectIds || (options.projectId && options.projectId !== "ALL" ? [options.projectId] : ["ALL"]);
    
    if (!pIds.includes("ALL")) {
        filtered = filtered.filter(r => pIds.includes(r.project_id || ""));
    }

    // 2. Filter by Category
    const cats = options.categories || ["ALL"];
    if (!cats.includes("ALL")) {
        filtered = filtered.filter(r => {
            const catKey = r.type || r.category || "OTHER";
            return cats.includes(catKey);
        });
    }

    // 3. Build Trend Data based on Timeframe
    let trendData: Array<{ label: string; amount: number }> = [];
    let timeframeRecords: FinanceRecord[] = [];

    if (options.timeframe === "WEEK") {
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end: now });
        timeframeRecords = filtered.filter(r => isWithinInterval(new Date(r.date), { start: startOfDay(start), end: endOfDay(now) }));
        trendData = days.map(day => ({
            label: format(day, "EEE"),
            amount: timeframeRecords.filter(r => new Date(r.date).toDateString() === day.toDateString()).reduce((sum, r) => sum + r.amount, 0)
        }));
    } else if (options.timeframe === "MONTH") {
        const start = startOfMonth(now);
        const days = Array.from({ length: now.getDate() }).map((_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
        timeframeRecords = filtered.filter(r => isWithinInterval(new Date(r.date), { start: startOfDay(start), end: endOfDay(now) }));
        trendData = days.map(day => ({
            label: format(day, "dd"),
            amount: timeframeRecords.filter(r => new Date(r.date).toDateString() === day.toDateString()).reduce((sum, r) => sum + r.amount, 0)
        }));
    } else if (options.timeframe === "3M") {
        const start = startOfMonth(subMonths(now, 2));
        const months = eachMonthOfInterval({ start, end: now });
        timeframeRecords = filtered.filter(r => isWithinInterval(new Date(r.date), { start: startOfDay(start), end: endOfDay(now) }));
        trendData = months.map(month => ({
            label: format(month, "MMM"),
            amount: timeframeRecords.filter(r => isSameMonth(new Date(r.date), month)).reduce((sum, r) => sum + r.amount, 0)
        }));
    } else if (options.timeframe === "1Y") {
        const start = startOfMonth(subMonths(now, 11));
        const months = eachMonthOfInterval({ start, end: now });
        timeframeRecords = filtered.filter(r => isWithinInterval(new Date(r.date), { start: startOfDay(start), end: endOfDay(now) }));
        trendData = months.map(month => ({
            label: format(month, "MMM yy"),
            amount: timeframeRecords.filter(r => isSameMonth(new Date(r.date), month)).reduce((sum, r) => sum + r.amount, 0)
        }));
    } else if (options.timeframe === "CUSTOM" && options.customStart && options.customEnd) {
        const start = new Date(options.customStart);
        const end = new Date(options.customEnd);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        timeframeRecords = filtered.filter(r => isWithinInterval(new Date(r.date), { start: startOfDay(start), end: endOfDay(end) }));
        if (diffDays <= 31) {
            const days = eachDayOfInterval({ start, end });
            trendData = days.map(day => ({
                label: format(day, "dd MMM"),
                amount: timeframeRecords.filter(r => new Date(r.date).toDateString() === day.toDateString()).reduce((sum, r) => sum + r.amount, 0)
            }));
        } else {
            const months = eachMonthOfInterval({ start, end });
            trendData = months.map(month => ({
                label: format(month, "MMM yy"),
                amount: timeframeRecords.filter(r => isSameMonth(new Date(r.date), month)).reduce((sum, r) => sum + r.amount, 0)
            }));
        }
    } else {
        const start = startOfMonth(subMonths(now, 23));
        const months = eachMonthOfInterval({ start, end: now });
        timeframeRecords = options.timeframe === "ALL" ? filtered : filtered.filter(r => isWithinInterval(new Date(r.date), { start: startOfDay(start), end: endOfDay(now) }));
        trendData = months.map(month => ({
            label: format(month, "MMM yy"),
            amount: timeframeRecords.filter(r => isSameMonth(new Date(r.date), month)).reduce((sum, r) => sum + r.amount, 0)
        }));
    }

    const totalExpenses = timeframeRecords.reduce((sum, r) => sum + r.amount, 0);
    const purchasingTotal = timeframeRecords.filter(r => r.source === "purchasing").reduce((sum, r) => sum + r.amount, 0);
    const reimburseTotal = timeframeRecords.filter(r => r.source === "reimburse").reduce((sum, r) => sum + r.amount, 0);
    
    const outstandingTotal = filtered.filter(r => {
        if (r.source === "purchasing") {
            return (r.approval_status === "SUBMITTED" || r.approval_status === "PENDING" || r.approval_status === "NEED_REVISION") ||
                   (r.approval_status === "APPROVED" && r.financial_status === "UNPAID");
        }
        return (r.status === "PENDING" || r.status === "SUBMITTED" || r.status === "APPROVED" || r.status === "NEED_REVISION");
    }).reduce((sum, r) => sum + r.amount, 0);

    const averageSpending = trendData.length > 0 ? totalExpenses / trendData.length : 0;
    const activeProjectsCount = new Set(timeframeRecords.filter(r => r.project_id).map(r => r.project_id)).size;

    const byCategory: Record<string, number> = {};
    timeframeRecords.forEach(r => {
        const catKey = r.type || r.category || "OTHER";
        const catLabel = CATEGORY_OPTIONS.find(c => c.value === catKey)?.label ||
                         REIMBURSE_CATEGORY_OPTIONS.find(c => c.value === catKey)?.label ||
                         formatStatus(catKey);
        byCategory[catLabel] = (byCategory[catLabel] || 0) + r.amount;
    });
    const categoryData = Object.entries(byCategory)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    const maxCategory = Math.max(...categoryData.map(c => c.value), 1);

    const byProject: Record<string, { code: string; name: string; value: number }> = {};
    timeframeRecords.forEach(r => {
        const pid = r.project_id || "unassigned";
        if (!byProject[pid]) {
            byProject[pid] = {
                code: r.project_code || "GEN",
                name: r.project_name || "General / Internal",
                value: 0
            };
        }
        byProject[pid].value += r.amount;
    });
    const projectData = Object.entries(byProject)
        .map(([id, d]) => ({ id, code: d.code, name: d.name, value: d.value }))
        .sort((a, b) => b.value - a.value);

    return { trendData, categoryData, maxCategory, projectData, totalExpenses, purchasingTotal, reimburseTotal, outstandingTotal, averageSpending, activeProjectsCount };
}

export default function ReportsClient() {
    const { isLoading: isAuthLoading, isInitialized, userId } = useFinance();
    const [timeframe, setTimeframe] = useState<"WEEK" | "MONTH" | "3M" | "1Y" | "ALL" | "CUSTOM">("MONTH");
    const [projectId, setProjectId] = useState<string>("ALL");
    const [customStart, setCustomStart] = useState<string>(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
    const [customEnd, setCustomEnd] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string; number?: number }>>([]);
    const [records, setRecords] = useState<FinanceRecord[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [isExportManagerOpen, setIsExportManagerOpen] = useState(false);
    const [exportingIds, setExportingIds] = useState<Record<string, boolean>>({});
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("finance_generated_reports");
            if (saved) {
                try { return JSON.parse(saved); } catch (e) { return []; }
            }
        }
        return [];
    });

    // Save reports to localStorage on change
    useEffect(() => {
        localStorage.setItem("finance_generated_reports", JSON.stringify(generatedReports));
    }, [generatedReports]);

    // Fetch ALL data by paginating through API (server caps at 100 per request)
    useEffect(() => {
        if (!isInitialized || !userId) return;

        const fetchAllPaginated = async (fetchFn: (opts: any) => Promise<{ data: any[]; total: number }>, label: string) => {
            const PAGE_SIZE = 100;
            let allData: any[] = [];
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const res = await fetchFn({ limit: PAGE_SIZE, offset });
                const batch = res.data || [];
                allData = [...allData, ...batch];
                offset += PAGE_SIZE;
                // Stop when we get less than PAGE_SIZE (no more pages)
                if (batch.length < PAGE_SIZE) hasMore = false;
            }
            return allData;
        };

        const loadAll = async () => {
            setIsLoadingData(true);
            try {
                const [purchasingData, reimburseData, projectList] = await Promise.all([
                    fetchAllPaginated(fetchPurchasingRequests, "purchasing"),
                    fetchAllPaginated(fetchReimburseRequests, "reimburse"),
                    fetchAllProjects()
                ]);

                setProjects(projectList.map(p => ({
                    id: p.id,
                    code: p.projectCode || "N/A",
                    name: p.projectName,
                    number: Number(p.projectNumber) || undefined
                })));

                const purchasingRecords: FinanceRecord[] = purchasingData.map((r: any) => ({
                    id: r.id,
                    date: r.date || r.created_at,
                    created_at: r.created_at,
                    amount: Number(r.amount) || 0,
                    type: r.type,
                    project_id: r.project_id,
                    project_code: r.project?.project_code || r.project_code || "N/A",
                    project_name: r.project?.project_name || r.project_name || "Unknown",
                    project_number: r.project?.project_number || r.project_number,
                    source: "purchasing" as const,
                    approval_status: r.approval_status,
                    financial_status: r.financial_status
                }));

                const reimburseRecords: FinanceRecord[] = reimburseData.map((r: any) => ({
                    id: r.id,
                    date: r.date || r.created_at,
                    created_at: r.created_at,
                    amount: Number(r.amount) || 0,
                    category: r.category,
                    project_id: r.project_id,
                    project_code: r.project?.project_code || r.project_code || "N/A",
                    project_name: r.project?.project_name || r.project_name || "Unknown",
                    project_number: r.project?.project_number || r.project_number,
                    source: "reimburse" as const,
                    status: r.status
                }));

                setRecords([...purchasingRecords, ...reimburseRecords]);
            } catch (e) {
                console.error("Failed to load reports data:", e);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadAll();
    }, [isInitialized, userId]);

    const stats = useMemo(() => {
        return calculateReportStats(records, { timeframe, projectId, customStart, customEnd });
    }, [records, timeframe, projectId, customStart, customEnd]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl">
                    <p className="text-xs font-bold text-neutral-500 mb-1">{label}</p>
                    <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const isLoading = isAuthLoading || isLoadingData;

    // ——— Report Generation ———
    const getTimeframeLabel = () => {
        const now = new Date();
        switch (timeframe) {
            case "WEEK": 
                const startW = startOfWeek(now, { weekStartsOn: 1 });
                const endW = endOfDay(now);
                return `This Week (${format(startW, "dd")}-${format(endW, "dd MMM yyyy")})`;
            case "MONTH": 
                return `This Month (${format(now, "MMMM yyyy")})`;
            case "3M": 
                const start3M = startOfMonth(subMonths(now, 2));
                return `Last 3 Months (${format(start3M, "MMM")} - ${format(now, "MMM yyyy")})`;
            case "1Y": 
                return `Full Year ${format(now, "yyyy")}`;
            case "ALL": 
                return "All Time";
            case "CUSTOM": 
                return `${format(new Date(customStart), "dd MMM")} – ${format(new Date(customEnd), "dd MMM yyyy")}`;
        }
    };

    // Helper to get clean filenames without "This Month" etc
    const getCleanTimeframeLabel = () => {
        const now = new Date();
        switch (timeframe) {
            case "WEEK": 
                const startW = startOfWeek(now, { weekStartsOn: 1 });
                return `${format(startW, "dd")}-${format(now, "dd MMM yyyy")}`;
            case "MONTH": 
                return format(now, "MMMM yyyy");
            case "3M": 
                const start3M = startOfMonth(subMonths(now, 2));
                return `${format(start3M, "MMM")}-${format(now, "MMM yyyy")}`;
            case "1Y": 
                return format(now, "yyyy");
            case "ALL": 
                return "All-Time";
            case "CUSTOM": 
                return `${format(new Date(customStart), "dd MMM")}-${format(new Date(customEnd), "dd MMM yyyy")}`;
        }
    };
    const getProjectLabel = () => {
        if (projectId === "ALL") return "All Projects";
        const p = projects.find(pp => pp.id === projectId);
        return p ? `[${p.code}] ${p.name}` : "Unknown";
    };

    const handleGeneratePDF = useCallback(async (customFilename?: string, histOptions?: ReportOptions, histTimeframe?: string) => {
        setIsGenerating(true);
        try {
            // Use historical options if provided, otherwise use current component state
            const statsToUse = histOptions 
                ? calculateReportStats(records, histOptions)
                : stats;

            const timeframeLabel = histTimeframe || (histOptions ? histOptions.timeframe : getTimeframeLabel());
            
            let projectLabel = "";
            if (histOptions) {
                const selectedProjects = histOptions.projectIds.includes("ALL") ? projects : projects.filter(p => histOptions.projectIds.includes(p.id));
                projectLabel = histOptions.projectIds.includes("ALL") ? "All Projects" : selectedProjects.map(p => p.code).join(", ");
            } else {
                projectLabel = getProjectLabel();
            }

            const generatedAt = format(new Date(), "dd MMM yyyy, HH:mm");

            const summaryCards = [
                { label: "Total Spending", value: statsToUse.totalExpenses, format: "currency" as const, color: "blue" as const },
                { label: "Purchasing", value: statsToUse.purchasingTotal, format: "currency" as const, color: "green" as const },
                { label: "Reimbursement", value: statsToUse.reimburseTotal, format: "currency" as const, color: "orange" as const },
                { label: "Active Projects", value: statsToUse.activeProjectsCount, format: "number" as const, color: "neutral" as const },
            ];

            const projectColumns = [
                { id: "project", label: "Project", align: "left" as const },
                { id: "amount", label: "Amount", align: "right" as const, format: "currency" as const },
                { id: "percentage", label: "%", align: "right" as const },
            ];

            const projectRows = statsToUse.projectData.map(p => ({
                project: `[${p.code}] ${p.name}`,
                amount: p.value,
                percentage: statsToUse.totalExpenses > 0 ? `${((p.value / statsToUse.totalExpenses) * 100).toFixed(1)}%` : "0%",
            }));

            const categoryColumns = [
                { id: "category", label: "Category", align: "left" as const },
                { id: "amount", label: "Amount", align: "right" as const, format: "currency" as const },
                { id: "percentage", label: "%", align: "right" as const },
            ];

            const categoryRows = statsToUse.categoryData.map(c => ({
                category: c.label,
                amount: c.value,
                percentage: statsToUse.totalExpenses > 0 ? `${((c.value / statsToUse.totalExpenses) * 100).toFixed(1)}%` : "0%",
            }));

            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: histOptions 
                            ? (histOptions.projectIds.includes("ALL") ? "ALL" : projects.find(p => histOptions.projectIds.includes(p.id))?.code || "RPT")
                            : (projectId === "ALL" ? "ALL" : projects.find(p => p.id === projectId)?.code || "RPT"),
                        projectName: projectLabel,
                        documentName: `Finance Report - ${timeframeLabel}`,
                        periodText: `Period: ${timeframeLabel}`,
                        generatedAt,
                    },
                    summary: summaryCards,
                    sections: [
                        { title: "Project Breakdown", columns: projectColumns, data: projectRows },
                        { title: "Category Breakdown", columns: categoryColumns, data: categoryRows }
                    ],
                    trendData: statsToUse.trendData,
                    categoryData: statsToUse.categoryData
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const rawMsg = errorData.details || errorData.error || "Export failed";
                const sanitizedMsg = String(rawMsg).replace(/[^\x00-\x7F]/g, "-");
                throw new Error(sanitizedMsg);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const filename = customFilename || generateReportFileName(
                histOptions ? histOptions.projectIds : (projectId === "ALL" ? ["ALL"] : [projectId]),
                statsToUse.projectData,
                histOptions ? timeframeLabel : getCleanTimeframeLabel(),
                "pdf"
            );

            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            if (!customFilename && !histOptions) {
                setGeneratedReports(prev => [{
                    id: crypto.randomUUID(),
                    name: filename.replace(".pdf", ""),
                    type: "pdf",
                    timeframe: timeframeLabel,
                    project: projectLabel,
                    generatedAt: format(new Date(), "dd MMM yyyy, HH:mm"),
                    url,
                }, ...prev]);
            }
        } catch (error) {
            console.error("PDF Export Error:", error);
        } finally {
            setIsGenerating(false);
        }
    }, [stats, records, projectId, projects, timeframe, getCleanTimeframeLabel, getTimeframeLabel, getProjectLabel]);

    const handleGenerateExcel = useCallback(async (customFilename?: string, histOptions?: ReportOptions, histTimeframe?: string) => {
        setIsGenerating(true);
        try {
            // Use historical options if provided, otherwise use current component state
            const statsToUse = histOptions 
                ? calculateReportStats(records, histOptions)
                : stats;

            const timeframeLabel = histTimeframe || (histOptions ? histOptions.timeframe : getTimeframeLabel());
            
            let projectLabel = "";
            if (histOptions) {
                const selectedProjects = histOptions.projectIds.includes("ALL") ? projects : projects.filter(p => histOptions.projectIds.includes(p.id));
                projectLabel = histOptions.projectIds.includes("ALL") ? "All Projects" : selectedProjects.map(p => p.code).join(", ");
            } else {
                projectLabel = getProjectLabel();
            }

            const filename = customFilename || generateReportFileName(
                histOptions ? histOptions.projectIds : (projectId === "ALL" ? ["ALL"] : [projectId]),
                statsToUse.projectData,
                histOptions ? timeframeLabel : getCleanTimeframeLabel(),
                "xlsx"
            );

            // Category Sheet
            const catData = statsToUse.categoryData.map(c => ({
                "Category": c.label,
                "Amount": c.value,
                "% of Total": statsToUse.totalExpenses > 0 ? `${((c.value / statsToUse.totalExpenses) * 100).toFixed(1)}%` : "0%"
            }));

            // Project Sheet
            const projData = statsToUse.projectData.map(p => ({
                "Project Code": p.code,
                "Project Name": p.name,
                "Amount": p.value,
                "% of Total": statsToUse.totalExpenses > 0 ? `${((p.value / statsToUse.totalExpenses) * 100).toFixed(1)}%` : "0%"
            }));

            const wb = XLSX.utils.book_new();

            const wsCat = XLSX.utils.json_to_sheet(catData);
            wsCat['!cols'] = Object.keys(catData[0] || {}).map(k => ({ wch: Math.max(15, k.length + 5) }));
            XLSX.utils.book_append_sheet(wb, wsCat, "Categories");

            const wsProj = XLSX.utils.json_to_sheet(projData);
            wsProj['!cols'] = Object.keys(projData[0] || {}).map(k => ({ wch: Math.max(15, k.length + 5) }));
            XLSX.utils.book_append_sheet(wb, wsProj, "Project Breakdown");

            XLSX.writeFile(wb, filename);

            if (!customFilename && !histOptions) {
                setGeneratedReports(prev => [{
                    id: crypto.randomUUID(),
                    name: filename.replace(".xlsx", ""),
                    type: "excel",
                    timeframe: timeframeLabel,
                    project: projectLabel,
                    generatedAt: format(new Date(), "dd MMM yyyy, HH:mm"),
                    url: "",
                }, ...prev]);
            }
        } catch (error) {
            console.error("Excel Export Error:", error);
        } finally {
            setIsGenerating(false);
        }
    }, [stats, records, projects, timeframe, projectId, customStart, customEnd, getTimeframeLabel, getCleanTimeframeLabel, getProjectLabel]);
    const handleGenerateReport = (options: ReportOptions) => {
        setIsGenerating(true);
        try {
            // Use descriptive timeframe logic
            let timeframeLabel = "";
            const now = new Date();
            if (options.timeframe === "WEEK") {
                const startW = startOfWeek(now, { weekStartsOn: 1 });
                timeframeLabel = `This Week (${format(startW, "dd")}-${format(now, "dd MMM yyyy")})`;
            } else if (options.timeframe === "MONTH") {
                timeframeLabel = `This Month (${format(now, "MMMM yyyy")})`;
            } else if (options.timeframe === "3M") {
                const start3M = startOfMonth(subMonths(now, 2));
                timeframeLabel = `Last 3 Months (${format(start3M, "MMM")} - ${format(now, "MMM yyyy")})`;
            } else if (options.timeframe === "1Y") {
                timeframeLabel = `Full Year ${format(now, "yyyy")}`;
            } else if (options.timeframe === "ALL") {
                timeframeLabel = "All Time";
            } else if (options.timeframe === "CUSTOM" && options.customStart && options.customEnd) {
                timeframeLabel = `${format(new Date(options.customStart), "dd MMM")} - ${format(new Date(options.customEnd), "dd MMM yyyy")}`;
            } else {
                timeframeLabel = options.timeframe;
            }

            const selectedProjects = options.projectIds.includes("ALL") 
                ? projects 
                : projects.filter(p => options.projectIds.includes(p.id));
            
            const projectLabel = options.projectIds.includes("ALL") 
                ? "All Projects" 
                : selectedProjects.map(p => p.code).join(", ");

            const categoryLabel = options.categories.includes("ALL")
                ? "All Categories"
                : options.categories.map(c => {
                    const found = CATEGORY_OPTIONS.find(o => o.value === c) || REIMBURSE_CATEGORY_OPTIONS.find(o => o.value === c);
                    return found?.label || c;
                }).join(", ");

            // Calculate stats for this specific generation to get correct projectData for filename
            const genStats = calculateReportStats(records, options);

            const filename = generateReportFileName(
                options.projectIds,
                genStats.projectData,
                getCleanTimeframeLabel(), // Keep clean label for filename base
                "xlsx"
            );

            const newReport: GeneratedReport = {
                id: crypto.randomUUID(),
                name: filename.replace(".xlsx", ""),
                type: "excel",
                timeframe: timeframeLabel,
                project: `${projectLabel} · ${categoryLabel}`,
                generatedAt: format(new Date(), "dd MMM yyyy, HH:mm"),
                url: "",
                options: {
                    ...options,
                    // We keep the raw options.timeframe ("MONTH", "WEEK", etc.) 
                    // and let the report.timeframe handle the display string.
                }
            };

            setGeneratedReports(prev => [newReport, ...prev]);
            setIsGeneratorOpen(false);
            
            // Show success feedback
            toast.success("Report generated successfully!", {
                style: {
                    background: 'rgba(255, 255, 255, 0.45)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    padding: '14px 24px',
                    color: '#0f172a',
                    borderRadius: '24px',
                    fontWeight: 600,
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)',
                },
                iconTheme: {
                    primary: '#059669',
                    secondary: '#fff',
                },
                duration: 4000,
            });

            // Scroll to history after a short delay
            setTimeout(() => {
                historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 400);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportReport = async (report: GeneratedReport, formatType: "pdf" | "excel") => {
        const key = `${report.id}-${formatType}`;
        setExportingIds(prev => ({ ...prev, [key]: true }));
        try {
            // Re-map display timeframe label back to raw options if available
            // Note: report.options already contains the raw timeframe type if generated correctly
            if (formatType === "excel") {
                await handleGenerateExcel(report.name, report.options as any, report.timeframe); 
            } else {
                await handleGeneratePDF(report.name, report.options as any, report.timeframe);
            }
        } finally {
            setExportingIds(prev => ({ ...prev, [key]: false }));
        }
    };



    const deleteReport = (id: string) => {
        setGeneratedReports(prev => prev.filter(r => r.id !== id));
        setConfirmDeleteId(null);
    };

    // Wire toolbar events
    useEffect(() => {
        const handleExport = () => setIsExportManagerOpen(true);
        const handleFab = (e: any) => {
            // FAB on reports = open generator
            if (e.detail?.id === 'FINANCE_NEW_PURCHASE' || e.detail?.id === 'FINANCE_NEW_REIMBURSE' || !e.detail?.id || e.detail?.id === 'FINANCE_EXPORT') {
                setIsGeneratorOpen(true);
            }
        };
        window.addEventListener('export-finance', handleExport);
        window.addEventListener('fab-action', handleFab);
        return () => {
            window.removeEventListener('export-finance', handleExport);
            window.removeEventListener('fab-action', handleFab);
        };
    }, []);

    return (
        <>
            <FinancePageWrapper
                breadcrumbItems={[]}
                header={<FinanceHeader title="Reports" subtitle="Analyze spending trends and project breakdowns." />}
            >
                {isLoadingData ? <GlobalLoading /> : (
                <div className="space-y-6 w-full animate-in fade-in duration-500 pb-10">
                    <>
                        {/* FILTERS TOOLBAR */}
                        <div className="flex flex-col gap-3 bg-white/40 dark:bg-neutral-900/40 p-4 rounded-[32px] border border-white/60 dark:border-neutral-800/40 sm:bg-transparent sm:p-0 sm:border-none">
                            <div className="flex flex-col sm:flex-row gap-3 items-center">
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                                    {/* Timeframe Pill Toggle */}
                                    <div className="flex gap-0 w-full sm:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-neutral-100/70 dark:bg-neutral-800/60 rounded-full p-[2px] relative shrink-0">
                                        {(["WEEK", "MONTH", "3M", "1Y", "ALL", "CUSTOM"] as const).map(tf => (
                                            <button
                                                key={tf}
                                                onClick={() => setTimeframe(tf)}
                                                className={clsx(
                                                    "relative px-3.5 py-1.5 rounded-full text-[11px] transition-colors whitespace-nowrap z-10",
                                                    timeframe === tf
                                                        ? "font-medium text-neutral-900 dark:text-white"
                                                        : "font-normal text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                                )}
                                            >
                                                {timeframe === tf && (
                                                    <motion.div
                                                        layoutId="timeframe-pill"
                                                        className="absolute inset-0 bg-white dark:bg-neutral-700 rounded-full"
                                                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                                                        transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                                                    />
                                                )}
                                                <span className="relative z-10 flex items-center gap-1">
                                                    {tf === "CUSTOM" && <CalendarRange className="w-3 h-3" />}
                                                    {tf === "WEEK" ? "Week" : tf === "MONTH" ? "Month" : tf === "3M" ? "3M" : tf === "1Y" ? "1Y" : tf === "ALL" ? "All" : "Custom"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom Date Range Row (Web & High-level Mobile) */}
                                    <AnimatePresence>
                                        {timeframe === "CUSTOM" && (
                                            <motion.div
                                                initial={{ width: 0, opacity: 0 }}
                                                animate={{ width: "auto", opacity: 1 }}
                                                exit={{ width: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: "circOut" }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex items-center gap-2 bg-neutral-100/70 dark:bg-neutral-800/60 rounded-full px-3 py-1.5 whitespace-nowrap">
                                                    <CalendarRange className="w-3.5 h-3.5 text-neutral-400" />
                                                    <input
                                                        type="date"
                                                        value={customStart}
                                                        onChange={(e) => setCustomStart(e.target.value)}
                                                        className="bg-transparent border-none outline-none text-xs font-normal text-neutral-800 dark:text-white w-[110px]"
                                                    />
                                                    <span className="text-[10px] font-normal text-neutral-300">→</span>
                                                    <input
                                                        type="date"
                                                        value={customEnd}
                                                        onChange={(e) => setCustomEnd(e.target.value)}
                                                        className="bg-transparent border-none outline-none text-xs font-normal text-neutral-800 dark:text-white w-[110px]"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Project Dropdown */}
                                <div className="relative w-full sm:w-56 sm:ml-auto">
                                    <select
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full appearance-none bg-neutral-100/70 dark:bg-neutral-800/60 border-none text-neutral-900 dark:text-white text-xs font-normal rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                                    >
                                        <option value="ALL">All Projects</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* SUMMARY CARDS - Now scrollable on mobile/iPad */}
                        <FinanceSummaryCardsRow className="!mb-6">
                            {[
                                // Summary cards formatted with 2 decimal precision
                                { icon: <DollarSign className="w-5 h-5 text-blue-600" />, iconBg: "bg-blue-100", label: "Total Spending", value: formatShort(stats.totalExpenses), subtext: `${records.length} transactions` },
                                { icon: <Receipt className="w-5 h-5 text-orange-600" />, iconBg: "bg-orange-100", label: "Outstanding Bills", value: formatShort(stats.outstandingTotal), subtext: "Unpaid / Pending" },
                                { icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, iconBg: "bg-emerald-100", label: "Purchasing", value: formatShort(stats.purchasingTotal), subtext: getTimeframeLabel() },
                                { icon: <Receipt className="w-5 h-5 text-blue-600" />, iconBg: "bg-blue-100", label: "Reimbursement", value: formatShort(stats.reimburseTotal), subtext: getTimeframeLabel() },
                                { icon: <Briefcase className="w-5 h-5 text-purple-600" />, iconBg: "bg-purple-100", label: "Active Projects", value: stats.activeProjectsCount.toString(), subtext: "With expenses" },
                            ].map((card, i) => (
                                <FinanceSummaryCard
                                    key={card.label}
                                    icon={card.icon}
                                    iconBg={card.iconBg}
                                    label={card.label}
                                    value={card.value}
                                    subtext={card.subtext}
                                    valueColor="text-neutral-900"
                                />
                            ))}
                        </FinanceSummaryCardsRow>

                        {/* LINE CHART & CATEGORIES */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Line Chart */}
                            <div className="lg:col-span-2 flex flex-col gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-neutral-900 dark:text-white tracking-tight">Expense Trend</h3>
                                        <div className="group relative">
                                            <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl text-[11px] font-medium text-neutral-600 dark:text-neutral-400 z-50 text-center">
                                                {timeframe === "WEEK" ? "Daily spending this week" : timeframe === "MONTH" ? "Daily spending this month" : timeframe === "3M" ? "Monthly spending over 3 months" : timeframe === "1Y" ? "Monthly spending over 12 months" : "Monthly spending all time"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-neutral-700/40 p-6 shadow-sm flex flex-col flex-1">
                                    <div className="w-full min-h-[250px] relative -ml-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={stats.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                                <XAxis
                                                    dataKey="label"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#888888', fontSize: 11, fontWeight: 600 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#888888', fontSize: 11, fontWeight: 600 }}
                                                    tickFormatter={(val) => formatShort(val)}
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="amount"
                                                    stroke="#3B82F6"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3B82F6' }}
                                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#2563EB' }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Top Categories */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white tracking-tight">Top Categories</h3>
                                </div>
                                <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-neutral-700/40 p-6 shadow-sm flex-1">
                                    <div className="space-y-5">
                                        {stats.categoryData.slice(0, 6).map((c) => (
                                            <div key={c.label} className="group cursor-default">
                                                <div className="flex justify-between mb-1.5 items-end">
                                                    <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.label}</span>
                                                    <span className="text-sm font-black text-neutral-900 dark:text-white">{formatShort(c.value)}</span>
                                                </div>
                                                <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(c.value / stats.maxCategory) * 100}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className="h-full bg-blue-500 dark:bg-blue-600 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {stats.categoryData.length === 0 && (
                                            <p className="text-neutral-500 text-sm py-4 text-center font-medium">No expenses to categorize.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PROJECT BREAKDOWN TABLE */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-neutral-900 dark:text-white tracking-tight">Project Breakdown</h3>
                                <div className="group relative">
                                    <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl text-[11px] font-medium text-neutral-600 dark:text-neutral-400 z-50 text-center">
                                        Allocation of funds per project
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-neutral-700/40 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-100 dark:border-white/[0.06]">
                                            <tr>
                                                <th className="text-left px-6 py-4 text-[10px] font-normal text-neutral-400 dark:text-neutral-500">Project</th>
                                                <th className="text-right px-6 py-4 text-[10px] font-normal text-neutral-400 dark:text-neutral-500">Total Output</th>
                                                <th className="text-right px-6 py-4 text-[10px] font-normal text-neutral-400 dark:text-neutral-500">% of Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                            {stats.projectData.map((p) => {
                                                const percentage = stats.totalExpenses > 0 ? ((p.value / stats.totalExpenses) * 100).toFixed(1) : "0.0";
                                                return (
                                                    <tr key={p.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50 shadow-sm shrink-0">
                                                                    <span className="text-[10px] font-normal text-neutral-900 dark:text-white whitespace-nowrap">
                                                                        {p.code}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-sm font-normal text-neutral-900 dark:text-white">{p.name}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="text-sm font-normal text-neutral-900 dark:text-white">
                                                                {formatCurrency(p.value)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-normal">
                                                                {percentage}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {stats.projectData.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-8 text-center text-sm font-medium text-neutral-500">
                                                        No project allocations found in this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot className="bg-neutral-50/50 dark:bg-white/[0.02] border-t border-neutral-100 dark:border-white/[0.06]">
                                            <tr className="font-bold text-neutral-900 dark:text-white">
                                                <td className="px-6 py-4 text-sm">{stats.projectData.length} Projects</td>
                                                <td className="px-6 py-4 text-right text-sm">{formatCurrency(stats.totalExpenses)}</td>
                                                <td className="px-6 py-4 text-right text-sm">100.00%</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* GENERATED REPORTS HISTORY */}
                        <div className="flex flex-col gap-4" ref={historyRef}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white tracking-tight">Generated Reports</h3>
                                    <div className="group relative">
                                        <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl text-[11px] font-medium text-neutral-600 dark:text-neutral-400 z-50 text-center">
                                            Use the Export (↓) button for PDF or the (+) button for Excel
                                        </div>
                                    </div>
                                </div>
                                {isGenerating && (
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-xs font-bold">Generating...</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-neutral-700/40 overflow-hidden shadow-sm">
                                <AnimatePresence mode="popLayout">
                                    {generatedReports.length === 0 ? (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="px-6 py-12 text-center"
                                        >
                                            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                                                <FileText className="w-6 h-6 text-neutral-400" />
                                            </div>
                                            <p className="text-sm font-bold text-neutral-500">No reports generated yet</p>
                                            <p className="text-xs text-neutral-400 mt-1">Click the Export or Add button in the toolbar to generate a report</p>
                                        </motion.div>
                                    ) : (
                                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                            {generatedReports.map((report) => (
                                                <motion.div
                                                    key={report.id}
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="px-6 py-5 flex items-center gap-5 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors"
                                                >
                                                     <div className={clsx(
                                                         "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                                         report.type === "pdf" ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"
                                                     )}>
                                                         {report.type === "pdf"
                                                             ? <FileText className="w-6 h-6 text-red-500" />
                                                             : <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                                                         }
                                                     </div>
                                                     
                                                     <div className="flex-1 min-w-0 py-1">
                                                         <p className="text-[15px] font-bold text-neutral-900 dark:text-white truncate tracking-tight mb-0.5">{report.name}</p>
                                                         <p className="text-[11px] text-neutral-500 font-medium opacity-80 mb-2">
                                                             {report.timeframe} · {report.project}
                                                         </p>
                                                         <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold w-fit">
                                                            <Clock className="w-3 h-3 opacity-60" />
                                                            {report.generatedAt}
                                                         </div>
                                                     </div>

                                                     <div className="flex items-center gap-3 shrink-0">
                                                             <button 
                                                                 onClick={() => handleExportReport(report, "excel")}
                                                                 disabled={exportingIds[`${report.id}-excel`]}
                                                                 className="group relative flex items-center gap-2 px-3.5 h-10 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 transition-all border border-emerald-100 dark:border-emerald-500/20 active:scale-95 disabled:opacity-50"
                                                             >
                                                                 {exportingIds[`${report.id}-excel`] 
                                                                     ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                                                     : <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                                 }
                                                                 <span className="text-[11px] font-black uppercase tracking-widest">{exportingIds[`${report.id}-excel`] ? 'Wait' : 'XLSX'}</span>
                                                             </button>

                                                             <button 
                                                                 onClick={() => handleExportReport(report, "pdf")}
                                                                 disabled={exportingIds[`${report.id}-pdf`]}
                                                                 className="group relative flex items-center gap-2 px-3.5 h-10 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl text-red-600 dark:text-red-400 transition-all border border-red-100 dark:border-red-500/20 active:scale-95 disabled:opacity-50 ml-1.5"
                                                             >
                                                                 {exportingIds[`${report.id}-pdf`]
                                                                     ? <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                                                     : <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                                 }
                                                                 <span className="text-[11px] font-black uppercase tracking-widest">{exportingIds[`${report.id}-pdf`] ? 'Wait' : 'PDF'}</span>
                                                             </button>
                                                            
                                                            <div className="flex items-center gap-1 min-w-[44px] justify-center">
                                                                {confirmDeleteId === report.id ? (
                                                                    <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                                                                        <button 
                                                                            onClick={() => deleteReport(report.id)}
                                                                            className="px-2.5 py-2 bg-rose-600 text-white text-[10px] font-bold rounded-full shadow-sm hover:bg-rose-700 transition-colors"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setConfirmDeleteId(null)}
                                                                            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => setConfirmDeleteId(report.id)}
                                                                        className="p-2.5 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full text-neutral-400 hover:text-rose-600 transition-all active:scale-90 group"
                                                                        title="Delete Report"
                                                                    >
                                                                        <Trash2 className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                 </motion.div>
                                             ))}
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </>
                </div>
            )}
        </FinancePageWrapper>

        <ReportGeneratorDrawer 
            isOpen={isGeneratorOpen} 
            onClose={() => setIsGeneratorOpen(false)} 
            projects={projects}
            onGenerate={handleGenerateReport}
        />

        <ExportManagerDrawer 
            isOpen={isExportManagerOpen} 
            onClose={() => setIsExportManagerOpen(false)}
            reports={generatedReports}
            onExport={handleExportReport}
        />
    </>
    );
}
