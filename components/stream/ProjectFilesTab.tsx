"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    FileText,
    Download,
    Trash2,
    FileCode,
    FileSpreadsheet,
    Presentation,
    Video,
    Image as ImageIcon,
    Box,
    FileCheck,
    Share2,
    MoreHorizontal,
    ArrowUpDown,
    ListFilter,
    CheckSquare,
    Square,
    Copy,
    Info,
    Search,
    X,
    LayoutGrid,
    List,
    ChevronUp,
    ChevronDown,
    Star,
    Globe,
    Lock,
    ExternalLink,
    Check,
    Pencil,
} from "lucide-react";
import clsx from "clsx";

export interface ProjectFileItem {
    id: string;
    name: string;
    size: string;
    type: "skp" | "pln" | "pdf" | "dwg" | "excel" | "word" | "ppt" | "video" | "image" | "archive" | "other";
    typeName: string;
    uploadedBy: string;
    uploadedAt: string;
    source: "chat" | "manual";
    url?: string;
    isFavorite?: boolean;
}

interface ProjectFilesTabProps {
    channelCode: string;
    channelName: string;
    customFiles: ProjectFileItem[];
    onDeleteFile?: (fileId: string) => void;
    onSelectFile?: (file: ProjectFileItem) => void;
    selectedFileId?: string | null;
    favoritedFileIds?: string[];
    onToggleFavorite?: (fileId: string) => void;
    renamedFilesMap?: Record<string, string>;
    onRenameFile?: (fileId: string, newName: string) => void;
    deletedFileIds?: string[];
}

export function middleTruncate(filename: string, maxLength: number = 26): string {
    if (!filename || filename.length <= maxLength) return filename;

    const lastDotIndex = filename.lastIndexOf(".");
    let namePart = filename;
    let extPart = "";

    if (lastDotIndex > 0) {
        namePart = filename.substring(0, lastDotIndex);
        extPart = filename.substring(lastDotIndex);
    }

    const extLen = extPart.length;
    const availableForName = maxLength - extLen - 3;

    if (availableForName <= 3) {
        return filename.substring(0, Math.max(1, maxLength - 4)) + "..." + extPart;
    }

    const frontChars = Math.ceil(availableForName * 0.55);
    const backChars = Math.floor(availableForName * 0.45);

    const front = namePart.substring(0, frontChars);
    const back = namePart.substring(namePart.length - backChars);

    return `${front}...${back}${extPart}`;
}

export const INITIAL_PROJECT_FILES: Record<string, ProjectFileItem[]> = {
    "000-gen": [
        {
            id: "f-1",
            name: "20250423_RWM_DETAIL_TANGGA.dwg",
            size: "14.8 MB",
            type: "dwg",
            typeName: "AutoCAD Drawing",
            uploadedBy: "Eko Prasetyo",
            uploadedAt: "Aug 25, 2026",
            source: "manual",
        },
        {
            id: "f-2",
            name: "RAB_Rawamangun_Structure_v3.pdf",
            size: "4.2 MB",
            type: "pdf",
            typeName: "PDF Document",
            uploadedBy: "Hendra Kusuma",
            uploadedAt: "Aug 28, 2026",
            source: "manual",
        },
        {
            id: "f-3",
            name: "Site_Pengecoran_Plat_Lt3.png",
            size: "3.8 MB",
            type: "image",
            typeName: "Image",
            uploadedBy: "Zulfikar Adhitya",
            uploadedAt: "Aug 27, 2026",
            source: "manual",
        },
        {
            id: "f-4",
            name: "20250809_GEN_LT 3.skp",
            size: "22.4 MB",
            type: "skp",
            typeName: "SketchUp 3D Model",
            uploadedBy: "Budi Santoso",
            uploadedAt: "Yesterday",
            source: "chat",
        },
        {
            id: "f-5",
            name: "20260830_RWM_MAIN_BUILDING.pln",
            size: "42.5 MB",
            type: "pln",
            typeName: "Archicad Model",
            uploadedBy: "Dian Rahma",
            uploadedAt: "Aug 30, 2026",
            source: "chat",
        },
        {
            id: "f-6",
            name: "BoQ_Material_Beton_Struktur.xlsx",
            size: "1.2 MB",
            type: "excel",
            typeName: "Excel Spreadsheet",
            uploadedBy: "Reza Syahputra",
            uploadedAt: "Aug 24, 2026",
            source: "manual",
        },
        {
            id: "f-7",
            name: "Surat_Perjanjian_Kontrak_Kerja.docx",
            size: "3.4 MB",
            type: "word",
            typeName: "Word Document",
            uploadedBy: "Hendra Kusuma",
            uploadedAt: "Jul 22, 2026",
            source: "manual",
        },
        {
            id: "f-8",
            name: "Presentasi_Desain_Fasad_Utama.pptx",
            size: "15.2 MB",
            type: "ppt",
            typeName: "PowerPoint Presentation",
            uploadedBy: "Dian Rahma",
            uploadedAt: "Jul 20, 2026",
            source: "chat",
        },
        {
            id: "f-9",
            name: "Site_Progress_Drone_Flythrough.mp4",
            size: "148.5 MB",
            type: "video",
            typeName: "MP4 Video",
            uploadedBy: "Zulfikar Adhitya",
            uploadedAt: "Jul 18, 2026",
            source: "chat",
        },
    ],
};

export default function ProjectFilesTab({
    channelCode,
    customFiles,
    onDeleteFile: onDeleteFileProp,
    onSelectFile,
    selectedFileId,
    favoritedFileIds: favoritedFileIdsProp,
    onToggleFavorite: onToggleFavoriteProp,
    renamedFilesMap: renamedFilesMapProp,
    onRenameFile: onRenameFileProp,
    deletedFileIds: deletedFileIdsProp,
}: ProjectFilesTabProps) {
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [sortOption, setSortOption] = useState<"newest" | "oldest" | "name" | "size">("newest");
    const [sortKey, setSortKey] = useState<"name" | "size" | "uploadedBy" | "date">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    // Favorites State
    const [internalFavoritedFileIds, setInternalFavoritedFileIds] = useState<string[]>(["f-1", "f-4"]);
    const favoritedFileIds = favoritedFileIdsProp !== undefined ? favoritedFileIdsProp : internalFavoritedFileIds;

    // Share & Public Drive Portal Modal States
    const [shareModalFile, setShareModalFile] = useState<ProjectFileItem | null>(null);
    const [isPublicPortalOpen, setIsPublicPortalOpen] = useState(false);
    const [copiedShareLink, setCopiedShareLink] = useState(false);

    // Rename & Delete Modal States
    const [renameModalFile, setRenameModalFile] = useState<ProjectFileItem | null>(null);
    const [renameBaseInput, setRenameBaseInput] = useState("");
    const [internalRenamedFilesMap, setInternalRenamedFilesMap] = useState<Record<string, string>>({});
    const renamedFilesMap = renamedFilesMapProp !== undefined ? renamedFilesMapProp : internalRenamedFilesMap;

    const [deleteConfirmFile, setDeleteConfirmFile] = useState<ProjectFileItem | null>(null);
    const [internalDeletedFileIds, setInternalDeletedFileIds] = useState<string[]>([]);
    const deletedFileIds = deletedFileIdsProp !== undefined ? deletedFileIdsProp : internalDeletedFileIds;

    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [openMenuFileId, setOpenMenuFileId] = useState<string | null>(null);
    const [activeMenuState, setActiveMenuState] = useState<{
        file: ProjectFileItem;
        top: number;
        left: number;
    } | null>(null);
    const [mounted, setMounted] = useState(false);

    // Combine initial + custom files with renamed overrides and deletion filter
    const allFiles = useMemo(() => {
        const base = INITIAL_PROJECT_FILES[channelCode] || INITIAL_PROJECT_FILES["000-gen"] || [];
        const combined = [...customFiles, ...base];
        return combined
            .filter(f => !deletedFileIds.includes(f.id))
            .map(f => ({
                ...f,
                name: renamedFilesMap[f.id] || f.name,
            }));
    }, [channelCode, customFiles, renamedFilesMap, deletedFileIds]);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const urlFileId = params.get("fileId");
            if (urlFileId && onSelectFile) {
                const target = allFiles.find(f => f.id === urlFileId);
                if (target) {
                    onSelectFile(target);
                }
            }
        }
    }, [allFiles, onSelectFile]);

    const handleOpenMenu = (file: ProjectFileItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeMenuState && activeMenuState.file.id === file.id) {
            setActiveMenuState(null);
            setOpenMenuFileId(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const popoverHeight = 165;
            const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

            const top = showAbove ? rect.top - popoverHeight - 6 : rect.bottom + 6;
            const left = Math.max(12, rect.right - 176);

            setActiveMenuState({ file, top, left });
            setOpenMenuFileId(file.id);
        }
    };

    const splitFileName = (fullName: string) => {
        const lastDotIndex = fullName.lastIndexOf(".");
        if (lastDotIndex <= 0) return { baseName: fullName, extension: "" };
        return {
            baseName: fullName.substring(0, lastDotIndex),
            extension: fullName.substring(lastDotIndex),
        };
    };

    const handleRenameFile = (fileId: string, newName: string) => {
        if (onRenameFileProp) {
            onRenameFileProp(fileId, newName);
        } else {
            setInternalRenamedFilesMap(prev => ({ ...prev, [fileId]: newName }));
        }
    };

    const toggleFavorite = (fileId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (onToggleFavoriteProp) {
            onToggleFavoriteProp(fileId);
        } else {
            setInternalFavoritedFileIds(prev =>
                prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
            );
        }
    };

    const handleTableSort = (key: "name" | "size" | "uploadedBy" | "date") => {
        if (sortKey === key) {
            setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortOrder(key === "name" || key === "uploadedBy" ? "asc" : "desc");
        }
    };

    // Live auto-detected category counts including Favorites
    const categoryCounts = useMemo(() => {
        return {
            all: allFiles.length,
            favorites: allFiles.filter(f => favoritedFileIds.includes(f.id)).length,
            skp: allFiles.filter(f => f.type === "skp").length,
            pln: allFiles.filter(f => f.type === "pln").length,
            pdf: allFiles.filter(f => f.type === "pdf").length,
            dwg: allFiles.filter(f => f.type === "dwg").length,
            image: allFiles.filter(f => f.type === "image").length,
            excel: allFiles.filter(f => f.type === "excel").length,
            word: allFiles.filter(f => f.type === "word").length,
            ppt: allFiles.filter(f => f.type === "ppt").length,
            video: allFiles.filter(f => f.type === "video").length,
        };
    }, [allFiles, favoritedFileIds]);

    // Filter & Sort files
    const filteredFiles = useMemo(() => {
        let result = allFiles.filter(file => {
            // Category Filter
            let catMatch = true;
            if (selectedCategory && selectedCategory !== "all") {
                if (selectedCategory === "favorites") catMatch = favoritedFileIds.includes(file.id);
                else if (selectedCategory === "skp") catMatch = file.type === "skp";
                else if (selectedCategory === "pln") catMatch = file.type === "pln";
                else if (selectedCategory === "pdf") catMatch = file.type === "pdf";
                else if (selectedCategory === "dwg") catMatch = file.type === "dwg";
                else if (selectedCategory === "image") catMatch = file.type === "image";
                else if (selectedCategory === "excel") catMatch = file.type === "excel";
                else if (selectedCategory === "word") catMatch = file.type === "word";
                else if (selectedCategory === "ppt") catMatch = file.type === "ppt";
                else if (selectedCategory === "video") catMatch = file.type === "video";
                else if (selectedCategory === "manual") catMatch = file.source === "manual";
                else if (selectedCategory === "chat") catMatch = file.source === "chat";
            }

            // Search Query
            let searchMatch = true;
            if (searchQuery && searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = file.name.toLowerCase().includes(q);
                const uploaderMatch = file.uploadedBy.toLowerCase().includes(q);
                searchMatch = nameMatch || uploaderMatch;
            }

            return catMatch && searchMatch;
        });

        // Sorting Logic Helpers
        const parseFileSize = (sizeStr: string) => {
            if (!sizeStr) return 0;
            const match = sizeStr.trim().match(/^([\d.]+)\s*([A-Za-z]+)?$/);
            if (!match) return parseFloat(sizeStr) || 0;
            const val = parseFloat(match[1]);
            const unit = (match[2] || "MB").toUpperCase();
            if (unit === "GB") return val * 1024 * 1024;
            if (unit === "MB") return val * 1024;
            if (unit === "KB") return val;
            if (unit === "B") return val / 1024;
            return val;
        };

        const parseFileDate = (dateStr: string) => {
            if (!dateStr) return 0;
            const now = new Date();
            if (dateStr.includes("Today")) {
                return now.getTime();
            }
            if (dateStr.includes("Yesterday")) {
                const y = new Date(now);
                y.setDate(now.getDate() - 1);
                return y.getTime();
            }
            const parsed = Date.parse(dateStr);
            return isNaN(parsed) ? 0 : parsed;
        };

        result = [...result].sort((a, b) => {
            if (sortKey === "name") {
                const cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
                return sortOrder === "asc" ? cmp : -cmp;
            }
            if (sortKey === "size") {
                const sizeA = parseFileSize(a.size);
                const sizeB = parseFileSize(b.size);
                return sortOrder === "asc" ? sizeA - sizeB : sizeB - sizeA;
            }
            if (sortKey === "uploadedBy") {
                const cmp = a.uploadedBy.localeCompare(b.uploadedBy);
                return sortOrder === "asc" ? cmp : -cmp;
            }
            if (sortKey === "date") {
                const dateA = parseFileDate(a.uploadedAt);
                const dateB = parseFileDate(b.uploadedAt);
                return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
            }
            return 0;
        });

        return result;
    }, [allFiles, selectedCategory, searchQuery, sortKey, sortOrder, favoritedFileIds]);

    // Checkbox selection handlers
    const isAllSelected = filteredFiles.length > 0 && selectedFileIds.length === filteredFiles.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedFileIds([]);
        } else {
            setSelectedFileIds(filteredFiles.map(f => f.id));
        }
    };

    const toggleSelectFile = (fileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFileIds(prev =>
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    // Helper for file type icons & colors per user specification:
    // dwg: merah, pdf: merah, skp: biru tua, pln: biru muda, image: kuning/oranye, lain: abu-abu
    const getFileBadge = (type: ProjectFileItem["type"], size: "sm" | "md" = "md") => {
        const iconSizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
        switch (type) {
            case "dwg":
                return {
                    icon: <FileCode className={`${iconSizeClass} text-rose-600 dark:text-rose-400`} />,
                    bgColor: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
                };
            case "pdf":
                return {
                    icon: <FileText className={`${iconSizeClass} text-rose-600 dark:text-rose-400`} />,
                    bgColor: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
                };
            case "skp":
                return {
                    icon: <Box className={`${iconSizeClass} text-blue-700 dark:text-blue-500`} />,
                    bgColor: "bg-blue-600/10 dark:bg-blue-600/20 border-blue-600/20",
                };
            case "pln":
                return {
                    icon: <Box className={`${iconSizeClass} text-sky-500 dark:text-sky-400`} />,
                    bgColor: "bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20",
                };
            case "image":
                return {
                    icon: <ImageIcon className={`${iconSizeClass} text-amber-500 dark:text-amber-400`} />,
                    bgColor: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20",
                };
            case "excel":
                return {
                    icon: <FileSpreadsheet className={`${iconSizeClass} text-emerald-600 dark:text-emerald-400`} />,
                    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
                };
            case "word":
                return {
                    icon: <FileText className={`${iconSizeClass} text-blue-600 dark:text-blue-400`} />,
                    bgColor: "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20",
                };
            case "ppt":
                return {
                    icon: <Presentation className={`${iconSizeClass} text-orange-600 dark:text-orange-400`} />,
                    bgColor: "bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20",
                };
            case "video":
                return {
                    icon: <Video className={`${iconSizeClass} text-purple-600 dark:text-purple-400`} />,
                    bgColor: "bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20",
                };
            default:
                return {
                    icon: <FileCheck className={`${iconSizeClass} text-neutral-500 dark:text-neutral-400`} />,
                    bgColor: "bg-neutral-500/10 dark:bg-neutral-500/20 border-neutral-500/20",
                };
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* UNIFIED FILES TOOLBAR (Select All, Batch Actions, Search, Filter, Sort, View Switcher) */}
            <div className="relative z-10 p-3 rounded-[24px] bg-white/60 dark:bg-neutral-900/60 backdrop-blur-2xl border border-white/80 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                
                {/* LEFT SIDE: Select All Checkbox & Batch Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer select-none"
                    >
                        {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : selectedFileIds.length > 0 ? (
                            <div className="w-4 h-4 rounded border-2 border-blue-600 bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                                -
                            </div>
                        ) : (
                            <Square className="w-4 h-4 text-neutral-400" />
                        )}
                        <span>{selectedFileIds.length > 0 ? `${selectedFileIds.length} Selected` : "Select all"}</span>
                    </button>

                    {/* Batch Action Toolbar when 1+ items selected */}
                    {selectedFileIds.length > 0 && (
                        <div className="flex items-center gap-1 pl-3 border-l border-neutral-200/50 dark:border-neutral-700/50">
                            <button
                                onClick={() => alert(`Downloading ${selectedFileIds.length} files...`)}
                                className="p-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                                title="Download Selected Files"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => {
                                    const firstFile = allFiles.find(f => selectedFileIds.includes(f.id));
                                    if (firstFile) setShareModalFile(firstFile);
                                }}
                                className="p-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                                title="Share Public Drive Link"
                            >
                                <Share2 className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white" />
                            </button>
                            <button
                                onClick={() => {
                                    if (onDeleteFileProp) {
                                        selectedFileIds.forEach(id => onDeleteFileProp(id));
                                    }
                                    selectedFileIds.forEach(id => {
                                        if (!deletedFileIds.includes(id)) {
                                            setInternalDeletedFileIds(prev => [...prev, id]);
                                        }
                                    });
                                    setSelectedFileIds([]);
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                title="Delete Selected Files"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: Search Input, Category Filter, Sort Dropdown & View Mode Switcher */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {/* Search Input (h-9 height) */}
                    <div className="relative flex items-center shrink-0">
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-8 pr-7 w-32 sm:w-44 rounded-full bg-neutral-200/50 dark:bg-neutral-800/60 border border-neutral-300/40 dark:border-neutral-700/40 text-[11px] font-medium text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter Dropdown (h-9 height with Favorites) */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                                setIsSortDropdownOpen(false);
                            }}
                            className={clsx(
                                "h-9 flex items-center gap-1.5 px-3.5 rounded-full border text-[11px] font-bold transition-colors cursor-pointer",
                                selectedCategory !== "all"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                    : "bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border-neutral-300/40 dark:border-neutral-700/40 hover:bg-neutral-300/50"
                            )}
                        >
                            {selectedCategory === "favorites" ? (
                                <span className="flex items-center gap-1 font-bold">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                                    <span>Favorites</span>
                                </span>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <ListFilter className="w-3.5 h-3.5" />
                                    <span className="capitalize">
                                        {selectedCategory === "all" ? "Filters" : selectedCategory.toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </button>

                        {isCategoryDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-[90]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCategoryDropdownOpen(false);
                                    }}
                                />
                                <div className="absolute right-0 mt-2 w-52 p-1.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800/90 shadow-lg shadow-black/5 z-[100] space-y-0.5 text-[11px] font-medium animate-in fade-in zoom-in-95 duration-150">
                                    <button
                                        onClick={() => { setSelectedCategory("all"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "all" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>All Files</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.all})</span>
                                    </button>

                                    {/* ⭐ FAVORITES FILTER OPTION */}
                                    <button
                                        onClick={() => { setSelectedCategory("favorites"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "favorites" ? "bg-amber-500/10 text-amber-600 font-bold" : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10")}
                                    >
                                        <span className="flex items-center gap-1.5 font-bold">
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                            <span>Favorites</span>
                                        </span>
                                        <span className="text-[10px] font-mono font-bold opacity-80">({categoryCounts.favorites})</span>
                                    </button>

                                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                                    <button
                                        onClick={() => { setSelectedCategory("skp"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "skp" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>3D Models (.skp)</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.skp})</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory("pln"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "pln" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>Archicad (.pln)</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.pln})</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory("pdf"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "pdf" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>PDF Documents</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.pdf})</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory("dwg"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "dwg" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>CAD Drawings (.dwg)</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.dwg})</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory("image"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "image" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>Images (.png/.jpg)</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.image})</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory("excel"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "excel" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>Spreadsheets (.xlsx/.csv)</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.excel})</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory("word"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "word" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>Documents (.docx/.doc)</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.word})</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory("ppt"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "ppt" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>Presentations (.pptx/.ppt)</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.ppt})</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory("video"); setIsCategoryDropdownOpen(false); }}
                                        className={clsx("w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors", selectedCategory === "video" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        <span>Videos (.mp4/.mov)</span>
                                        <span className="text-[10px] font-mono font-bold opacity-60">({categoryCounts.video})</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sort Dropdown (h-9 height) */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsSortDropdownOpen(!isSortDropdownOpen);
                                setIsCategoryDropdownOpen(false);
                            }}
                            className="h-9 flex items-center gap-1.5 px-3.5 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/40 dark:border-neutral-700/40 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300/50 transition-colors cursor-pointer"
                        >
                            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                            <span>
                                Sort: {
                                    sortKey === "date" ? (sortOrder === "desc" ? "Newest" : "Oldest") :
                                    sortKey === "name" ? (sortOrder === "asc" ? "Name A-Z" : "Name Z-A") :
                                    sortKey === "size" ? (sortOrder === "desc" ? "Largest Size" : "Smallest Size") :
                                    "Newest"
                                }
                            </span>
                        </button>

                        {isSortDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-[90]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsSortDropdownOpen(false);
                                    }}
                                />
                                <div className="absolute right-0 mt-2 w-44 p-1.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800/90 shadow-lg shadow-black/5 z-[100] space-y-0.5 text-[11px] font-medium animate-in fade-in zoom-in-95 duration-150">
                                    <button
                                        onClick={() => { setSortKey("date"); setSortOrder("desc"); setIsSortDropdownOpen(false); }}
                                        className={clsx("w-full text-left px-2.5 py-1.5 rounded-xl transition-colors", sortKey === "date" && sortOrder === "desc" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        Newest First
                                    </button>
                                    <button
                                        onClick={() => { setSortKey("date"); setSortOrder("asc"); setIsSortDropdownOpen(false); }}
                                        className={clsx("w-full text-left px-2.5 py-1.5 rounded-xl transition-colors", sortKey === "date" && sortOrder === "asc" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        Oldest First
                                    </button>
                                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                                    <button
                                        onClick={() => { setSortKey("name"); setSortOrder("asc"); setIsSortDropdownOpen(false); }}
                                        className={clsx("w-full text-left px-2.5 py-1.5 rounded-xl transition-colors", sortKey === "name" && sortOrder === "asc" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        Name A – Z
                                    </button>
                                    <button
                                        onClick={() => { setSortKey("name"); setSortOrder("desc"); setIsSortDropdownOpen(false); }}
                                        className={clsx("w-full text-left px-2.5 py-1.5 rounded-xl transition-colors", sortKey === "name" && sortOrder === "desc" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        Name Z – A
                                    </button>
                                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                                    <button
                                        onClick={() => { setSortKey("size"); setSortOrder("desc"); setIsSortDropdownOpen(false); }}
                                        className={clsx("w-full text-left px-2.5 py-1.5 rounded-xl transition-colors", sortKey === "size" && sortOrder === "desc" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        Size: Largest First
                                    </button>
                                    <button
                                        onClick={() => { setSortKey("size"); setSortOrder("asc"); setIsSortDropdownOpen(false); }}
                                        className={clsx("w-full text-left px-2.5 py-1.5 rounded-xl transition-colors", sortKey === "size" && sortOrder === "asc" ? "bg-blue-500/10 text-blue-600 font-bold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}
                                    >
                                        Size: Smallest First
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* View Switcher Toggle Pill (h-9 height, Icon-only with fluid sliding pill animation) */}
                    <div className="relative h-9 p-1 flex items-center rounded-full bg-neutral-200/50 dark:bg-neutral-800/60 border border-neutral-300/40 dark:border-neutral-700/40 shrink-0 select-none">
                        {/* Sliding Active Pill Background Indicator */}
                        <div
                            className={clsx(
                                "absolute top-1 bottom-1 w-7 rounded-full bg-white dark:bg-neutral-700 shadow-sm transition-transform duration-300 ease-out pointer-events-none",
                                viewMode === "grid" ? "translate-x-0" : "translate-x-7"
                            )}
                        />
                        <button
                            onClick={() => setViewMode("grid")}
                            className={clsx(
                                "relative z-10 h-7 w-7 rounded-full flex items-center justify-center transition-colors cursor-pointer",
                                viewMode === "grid"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                            )}
                            title="Card Grid View"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={clsx(
                                "relative z-10 h-7 w-7 rounded-full flex items-center justify-center transition-colors cursor-pointer",
                                viewMode === "table"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                            )}
                            title="Table List View"
                        >
                            <List className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Counter Badge (h-9 height) */}
                    <div className="h-9 flex items-center text-xs font-mono font-bold px-3 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                        {filteredFiles.length} files
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {filteredFiles.length === 0 && (
                <div className="p-12 text-center rounded-[24px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40 space-y-3">
                    <FileText className="w-10 h-10 mx-auto text-neutral-400" />
                    <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No matching files found</h4>
                    <p className="text-xs text-neutral-400">Try adjusting your category filter or search query.</p>
                </div>
            )}

            {/* CARD VIEW MODE */}
            {viewMode === "grid" && filteredFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFiles.map((file, index) => {
                        const badge = getFileBadge(file.type);
                        const truncatedName = middleTruncate(file.name, 26);
                        const isSelected = selectedFileIds.includes(file.id);
                        const isActiveDetail = selectedFileId === file.id;
                        const isFav = favoritedFileIds.includes(file.id);
                        const isNearBottom = index >= filteredFiles.length - 3;

                        return (
                            <div
                                key={file.id}
                                onClick={() => onSelectFile && onSelectFile(file)}
                                className={clsx(
                                    "group relative p-4 rounded-[22px] border transition-all duration-300 flex flex-col justify-between space-y-3 cursor-pointer select-none",
                                    isActiveDetail || isSelected
                                        ? "border-blue-400/50 ring-2 ring-blue-400/20 shadow-xs bg-blue-50/80 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-medium"
                                        : "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md"
                                )}
                            >
                                {/* Checkbox & Yellow Favorite Star Badge (only when isFav) & Floating Hover Action Bar */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => toggleSelectFile(file.id, e)}
                                            className="p-1 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                                        >
                                            {isSelected ? (
                                                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            ) : (
                                                <Square className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600" />
                                            )}
                                        </button>

                                        {/* Yellow Star Badge ONLY when favorited */}
                                        {isFav && (
                                            <button
                                                onClick={(e) => toggleFavorite(file.id, e)}
                                                className="p-0.5 transition-transform active:scale-90 cursor-pointer"
                                                title="Remove from Favorites"
                                            >
                                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Hover Action Buttons: Separate individual buttons without shared pill capsule */}
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className={clsx(
                                            "transition-opacity flex items-center gap-1.5",
                                            openMenuFileId === file.id ? "opacity-100 z-[99999]" : "opacity-0 group-hover:opacity-100"
                                        )}
                                    >
                                        <button
                                            onClick={() => alert(`Downloading ${file.name} to local device...`)}
                                            className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 transition-all cursor-pointer"
                                            title="Download File"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>

                                        {/* More Dropdown Button */}
                                        <button
                                            onClick={(e) => handleOpenMenu(file, e)}
                                            className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 transition-all cursor-pointer"
                                            title="More Actions"
                                        >
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* File Icon + Middle Truncated Name + Size */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${badge.bgColor}`}>
                                        {badge.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4
                                            className="text-[13px] font-bold text-neutral-900 dark:text-white font-mono leading-tight whitespace-nowrap group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                                            title={file.name}
                                        >
                                            {truncatedName}
                                        </h4>
                                        <p className="text-[11px] font-mono font-semibold text-neutral-600 dark:text-neutral-300 mt-0.5">
                                            {file.size}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer: Uploaded By & Date */}
                                <div className="pt-1.5 flex items-center justify-between gap-2 text-[11px]">
                                    <span className="text-neutral-600 dark:text-neutral-300 font-medium truncate">
                                        {file.uploadedBy} · {file.uploadedAt}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TABLE VIEW MODE */}
            {viewMode === "table" && filteredFiles.length > 0 && (
                <div className="rounded-[24px] bg-white dark:bg-neutral-900 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-900/50 select-none">
                                    <th className="py-3 px-4 w-10 text-center">
                                        <button onClick={toggleSelectAll}>
                                            {isAllSelected ? (
                                                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            ) : (
                                                <Square className="w-4 h-4 text-neutral-400" />
                                            )}
                                        </button>
                                    </th>

                                    {/* FILE NAME HEADER */}
                                    <th
                                        onClick={() => handleTableSort("name")}
                                        className="py-3 px-4 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className={clsx(sortKey === "name" && "text-blue-600 dark:text-blue-400 font-extrabold")}>
                                                File Name
                                            </span>
                                            {sortKey === "name" && (
                                                sortOrder === "asc" ? (
                                                    <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                                                ) : (
                                                    <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                                                )
                                            )}
                                        </div>
                                    </th>

                                    {/* SIZE HEADER */}
                                    <th
                                        onClick={() => handleTableSort("size")}
                                        className="py-3 px-4 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className={clsx(sortKey === "size" && "text-blue-600 dark:text-blue-400 font-extrabold")}>
                                                Size
                                            </span>
                                            {sortKey === "size" && (
                                                sortOrder === "asc" ? (
                                                    <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                                                ) : (
                                                    <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                                                )
                                            )}
                                        </div>
                                    </th>

                                    {/* UPLOADED BY HEADER */}
                                    <th
                                        onClick={() => handleTableSort("uploadedBy")}
                                        className="py-3 px-4 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className={clsx(sortKey === "uploadedBy" && "text-blue-600 dark:text-blue-400 font-extrabold")}>
                                                Uploaded By
                                            </span>
                                            {sortKey === "uploadedBy" && (
                                                sortOrder === "asc" ? (
                                                    <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                                                ) : (
                                                    <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                                                )
                                            )}
                                        </div>
                                    </th>

                                    {/* DATE HEADER */}
                                    <th
                                        onClick={() => handleTableSort("date")}
                                        className="py-3 px-4 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className={clsx(sortKey === "date" && "text-blue-600 dark:text-blue-400 font-extrabold")}>
                                                Date
                                            </span>
                                            {sortKey === "date" && (
                                                sortOrder === "asc" ? (
                                                    <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                                                ) : (
                                                    <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                                                )
                                            )}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-[12px]">
                                {filteredFiles.map((file, index) => {
                                    const badge = getFileBadge(file.type, "sm");
                                    const truncatedName = middleTruncate(file.name, 35);
                                    const isSelected = selectedFileIds.includes(file.id);
                                    const isActiveDetail = selectedFileId === file.id;
                                    const isFav = favoritedFileIds.includes(file.id);
                                    const isNearBottom = index >= filteredFiles.length - 2;

                                    return (
                                        <tr
                                            key={file.id}
                                            onClick={() => onSelectFile && onSelectFile(file)}
                                            className={clsx(
                                                "group relative transition-all duration-200 cursor-pointer select-none",
                                                isActiveDetail || isSelected
                                                    ? "bg-blue-50/80 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold"
                                                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
                                            )}
                                        >
                                            <td className="py-3.5 px-4 text-center">
                                                <button onClick={(e) => toggleSelectFile(file.id, e)}>
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-neutral-400" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-white max-w-xs whitespace-nowrap">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-7 h-7 rounded-[11px] flex items-center justify-center shrink-0 border ${badge.bgColor}`}>
                                                        {badge.icon}
                                                    </div>
                                                    <span title={file.name}>{truncatedName}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-neutral-500 dark:text-neutral-400">{file.size}</td>
                                            <td className="py-3.5 px-4 font-medium text-neutral-700 dark:text-neutral-300">{file.uploadedBy}</td>
                                            <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400 relative pr-12">
                                                <div className="flex items-center justify-between gap-2 pr-2">
                                                    <span>{file.uploadedAt}</span>
                                                    {isFav && (
                                                        <button
                                                            onClick={(e) => toggleFavorite(file.id, e)}
                                                            className="p-0.5 hover:scale-110 transition-transform cursor-pointer shrink-0"
                                                            title="Remove Favorite"
                                                        >
                                                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Floating Hover Action Buttons on right of row */}
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={clsx(
                                                        "absolute right-3 top-1/2 -translate-y-1/2 transition-opacity flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-sm",
                                                        openMenuFileId === file.id ? "opacity-100 z-[99999]" : "opacity-0 group-hover:opacity-100 z-10"
                                                    )}
                                                >
                                                    {/* ⭐ Favorite Star Button - ONLY APPEARS IF ADDED TO FAV */}
                                                    {isFav && (
                                                        <button
                                                            onClick={(e) => toggleFavorite(file.id, e)}
                                                            className="w-7 h-7 rounded-full hover:bg-amber-500/10 text-amber-400 transition-all flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95"
                                                            title="Remove from Favorites"
                                                        >
                                                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => alert(`Downloading ${file.name} to local device...`)}
                                                        className="w-7 h-7 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 transition-colors flex items-center justify-center cursor-pointer"
                                                        title="Download File"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleOpenMenu(file, e)}
                                                        className="w-7 h-7 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 transition-colors flex items-center justify-center cursor-pointer"
                                                        title="More Actions"
                                                    >
                                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =========================================================================
                PUBLIC LINK DRIVE SHARE SETTINGS MODAL (GOOGLE DRIVE STYLE)
            ========================================================================= */}
            {shareModalFile && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 text-neutral-900 dark:text-white"
                    onClick={() => setShareModalFile(null)}
                >
                    <div
                        className="w-full max-w-md rounded-[28px] bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Bar */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold">Public File Drive Portal</h4>
                                    <p className="text-[11px] text-neutral-400">Shareable Cloud Link</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShareModalFile(null)}
                                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* File Card Box */}
                        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                {shareModalFile.type.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold font-mono text-neutral-900 dark:text-white truncate">
                                    {shareModalFile.name}
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono">
                                    {shareModalFile.size} · Uploaded by {shareModalFile.uploadedBy}
                                </div>
                            </div>
                        </div>

                        {/* General Access Permission Pill */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                General Access Permission
                            </label>
                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                        Anyone with the link can view & download
                                    </div>
                                    <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                                        No login required · Public guest preview mode
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Share Link Input Box */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                Copy Public Drive Link
                            </label>
                            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                                <input
                                    type="text"
                                    readOnly
                                    value={`https://adidaya.studio/share/${shareModalFile.id}?token=pub_${shareModalFile.id}`}
                                    className="flex-1 px-2.5 text-xs font-mono bg-transparent text-neutral-800 dark:text-neutral-200 outline-none select-all truncate"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://adidaya.studio/share/${shareModalFile.id}?token=pub_${shareModalFile.id}`);
                                        setCopiedShareLink(true);
                                        setTimeout(() => setCopiedShareLink(false), 2000);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                >
                                    {copiedShareLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedShareLink ? "Copied!" : "Copy"}</span>
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons: Test Public Portal View */}
                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                onClick={() => setIsPublicPortalOpen(true)}
                                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>Preview Public Drive Portal (No Login View)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                REACT PORTAL: PUBLIC DRIVE PORTAL PREVIEW (SIMULATES WHAT GUESTS SEE)
            ========================================================================= */}
            {mounted && isPublicPortalOpen && shareModalFile && createPortal(
                <div className="fixed inset-0 z-[99999] bg-neutral-950/95 backdrop-blur-2xl flex flex-col justify-between animate-in fade-in duration-300 text-white">
                    {/* Public Header Bar */}
                    <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center font-mono shadow-md">
                                AD
                            </div>
                            <div>
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <span>Adidaya Studio Cloud Drive</span>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        Public Guest Access
                                    </span>
                                </h4>
                                <p className="text-[11px] text-neutral-400">
                                    File: {shareModalFile.name} ({shareModalFile.size}) · Uploaded by {shareModalFile.uploadedBy}
                                </p>
                            </div>
                        </div>

                        {/* Top Download & Close */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => alert(`Downloading ${shareModalFile.name} from Public Drive...`)}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download File ({shareModalFile.size})</span>
                            </button>
                            <button
                                onClick={() => setIsPublicPortalOpen(false)}
                                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                                title="Close Public Drive Preview"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Guest Preview Workspace */}
                    <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-center">
                        <div className="w-full max-w-2xl p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                                <FileText className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold font-mono text-white leading-tight">
                                    {shareModalFile.name}
                                </h3>
                                <p className="text-xs text-neutral-400">
                                    Shared via Adidaya Studio Public Drive · No login required to download
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 w-full max-w-sm flex justify-around text-xs font-mono">
                                <div><div className="text-neutral-500 text-[10px]">FILE SIZE</div><div className="font-bold">{shareModalFile.size}</div></div>
                                <div className="border-r border-neutral-700" />
                                <div><div className="text-neutral-500 text-[10px]">FORMAT</div><div className="font-bold">{shareModalFile.type.toUpperCase()}</div></div>
                                <div className="border-r border-neutral-700" />
                                <div><div className="text-neutral-500 text-[10px]">STATUS</div><div className="font-bold text-emerald-400">Public</div></div>
                            </div>

                            <button
                                onClick={() => alert(`Downloading ${shareModalFile.name} from Public Drive...`)}
                                className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 shadow-xl transition-all cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download Original File</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* REACT PORTAL MODAL 3: RENAME FILE DIALOG */}
            {mounted && renameModalFile && createPortal(
                <div
                    className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setRenameModalFile(null)}
                >
                    <div
                        className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white/60 dark:border-neutral-700/50 rounded-[28px] p-6 max-w-sm w-full space-y-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-1">
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Pencil className="w-4 h-4" />
                                </div>
                                <span>Rename File</span>
                            </h4>
                            <button
                                onClick={() => setRenameModalFile(null)}
                                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-400 uppercase tracking-widest">
                                File Name
                            </label>
                            <div className="flex items-center gap-2 p-1.5 pl-3.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                <input
                                    type="text"
                                    value={renameBaseInput}
                                    onChange={(e) => setRenameBaseInput(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-xs font-mono font-bold text-neutral-900 dark:text-white"
                                    autoFocus
                                />
                                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-200/90 dark:bg-neutral-700/90 text-neutral-700 dark:text-neutral-200 border border-neutral-300/40 dark:border-neutral-600/40 shadow-xs select-none shrink-0">
                                    {splitFileName(renameModalFile.name).extension}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setRenameModalFile(null)}
                                className="flex-1 py-3 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (renameBaseInput.trim()) {
                                        const ext = splitFileName(renameModalFile.name).extension;
                                        const fullNewName = `${renameBaseInput.trim()}${ext}`;
                                        handleRenameFile(renameModalFile.id, fullNewName);
                                    }
                                    setRenameModalFile(null);
                                }}
                                className="flex-1 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Save Rename
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* REACT PORTAL MODAL 4: DELETE FILE CONFIRMATION DIALOG */}
            {mounted && deleteConfirmFile && createPortal(
                <div
                    className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setDeleteConfirmFile(null)}
                >
                    <div
                        className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white/60 dark:border-neutral-700/50 rounded-[28px] p-6 max-w-sm w-full space-y-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <div className="text-center space-y-1.5">
                            <h4 className="text-base font-extrabold text-neutral-900 dark:text-white">Delete File?</h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                Are you sure you want to delete <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{deleteConfirmFile.name}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setDeleteConfirmFile(null)}
                                className="flex-1 py-3 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (onDeleteFileProp) onDeleteFileProp(deleteConfirmFile.id);
                                    if (!deletedFileIds.includes(deleteConfirmFile.id)) {
                                        setInternalDeletedFileIds(prev => [...prev, deleteConfirmFile.id]);
                                    }
                                    setDeleteConfirmFile(null);
                                    if (selectedFileId === deleteConfirmFile.id && onSelectFile) {
                                        onSelectFile(null as any);
                                    }
                                }}
                                className="flex-1 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Delete File
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* REACT PORTAL 5: FILE ACTIONS DROPDOWN POPOVER MENU */}
            {mounted && activeMenuState && createPortal(
                <>
                    {/* Transparent Click-Outside Backdrop */}
                    <div
                        className="fixed inset-0 z-[999998]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuState(null);
                            setOpenMenuFileId(null);
                        }}
                    />
                    <div
                        style={{
                            position: "fixed",
                            top: activeMenuState.top,
                            left: activeMenuState.left,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="z-[999999] w-44 p-1.5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-neutral-200/90 dark:border-neutral-800/90 shadow-lg shadow-black/5 space-y-0.5 text-left text-[11px] font-medium animate-in fade-in zoom-in-95 duration-150 select-none"
                    >
                        {/* Share Option */}
                        <button
                            onClick={() => {
                                setShareModalFile(activeMenuState.file);
                                setActiveMenuState(null);
                                setOpenMenuFileId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer transition-colors"
                        >
                            <Share2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                            <span>Share</span>
                        </button>

                        {/* Rename Option */}
                        <button
                            onClick={() => {
                                const { baseName } = splitFileName(activeMenuState.file.name);
                                setRenameBaseInput(baseName);
                                setRenameModalFile(activeMenuState.file);
                                setActiveMenuState(null);
                                setOpenMenuFileId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer transition-colors"
                        >
                            <Pencil className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                            <span>Rename</span>
                        </button>

                        {/* Favorite Toggle Option */}
                        <button
                            onClick={() => {
                                toggleFavorite(activeMenuState.file.id);
                                setActiveMenuState(null);
                                setOpenMenuFileId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer transition-colors"
                        >
                            <Star className={clsx("w-3.5 h-3.5", favoritedFileIds.includes(activeMenuState.file.id) ? "text-amber-400 fill-amber-400" : "text-neutral-500 dark:text-neutral-400")} />
                            <span>{favoritedFileIds.includes(activeMenuState.file.id) ? "Remove Favorite" : "Add to Favorites"}</span>
                        </button>

                        {/* Delete Option */}
                        <button
                            onClick={() => {
                                setDeleteConfirmFile(activeMenuState.file);
                                setActiveMenuState(null);
                                setOpenMenuFileId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-500/10 text-rose-500 font-semibold cursor-pointer transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete</span>
                        </button>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
