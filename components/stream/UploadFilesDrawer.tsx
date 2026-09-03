"use client";

import React, { useState, useRef } from "react";
import {
    X,
    Upload,
    FileCode,
    FileText,
    Box,
    Image as ImageIcon,
    FileSpreadsheet,
    Presentation,
    Video,
    FileCheck,
    Check,
    Loader2,
    Trash2,
    Plus,
} from "lucide-react";
import clsx from "clsx";
import type { ProjectFileItem } from "./ProjectFilesTab";
import { uploadProjectFile, getProjectFileSignedUrl } from "@/lib/api/storage";
import { supabase } from "@/lib/supabaseClient";

interface UploadFilesDrawerProps {
    channelCode: string;
    channelName: string;
    onClose: () => void;
    onUploadSuccess: (newFiles: ProjectFileItem[]) => void;
}

export function detectFileType(fileName: string): {
    type: ProjectFileItem["type"];
    typeName: string;
} {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["dwg", "dxf"].includes(ext)) {
        return { type: "dwg", typeName: "AutoCAD Drawing" };
    }
    if (["skp"].includes(ext)) {
        return { type: "skp", typeName: "SketchUp 3D Model" };
    }
    if (["pln"].includes(ext)) {
        return { type: "pln", typeName: "Archicad BIM Model" };
    }
    if (["pdf"].includes(ext)) {
        return { type: "pdf", typeName: "PDF Document" };
    }
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
        return { type: "image", typeName: "Image File" };
    }
    if (["xlsx", "xls", "csv"].includes(ext)) {
        return { type: "excel", typeName: ext === "csv" ? "CSV Spreadsheet" : "Excel Spreadsheet" };
    }
    if (["docx", "doc"].includes(ext)) {
        return { type: "word", typeName: "Word Document" };
    }
    if (["pptx", "ppt"].includes(ext)) {
        return { type: "ppt", typeName: "PowerPoint Presentation" };
    }
    if (["mp4", "mov", "webm", "mkv"].includes(ext)) {
        return { type: "video", typeName: "MP4 Video" };
    }
    return { type: "other", typeName: "Project Document" };
}

export function getFileBadgeIcon(type: ProjectFileItem["type"]) {
    switch (type) {
        case "dwg":
            return {
                icon: <FileCode className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
                bgColor: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
            };
        case "pdf":
            return {
                icon: <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
                bgColor: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
            };
        case "skp":
            return {
                icon: <Box className="w-5 h-5 text-blue-700 dark:text-blue-500" />,
                bgColor: "bg-blue-600/10 dark:bg-blue-600/20 border-blue-600/20",
            };
        case "pln":
            return {
                icon: <Box className="w-5 h-5 text-sky-500 dark:text-sky-400" />,
                bgColor: "bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20",
            };
        case "image":
            return {
                icon: <ImageIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
                bgColor: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20",
            };
        case "excel":
            return {
                icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
                bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
            };
        case "word":
            return {
                icon: <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
                bgColor: "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20",
            };
        case "ppt":
            return {
                icon: <Presentation className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
                bgColor: "bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20",
            };
        case "video":
            return {
                icon: <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
                bgColor: "bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20",
            };
        default:
            return {
                icon: <FileCheck className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />,
                bgColor: "bg-neutral-500/10 dark:bg-neutral-500/20 border-neutral-500/20",
            };
    }
}

export default function UploadFilesDrawer({
    channelCode,
    channelName,
    onClose,
    onUploadSuccess,
}: UploadFilesDrawerProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgressText, setUploadProgressText] = useState("");
    const [currentUserName, setCurrentUserName] = useState<string>("You");
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        async function fetchUser() {
            try {
                const { data } = await supabase.auth.getUser();
                if (data?.user) {
                    const meta = data.user.user_metadata;
                    let resolvedName = meta?.full_name || meta?.nickname || meta?.name;

                    if (!resolvedName || resolvedName.toLowerCase() === "admin") {
                        try {
                            const { data: profile } = await supabase
                                .from("profiles")
                                .select("full_name, nickname")
                                .eq("id", data.user.id)
                                .maybeSingle();

                            if (profile?.full_name) resolvedName = profile.full_name;
                            else if (profile?.nickname) resolvedName = profile.nickname;
                        } catch {
                            // ignore
                        }
                    }

                    if (!resolvedName) {
                        resolvedName = data.user.email ? data.user.email.split("@")[0] : "Admin";
                    }

                    if (resolvedName) {
                        // Capitalize nicely
                        const formatted = resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1);
                        setCurrentUserName(formatted);
                    }
                }
            } catch (err) {
                console.error("Error detecting active user:", err);
            }
        }
        fetchUser();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            setSelectedFiles((prev) => [...prev, ...filesArray]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const filesArray = Array.from(e.dataTransfer.files);
            setSelectedFiles((prev) => [...prev, ...filesArray]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleStartUpload = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);

        const uploadedItems: ProjectFileItem[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            setUploadProgressText("Uploading...");

            const { type, typeName } = detectFileType(file.name);
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";
            const storagePath = `channels/${channelCode}/${Date.now()}_${file.name}`;

            // Upload to Supabase Storage bucket with silent fallback if bucket doesn't exist
            let fileUrl: string | undefined = undefined;
            try {
                const pathResult = await uploadProjectFile(file, storagePath).catch(() => null);
                if (pathResult) {
                    const signed = await getProjectFileSignedUrl(pathResult).catch(() => null);
                    if (signed) fileUrl = signed;
                }
            } catch {
                // Ignore bucket missing errors gracefully
            }

            // Fallback to Object URL for instant real file preview
            if (!fileUrl) {
                try {
                    fileUrl = URL.createObjectURL(file);
                } catch (e) {
                    console.warn("Blob URL creation error:", e);
                }
            }

            const newItem: ProjectFileItem = {
                id: `proj-file-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                size: sizeMb,
                type,
                typeName,
                uploadedBy: currentUserName,
                uploadedAt: "Just now",
                source: "manual",
                url: fileUrl,
            };

            uploadedItems.push(newItem);
        }

        setIsUploading(false);
        onUploadSuccess(uploadedItems);
    };

    return (
        <div className="h-full flex flex-col justify-between p-5 text-neutral-900 dark:text-white bg-white dark:bg-neutral-900 animate-in slide-in-from-right-4 duration-200 overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <Upload className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Upload Project Files</h3>
                        <p className="text-[11px] text-neutral-400 font-mono">Channel #{channelCode} · {channelName}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Dropzone & Staging Area */}
            <div className="my-4 space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Drag & Drop Target Box */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={clsx(
                        "rounded-[24px] border-2 border-dashed transition-all cursor-pointer text-center space-y-2 flex flex-col items-center justify-center shrink-0",
                        selectedFiles.length > 0 ? "p-3.5 min-h-[90px]" : "p-6 min-h-[150px]",
                        isDragging
                            ? "border-blue-500 bg-blue-500/10 scale-[0.99]"
                            : "border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/70 hover:border-blue-400/60"
                    )}
                >
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <div className={clsx("rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs border border-blue-500/20", selectedFiles.length > 0 ? "w-8 h-8" : "w-11 h-11")}>
                        <Upload className={clsx(selectedFiles.length > 0 ? "w-4 h-4" : "w-5 h-5")} />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            Drag & drop files here, or <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
                        </p>
                        <p className="text-[10px] text-neutral-400 font-mono">
                            Supports dwg, skp, pln, pdf, images & documents
                        </p>
                    </div>
                </div>

                {/* Staging Selected Files List */}
                {selectedFiles.length > 0 && (
                    <div className="space-y-2 flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1 shrink-0">
                            <span>Selected Files ({selectedFiles.length})</span>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="py-1 px-3 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-normal flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Add More</span>
                            </button>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide pr-1 min-h-0">
                            {selectedFiles.map((file, index) => {
                                const { type, typeName } = detectFileType(file.name);
                                const badge = getFileBadgeIcon(type);
                                const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";

                                return (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="p-3 rounded-[20px] bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between gap-3 shadow-xs group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 border ${badge.bgColor}`}>
                                                {badge.icon}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-neutral-900 dark:text-white font-mono truncate" title={file.name}>
                                                    {file.name}
                                                </h4>
                                                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                                    {sizeMb} · {typeName} · Uploaded by {currentUserName}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="p-1.5 rounded-full text-neutral-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                                            title="Remove File"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Action Footer: 1 Row Side-by-Side (Cancel & Upload) */}
            <div className="pt-2 flex items-center gap-3 shrink-0">
                <button
                    onClick={onClose}
                    disabled={isUploading}
                    className="w-1/3 py-3 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium transition-colors cursor-pointer text-center"
                >
                    Cancel
                </button>
                <button
                    disabled={selectedFiles.length === 0 || isUploading}
                    onClick={handleStartUpload}
                    className={clsx(
                        "w-2/3 py-3 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer truncate",
                        selectedFiles.length === 0 || isUploading
                            ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed shadow-none"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 active:scale-95"
                    )}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                            <span className="truncate">{uploadProgressText}</span>
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 shrink-0" />
                            <span className="truncate">
                                {selectedFiles.length === 0
                                    ? "Select Files"
                                    : `Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? "File" : "Files"}`}
                            </span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
