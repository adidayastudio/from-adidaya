"use client";

import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { useProject } from "@/components/flow/project-context";
import { Save, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";
import { updateProject } from "@/lib/api/projects";
import { useState, useEffect } from "react";

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

export default function ProjectInfoPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const { project, isLoading, error, refresh } = useProject();

    // ================= FORM STATE =================
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

            setCategory(meta?.category || "new");
            setDisciplines(meta?.disciplines || ["Architecture", "Structure", "MEP"]);
            setLandArea(meta?.landArea?.toString() || "");
            setBuildingArea(meta?.buildingArea?.toString() || "");
            setFloors(meta?.floors?.toString() || "");
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

        try {
            const success = await updateProject(project.id, {
                projectNumber,
                projectCode,
                projectName,
                status: status as any,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                location: {
                    address,
                    city,
                    province,
                    mapsLink,
                } as any,
                meta: {
                    ...(project.meta as any),
                    type: projectType,
                    category,
                    disciplines,
                    landArea: landArea ? parseFloat(landArea) : null,
                    buildingArea: buildingArea ? parseFloat(buildingArea) : null,
                    floors: floors ? parseInt(floors) : null,
                    rabClass,
                    clientName,
                    clientContact,
                },
            } as any);

            if (success) {
                setSaveMessage("Changes saved successfully!");
                await refresh(); // Refresh context to update header
            } else {
                setSaveMessage("Failed to save changes.");
            }
        } catch (err) {
            console.error(err);
            setSaveMessage("Error saving changes.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    // ================= LOADING / ERROR =================
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">Loading...</div>;
    }

    if (error || !project) {
        return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">{error || "Project not found."}</div>;
    }

    const activeStages = STAGE_MAPPING[projectType] || STAGE_MAPPING["design-build"];
    // Default to 01-KO if no stage is set
    const currentStageCode = (project.stage as string) || "01-KO";
    const projectForHeader = mapProjectToHeader(project as any);

    return (
        <div className="min-h-screen bg-neutral-50 p-2 md:p-6">
            <Breadcrumb
                items={[
                    { label: "Flow" },
                    { label: "Projects", href: "/flow/projects" },
                    { label: project.project_name, href: `/flow/projects/${projectId}` },
                    { label: "Setup" },
                    { label: "Project Information" },
                ]}
            />

            <PageWrapper sidebar={<ProjectDetailSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">

                    {/* STANDARD HEADER */}
                    <ProjectDetailHeader project={projectForHeader as any} />

                    {/* ACTION TOOLBAR */}
                    <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Project Details</h2>
                            <p className="text-xs text-neutral-500">Manage basic information and settings.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {saveMessage && (
                                <span className={`text-sm ${saveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                                    {saveMessage}
                                </span>
                            )}
                            <Button
                                icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                className="!rounded-full bg-brand-red hover:bg-brand-red-hover text-white shadow-sm"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>

                    {/* FORM SECTIONS */}
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Basic Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Project Number"
                                    value={projectNumber}
                                    onChange={(e) => setProjectNumber(e.target.value)}
                                />
                                <Input
                                    label="Project Code"
                                    value={projectCode}
                                    onChange={(e) => setProjectCode(e.target.value)}
                                />
                            </div>

                            <Input
                                label="Project Name"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Select
                                    label="Project Type"
                                    options={PROJECT_TYPE_OPTIONS}
                                    value={projectType}
                                    onChange={(val) => setProjectType(val as WorkType)}
                                />
                                <Select
                                    label="Status"
                                    options={STATUS_OPTIONS}
                                    value={status}
                                    onChange={setStatus}
                                />
                            </div>
                        </div>

                        {/* Applicable Stages Preview */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
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

                        {/* Location */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Location</h2>

                            <Input
                                label="Address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Street address"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Province"
                                    value={province}
                                    onChange={(e) => setProvince(e.target.value)}
                                    placeholder="e.g. DKI Jakarta"
                                />
                                <Input
                                    label="City"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="e.g. Jakarta Selatan"
                                />
                            </div>

                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Input
                                        label="Google Maps Link"
                                        value={mapsLink}
                                        onChange={(e) => setMapsLink(e.target.value)}
                                        placeholder="https://maps.google.com/..."
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
                        </div>

                        {/* Scope of Work */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Scope of Work</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Select
                                    label="Category"
                                    options={CATEGORY_OPTIONS}
                                    value={category}
                                    onChange={setCategory}
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
                                                <button
                                                    type="button"
                                                    onClick={() => setDisciplines(disciplines.filter(x => x !== d))}
                                                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                        {showAddDiscipline ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={newDiscipline}
                                                    onChange={(e) => setNewDiscipline(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && newDiscipline.trim()) {
                                                            if (!disciplines.includes(newDiscipline.trim())) {
                                                                setDisciplines([...disciplines, newDiscipline.trim()]);
                                                            }
                                                            setNewDiscipline("");
                                                            setShowAddDiscipline(false);
                                                        } else if (e.key === 'Escape') {
                                                            setNewDiscipline("");
                                                            setShowAddDiscipline(false);
                                                        }
                                                    }}
                                                    placeholder="Type & Enter"
                                                    autoFocus
                                                    className="px-2 py-1 text-xs border border-neutral-300 rounded-full w-24 focus:outline-none focus:border-red-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (newDiscipline.trim() && !disciplines.includes(newDiscipline.trim())) {
                                                            setDisciplines([...disciplines, newDiscipline.trim()]);
                                                        }
                                                        setNewDiscipline("");
                                                        setShowAddDiscipline(false);
                                                    }}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNewDiscipline("");
                                                        setShowAddDiscipline(false);
                                                    }}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 text-xs hover:bg-neutral-300"
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
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Specifications */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Specifications</h2>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <Input
                                    label="Land Area (m²)"
                                    type="number"
                                    value={landArea}
                                    onChange={(e) => setLandArea(e.target.value)}
                                />
                                <Input
                                    label="Building Area (m²)"
                                    type="number"
                                    value={buildingArea}
                                    onChange={(e) => setBuildingArea(e.target.value)}
                                />
                                <Input
                                    label="Floors"
                                    type="number"
                                    value={floors}
                                    onChange={(e) => setFloors(e.target.value)}
                                />
                                <Select
                                    label="RAB Class"
                                    options={RAB_CLASS_OPTIONS}
                                    value={rabClass}
                                    onChange={setRabClass}
                                />
                            </div>
                        </div>

                        {/* Client */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Client Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Client Name"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                />
                                <Input
                                    label="Contact"
                                    value={clientContact}
                                    onChange={(e) => setClientContact(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
                            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Timeline</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Start Date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <Input
                                    label="End Date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
