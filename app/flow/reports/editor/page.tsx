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
    Download
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import clsx from "clsx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";

interface ProjectDropdownOption {
    id: string;
    name: string;
    location?: string;
    project_code: string;
    project_number?: string;
}

function EditorContentComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // URL Search Params
    const paramType = searchParams.get("type") as "daily" | "weekly" | "monthly" | null;
    const paramId = searchParams.get("id");
    const paramProjectId = searchParams.get("projectId");

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [projects, setProjects] = useState<ProjectDropdownOption[]>([]);
    
    // Core Form State
    const [reportId, setReportId] = useState<string | null>(paramId);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">(paramType || "daily");
    const [title, setTitle] = useState("");
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [progress, setProgress] = useState("0");
    const [status, setStatus] = useState<ReportStatus>("on-track");
    
    // Text Content (For Weekly/Monthly or Legacy Daily)
    const [editorContent, setEditorContent] = useState("");

    // --- DAILY TEMPLATE STATES ---
    const [activeTab, setActiveTab] = useState<"general" | "workItems" | "personnel" | "cuaca" | "catatan" | "dokumentasi" | "material" | "ttd">("general");

    const [dayNumber, setDayNumber] = useState("");
    const [totalDays, setTotalDays] = useState("");
    const [remainingDays, setRemainingDays] = useState("");
    const [workPackage, setWorkPackage] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [revision, setRevision] = useState("00");

    // Dynamic Work Items
    const [workItems, setWorkItems] = useState<{ description: string; position: string; volume: string }[]>([
        { description: "", position: "", volume: "" }
    ]);

    // Personnel
    const [pmCount, setPmCount] = useState("");
    const [smCount, setSmCount] = useState("");
    const [supervisorCount, setSupervisorCount] = useState("");
    const [mandorCount, setMandorCount] = useState("");
    const [tukangCount, setTukangCount] = useState("");
    const [pekerjaCount, setPekerjaCount] = useState("");
    const [operatorCount, setOperatorCount] = useState("");

    // Work Hours (Hours/shift)
    const [shiftReguler, setShiftReguler] = useState("");
    const [shiftOt1, setShiftOt1] = useState("");
    const [shiftOt2, setShiftOt2] = useState("");
    const [shiftOt3, setShiftOt3] = useState("");

    // Weather
    const [weatherItems, setWeatherItems] = useState<{ timeRange: string; condition: string }[]>([
        { timeRange: "08.00 - 09.00", condition: "cerah" },
        { timeRange: "09.00 - 10.00", condition: "cerah" },
        { timeRange: "10.00 - 11.00", condition: "cerah" },
        { timeRange: "11.00 - 12.00", condition: "cerah" },
        { timeRange: "12.00 - 13.00", condition: "cerah" },
        { timeRange: "13.00 - 14.00", condition: "cerah" },
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
    const [nextActions, setNextActions] = useState("");
    const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
    const [isDocIdManuallyEdited, setIsDocIdManuallyEdited] = useState(false);
    const [hasDailyLogs, setHasDailyLogs] = useState<boolean | null>(null);
    const [isFetchingLogs, setIsFetchingLogs] = useState(false);
    const [locationOverride, setLocationOverride] = useState("");
    const [materialItems, setMaterialItems] = useState<{ name: string; category: string; unit: string; incoming: string; outgoing: string; stock: string }[]>([
        { name: "", category: "Material", unit: "unit", incoming: "", outgoing: "", stock: "" }
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

                // Set preselected project if exists in params
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

                        // Try to parse Daily report details from content JSON
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
                                    } else {
                                        const w = parsed.weather || {};
                                        const tempWeather = [];
                                        if (w.pagi) tempWeather.push({ timeRange: "08.00 - 10.00", condition: w.pagi });
                                        if (w.siang) tempWeather.push({ timeRange: "10.00 - 12.00", condition: w.siang });
                                        if (w.sore) tempWeather.push({ timeRange: "12.00 - 15.00", condition: w.sore });
                                        if (w.malam) tempWeather.push({ timeRange: "15.00 - 16.00", condition: w.malam });
                                        setWeatherItems(tempWeather.length > 0 ? tempWeather : [
                                            { timeRange: "08.00 - 09.00", condition: "cerah" },
                                            { timeRange: "09.00 - 10.00", condition: "cerah" },
                                            { timeRange: "10.00 - 11.00", condition: "cerah" },
                                            { timeRange: "11.00 - 12.00", condition: "cerah" },
                                            { timeRange: "12.00 - 13.00", condition: "cerah" },
                                            { timeRange: "13.00 - 14.00", condition: "cerah" },
                                            { timeRange: "14.00 - 15.00", condition: "cerah" },
                                            { timeRange: "15.00 - 16.00", condition: "cerah" }
                                        ]);
                                    }

                                    setApprovedBy(parsed.approvedBy || "");
                                    setApprovedByRole(parsed.approvedByRole || "Project Manager / Direktur");
                                    setPreparedBy(parsed.preparedBy || "");
                                    setPreparedByRole(parsed.preparedByRole || "Project Officer / Pengawas");
                                    setNotes(parsed.notes || "");
                                    setPhotos(parsed.photos || []);
                                    setMaterialItems(
                                        (parsed.materialItems || []).map((m: any) => ({
                                            name: m.name || "",
                                            category: m.category || "Material",
                                            unit: m.unit || "unit",
                                            incoming: m.incoming || "",
                                            outgoing: m.outgoing || "",
                                            stock: m.stock || ""
                                        }))
                                    );
                                    setNextActions(parsed.nextActions || "");
                                    
                                    setIsTitleManuallyEdited(true);
                                    setIsDocIdManuallyEdited(true);
                                } else {
                                    setEditorContent(data.content || "");
                                }
                            } catch (e) {
                                setEditorContent(data.content || "");
                            }
                        } else {
                            setEditorContent(data.content || "");
                        }
                    }
                } catch (err) {
                    console.error("Error loading report details:", err);
                    alert("Error loading report details");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchReportDetails();
        }
    }, [paramId]);

    // Date validation (No future dates allowed)
    useEffect(() => {
        const getLocalTodayString = () => {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const todayStr = getLocalTodayString();
        if (reportDate && reportDate > todayStr) {
            alert("Tanggal laporan tidak boleh di masa depan.");
            setReportDate(todayStr);
        }
    }, [reportDate]);

    // Fetch crew daily logs when project or date changes (skip during initial load)
    useEffect(() => {
        if (isLoading || reportType !== "daily" || !selectedProjectId || !reportDate) {
            setHasDailyLogs(null);
            return;
        }

        const currentProj = projects.find(p => p.id === selectedProjectId);
        if (!currentProj) return;

        const checkDailyLogs = async () => {
            setIsFetchingLogs(true);
            try {
                const projectSuffix = currentProj.project_code;
                const { data, error } = await supabase
                    .from("crew_daily_logs")
                    .select(`
                        id,
                        status,
                        regular_hours,
                        ot1_hours,
                        ot2_hours,
                        ot3_hours,
                        crew:crew_members (
                            id,
                            name,
                            role
                        )
                    `)
                    .eq("date", reportDate)
                    .or(`project_code.eq.${projectSuffix},project_code.ilike.%-${projectSuffix}`);

                if (error) throw error;

                if (data && data.length > 0) {
                    setHasDailyLogs(true);
                    
                    // Filter to present workers
                    const presentLogs = data.filter(log => log.status === "PRESENT" || log.status === "HALF_DAY");
                    
                    // Count by role
                    let mandor = 0;
                    let tukang = 0;
                    let pekerja = 0;
                    let operator = 0;

                    presentLogs.forEach(log => {
                        const crewMember = Array.isArray(log.crew) ? log.crew[0] : log.crew;
                        const role = (crewMember as any)?.role;
                        if (role === "FOREMAN") mandor++;
                        else if (role === "SKILLED" || role === "LEADER") tukang++;
                        else if (role === "HELPER" || role === "GENERAL") pekerja++;
                        else if (role === "OPERATOR") operator++;
                    });

                    // Shift hours average (sum divided by number of people working that shift)
                    const regLogs = presentLogs.filter(log => (parseFloat(log.regular_hours) || 0) > 0);
                    const regAvg = regLogs.length > 0 ? regLogs.reduce((sum, log) => sum + (parseFloat(log.regular_hours) || 0), 0) / regLogs.length : 0;

                    const ot1Logs = presentLogs.filter(log => (parseFloat(log.ot1_hours) || 0) > 0);
                    const ot1Avg = ot1Logs.length > 0 ? ot1Logs.reduce((sum, log) => sum + (parseFloat(log.ot1_hours) || 0), 0) / ot1Logs.length : 0;

                    const ot2Logs = presentLogs.filter(log => (parseFloat(log.ot2_hours) || 0) > 0);
                    const ot2Avg = ot2Logs.length > 0 ? ot2Logs.reduce((sum, log) => sum + (parseFloat(log.ot2_hours) || 0), 0) / ot2Logs.length : 0;

                    const ot3Logs = presentLogs.filter(log => (parseFloat(log.ot3_hours) || 0) > 0);
                    const ot3Avg = ot3Logs.length > 0 ? ot3Logs.reduce((sum, log) => sum + (parseFloat(log.ot3_hours) || 0), 0) / ot3Logs.length : 0;

                    // Set state
                    setMandorCount(mandor.toString());
                    setTukangCount(tukang.toString());
                    setPekerjaCount(pekerja.toString());
                    setOperatorCount(operator.toString());

                    setShiftReguler(regAvg.toFixed(1).replace(/\.0$/, ""));
                    setShiftOt1(ot1Avg.toFixed(1).replace(/\.0$/, ""));
                    setShiftOt2(ot2Avg.toFixed(1).replace(/\.0$/, ""));
                    setShiftOt3(ot3Avg.toFixed(1).replace(/\.0$/, ""));
                } else {
                    setHasDailyLogs(false);
                    // Reset crew-log dependent inputs if no logs exist
                    setMandorCount("0");
                    setTukangCount("0");
                    setPekerjaCount("0");
                    setOperatorCount("0");
                    setShiftReguler("0");
                    setShiftOt1("0");
                    setShiftOt2("0");
                    setShiftOt3("0");
                }
            } catch (err) {
                console.error("Error checking crew daily logs:", err);
            } finally {
                setIsFetchingLogs(false);
            }
        };

        checkDailyLogs();
    }, [selectedProjectId, reportDate, reportType, projects, isLoading]);

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

        // Auto-generate Doc ID
        if (!isDocIdManuallyEdited) {
            const weekVal = getWeekOfYear(reportDate);
            const dayOfWeekVal = getDayOfWeekNumber(reportDate);
            setDocumentId(`LH-${weekVal}-${dayOfWeekVal}`);
        }

        // Auto-generate Title
        if (!isTitleManuallyEdited) {
            const dayVal = dayNumber || "1";
            setTitle(`LH - ${currentProj.project_code || currentProj.name} - H${dayVal}`);
        }
    }, [selectedProjectId, dayNumber, reportDate, projects, isLoading, paramId, isTitleManuallyEdited, isDocIdManuallyEdited]);

    // Parse volume string to separate number and unit
    const parseVolume = (volStr: string) => {
        if (!volStr) return { value: "", unit: "m3" };
        const parts = volStr.trim().split(/\s+/);
        if (parts.length === 0) return { value: "", unit: "m3" };
        if (parts.length === 1) {
            // Check if numeric
            if (!isNaN(Number(parts[0]))) {
                return { value: parts[0], unit: "m3" };
            }
            return { value: "", unit: parts[0] };
        }
        return { value: parts[0], unit: parts[1] };
    };

    const getGeneratedFilename = () => {
        const datePart = reportDate ? reportDate.replace(/-/g, "") : "YYYYMMDD";
        const currentProj = projects.find(p => p.id === selectedProjectId);
        const codePart = currentProj?.project_code || "KODE";
        
        let docPart = "00_01";
        if (documentId) {
            let cleaned = documentId.toUpperCase();
            if (cleaned.startsWith("LHS-")) {
                cleaned = cleaned.substring(4);
            }
            docPart = cleaned.replace(/[^A-Z0-9]/g, "_");
        }

        const revPart = revision ? `R${revision}` : "R0";
        return `${datePart}_${codePart}_LH_${docPart}_${revPart}.pdf`;
    };

    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

    // Helpers for dynamic work items
    const handleAddWorkItem = () => {
        setWorkItems([...workItems, { description: "", position: "", volume: "" }]);
    };

    const handleRemoveWorkItem = (index: number) => {
        if (workItems.length === 1) {
            setWorkItems([{ description: "", position: "", volume: "" }]);
            return;
        }
        setWorkItems(workItems.filter((_, i) => i !== index));
    };

    const handleWorkItemChange = (index: number, key: keyof typeof workItems[0], val: string) => {
        const copy = [...workItems];
        copy[index][key] = val;
        setWorkItems(copy);
    };

    const handleAddWeatherItem = () => {
        setWeatherItems(prev => {
            if (prev.length === 0) {
                return [{ timeRange: "08.00 - 09.00", condition: "cerah" }];
            }
            const lastRange = prev[prev.length - 1].timeRange;
            const match = lastRange.match(/(\d{2})[\.:](\d{2})\s*-\s*(\d{2})[\.:](\d{2})/);
            if (match) {
                const endHour = parseInt(match[3]);
                const nextStart = endHour.toString().padStart(2, "0") + ".00";
                const nextEnd = (endHour + 1).toString().padStart(2, "0") + ".00";
                return [...prev, { timeRange: `${nextStart} - ${nextEnd}`, condition: "cerah" }];
            }
            return [...prev, { timeRange: "", condition: "cerah" }];
        });
    };

    const getSummarizedWeather = (items: { timeRange: string; condition: string }[]) => {
        if (!items || items.length === 0) return [];
        
        const summarized: { timeRange: string; condition: string; duration: number }[] = [];
        let currentBlock: any = null;
        
        items.forEach((item) => {
            const match = item.timeRange.match(/(\d{2})[\.:](\d{2})\s*-\s*(\d{2})[\.:](\d{2})/);
            const condition = item.condition || "cerah";
            
            if (match) {
                const startStr = `${match[1]}.${match[2]}`;
                const endStr = `${match[3]}.${match[4]}`;
                const duration = parseFloat(match[3]) - parseFloat(match[1]) || 1;
                
                if (!currentBlock) {
                    currentBlock = { start: startStr, end: endStr, condition, duration };
                } else if (currentBlock.condition === condition) {
                    currentBlock.end = endStr;
                    currentBlock.duration += duration;
                } else {
                    summarized.push({
                        timeRange: `${currentBlock.start} - ${currentBlock.end}`,
                        condition: currentBlock.condition,
                        duration: currentBlock.duration
                    });
                    currentBlock = { start: startStr, end: endStr, condition, duration };
                }
            } else {
                if (currentBlock) {
                    summarized.push({
                        timeRange: `${currentBlock.start} - ${currentBlock.end}`,
                        condition: currentBlock.condition,
                        duration: currentBlock.duration
                    });
                    currentBlock = null;
                }
                summarized.push({
                    timeRange: item.timeRange || "—",
                    condition,
                    duration: 1
                });
            }
        });
        
        if (currentBlock) {
            summarized.push({
                timeRange: `${currentBlock.start} - ${currentBlock.end}`,
                condition: currentBlock.condition,
                duration: currentBlock.duration
            });
        }
        
        return summarized;
    };

    const handleSave = async () => {
        if (!selectedProjectId) {
            alert("Please select a project.");
            return;
        }
        if (!title) {
            alert("Please enter a report title.");
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
                    personnel: {
                        projectManager: pm,
                        siteManager: sm,
                        supervisor: sv,
                        mandor: md,
                        tukang: tk,
                        pekerja: pk,
                        operator: op
                    },
                    workHours: {
                        reguler: shiftReguler ? parseFloat(shiftReguler) : 0,
                        ot1: shiftOt1 ? parseFloat(shiftOt1) : 0,
                        ot2: shiftOt2 ? parseFloat(shiftOt2) : 0,
                        ot3: shiftOt3 ? parseFloat(shiftOt3) : 0,
                        // Backward compatibility:
                        shift1: shiftReguler ? parseFloat(shiftReguler) : 0,
                        shift2: shiftOt1 ? parseFloat(shiftOt1) : 0,
                        shift3: shiftOt2 ? parseFloat(shiftOt2) : 0
                    },
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
            }

            const payload = {
                project_id: selectedProjectId,
                report_type: reportType,
                title,
                report_date: reportDate,
                progress: parseFloat(progress) || 0,
                status,
                manpower_count: reportType === "daily" ? computedManpower : null,
                weather_condition: reportType === "daily" ? summaryWeather : null,
                content: finalContent || null,
                updated_at: new Date().toISOString(),
            };

            const { data: { user } } = await supabase.auth.getUser();

            if (!reportId) {
                // Insert
                const { error } = await supabase.from("project_reports").insert({
                    ...payload,
                    created_by: user?.id
                });
                if (error) throw error;
            } else {
                // Update
                const { error } = await supabase.from("project_reports").update(payload).eq("id", reportId);
                if (error) throw error;
            }

            // Redirect back
            router.push(`/flow/reports/${reportType}`);
        } catch (err: any) {
            console.error("Error saving report:", err);
            alert(`Failed to save report: ${err.message || err.details || JSON.stringify(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const currentProject = projects.find(p => p.id === selectedProjectId);
    
    // Format date string for template preview (e.g. Wednesday, 13-Nov-2024 or similar)
    const getFormattedDate = () => {
        if (!reportDate) return "-";
        try {
            const date = new Date(reportDate);
            return date.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: '2-digit' }).replace(/\./g, '');
        } catch(e) {
            return reportDate;
        }
    };

    const getDayName = () => {
        if (!reportDate) return "-";
        try {
            const date = new Date(reportDate);
            return date.toLocaleDateString("id-ID", { weekday: 'long' });
        } catch(e) {
            return "-";
        }
    };

    const getDayDateOnly = () => {
        if (!reportDate) return "-";
        try {
            const date = new Date(reportDate);
            return date.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\./g, '');
        } catch(e) {
            return "-";
        }
    };

    const getDayOfWeekNumber = (dateStr: string) => {
        if (!dateStr) return "01";
        const date = new Date(dateStr);
        const day = date.getDay(); // 0 is Sunday, 6 is Saturday
        return (day + 1).toString().padStart(2, "0");
    };

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

    const weatherOptions = [
        { value: "", label: "-- Select Weather --" },
        { value: "cerah", label: "Cerah" },
        { value: "berawan", label: "Berawan" },
        { value: "hujan", label: "Hujan" }
    ];

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
            // Clone preview element
            const clone = previewElement.cloneNode(true) as HTMLElement;
            clone.style.width = "794px";
            clone.style.maxWidth = "794px";
            clone.style.margin = "0 auto";
            clone.style.transform = "none";
            clone.style.boxShadow = "none";
            clone.style.border = "none";

            // Convert relative image sources to absolute URLs
            const images = clone.querySelectorAll("img");
            images.forEach((img) => {
                const src = img.getAttribute("src");
                if (src && !src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:")) {
                    img.setAttribute("src", new URL(src, window.location.origin).href);
                }
            });

            // Extract all CSS style tags and link stylesheets
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

            // Wrap inside a complete HTML page
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
            min-height: 1123px !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
        }
    </style>
</head>
<body>
    <div class="a4-wrapper">
        ${clone.outerHTML}
    </div>
</body>
</html>`;

            // Call Puppeteer API endpoint
            const response = await fetch("/api/flow/reports/export-pdf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ html: fullHTML }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal membuat PDF dari server.");
            }

            const blob = await response.blob();
            const fileName = getGeneratedFilename();

            // Trigger download
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
                <span className="text-sm font-semibold text-neutral-500">Loading Report Editor...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col lg:overflow-hidden space-y-5 pb-6">
            {/* Top Editor Bar - Transparent Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/40 dark:hover:bg-neutral-800/40 rounded-full text-neutral-500 border border-neutral-200/50 dark:border-neutral-800/60 bg-white/20 transition-colors"
                        title="Back"
                    >
                        <ArrowLeft className="w-4 h-4 text-neutral-800 dark:text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white leading-tight">
                            {reportId ? `Edit ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report` : `Create New ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
                        </h1>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-0.5">
                            Reports & Documents Database
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
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                        icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    >
                        Save Report
                    </Button>
                </div>
            </div>

            {/* Tab Navigation for Daily */}
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

            {/* Split screen content - Double Card Layout */}
            <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:overflow-hidden">
                
                {/* Left Card: Form Input Fields */}
                <div className="w-full lg:w-[45%] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl lg:overflow-y-auto p-6 space-y-6 shadow-sm lg:h-full shrink-0">
                        
                        {/* -------------------- DAILY TABS -------------------- */}
                        {reportType === "daily" && (
                            <>
                                {/* TAB 1: INFO UMUM */}
                                {activeTab === "general" && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        {/* Project Selector */}
                                        <Select
                                            label="Project *"
                                            value={selectedProjectId}
                                            onChange={(val) => {
                                                setSelectedProjectId(val);
                                                if (!paramId) {
                                                    const proj = projects.find(p => p.id === val);
                                                    if (proj?.location) {
                                                        setLocationOverride(proj.location);
                                                    } else {
                                                        setLocationOverride("");
                                                    }
                                                }
                                            }}
                                            options={[
                                                { value: "", label: "-- Pilih Proyek --" },
                                                ...projects.map(p => ({ value: p.id, label: p.name }))
                                            ]}
                                            disabled={!!paramProjectId}
                                            required
                                        />

                                        {/* Project Code Badge & Filename Preview */}
                                        {selectedProjectId && (() => {
                                            const proj = projects.find(p => p.id === selectedProjectId);
                                            return proj ? (
                                                <div className="flex items-center gap-3 -mt-2">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-black uppercase tracking-widest">
                                                        {proj.project_code || "—"}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400 font-mono truncate" title={getGeneratedFilename()}>
                                                        📄 {getGeneratedFilename()}
                                                    </span>
                                                </div>
                                            ) : null;
                                        })()}

                                        {/* Location under the project badge */}
                                        <div className="space-y-1 -mt-2">
                                            <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Lokasi Proyek</label>
                                            <Input
                                                label=""
                                                value={locationOverride || currentProject?.location || ""}
                                                onChange={(e) => setLocationOverride(e.target.value)}
                                                placeholder="e.g. Lokasi Proyek"
                                            />
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
                                                label="Revisi (REV)"
                                                value={revision}
                                                onChange={(e) => setRevision(e.target.value)}
                                                placeholder="00"
                                            />
                                        </div>

                                        {/* Report Title (auto-generate with override) */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Judul Laporan *</label>
                                                {!isTitleManuallyEdited && (
                                                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Auto</span>
                                                )}
                                                {isTitleManuallyEdited && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsTitleManuallyEdited(false)}
                                                        className="text-[10px] font-bold text-neutral-400 hover:text-orange-500 uppercase tracking-wider transition-colors"
                                                    >
                                                        Reset ke Auto
                                                    </button>
                                                )}
                                            </div>
                                            <Input
                                                label=""
                                                value={title}
                                                onChange={(e) => { setTitle(e.target.value); setIsTitleManuallyEdited(true); }}
                                                placeholder="e.g. Laporan Harian Pekerjaan Struktur"
                                                required
                                            />
                                        </div>

                                        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 grid grid-cols-3 gap-4">
                                            <Input
                                                label="Hari Ke-"
                                                type="number"
                                                value={dayNumber}
                                                onChange={(e) => setDayNumber(e.target.value)}
                                                placeholder="1"
                                            />
                                            <Input
                                                label="Total Hari"
                                                type="number"
                                                value={totalDays}
                                                onChange={(e) => setTotalDays(e.target.value)}
                                                placeholder="150"
                                            />
                                            <Input
                                                label="Sisa Hari"
                                                type="number"
                                                value={remainingDays}
                                                disabled
                                                placeholder="Sisa Hari"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2">
                                                <Input
                                                    label="Tahap / Paket Pekerjaan"
                                                    value={workPackage}
                                                    onChange={(e) => setWorkPackage(e.target.value)}
                                                    placeholder="e.g. Struktur - Persiapan"
                                                />
                                            </div>
                                            {/* Doc ID (auto-generate with override) */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Doc ID</label>
                                                    {!isDocIdManuallyEdited ? (
                                                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Auto</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsDocIdManuallyEdited(false)}
                                                            className="text-[10px] font-bold text-neutral-400 hover:text-orange-500 uppercase tracking-wider transition-colors"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                                <Input
                                                    label=""
                                                    value={documentId}
                                                    onChange={(e) => { setDocumentId(e.target.value); setIsDocIdManuallyEdited(true); }}
                                                    placeholder="LH-00-01"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}


                                {/* TAB 2: URAIAN PEKERJAAN */}
                                {activeTab === "workItems" && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Daftar Uraian Pekerjaan</span>
                                        </div>

                                        <div className="space-y-3">
                                            {workItems.map((item, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="flex items-end gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800"
                                                >
                                                    <div className="text-xs font-bold text-neutral-400 self-center pl-1 w-6">{idx + 1}.</div>
                                                    
                                                    <div className="flex-1">
                                                        <Input
                                                            label="Uraian Pekerjaan"
                                                            value={item.description}
                                                            onChange={(e) => handleWorkItemChange(idx, "description", e.target.value)}
                                                            placeholder="e.g. Pembesian sloof beton"
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <Input
                                                            label="Lokasi"
                                                            value={item.position}
                                                            onChange={(e) => handleWorkItemChange(idx, "position", e.target.value)}
                                                            placeholder="e.g. Lantai 1 / Zone A"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1 items-end">
                                                        <div className="w-16">
                                                            <Input
                                                                label="Vol"
                                                                type="number"
                                                                value={parseVolume(item.volume).value}
                                                                onChange={(e) => {
                                                                    const unit = parseVolume(item.volume).unit;
                                                                    handleWorkItemChange(idx, "volume", e.target.value ? `${e.target.value} ${unit}` : "");
                                                                }}
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <div className="w-16 mb-0.5">
                                                            <select
                                                                className="w-full h-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 px-2 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                                                value={parseVolume(item.volume).unit}
                                                                onChange={(e) => {
                                                                    const numVal = parseVolume(item.volume).value;
                                                                    handleWorkItemChange(idx, "volume", numVal ? `${numVal} ${e.target.value}` : e.target.value);
                                                                }}
                                                            >
                                                                {["m2","m3","ml","hari","btg","zak","unit","pcs","set","ls","titik","bh","lot"].map(u => (
                                                                    <option key={u} value={u}>{u}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveWorkItem(idx)}
                                                        className="p-2.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 mb-0.5 transition-colors"
                                                        title="Remove Row"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-center pt-2">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                icon={<Plus className="w-3.5 h-3.5" />}
                                                onClick={handleAddWorkItem}
                                                className="w-full sm:w-auto"
                                            >
                                                Tambah Item
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: TENAGA & SHIFT */}
                                {activeTab === "personnel" && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div>
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1">Jumlah Personel</span>

                                            {/* Daily log warning banner */}
                                            {hasDailyLogs === false && (
                                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl mb-4 space-y-2">
                                                    <div className="flex gap-2 text-amber-800 dark:text-amber-400">
                                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                        <div className="text-xs">
                                                            <p className="font-bold">⚠️ Data Daily Log Absensi Kru Belum Terisi!</p>
                                                            <p className="mt-1 opacity-80">Data tenaga kerja & shift diambil dari <strong>Crew Daily Log</strong>. Belum ada data untuk tanggal &amp; proyek yang dipilih. Isi dahulu di halaman Crew.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push("/flow/crew")}
                                                        className="w-full text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 py-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                                    >
                                                        → Buka Halaman Crew Daily Log
                                                    </button>
                                                </div>
                                            )}
                                            {isFetchingLogs && (
                                                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengambil data dari crew log...
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Project Manager" type="number" value={pmCount} onChange={(e) => setPmCount(e.target.value)} placeholder="0" />
                                                <Input label="Site Manager" type="number" value={smCount} onChange={(e) => setSmCount(e.target.value)} placeholder="0" />
                                                <Input label="Supervisor" type="number" value={supervisorCount} onChange={(e) => setSupervisorCount(e.target.value)} placeholder="0" />
                                                <Input label="Mandor" type="number" value={mandorCount} onChange={(e) => setMandorCount(e.target.value)} placeholder="0" />
                                                <Input label="Tukang" type="number" value={tukangCount} onChange={(e) => setTukangCount(e.target.value)} placeholder="0" />
                                                <Input label="Pekerja" type="number" value={pekerjaCount} onChange={(e) => setPekerjaCount(e.target.value)} placeholder="0" />
                                                <Input label="Operator" type="number" value={operatorCount} onChange={(e) => setOperatorCount(e.target.value)} placeholder="0" />
                                            </div>
                                        </div>

                                        <div>
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1">Shift Kerja (Jumlah Jam Rata-rata)</span>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <Input label="Reguler 08.00-16.00" type="number" value={shiftReguler} onChange={(e) => setShiftReguler(e.target.value)} placeholder="0" />
                                                <Input label="Overtime 1 16.00-18.00" type="number" value={shiftOt1} onChange={(e) => setShiftOt1(e.target.value)} placeholder="0" />
                                                <Input label="Overtime 2 18.00-22.00" type="number" value={shiftOt2} onChange={(e) => setShiftOt2(e.target.value)} placeholder="0" />
                                                <Input label="Overtime 3 22.00-08.00" type="number" value={shiftOt3} onChange={(e) => setShiftOt3(e.target.value)} placeholder="0" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: CUACA */}
                                {activeTab === "cuaca" && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Kondisi Cuaca Harian</span>
                                        </div>
                                        <div className="space-y-2">
                                            {weatherItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-neutral-400 w-5 shrink-0">{idx + 1}.</span>
                                                    <div className="flex-1">
                                                        <Input
                                                            label=""
                                                            value={item.timeRange}
                                                            onChange={(e) => setWeatherItems(prev => prev.map((w, i) => i === idx ? { ...w, timeRange: e.target.value } : w))}
                                                            placeholder="Waktu (e.g. 08.00 - 10.00)"
                                                        />
                                                    </div>
                                                    <div className="w-32 shrink-0">
                                                        <Select
                                                            label=""
                                                            value={item.condition}
                                                            onChange={(val) => setWeatherItems(prev => prev.map((w, i) => i === idx ? { ...w, condition: val } : w))}
                                                            options={[
                                                                { value: "cerah", label: "Cerah" },
                                                                { value: "berawan", label: "Berawan" },
                                                                { value: "hujan", label: "Hujan" }
                                                            ]}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setWeatherItems(prev => prev.filter((_, i) => i !== idx))}
                                                        className="text-neutral-300 hover:text-red-500 transition-colors shrink-0 mt-1"
                                                        disabled={weatherItems.length <= 1}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-center pt-2">
                                            <button
                                                type="button"
                                                onClick={handleAddWeatherItem}
                                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50/50 hover:bg-orange-50 rounded-xl border border-dashed border-orange-200 transition-all w-full sm:w-auto"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Tambah Jam
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: CATATAN */}
                                {activeTab === "catatan" && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                Catatan / Kendala
                                            </label>
                                            <textarea
                                                className="w-full min-h-[140px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all resize-y"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Tulis catatan harian, kendala teknis, atau isu di lapangan..."
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                                Rencana Pekerjaan Lanjutan
                                            </label>
                                            <textarea
                                                className="w-full min-h-[140px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all resize-y"
                                                value={nextActions}
                                                onChange={(e) => setNextActions(e.target.value)}
                                                placeholder="Tulis rencana pekerjaan untuk hari berikutnya..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* TAB: DOKUMENTASI */}
                                {activeTab === "dokumentasi" && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Foto Lapangan ({photos.length})</span>
                                        </div>
                                        {photos.length > 0 ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {photos.map((photo, idx) => (
                                                        <div key={idx} className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 group">
                                                            <img src={photo.url} alt={`Photo ${idx+1}`} className="w-full h-28 object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemovePhoto(idx)}
                                                                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold hover:bg-red-600"
                                                            >×</button>
                                                            <input
                                                                type="text"
                                                                placeholder="Keterangan foto..."
                                                                value={photo.caption}
                                                                onChange={(e) => handlePhotoCaptionChange(idx, e.target.value)}
                                                                className="w-full text-xs p-2 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:bg-orange-50 dark:focus:bg-orange-950/20 transition-colors"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-center pt-2">
                                                    <label className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50/50 hover:bg-orange-50 rounded-xl border border-dashed border-orange-200 transition-all w-full sm:w-auto">
                                                        <Plus className="w-3.5 h-3.5" />
                                                        {uploadingPhoto ? "Uploading..." : "Tambah Foto"}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            className="hidden"
                                                            onChange={handlePhotoUpload}
                                                            disabled={uploadingPhoto}
                                                        />
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="cursor-pointer border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-10 text-center flex flex-col items-center gap-3 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:border-orange-700 dark:hover:bg-orange-950/10 transition-all">
                                                <Camera className="w-8 h-8 text-neutral-300" />
                                                <div>
                                                    <p className="text-sm font-bold text-neutral-500">Klik untuk upload foto</p>
                                                    <p className="text-xs text-neutral-400 mt-1">JPG, PNG, HEIC — bisa multi-foto</p>
                                                </div>
                                                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                            </label>
                                        )}
                                    </div>
                                )}

                                {/* TAB: MATERIAL */}
                                {activeTab === "material" && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Stok & Penggunaan Material</span>
                                        </div>
                                        <div className="space-y-2">
                                            {materialItems.map((mat, idx) => (
                                                <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-neutral-400 w-5 shrink-0">{idx + 1}.</span>
                                                        <Input
                                                            label=""
                                                            value={mat.name}
                                                            onChange={(e) => setMaterialItems(prev => prev.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))}
                                                            placeholder="Nama material (e.g. Semen, Besi D10, Cat)"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setMaterialItems(prev => prev.filter((_, i) => i !== idx))}
                                                            className="text-neutral-300 hover:text-red-500 transition-colors shrink-0"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-2 pl-7">
                                                        <Select
                                                            label="Kategori"
                                                            value={mat.category || "Material"}
                                                            onChange={(val) => setMaterialItems(prev => prev.map((m, i) => i === idx ? { ...m, category: val } : m))}
                                                            options={[
                                                                { value: "Material", label: "Material" },
                                                                { value: "Alat", label: "Alat" },
                                                                { value: "Jasa", label: "Jasa" },
                                                            ]}
                                                        />
                                                        <Select
                                                            label="Satuan"
                                                            value={mat.unit}
                                                            onChange={(val) => setMaterialItems(prev => prev.map((m, i) => i === idx ? { ...m, unit: val } : m))}
                                                            options={[
                                                                { value: "unit", label: "unit" }, { value: "m²", label: "m²" },
                                                                { value: "m³", label: "m³" }, { value: "kg", label: "kg" },
                                                                { value: "ton", label: "ton" }, { value: "btg", label: "btg" },
                                                                { value: "zak", label: "zak" }, { value: "ls", label: "ls" },
                                                                { value: "pcs", label: "pcs" }, { value: "set", label: "set" },
                                                                { value: "ltr", label: "ltr" },
                                                            ]}
                                                        />
                                                        <Input label="Masuk" type="number" value={mat.incoming}
                                                            onChange={(e) => setMaterialItems(prev => prev.map((m, i) => i === idx ? { ...m, incoming: e.target.value } : m))}
                                                            placeholder="0" />
                                                        <Input label="Terpakai" type="number" value={mat.outgoing}
                                                            onChange={(e) => setMaterialItems(prev => prev.map((m, i) => i === idx ? { ...m, outgoing: e.target.value } : m))}
                                                            placeholder="0" />
                                                        <Input label="Sisa/Stok" type="number" value={mat.stock}
                                                            onChange={(e) => setMaterialItems(prev => prev.map((m, i) => i === idx ? { ...m, stock: e.target.value } : m))}
                                                            placeholder="0" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-center pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setMaterialItems(prev => [...prev, { name: "", category: "Material", unit: "unit", incoming: "", outgoing: "", stock: "" }])}
                                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50/50 hover:bg-orange-50 rounded-xl border border-dashed border-orange-200 transition-all w-full sm:w-auto"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Tambah Material / Alat / Jasa
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: TTD */}
                                {activeTab === "ttd" && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block border-b border-neutral-100 dark:border-neutral-800 pb-2">Tanda Tangan & Persetujuan</span>
                                        <div className="grid grid-cols-1 gap-4">
                                            <Input
                                                label="Disusun Oleh"
                                                value={preparedBy}
                                                onChange={(e) => setPreparedBy(e.target.value)}
                                                placeholder="Nama penyusun laporan"
                                            />
                                            <Input
                                                label="Jabatan Penyusun"
                                                value={preparedByRole}
                                                onChange={(e) => setPreparedByRole(e.target.value)}
                                                placeholder="Project Officer / Pengawas"
                                            />
                                            <Input
                                                label="Disetujui Oleh"
                                                value={approvedBy}
                                                onChange={(e) => setApprovedBy(e.target.value)}
                                                placeholder="Nama yang menyetujui"
                                            />
                                            <Input
                                                label="Jabatan Penyetuju"
                                                value={approvedByRole}
                                                onChange={(e) => setApprovedByRole(e.target.value)}
                                                placeholder="Project Manager / Direktur"
                                            />
                                        </div>
                                        <div className="bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-4 text-xs text-neutral-500 border border-neutral-100 dark:border-neutral-800">
                                            💡 Tanda tangan fisik dibubuhkan pada dokumen cetak PDF.
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* -------------------- WEEKLY & MONTHLY FORM -------------------- */}
                        {reportType !== "daily" && (
                            <div className="space-y-5">
                                <Select
                                    label="Project *"
                                    value={selectedProjectId}
                                    onChange={(val) => setSelectedProjectId(val)}
                                    options={[
                                        { value: "", label: "-- Select Project --" },
                                        ...projects.map(p => ({ value: p.id, label: p.name }))
                                    ]}
                                    disabled={!!paramProjectId}
                                    required
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Report Date *"
                                        type="date"
                                        value={reportDate}
                                        onChange={(e) => setReportDate(e.target.value)}
                                        required
                                    />
                                    <Input
                                        label="Physical Progress (%) *"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={progress}
                                        onChange={(e) => setProgress(e.target.value)}
                                        required
                                    />
                                </div>

                                <Input
                                    label="Report Title *"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Laporan Mingguan Progres Struktur"
                                    required
                                />

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
                                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                                        Content Description
                                    </label>
                                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden min-h-[300px]">
                                        <RichTextEditor value={editorContent} onChange={setEditorContent} />
                                    </div>
                                </div>
                            </div>
                        )}
                </div>

                {/* Right Card Panel: Live Document Preview */}
                <div className="flex-1 w-full bg-neutral-100/80 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl lg:overflow-y-auto flex flex-col items-center gap-0 shadow-sm lg:h-full py-6 px-4">
                    
                    {/* Filename Watermark Label - OUTSIDE the A4 */}
                    {reportType === "daily" && (
                        <div className="text-[10px] text-neutral-400 font-mono mb-2 px-2 tracking-tight text-center">
                            📄 {getGeneratedFilename()}
                        </div>
                    )}

                    {/* ===================== A4 Document (single flowing page) ===================== */}
                    <div
                        id="document-preview-a4"
                        className="bg-white text-neutral-800 shadow-xl w-full max-w-[680px] shrink-0"
                        style={{ padding: "28px 32px", fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}
                    >
                        {reportType === "daily" ? (
                            <div className="flex flex-col gap-3">

                                {/* ── HEADER ── */}
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

                                    {/* Right: LH + Doc ID */}
                                    <div className="w-[130px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
                                        <div className="font-black text-[34px] text-neutral-900 leading-none tracking-tighter">LH</div>
                                        <div className="text-[5px] font-black text-neutral-500 uppercase tracking-[0.15em] leading-none">Laporan Harian</div>
                                        <div className="w-full border-t border-neutral-300 my-1" />
                                        <div className="font-black text-[12px] text-neutral-900 tracking-tight leading-none">{documentId || "LHS-00-01"}</div>
                                        <div className="w-full border-t border-neutral-200 my-1" />
                                        <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                                            <span className="text-left font-bold">TGL LAPORAN</span>
                                            <span className="text-right font-bold">REV</span>
                                            <span className="text-left font-black text-neutral-800">{getDayDateOnly()}</span>
                                            <span className="text-right font-black text-neutral-800">{revision || "00"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── DATE META ROW ── */}
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

                                {/* ── MAIN TABLES ROW ── */}
                                <div className="flex gap-3">

                                    {/* Left: Uraian Pekerjaan */}
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
                                                {/* Pad to minimum 14 rows to align with Personel, Waktu Kerja, and Cuaca tables */}
                                                {Array.from({ length: Math.max(0, 14 - workItems.length) }).map((_, i) => (
                                                    <tr key={`pad-${i}`} className="border-b border-neutral-100 h-5">
                                                        <td className="border-r border-neutral-200"></td>
                                                        <td className="border-r border-neutral-200"></td>
                                                        <td className="border-r border-neutral-200"></td>
                                                        <td></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Right: Personel + Shift + Cuaca stacked */}
                                    <div className="w-[200px] shrink-0 flex flex-col gap-2">

                                        {/* Personel */}
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Personel</div>
                                            <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                                <tbody className="text-[6px]">
                                                    {[
                                                        ["Project Manager", pmCount],
                                                        ["Site Manager", smCount],
                                                        ["Supervisor", supervisorCount],
                                                        ["Mandor", mandorCount],
                                                        ["Tukang", tukangCount],
                                                        ["Pekerja", pekerjaCount],
                                                        ["Operator", operatorCount],
                                                    ].map(([label, val], i) => (
                                                        <tr key={i} className="border-b border-neutral-200">
                                                            <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">{label}</td>
                                                            <td className="p-0.5 text-center font-black text-neutral-900 w-8">{val || "0"}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-neutral-100">
                                                        <td className="p-1 text-[6px] font-black text-neutral-800 border-r border-neutral-200">Total</td>
                                                        <td className="p-1 text-center text-[7px] font-black text-neutral-900">
                                                            {[pmCount, smCount, supervisorCount, mandorCount, tukangCount, pekerjaCount, operatorCount].reduce((a, v) => a + (parseInt(v) || 0), 0)}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Shift */}
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Waktu Kerja</div>
                                            <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                                <tbody className="text-[6px]">
                                                    {[
                                                        ["Reguler 08.00–16.00", shiftReguler],
                                                        ["OT 1 16.00–18.00", shiftOt1],
                                                        ["OT 2 18.00–22.00", shiftOt2],
                                                        ["OT 3 22.00–08.00", shiftOt3],
                                                    ].map(([label, val], i) => (
                                                        <tr key={i} className="border-b border-neutral-200">
                                                            <td className="p-0.5 pl-1.5 border-r border-neutral-200 text-neutral-600 font-semibold">{label}</td>
                                                            <td className="p-0.5 text-center font-black text-neutral-900 w-12">{val || "0"} Jam</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Cuaca */}
                                        <div>
                                            <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Cuaca</div>
                                            <table className="w-full text-center border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr className="bg-neutral-50 border-b border-neutral-300 text-[5px] font-extrabold text-neutral-500 uppercase">
                                                        <th className="p-1 text-left pl-1.5 border-r border-neutral-300">Waktu</th>
                                                        <th className="p-0.5 border-r border-neutral-300 w-8">☀</th>
                                                        <th className="p-0.5 border-r border-neutral-300 w-8">⛅</th>
                                                        <th className="p-0.5 border-r border-neutral-300 w-8">🌧</th>
                                                        <th className="p-0.5 w-8">Durasi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[6.5px] font-bold text-neutral-900">
                                                    {getSummarizedWeather(weatherItems).map((item, idx) => (
                                                        <tr key={idx} className="border-b border-neutral-200">
                                                            <td className="p-0.5 text-left pl-1.5 border-r border-neutral-200 bg-neutral-50 text-[6px] font-bold">{item.timeRange}</td>
                                                            <td className="p-0.5 border-r border-neutral-200">{item.condition === "cerah" ? "✓" : ""}</td>
                                                            <td className="p-0.5 border-r border-neutral-200">{item.condition === "berawan" ? "✓" : ""}</td>
                                                            <td className="p-0.5 border-r border-neutral-200">{item.condition === "hujan" ? "✓" : ""}</td>
                                                            <td className="p-0.5 text-[6px] text-neutral-500">{item.duration} Jam</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Material Log */}
                                <div>
                                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Material / Alat / Jasa Lapangan</div>
                                    <table className="w-full text-left border border-neutral-300 border-t-0" style={{ borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                                                <th className="p-1 w-5 text-center border-r border-neutral-300">No</th>
                                                <th className="p-1 w-14 border-r border-neutral-300">Kategori</th>
                                                <th className="p-1 border-r border-neutral-300">Nama Material / Alat / Jasa</th>
                                                <th className="p-1 w-10 text-center border-r border-neutral-300">Satuan</th>
                                                <th className="p-1 w-12 text-center border-r border-neutral-300">Masuk</th>
                                                <th className="p-1 w-12 text-center border-r border-neutral-300">Keluar / Terpakai</th>
                                                <th className="p-1 w-12 text-center">Sisa / Stok</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {materialItems.map((mat, idx) => (
                                                <tr key={idx} className="border-b border-neutral-200 text-[6.5px]">
                                                    <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-400">{idx + 1}</td>
                                                    <td className="p-1 border-r border-neutral-200 text-neutral-600 font-semibold uppercase">{mat.category || "Material"}</td>
                                                    <td className="p-1 border-r border-neutral-200 font-bold text-neutral-800">{mat.name || ""}</td>
                                                    <td className="p-1 text-center border-r border-neutral-200 text-neutral-600">{mat.unit || ""}</td>
                                                    <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-800">{mat.incoming || ""}</td>
                                                    <td className="p-1 text-center border-r border-neutral-200 font-bold text-neutral-800">{mat.outgoing || ""}</td>
                                                    <td className="p-1 text-center font-bold text-neutral-800">{mat.stock || ""}</td>
                                                </tr>
                                            ))}
                                            {Array.from({ length: Math.max(0, 5 - materialItems.length) }).map((_, i) => (
                                                <tr key={`mpad-${i}`} className="border-b border-neutral-100 h-5">
                                                    <td className="border-r border-neutral-200"></td><td className="border-r border-neutral-200"></td>
                                                    <td className="border-r border-neutral-200"></td><td className="border-r border-neutral-200"></td>
                                                    <td className="border-r border-neutral-200"></td><td className="border-r border-neutral-200"></td>
                                                    <td></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Documentation Photos */}
                                <div>
                                    <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Dokumentasi Lapangan</div>
                                    <div className="border border-neutral-300 border-t-0 p-2">
                                        {photos.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {photos.slice(0, 6).map((p, idx) => (
                                                    <div key={idx} className="space-y-0.5">
                                                        <img src={p.url} crossOrigin="anonymous" alt={`Foto ${idx + 1}`} className="w-full rounded-sm border border-neutral-200" style={{ aspectRatio: "4/3", objectFit: "cover" }} />
                                                        {p.caption && <p className="text-[5.5px] text-neutral-500 font-semibold leading-tight">{p.caption}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-16 flex items-center justify-center text-[6px] text-neutral-300 italic border border-dashed border-neutral-200 rounded">[ Belum ada foto dokumentasi ]</div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes + Next Actions side by side */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col">
                                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Catatan / Kendala</div>
                                        <div className="border border-neutral-300 border-t-0 p-2 min-h-[60px]">
                                            <div className="text-[6.5px] text-neutral-700 font-semibold leading-relaxed whitespace-pre-wrap">{notes || "—"}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider rounded-t-sm">Rencana Pekerjaan Lanjutan</div>
                                        <div className="border border-neutral-300 border-t-0 p-2 min-h-[60px]">
                                            <div className="text-[6.5px] text-neutral-700 font-semibold leading-relaxed whitespace-pre-wrap">{nextActions || "—"}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Signatures */}
                                <div className="mt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <div className="text-[7px] font-bold text-neutral-600 uppercase tracking-wider">Disetujui Oleh</div>
                                            <div className="w-full border border-neutral-300 rounded h-16 bg-neutral-50/50"></div>
                                            <div className="w-full border-t border-neutral-300 pt-1.5">
                                                <div className="text-[8px] font-black text-neutral-900">{approvedBy || "( Nama Terang )"}</div>
                                                <div className="text-[6px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">{approvedByRole || "Project Manager / Direktur"}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <div className="text-[7px] font-bold text-neutral-600 uppercase tracking-wider">Disusun Oleh</div>
                                            <div className="w-full border border-neutral-300 rounded h-16 bg-neutral-50/50"></div>
                                            <div className="w-full border-t border-neutral-300 pt-1.5">
                                                <div className="text-[8px] font-black text-neutral-900">{preparedBy || "( Nama Terang )"}</div>
                                                <div className="text-[6px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">{preparedByRole || "Project Officer / Pengawas"}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-[5px] text-neutral-300 text-center mt-4 pt-1">{getGeneratedFilename()}</div>

                            </div>
                        ) : (
                            /* WEEKLY / MONTHLY PREVIEW */
                            <div className="h-full flex flex-col justify-between">
                                <div>
                                    <div className="border-b border-neutral-800 pb-3 mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <img src="/logo-adidaya-red.svg" alt="Adidaya" className="w-5 h-5 object-contain filter brightness-0" />
                                            <div>
                                                <h1 className="font-black text-[11px] text-neutral-900 tracking-wider">ADIDAYA STUDIO</h1>
                                                <p className="text-[6px] text-neutral-400 font-bold uppercase tracking-widest leading-none mt-0.5">Laporan Rekapitulasi Progres</p>
                                            </div>
                                        </div>
                                        <span className="inline-block px-2 py-0.5 text-[6px] font-black uppercase tracking-widest rounded bg-neutral-900 text-white leading-none">{reportType}</span>
                                    </div>
                                    <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 mb-4 grid grid-cols-2 gap-3 text-[7px] font-semibold text-neutral-600 leading-normal">
                                        <div>
                                            <span className="text-[5px] font-bold text-neutral-400 block uppercase tracking-wider">Proyek</span>
                                            <span className="text-[8px] font-bold text-neutral-800 uppercase block">{currentProject?.name || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[5px] font-bold text-neutral-400 block uppercase tracking-wider">Tanggal</span>
                                            <span className="text-[8px] font-bold text-neutral-800 block">{getFormattedDate()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[5px] font-bold text-neutral-400 block uppercase tracking-wider">Judul</span>
                                            <span className="text-[8px] font-bold text-neutral-800 block">{title || "JUDUL LAPORAN"}</span>
                                        </div>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-neutral-800 text-[8px] leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: editorContent || "<p>Belum ada isi laporan.</p>" }} />
                                </div>
                                <div className="border-t border-neutral-200 pt-4 mt-6 grid grid-cols-2 text-center text-[7px] font-semibold text-neutral-600">
                                    <div><span>Disetujui oleh,</span><div className="h-12"></div><span className="font-extrabold text-neutral-900 text-[8px] block">{approvedBy || "( Nama Terang )"}</span><span className="text-[5px] text-neutral-400 font-bold uppercase tracking-wider block">{approvedByRole || "Manajer Proyek"}</span></div>
                                    <div><span>Disusun oleh,</span><div className="h-12"></div><span className="font-extrabold text-neutral-900 text-[8px] block">{preparedBy || "( Nama Terang )"}</span><span className="text-[5px] text-neutral-400 font-bold uppercase tracking-wider block">{preparedByRole || "Pengawas Lapangan"}</span></div>
                                </div>
                            </div>
                        )}
                    </div>


                </div>

            </div>
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

