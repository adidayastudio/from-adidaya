"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Plus, Folder, File, Download, ChevronUp, ChevronDown, Filter, ArrowUpDown, Check, Sparkles, Trash2, Upload } from "lucide-react";
import DocsUploadModal from "./DocsUploadModal";
import FilePreviewModal from "./FilePreviewModal";
import DocumentGenerator from "./DocumentGenerator";
import clsx from "clsx";
import { PopoverRoot as Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { fetchProjectDocs, deleteProjectDoc } from "@/lib/api/projects";
import { ProjectDoc } from "@/types/project";
import toast from "react-hot-toast";

type DocTab = "all" | "design" | "legal" | "controls" | "exports" | "other";
type SortKey = "title" | "stage" | "type" | "date" | "size";
type SortDirection = "asc" | "desc";
type TabItem<T> = { key: T; label: string };
type TimeFilter = "all" | "today" | "week" | "month";

export default function ProjectDetailDocsContent({ project }: { project: any }) {
    const [activeTab, setActiveTab] = useState<DocTab>("all");
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

    // Database docs state
    const [docs, setDocs] = useState<ProjectDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter State
    const [filterStage, setFilterStage] = useState<string[]>([]);
    const [filterTime, setFilterTime] = useState<TimeFilter>("all");

    // Sort State
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    // Preview State
    const [previewFile, setPreviewFile] = useState<any>(null);

    const tabs: TabItem<DocTab>[] = [
        { key: "all", label: "All Files" },
        { key: "design", label: "Design & Renders" },
        { key: "legal", label: "Contracts & Invoices" },
        { key: "controls", label: "Controls & RAB" },
        { key: "exports", label: "Exports" },
        { key: "other", label: "Other" },
    ];

    // Load docs from DB
    const loadDocs = async () => {
        setIsLoading(true);
        try {
            const fetched = await fetchProjectDocs(project.id);
            setDocs(fetched);
        } catch (err: any) {
            console.error("Error loading documents:", err);
            toast.error("Failed to load documents.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDocs();
    }, [project.id]);

    // Handle document deletion
    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            const success = await deleteProjectDoc(id);
            if (success) {
                toast.success("Document deleted successfully!");
                loadDocs();
            } else {
                toast.error("Failed to delete document.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error("An error occurred during deletion.");
        }
    };

    // Format tags info to mapped files
    const mappedFiles = useMemo(() => {
        return docs.map(doc => {
            // tags format: [Type, Stage, Version, Size]
            const type = doc.tags?.[0] || "OTH";
            const stage = doc.tags?.[1] || "—";
            const version = doc.tags?.[2] || "1";
            const size = doc.tags?.[3] || "—";

            return {
                id: doc.id,
                title: doc.title,
                version: version,
                generatedName: doc.storagePath?.split('/').pop() || doc.title,
                type: type,
                date: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
                timestamp: doc.createdAt ? new Date(doc.createdAt) : new Date(),
                size: size,
                stage: stage,
                storagePath: doc.storagePath,
                url: doc.url
            };
        });
    }, [docs]);

    // Filter and Sort logic
    const sortedFiles = useMemo(() => {
        // 1. Filter by Tab
        let items = activeTab === "all"
            ? mappedFiles
            : mappedFiles.filter(f => {
                const typeUpper = f.type.toUpperCase();
                if (activeTab === "design") return ["DRW", "SKP", "DWG", "ACD", "PLN", "VIZ", "JPG", "PNG"].includes(typeUpper);
                if (activeTab === "legal") return ["CON", "INV", "AGR"].includes(typeUpper);
                if (activeTab === "controls") return ["RAB", "SCH", "BOQ"].includes(typeUpper);
                if (activeTab === "exports") return ["EXP", "ALL"].includes(typeUpper);
                if (activeTab === "other") return !["DRW", "SKP", "DWG", "ACD", "PLN", "VIZ", "JPG", "PNG", "CON", "INV", "AGR", "RAB", "SCH", "BOQ", "EXP", "ALL"].includes(typeUpper);
                return false;
            });

        // 2. Filter by Stage
        if (filterStage.length > 0) {
            items = items.filter((f) => filterStage.includes(f.stage));
        }

        // 3. Filter by Time
        if (filterTime !== "all") {
            const now = new Date();
            items = items.filter((f) => {
                const diffTime = Math.abs(now.getTime() - f.timestamp.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (filterTime === "today") return diffDays <= 1;
                if (filterTime === "week") return diffDays <= 7;
                if (filterTime === "month") return diffDays <= 30;
                return true;
            });
        }

        // 4. Sort
        return items.sort((a, b) => {
            let valA: any = a[sortKey];
            let valB: any = b[sortKey];

            if (sortKey === "date") {
                valA = a.timestamp.getTime();
                valB = b.timestamp.getTime();
            } else if (sortKey === "size") {
                valA = parseFloat(a.size) || 0;
                valB = parseFloat(b.size) || 0;
            }

            if (valA < valB) return sortDirection === "asc" ? -1 : 1;
            if (valA > valB) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }, [mappedFiles, activeTab, filterStage, filterTime, sortKey, sortDirection]);

    const toggleStage = (stage: string) => {
        setFilterStage((prev) =>
            prev.includes(stage) ? prev.filter((t) => t !== stage) : [...prev, stage]
        );
    };

    const SortIcon = ({ active }: { active: boolean }) => {
        if (!active) return <ChevronDown className="w-3 h-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortDirection === "asc"
            ? <ChevronUp className="w-3 h-3 text-brand-red" />
            : <ChevronDown className="w-3 h-3 text-brand-red" />;
    };

    // If generator panel is active, replace main content
    if (isGeneratorOpen) {
        return (
            <DocumentGenerator
                project={project}
                onClose={() => {
                    setIsGeneratorOpen(false);
                    loadDocs();
                }}
            />
        );
    }

    return (
        <div>
            {/* HEADER: TITLE LEFT, TOGGLE + ACTION RIGHT */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-neutral-900 whitespace-nowrap">Documents</h2>

                <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                    {/* CATEGORY SELECTOR DROPDOWN */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 text-sm h-10 px-4 font-semibold rounded-full bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 transition-all select-none shadow-sm cursor-pointer"
                            >
                                <Folder className="w-4 h-4 text-neutral-500 shrink-0" />
                                <span>{tabs.find(t => t.key === activeTab)?.label}</span>
                                <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2 bg-white rounded-xl shadow-lg border border-neutral-100" align="start">
                            <div className="flex flex-col gap-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={clsx(
                                            "flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors text-left",
                                            activeTab === tab.key
                                                ? "bg-neutral-50 text-brand-red font-semibold"
                                                : "text-neutral-600 hover:bg-neutral-50"
                                        )}
                                    >
                                        {tab.label}
                                        {activeTab === tab.key && <Check className="w-4 h-4 text-brand-red" />}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* ACTIONS (Sort/Filter + Add Popover Menu) */}
                    <div className="flex items-center justify-end gap-2 shrink-0">

                        {/* FILTER POPOVER */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className={clsx(
                                        "!h-10 !w-10 !p-0 !rounded-full border border-neutral-200 bg-white shadow-none flex-shrink-0 min-w-[40px] flex items-center justify-center",
                                        (filterStage.length > 0 || filterTime !== "all") ? "text-brand-red border-brand-red ring-1 ring-brand-red bg-red-50" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                                    )}
                                >
                                    <Filter className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4" align="end">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 text-neutral-900">Stage</h4>
                                        <div className="space-y-2">
                                            {["01-KO", "02-SD", "03-DD", "04-CD"].map((stg) => (
                                                <div key={stg} className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleStage(stg)}
                                                        className={clsx(
                                                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                            filterStage.includes(stg) ? "bg-brand-red border-brand-red text-white" : "border-neutral-300 bg-white"
                                                        )}
                                                    >
                                                        {filterStage.includes(stg) && <Check className="w-3 h-3" />}
                                                    </button>
                                                    <span className="text-sm text-neutral-700 cursor-pointer" onClick={() => toggleStage(stg)}>{stg}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-px bg-neutral-100" />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 text-neutral-900">Time Range</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(["all", "today", "week", "month"] as TimeFilter[]).map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setFilterTime(t)}
                                                    className={clsx(
                                                        "px-3 py-1.5 text-xs rounded-full border transition-all capitalize",
                                                        filterTime === t
                                                            ? "bg-neutral-900 text-white border-neutral-900"
                                                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                                                    )}
                                                >
                                                    {t === "all" ? "All Time" : t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {(filterStage.length > 0 || filterTime !== "all") && (
                                        <Button size="sm" variant="text" onClick={() => { setFilterStage([]); setFilterTime("all"); }} className="w-full text-xs text-neutral-500 hover:text-red-600">
                                            Reset Filters
                                        </Button>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* SORT POPOVER */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className={clsx(
                                        "!h-10 !w-10 !p-0 !rounded-full border border-neutral-200 bg-white shadow-none flex-shrink-0 min-w-[40px] flex items-center justify-center",
                                        (sortKey !== "date" || sortDirection !== "desc") ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                                    )}
                                >
                                    <ArrowUpDown className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="end">
                                <div className="flex flex-col gap-1">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Sort by</div>
                                    {[
                                        { key: "date", label: "Date" },
                                        { key: "title", label: "Name" },
                                        { key: "stage", label: "Stage" },
                                        { key: "size", label: "Size" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.key}
                                            onClick={() => setSortKey(opt.key as SortKey)}
                                            className={clsx(
                                                "flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors",
                                                sortKey === opt.key ? "bg-neutral-100 text-neutral-900 font-medium" : "text-neutral-600 hover:bg-neutral-50"
                                            )}
                                        >
                                            {opt.label}
                                            {sortKey === opt.key && <Check className="w-4 h-4 text-neutral-900" />}
                                        </button>
                                    ))}
                                    <div className="h-px bg-neutral-100 my-1" />
                                    <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Direction</div>
                                    <div className="flex bg-neutral-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setSortDirection("asc")}
                                            className={clsx("flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-all", sortDirection === "asc" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                                        >
                                            Asc <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => setSortDirection("desc")}
                                            className={clsx("flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-all", sortDirection === "desc" ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                                        >
                                            Desc <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* ADD/NEW POPOVER BUTTON */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    className="!h-10 !w-10 !p-0 !rounded-full bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm flex items-center justify-center min-w-[40px] flex-shrink-0"
                                    title="Add New Document"
                                >
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2 bg-white rounded-xl shadow-lg border border-neutral-100" align="end">
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => setIsUploadOpen(true)}
                                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors text-left w-full"
                                    >
                                        <Upload className="w-4 h-4 text-neutral-500" />
                                        Upload File
                                    </button>
                                    <button
                                        onClick={() => setIsGeneratorOpen(true)}
                                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors text-left w-full"
                                    >
                                        <Sparkles className="w-4 h-4 text-brand-red" />
                                        Generate Document
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {isLoading ? (
                    <div className="flex justify-center items-center py-20 text-neutral-500 text-sm">
                        Loading documents...
                    </div>
                ) : sortedFiles.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
                        <Folder className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-neutral-900">No documents found</h3>
                        <p className="text-xs text-neutral-500">
                            {(filterStage.length > 0 || filterTime !== "all") ? "Try adjusting your filters." : "Upload or generate a document to get started."}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[800px]">
                                <thead className="bg-neutral-50 border-b border-neutral-100 text-xs uppercase font-semibold text-neutral-500">
                                    <tr>
                                        {[
                                            { key: "title", label: "Document", width: "w-[40%]" },
                                            { key: "stage", label: "Stage" },
                                            { key: "type", label: "Type" },
                                            { key: "date", label: "Date" },
                                            { key: "size", label: "Size", align: "text-right" }
                                        ].map((col) => (
                                            <th
                                                key={col.key}
                                                className={`px-4 py-3 cursor-pointer hover:bg-neutral-100 transition-colors group select-none ${col.width || ""} ${col.align || ""}`}
                                                onClick={() => {
                                                    setSortKey(col.key as SortKey);
                                                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                                                }}
                                            >
                                                <div className={`flex items-center gap-1 ${col.align === "text-right" ? "justify-end" : ""}`}>
                                                    {col.label}
                                                    <SortIcon active={sortKey === col.key} />
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {sortedFiles.map((file, i) => (
                                        <tr key={i} className="group hover:bg-neutral-50/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-neutral-900 cursor-pointer" onClick={() => setPreviewFile(file)}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <File className="w-5 h-5 group-hover:text-brand-red transition-colors" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="group-hover:text-brand-red transition-colors">{file.title}</span>
                                                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200 font-mono">v{file.version}</span>
                                                        </div>
                                                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate max-w-[200px] md:max-w-xs opacity-70 group-hover:opacity-100 transition-opacity" title={file.generatedName}>
                                                            {file.generatedName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-600 text-xs whitespace-nowrap">{file.stage}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600 uppercase border border-neutral-200">
                                                    {file.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">{file.date}</td>
                                            <td className="px-4 py-3 text-neutral-500 text-xs text-right whitespace-nowrap">{file.size}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {file.url && (
                                                        <a
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-neutral-400 hover:text-brand-red p-2 hover:bg-red-50 rounded-full transition-colors"
                                                            title={`Download file`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button
                                                        className="text-neutral-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                                                        title="Delete document"
                                                        onClick={(e) => handleDelete(file.id, e)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL */}
            <DocsUploadModal
                open={isUploadOpen}
                onClose={() => {
                    setIsUploadOpen(false);
                    loadDocs();
                }}
                project={project}
            />

            {/* PREVIEW */}
            <FilePreviewModal
                open={!!previewFile}
                onClose={() => setPreviewFile(null)}
                file={previewFile}
            />
        </div>
    );
}
