"use client";

import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { useProject } from "@/components/flow/project-context";
import { Save, ExternalLink, Loader2, Pencil } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";
import { updateProject } from "@/lib/api/projects";
import { useState, useEffect, useMemo } from "react";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { supabase } from "@/lib/supabaseClient";
import { fetchProjectTypes, fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { fetchClasses, fetchTypologies, fetchDisciplines } from "@/lib/api/templates-extended";
import { INDONESIAN_REGIONS } from "@/shared/constants/regions";

/* ================= TYPES ================= */

type WorkType = "design-only" | "design-build" | "build-only";

// Stage Mapping based on Contract Type
const STAGE_MAPPING: Record<WorkType, { code: string; name: string }[]> = {
    "design-only": [
        { code: "01-KO", name: "Kickoff" },
        { code: "02-SD", name: "Schematic Design" },
        { code: "03-DD", name: "Design Development" },
        { code: "04-ED", name: "Engineering/Tender" },
        { code: "05-HO", name: "Handover" },
    ],
    "design-build": [
        { code: "01-KO", name: "Kickoff" },
        { code: "02-SD", name: "Schematic Design" },
        { code: "03-DD", name: "Design Development" },
        { code: "04-CD", name: "Construction Drawing" },
        { code: "05-TN", name: "Tender" },
        { code: "06-CN", name: "Construction" },
        { code: "07-HO", name: "Handover" },
    ],
    "build-only": [
        { code: "01-KO", name: "Kickoff" },
        { code: "02-ED", name: "Engineering" },
        { code: "03-PC", name: "Pre-Construction" },
        { code: "04-CN", name: "Construction" },
        { code: "05-HO", name: "Handover" },
    ],
};

// Select Options
const PROJECT_TYPE_OPTIONS = [
    { label: "Design-Build", value: "design-build" },
    { label: "Design Only", value: "design-only" },
    { label: "Build Only", value: "build-only" },
];

const STATUS_OPTIONS = [
    { label: "Active", value: "active" },
    { label: "On Hold", value: "on_hold" },
    { label: "Completed", value: "completed" },
    { label: "Archived", value: "archived" },
];

const CATEGORY_OPTIONS = [
    { label: "New Building", value: "new" },
    { label: "Renovation", value: "renovation" },
    { label: "Interior Fit-out", value: "interior" },
    { label: "Landscape", value: "landscape" },
];

const RAB_CLASS_OPTIONS = [
    { label: "Class A - Luxury", value: "A" },
    { label: "Class B - Premium", value: "B" },
    { label: "Class C - Standard", value: "C" },
    { label: "Class D - Basic", value: "D" },
];

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export default function ProjectInfoPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const { project, isLoading, error, refresh } = useProject();

    // ================= FORM STATE =================
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Basic Info
    const [projectNumber, setProjectNumber] = useState("");
    const [projectCode, setProjectCode] = useState("");
    const [projectName, setProjectName] = useState("");
    const [projectType, setProjectType] = useState<WorkType>("design-build");
    const [status, setStatus] = useState("active");

    // Location
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [province, setProvince] = useState("");
    const [mapsLink, setMapsLink] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");

    // Scope
    const [category, setCategory] = useState("new");
    const [disciplines, setDisciplines] = useState<string[]>(["Architecture", "Structure", "MEP"]);
    const [newDiscipline, setNewDiscipline] = useState("");
    const [showAddDiscipline, setShowAddDiscipline] = useState(false);
    // Specifications
    const [landArea, setLandArea] = useState("");
    const [buildingArea, setBuildingArea] = useState("");
    const [floors, setFloors] = useState("");
    const [rabClass, setRabClass] = useState("B");

    // Client
    const [clientName, setClientName] = useState("");
    const [clientContact, setClientContact] = useState("");

    // Timeline
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Dynamic Select Options from DB Settings General
    const [projectTypeOptions, setProjectTypeOptions] = useState<{ value: string; label: string }[]>(PROJECT_TYPE_OPTIONS);
    const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>(CATEGORY_OPTIONS);
    const [rabClassOptions, setRabClassOptions] = useState<{ value: string; label: string }[]>(RAB_CLASS_OPTIONS);
    const [allTemplateDisciplines, setAllTemplateDisciplines] = useState<string[]>(["Architecture", "Structure", "MEP"]);

    // Validation warning states
    const [numberError, setNumberError] = useState<string | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);

    // Indonesian regions dropdown data calculation
    const provinceOptions = useMemo(() => {
        const base = INDONESIAN_REGIONS.map(r => ({ label: r.province, value: r.province }));
        if (province && !base.some(b => b.value.toLowerCase() === province.toLowerCase())) {
            base.unshift({ label: province, value: province });
        }
        return base;
    }, [province]);

    const cityOptions = useMemo(() => {
        const selectedProvData = INDONESIAN_REGIONS.find(r => r.province.toLowerCase() === province.toLowerCase());
        const base = selectedProvData 
            ? selectedProvData.cities.map(c => ({ label: c, value: c }))
            : [];
        if (city && !base.some(b => b.value.toLowerCase() === city.toLowerCase())) {
            base.unshift({ label: city, value: city });
        }
        return base;
    }, [province, city]);
 
    // ================= DYNAMIC SETTINGS SYNC =================
    useEffect(() => {
        async function loadOptions() {
            try {
                let wsId = await fetchDefaultWorkspaceId();
                if (!wsId) wsId = DEFAULT_WORKSPACE_ID;

                // Load Project Types
                const dbTypes = await fetchProjectTypes(wsId);
                if (dbTypes && dbTypes.length > 0) {
                    setProjectTypeOptions(dbTypes.map(t => ({
                        value: t.projectTypeId,
                        label: t.name
                    })));
                }

                // Load Typologies (Categories)
                const dbTypologies = await fetchTypologies(wsId);
                if (dbTypologies && dbTypologies.length > 0) {
                    setCategoryOptions(dbTypologies.map(t => ({
                        value: t.code || t.id,
                        label: t.name
                    })));
                }

                // Load RAB Classes
                const dbClasses = await fetchClasses(wsId);
                if (dbClasses && dbClasses.length > 0) {
                    setRabClassOptions(dbClasses.map(c => ({
                        value: c.classCode,
                        label: `Class ${c.classCode} - ${c.description || c.finishLevel || ''}`
                    })));
                }

                // Load Disciplines
                const dbDisciplines = await fetchDisciplines(wsId);
                if (dbDisciplines && dbDisciplines.length > 0) {
                    setAllTemplateDisciplines(dbDisciplines.map(d => d.nameEn));
                }

            } catch (err) {
                console.error("Failed to load settings templates:", err);
            }
        }
        loadOptions();
    }, []);

    // ================= LIVE UNIQUENESS VALIDATION =================
    useEffect(() => {
        if (!isEditing || !project) {
            setNumberError(null);
            setCodeError(null);
            return;
        }
 
        const checkNum = async () => {
            const trimmedNum = projectNumber.trim();
            if (trimmedNum && trimmedNum !== project.project_number) {
                const { data } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("project_number", trimmedNum)
                    .neq("id", project.id)
                    .limit(1);
                if (data && data.length > 0) {
                    setNumberError("Project Number is already taken.");
                } else {
                    setNumberError(null);
                }
            } else {
                setNumberError(null);
            }
        };
 
        const checkCode = async () => {
            const trimmedCode = projectCode.trim().toUpperCase();
            if (trimmedCode && trimmedCode !== project.project_code) {
                const { data } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("project_code", trimmedCode)
                    .neq("id", project.id)
                    .limit(1);
                if (data && data.length > 0) {
                    setCodeError("Project Code is already taken.");
                } else {
                    setCodeError(null);
                }
            } else {
                setCodeError(null);
            }
        };
 
        const delayDebounce = setTimeout(() => {
            checkNum();
            checkCode();
        }, 400);
 
        return () => clearTimeout(delayDebounce);
    }, [projectNumber, projectCode, isEditing, project]);
 
    // ================= AUTO COORDINATES EXTRACTION =================
    useEffect(() => {
        if (!isEditing || !mapsLink.trim()) return;
 
        const parseCoordinatesDirectly = (url: string) => {
            const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
            const atMatch = url.match(atRegex);
            if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
 
            const qRegex = /[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/;
            const qMatch = url.match(qRegex);
            if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };
 
            const searchRegex = /search\/(-?\d+\.\d+),(-?\d+\.\d+)/;
            const searchMatch = url.match(searchRegex);
            if (searchMatch) return { lat: searchMatch[1], lng: searchMatch[2] };
 
            const rawRegex = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/;
            const rawMatch = url.trim().match(rawRegex);
            if (rawMatch) return { lat: rawMatch[1], lng: rawMatch[2] };
 
            return null;
        };
 
        const resolveAndExtract = async () => {
            const direct = parseCoordinatesDirectly(mapsLink);
            if (direct) {
                setLatitude(direct.lat);
                setLongitude(direct.lng);
                return;
            }
 
            if (mapsLink.includes("maps.app.goo.gl") || mapsLink.includes("google.com/maps") || mapsLink.includes("maps.google")) {
                try {
                    const res = await fetch(`/api/resolve-maps?url=${encodeURIComponent(mapsLink.trim())}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.lat && data.lng) {
                            setLatitude(data.lat);
                            setLongitude(data.lng);
                        }
                    }
                } catch (err) {
                    console.error("Failed to auto-resolve maps coordinates:", err);
                }
            }
        };
 
        const timer = setTimeout(resolveAndExtract, 600);
        return () => clearTimeout(timer);
    }, [mapsLink, isEditing]);
 
    // ================= SYNC FROM PROJECT =================
    useEffect(() => {
        if (project) {
            const meta = project.meta as any;
            const loc = project.location as any;

            setProjectNumber(project.project_number || "");
            setProjectCode(project.project_code || "");
            setProjectName(project.project_name || "");
            setProjectType((meta?.type as WorkType) || "design-build");
            setStatus(project.status || "active");

            setAddress(loc?.address || "");
            setCity(loc?.city || "");
            setProvince(loc?.province || "");
            setMapsLink(loc?.mapsLink || "");
            setLatitude(loc?.latitude || "");
            setLongitude(loc?.longitude || "");

            setCategory(meta?.category || "new");
            setDisciplines(meta?.disciplines || ["Architecture", "Structure", "MEP"]);
            setLandArea(meta?.landArea || "");
            setBuildingArea(meta?.buildingArea || "");
            setFloors(meta?.floors || "");
            setRabClass(meta?.rabClass || "B");

            setClientName(meta?.clientName || "");
            setClientContact(meta?.clientContact || "");

            setStartDate(project.start_date || "");
            setEndDate(project.end_date || "");
        }
    }, [project]);

    // ================= SAVE HANDLER =================
    const handleSave = async () => {
        if (!project) return;
        setIsSaving(true);
        setSaveMessage(null);
        setNumberError(null);
        setCodeError(null);
 
        try {
            // Check uniqueness of number
            if (projectNumber.trim() && projectNumber !== project.project_number) {
                const { data: numCheck } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("project_number", projectNumber.trim())
                    .neq("id", project.id)
                    .limit(1);
                if (numCheck && numCheck.length > 0) {
                    setNumberError("Project Number is already taken.");
                    setIsSaving(false);
                    return false;
                }
            }
 
            // Check uniqueness of code
            if (projectCode.trim() && projectCode !== project.project_code) {
                const { data: codeCheck } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("project_code", projectCode.trim().toUpperCase())
                    .neq("id", project.id)
                    .limit(1);
                if (codeCheck && codeCheck.length > 0) {
                    setCodeError("Project Code is already taken.");
                    setIsSaving(false);
                    return false;
                }
            }

            const meta = {
                ...(project.meta as any),
                type: projectType,
                category,
                disciplines,
                landArea,
                buildingArea,
                floors,
                rabClass,
                clientName,
                clientContact,
            };
 
            const location = {
                ...(project.location as any),
                address,
                city,
                province,
                mapsLink,
                latitude,
                longitude,
            };
 
            const res = await fetch(`/api/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_number: projectNumber,
                    project_code: projectCode.toUpperCase(), // Auto uppercase on save
                    project_name: projectName,
                    status,
                    start_date: startDate || null,
                    end_date: endDate || null,
                    meta,
                    location,
                }),
            });
 
            if (res.ok) {
                setSaveMessage("Changes saved successfully!");
                refresh();
                return true;
            } else {
                setSaveMessage("Failed to save changes.");
                return false;
            }
        } catch (err) {
            console.error(err);
            setSaveMessage("Error saving changes.");
            return false;
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };
 
    const handleCancel = () => {
        if (!project) return;
        const meta = project.meta as any;
        const loc = project.location as any;
 
        setNumberError(null);
        setCodeError(null);
 
        setProjectNumber(project.project_number || "");
        setProjectCode(project.project_code || "");
        setProjectName(project.project_name || "");
        setProjectType((meta?.type as WorkType) || "design-build");
        setStatus(project.status || "active");

        setAddress(loc?.address || "");
        setCity(loc?.city || "");
        setProvince(loc?.province || "");
        setMapsLink(loc?.mapsLink || "");
        setLatitude(loc?.latitude || "");
        setLongitude(loc?.longitude || "");

        setCategory(meta?.category || "new");
        setDisciplines(meta?.disciplines || ["Architecture", "Structure", "MEP"]);
        setLandArea(meta?.landArea || "");
        setBuildingArea(meta?.buildingArea || "");
        setFloors(meta?.floors || "");
        setRabClass(meta?.rabClass || "B");

        setClientName(meta?.clientName || "");
        setClientContact(meta?.clientContact || "");

        setStartDate(project.start_date || "");
        setEndDate(project.end_date || "");
    };

    // ================= LOADING / ERROR =================
    if (isLoading) {
        return <GlobalLoading />;
    }

    if (error || !project) {
        return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">{error || "Project not found."}</div>;
    }

    const activeStages = STAGE_MAPPING[projectType] || STAGE_MAPPING["design-build"];
    // Default to 01-KO if no stage is set
    const currentStageCode = (project.stage as string) || "01-KO";
    const projectForHeader = mapProjectToHeader(project as any);

    return (
        <PageWrapper sidebar={<ProjectDetailSidebar />} isTransparent={true}>
            <div className="space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500 pb-36 px-4 md:px-0">
                {/* STANDARD HEADER */}
                <ProjectDetailHeader project={projectForHeader as any} />

                {/* FLOATING ACTION BAR */}
                <div className="fixed z-40 bottom-24 left-1/2 -translate-x-1/2 md:sticky md:top-[100px] md:bottom-auto md:left-auto md:translate-x-0 md:float-right md:h-0 md:overflow-visible md:w-full md:pr-1 md:-mt-3 md:mb-1">
                    <div className="relative md:absolute md:right-0 flex items-center gap-3 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md p-2 rounded-full border border-neutral-200/50 dark:border-neutral-800/50 shadow-[0_2px_12px_rgba(0,0,0,0.06)] animate-in fade-in whitespace-nowrap z-30">
                        {saveMessage && (
                            <span className={`text-xs font-semibold mr-2 ${saveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                                {saveMessage}
                            </span>
                        )}
                        {!isEditing ? (
                            <Button
                                variant="secondary"
                                icon={<Pencil className="w-3.5 h-3.5" />}
                                className="!rounded-full px-5 h-9 text-xs"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="secondary"
                                    className="!rounded-full px-5 h-9 text-xs"
                                    onClick={() => {
                                        handleCancel();
                                        setIsEditing(false);
                                    }}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    className="!rounded-full bg-brand-red hover:bg-brand-red-hover text-white shadow-sm px-5 h-9 text-xs"
                                    onClick={async () => {
                                        const success = await handleSave();
                                        if (success) {
                                            setIsEditing(false);
                                        }
                                    }}
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                    {/* ACTION TOOLBAR */}
                    <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Project Details</h2>
                            <p className="text-xs text-neutral-500">Manage basic information and settings.</p>
                        </div>
                    </div>

                    {/* FORM SECTIONS */}
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="bg-white/40 dark:bg-neutral-800/10 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/5 p-6 space-y-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Basic Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1 w-full">
                                    <Input
                                        label="Project Number"
                                        value={projectNumber}
                                        onChange={(e) => {
                                            setProjectNumber(e.target.value);
                                            setNumberError(null);
                                        }}
                                        disabled={!isEditing}
                                        className={numberError ? "!border-red-500 !text-red-500" : ""}
                                    />
                                    {numberError && (
                                        <p className="text-xs text-red-500 font-semibold px-1 mt-0.5 animate-in fade-in duration-200">
                                            {numberError}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1 w-full">
                                    <Input
                                        label="Project Code"
                                        value={projectCode}
                                        onChange={(e) => {
                                            setProjectCode(e.target.value);
                                            setCodeError(null);
                                        }}
                                        disabled={!isEditing}
                                        className={codeError ? "!border-red-500 !text-red-500" : ""}
                                    />
                                    {codeError && (
                                        <p className="text-xs text-red-500 font-semibold px-1 mt-0.5 animate-in fade-in duration-200">
                                            {codeError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Input
                                label="Project Name"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                disabled={!isEditing}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Select
                                    label="Project Type"
                                    options={projectTypeOptions}
                                    value={projectType}
                                    onChange={(val) => setProjectType(val as WorkType)}
                                    disabled={!isEditing}
                                />
                                <Select
                                    label="Status"
                                    options={STATUS_OPTIONS}
                                    value={status}
                                    onChange={setStatus}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* Applicable Stages */}
                        <div className="bg-white/40 dark:bg-neutral-800/10 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/5 p-6 space-y-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Applicable Stages</h2>
                            <p className="text-xs text-neutral-500">
                                Stages are configured based on <b>Contract Type</b> ({projectType}).
                            </p>

                            <div className="rounded-xl border border-neutral-100 bg-neutral-50 overflow-hidden">
                                {activeStages.map((stage, idx) => {
                                    // Match by stage code prefix (e.g., "01-KO" matches "01-KO")
                                    const isCurrent = currentStageCode.toUpperCase().startsWith(stage.code.split("-")[0]);
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-3 px-4 py-2.5 border-b border-neutral-100 last:border-0 transition-colors ${isCurrent ? "bg-red-50" : "hover:bg-white"
                                                }`}
                                        >
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${isCurrent
                                                ? "bg-red-500 border-red-500 text-white"
                                                : "bg-white border-neutral-200 text-neutral-500"
                                                }`}>
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-sm ${isCurrent ? "font-semibold text-neutral-900" : "font-medium text-neutral-700"}`}>
                                                    {stage.code}
                                                </span>
                                                <span className="text-neutral-400 mx-2">–</span>
                                                <span className={`text-sm ${isCurrent ? "text-neutral-700" : "text-neutral-500"}`}>
                                                    {stage.name}
                                                </span>
                                            </div>
                                            {isCurrent && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Project Dates */}
                        <div className="bg-white/40 dark:bg-neutral-800/10 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/5 p-6 space-y-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Location</h2>

                            <Input
                                label="Address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Street address"
                                disabled={!isEditing}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Select
                                    label="Province"
                                    options={provinceOptions}
                                    value={province}
                                    onChange={(val) => {
                                        setProvince(val);
                                        setCity(""); // Reset city when province changes
                                    }}
                                    disabled={!isEditing}
                                    placeholder="Select Province..."
                                />
                                {cityOptions.length > 0 ? (
                                    <Select
                                        label="City"
                                        options={cityOptions}
                                        value={city}
                                        onChange={setCity}
                                        disabled={!isEditing}
                                        placeholder="Select City..."
                                    />
                                ) : (
                                    <Input
                                        label="City"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="e.g. Jakarta Selatan"
                                        disabled={!isEditing || !province}
                                    />
                                )}
                            </div>

                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Input
                                        label="Google Maps Link"
                                        value={mapsLink}
                                        onChange={(e) => setMapsLink(e.target.value)}
                                        placeholder="https://maps.google.com/..."
                                        disabled={!isEditing}
                                    />
                                </div>
                                <Button
                                    variant="secondary"
                                    className="shrink-0"
                                    icon={<ExternalLink className="w-4 h-4" />}
                                    onClick={() => mapsLink && window.open(mapsLink, "_blank")}
                                    disabled={!mapsLink}
                                >
                                    Open
                                </Button>
                            </div>
 
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Latitude"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    placeholder="e.g. -6.1919864"
                                    disabled={!isEditing}
                                />
                                <Input
                                    label="Longitude"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    placeholder="e.g. 106.883713"
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* Scope of Work */}
                        <div className="bg-white/40 dark:bg-neutral-800/10 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/5 p-6 space-y-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Scope of Work</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Select
                                    label="Category"
                                    options={categoryOptions}
                                    value={category}
                                    onChange={setCategory}
                                    disabled={!isEditing}
                                />
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Disciplines</label>
                                    <div className="flex flex-wrap gap-2 p-3 border border-neutral-200 rounded-lg bg-neutral-50 min-h-[42px]">
                                        {disciplines.map((d: string) => (
                                            <span
                                                key={d}
                                                className="px-3 py-1 bg-white border border-neutral-200 rounded-full text-xs text-neutral-700 shadow-sm flex items-center gap-2 hover:border-neutral-300 transition-colors"
                                            >
                                                {d}
                                                {isEditing && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDisciplines(disciplines.filter(x => x !== d))}
                                                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                        {isEditing && (
                                            showAddDiscipline ? (
                                                <div className="flex items-center gap-1">
                                                    <Select
                                                        options={allTemplateDisciplines
                                                            .filter(d => !disciplines.includes(d))
                                                            .map(d => ({ label: d, value: d }))}
                                                        value=""
                                                        onChange={(val) => {
                                                            if (val && !disciplines.includes(val)) {
                                                                setDisciplines([...disciplines, val]);
                                                            }
                                                            setShowAddDiscipline(false);
                                                        }}
                                                        placeholder="Select..."
                                                        className="w-36 text-xs"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowAddDiscipline(false);
                                                        }}
                                                        className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 text-xs hover:bg-neutral-300 ml-1 shrink-0"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddDiscipline(true)}
                                                    className="px-3 py-1 border border-dashed border-neutral-300 rounded-full text-xs text-neutral-400 hover:text-neutral-600 hover:border-neutral-400 transition-colors"
                                                >
                                                    + Add
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
 
                        {/* Specifications */}
                        <div className="bg-white/40 dark:bg-neutral-800/10 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/5 p-6 space-y-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Specifications</h2>
 
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <Input
                                    label="Land Area (m²)"
                                    type="number"
                                    value={landArea}
                                    onChange={(e) => setLandArea(e.target.value)}
                                    disabled={!isEditing}
                                />
                                <Input
                                    label="Building Area (m²)"
                                    type="number"
                                    value={buildingArea}
                                    onChange={(e) => setBuildingArea(e.target.value)}
                                    disabled={!isEditing}
                                />
                                <Input
                                    label="Floors"
                                    type="number"
                                    value={floors}
                                    onChange={(e) => setFloors(e.target.value)}
                                    disabled={!isEditing}
                                />
                                <Select
                                    label="RAB Class"
                                    options={rabClassOptions}
                                    value={rabClass}
                                    onChange={setRabClass}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* Client & Partners */}
                        <div className="bg-white/40 dark:bg-neutral-800/10 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/5 p-6 space-y-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Client Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Client Name"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    disabled={!isEditing}
                                />
                                <Input
                                    label="Contact"
                                    value={clientContact}
                                    onChange={(e) => setClientContact(e.target.value)}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* Team assignment list */}
                        <div className="bg-white/40 dark:bg-neutral-800/10 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/5 p-6 space-y-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Timeline</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Start Date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    disabled={!isEditing}
                                />
                                <Input
                                    label="End Date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>
                    </div>

            </div>
        </PageWrapper>
    );
}
