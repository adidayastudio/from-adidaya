"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Download,
    Share2,
    Box,
    FileText,
    FileCode,
    FileSpreadsheet,
    Image as ImageIcon,
    FileCheck,
    Hash,
    ZoomIn,
    ZoomOut,
    Maximize2,
    ChevronLeft,
    ChevronRight,
    Printer,
    Star,
    Trash2,
    Pencil,
} from "lucide-react";
import clsx from "clsx";
import type { ProjectFileItem } from "./ProjectFilesTab";

interface ProjectFileDetailPanelProps {
    file: ProjectFileItem;
    onClose: () => void;
    channelCode: string;
    onDeleteFile?: (fileId: string) => void;
    onRenameFile?: (fileId: string, newName: string) => void;
    isFavorite?: boolean;
    onToggleFavorite?: (fileId: string) => void;
}

export default function ProjectFileDetailPanel({
    file,
    onClose,
    channelCode,
    onDeleteFile,
    onRenameFile,
    isFavorite: isFavoriteProp,
    onToggleFavorite,
}: ProjectFileDetailPanelProps) {
    const [copied, setCopied] = useState(false);
    const [isFavorite, setIsFavorite] = useState(isFavoriteProp ?? file.isFavorite ?? false);
    const [mounted, setMounted] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isFavoriteProp !== undefined) {
            setIsFavorite(isFavoriteProp);
        }
    }, [file.id, isFavoriteProp]);

    const handleToggleFav = () => {
        setIsFavorite(prev => !prev);
        if (onToggleFavorite) {
            onToggleFavorite(file.id);
        }
    };

    // Rename Modal State
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameBaseInput, setRenameBaseInput] = useState("");

    // Image Lightbox Modal State
    const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);

    // PDF Reader Modal State
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfZoom, setPdfZoom] = useState(100);

    const splitFileName = (fullName: string) => {
        const lastDotIndex = fullName.lastIndexOf(".");
        if (lastDotIndex <= 0) return { baseName: fullName, extension: "" };
        return {
            baseName: fullName.substring(0, lastDotIndex),
            extension: fullName.substring(lastDotIndex),
        };
    };

    // Mount check for Portal rendering
    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync isFavorite if file prop changes
    useEffect(() => {
        setIsFavorite(file.isFavorite ?? false);
    }, [file]);

    // Listen for Escape key to close modals instantly
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isImageLightboxOpen) setIsImageLightboxOpen(false);
                if (isPdfModalOpen) setIsPdfModalOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isImageLightboxOpen, isPdfModalOpen]);

    const isImageFile = file.type === "image" || /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name);
    const isPdfFile = file.type === "pdf" || /\.pdf$/i.test(file.name);

    // Real high-quality architectural construction site mockup photo
    const sampleImageUrl = (file.url && file.url.startsWith("http"))
        ? file.url
        : "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?q=80&w=1200&auto=format&fit=crop";

    const getFileBadge = (type: ProjectFileItem["type"]) => {
        switch (type) {
            case "dwg":
                return {
                    icon: <FileCode className="w-8 h-8 text-rose-600 dark:text-rose-400" />,
                    bgColor: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
                    label: "AutoCAD Drawing",
                    ext: "DWG",
                };
            case "pdf":
                return {
                    icon: <FileText className="w-8 h-8 text-rose-600 dark:text-rose-400" />,
                    bgColor: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
                    label: "PDF Document",
                    ext: "PDF",
                };
            case "skp":
                return {
                    icon: <Box className="w-8 h-8 text-blue-700 dark:text-blue-500" />,
                    bgColor: "bg-blue-600/10 dark:bg-blue-600/20 border-blue-600/20",
                    label: "SketchUp 3D Model",
                    ext: "SKP",
                };
            case "pln":
                return {
                    icon: <Box className="w-8 h-8 text-sky-500 dark:text-sky-400" />,
                    bgColor: "bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20",
                    label: "Archicad BIM Model",
                    ext: "PLN",
                };
            case "image":
                return {
                    icon: <ImageIcon className="w-8 h-8 text-amber-500 dark:text-amber-400" />,
                    bgColor: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20",
                    label: "Site Image",
                    ext: "PNG",
                };
            default:
                return {
                    icon: <FileCheck className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />,
                    bgColor: "bg-neutral-500/10 dark:bg-neutral-500/20 border-neutral-500/20",
                    label: "Document",
                    ext: "FILE",
                };
        }
    };

    const badge = getFileBadge(file.type);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-l border-neutral-200/50 dark:border-neutral-800/50 animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="p-4 border-b border-neutral-200/40 dark:border-neutral-800/40 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                    <span>File Details</span>
                </h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Close Panel"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
                {/* Filename, Uploader & Top Neutral Action Buttons */}
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                            <h4 className="text-sm font-bold font-mono text-neutral-900 dark:text-white leading-snug break-words">
                                {file.name}
                            </h4>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-300 font-medium">
                                {file.uploadedBy} · {file.uploadedAt}
                            </p>
                        </div>

                        {/* Top Neutral Action Icons (ONLY Favorite Star) */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={handleToggleFav}
                                className="p-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
                                title={isFavorite ? "Remove Favorite" : "Add to Favorites"}
                            >
                                <Star className={clsx("w-4 h-4 transition-colors", isFavorite ? "text-amber-400 fill-amber-400" : "text-neutral-400 hover:text-amber-400")} />
                            </button>
                        </div>
                    </div>

                    {/* =========================================================================
                        PREVIEW CONTAINER: IMAGE vs PDF vs STANDARD FILE BADGE
                    ========================================================================= */}

                    {/* 1. JPG / PNG IMAGE PREVIEW CARD (Only 1 Expand button in Top Right, No Text Badges) */}
                    {isImageFile ? (
                        <div className="group relative rounded-[20px] overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-900 cursor-pointer shadow-xs">
                            <img
                                src={sampleImageUrl}
                                alt={file.name}
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                                onClick={() => setIsImageLightboxOpen(true)}
                            />

                            {/* Top Right Expand Icon Button Only */}
                            <div className="absolute top-2.5 right-2.5">
                                <button
                                    onClick={() => setIsImageLightboxOpen(true)}
                                    className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer shadow-md"
                                    title="Expand Image Lightbox"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : isPdfFile ? (
                        /* 2. PDF PREVIEW CARD (Page count indicator left, Expand button right) */
                        <div className="rounded-[20px] bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 shadow-xs overflow-hidden flex flex-col">
                            {/* PDF Header: Page Count Left, Expand Button Right */}
                            <div className="p-2.5 bg-neutral-100/70 dark:bg-neutral-800/70 border-b border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md bg-neutral-200/80 dark:bg-neutral-700/80">
                                    3 pages
                                </span>
                                <button
                                    onClick={() => setIsPdfModalOpen(true)}
                                    className="p-1.5 rounded-lg bg-white dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer border border-neutral-300/40 dark:border-neutral-600/40"
                                    title="Expand PDF Fullscreen"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Scrollable PDF Document View with 3 Pages */}
                            <div className="h-56 overflow-y-auto px-4 py-3 bg-neutral-50 dark:bg-neutral-950 font-mono text-[11px] space-y-3 text-neutral-800 dark:text-neutral-200 border-t border-neutral-200/40 dark:border-neutral-800/40">
                                {/* Page 1 */}
                                <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
                                    <div className="flex justify-between items-center text-[9px] text-neutral-500 dark:text-neutral-300 font-bold border-b border-neutral-100 dark:border-neutral-800 pb-1">
                                        <span>ADIDAYA STUDIO · RAB SUMMARY</span>
                                        <span>PAGE 01 / 03</span>
                                    </div>
                                    <h5 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                                        # PROJECT COST ESTIMATE & SCHEDULE
                                    </h5>
                                    <p className="text-[10px] text-neutral-600 dark:text-neutral-300 leading-normal">
                                        Lokasi Pekerjaan: Rawamangun, Jakarta Timur.<br />
                                        Sub-Struktur: Pengecoran Plat Lantai 3 Sisi Utara & Balok TX-12.
                                    </p>
                                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 space-y-1 text-[10px]">
                                        <div className="flex justify-between"><span>Beton K-350</span><span className="font-bold">12 m³</span></div>
                                        <div className="flex justify-between"><span>Besi 12mm</span><span className="font-bold">45 Sak</span></div>
                                    </div>
                                </div>

                                {/* Page 2 */}
                                <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
                                    <div className="flex justify-between items-center text-[9px] text-neutral-500 dark:text-neutral-300 font-bold border-b border-neutral-100 dark:border-neutral-800 pb-1">
                                        <span>ADIDAYA STUDIO · STRUCTURAL SPEC</span>
                                        <span>PAGE 02 / 03</span>
                                    </div>
                                    <h5 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                                        # SPESIFIKASI TEKNIS PEMBESIAN
                                    </h5>
                                    <p className="text-[10px] text-neutral-600 dark:text-neutral-300 leading-normal">
                                        1. Jarak sengkang balok induk 100mm.<br />
                                        2. Ketebalan selimut beton pondasi min 40mm.<br />
                                        3. Pemancangan tiang pancang mini pile 25x25cm.
                                    </p>
                                </div>

                                {/* Page 3 */}
                                <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-2">
                                    <div className="flex justify-between items-center text-[9px] text-neutral-500 dark:text-neutral-300 font-bold border-b border-neutral-100 dark:border-neutral-800 pb-1">
                                        <span>ADIDAYA STUDIO · SIGNATURE & APPROVAL</span>
                                        <span>PAGE 03 / 03</span>
                                    </div>
                                    <h5 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                                        # PERSETUJUAN DIREKSI PEKERJAAN
                                    </h5>
                                    <p className="text-[10px] text-neutral-600 dark:text-neutral-300 leading-normal">
                                        Disetujui oleh: Project Manager Dian Rahma & Site Engineer Hendra Kusuma.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* 3. STANDARD FILE BADGE BOX (SketchUp, DWG, Excel, Archicad) */
                        <div className="p-6 rounded-[20px] bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
                            <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center border ${badge.bgColor}`}>
                                {badge.icon}
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-700/80 text-neutral-700 dark:text-neutral-200 inline-block border border-neutral-300/40 dark:border-neutral-600/40">
                                    {badge.ext}
                                </div>
                                <p className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-200">
                                    {badge.label}
                                </p>
                                <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-300 font-medium">
                                    {file.size}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Shared In Section */}
                <div className="space-y-2 pt-2 border-t border-neutral-200/40 dark:border-neutral-800/40">
                    <h5 className="text-[11px] font-bold text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                        Shared In
                    </h5>
                    <div className="p-3 rounded-2xl bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/40 dark:border-neutral-700/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-mono text-xs font-bold">
                                <Hash className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                            </div>
                            <div>
                                <div className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                                    #{channelCode}
                                </div>
                                <div className="text-[10px] text-neutral-500 dark:text-neutral-300 font-medium">
                                    {file.source === "chat" ? "Shared in Chat Feed" : "Uploaded via Project Files"}
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono font-medium text-neutral-500 dark:text-neutral-300">
                            {file.uploadedAt}
                        </span>
                    </div>
                </div>

                {/* Bottom Action List: Download, Share, Add to Favorites, Delete */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-200/40 dark:border-neutral-800/40">
                    {/* 1. Download Original File */}
                    <button
                        onClick={() => alert(`Downloading ${file.name} to local device...`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                            <span>Download Original File</span>
                        </span>
                        <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-300 font-medium">{file.size}</span>
                    </button>

                    {/* 2. Share Link */}
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                            <span>{copied ? "Link Copied!" : "Share Link"}</span>
                        </span>
                    </button>

                    {/* 3. Add to Favorites / Remove Favorite */}
                    <button
                        onClick={handleToggleFav}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Star className={clsx("w-4 h-4 transition-colors", isFavorite ? "text-amber-400 fill-amber-400" : "text-neutral-600 dark:text-neutral-300")} />
                            <span>{isFavorite ? "Remove Favorite" : "Add to Favorites"}</span>
                        </span>
                    </button>

                    {/* 4. Rename File */}
                    <button
                        onClick={() => {
                            const { baseName } = splitFileName(file.name);
                            setRenameBaseInput(baseName);
                            setShowRenameModal(true);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                            <span>Rename File</span>
                        </span>
                    </button>

                    {/* 5. Delete File */}
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-500 text-xs font-medium transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            <span>Delete File</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Rename File Modal */}
            {showRenameModal && mounted && createPortal(
                <div
                    className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setShowRenameModal(false)}
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
                                onClick={() => setShowRenameModal(false)}
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
                                    {splitFileName(file.name).extension}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setShowRenameModal(false)}
                                className="flex-1 py-3 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (renameBaseInput.trim()) {
                                        const ext = splitFileName(file.name).extension;
                                        const fullNewName = `${renameBaseInput.trim()}${ext}`;
                                        if (onRenameFile) onRenameFile(file.id, fullNewName);
                                        file.name = fullNewName;
                                    }
                                    setShowRenameModal(false);
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

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && mounted && createPortal(
                <div
                    className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setShowDeleteConfirm(false)}
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
                                Are you sure you want to delete <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{file.name}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (onDeleteFile) onDeleteFile(file.id);
                                    setShowDeleteConfirm(false);
                                    onClose();
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

            {/* =========================================================================
                REACT PORTAL MODAL 1: FULL PAGE IMAGE LIGHTBOX
            ========================================================================= */}
            {mounted && isImageLightboxOpen && createPortal(
                <div
                    className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col justify-between animate-in fade-in duration-200"
                    onClick={() => setIsImageLightboxOpen(false)}
                >
                    {/* Lightbox Header Bar */}
                    <div
                        className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-white shrink-0 shadow-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <ImageIcon className="w-5 h-5 text-neutral-400 shrink-0" />
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold font-mono text-white truncate">{file.name}</h4>
                                <p className="text-[11px] text-neutral-400 truncate">{file.uploadedBy} · {file.uploadedAt}</p>
                            </div>
                        </div>

                        {/* Top Controls: Zoom Pill, Download, Sleek Esc button */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Zoom Controls Pill */}
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-800 border border-neutral-700">
                                <button
                                    onClick={() => setImageZoom(prev => Math.max(0.5, prev - 0.25))}
                                    className="p-1.5 rounded-lg hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-mono font-bold px-2 text-neutral-300 min-w-[48px] text-center">
                                    {Math.round(imageZoom * 100)}%
                                </span>
                                <button
                                    onClick={() => setImageZoom(prev => Math.min(3, prev + 0.25))}
                                    className="p-1.5 rounded-lg hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setImageZoom(1)}
                                    className="p-1.5 px-2 rounded-lg hover:bg-neutral-700 text-neutral-300 text-xs font-bold font-mono transition-colors cursor-pointer"
                                    title="Reset Zoom"
                                >
                                    Reset
                                </button>
                            </div>

                            <button
                                onClick={() => alert(`Downloading ${file.name} to local device...`)}
                                className="p-2 px-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-neutral-700"
                                title="Download Image"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                            </button>

                            {/* SLEEK NEUTRAL ESC BUTTON */}
                            <button
                                onClick={() => setIsImageLightboxOpen(false)}
                                className="px-3 py-1.5 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 border border-neutral-700/60 shadow-lg text-xs font-mono font-bold"
                                title="Close Fullscreen (Esc)"
                            >
                                <X className="w-4 h-4 text-neutral-300" />
                                <span className="text-[10px] uppercase bg-neutral-700/80 px-1.5 py-0.5 rounded text-neutral-400">Esc</span>
                            </button>
                        </div>
                    </div>

                    {/* Image Workspace */}
                    <div className="flex-1 overflow-auto flex items-center justify-center p-8 select-none">
                        <img
                            src={sampleImageUrl}
                            alt={file.name}
                            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10 object-contain mx-auto transition-transform duration-200"
                            style={{ transform: `scale(${imageZoom})` }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* =========================================================================
                REACT PORTAL MODAL 2: FULL PAGE PDF READER MODAL
            ========================================================================= */}
            {mounted && isPdfModalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[99999] bg-neutral-950/95 backdrop-blur-2xl flex flex-col justify-between animate-in fade-in duration-200 text-white"
                    onClick={() => setIsPdfModalOpen(false)}
                >
                    {/* PDF Header Bar */}
                    <div
                        className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0 shadow-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-neutral-400 shrink-0" />
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold font-mono text-white truncate">{file.name}</h4>
                                <p className="text-[11px] text-neutral-400 truncate">PDF Document · {file.size}</p>
                            </div>
                        </div>

                        {/* Navigation & Controls */}
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Page Controls */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const newPage = Math.max(1, pdfPage - 1);
                                        setPdfPage(newPage);
                                        const el = document.getElementById(`pdf-modal-page-${newPage}`);
                                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    disabled={pdfPage === 1}
                                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 transition-colors cursor-pointer"
                                    title="Previous Page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-mono font-bold">
                                    Page {pdfPage} of 3
                                </span>
                                <button
                                    onClick={() => {
                                        const newPage = Math.min(3, pdfPage + 1);
                                        setPdfPage(newPage);
                                        const el = document.getElementById(`pdf-modal-page-${newPage}`);
                                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    disabled={pdfPage === 3}
                                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 transition-colors cursor-pointer"
                                    title="Next Page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* PDF Zoom Controls Pill */}
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-800 border border-neutral-700">
                                <button
                                    onClick={() => setPdfZoom(prev => Math.max(50, prev - 25))}
                                    className="p-1.5 rounded-lg hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-mono font-bold px-2 text-neutral-300 min-w-[48px] text-center">
                                    {pdfZoom}%
                                </span>
                                <button
                                    onClick={() => setPdfZoom(prev => Math.min(200, prev + 25))}
                                    className="p-1.5 rounded-lg hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPdfZoom(100)}
                                    className="p-1.5 px-2 rounded-lg hover:bg-neutral-700 text-neutral-300 text-xs font-bold font-mono transition-colors cursor-pointer"
                                    title="Reset Zoom"
                                >
                                    Reset
                                </button>
                            </div>

                            <button
                                onClick={() => alert(`Downloading ${file.name} to local device...`)}
                                className="p-2 px-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-neutral-700"
                                title="Download PDF"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                            </button>

                            {/* SLEEK NEUTRAL ESC BUTTON */}
                            <button
                                onClick={() => setIsPdfModalOpen(false)}
                                className="px-3 py-1.5 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 border border-neutral-700/60 shadow-lg text-xs font-mono font-bold"
                                title="Close Fullscreen (Esc)"
                            >
                                <X className="w-4 h-4 text-neutral-300" />
                                <span className="text-[10px] uppercase bg-neutral-700/80 px-1.5 py-0.5 rounded text-neutral-400">Esc</span>
                            </button>
                        </div>
                    </div>

                    {/* PDF Full Workspace: Continuous Vertical Scroll for All Pages */}
                    <div
                        className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 bg-neutral-900/60 scrollbar-thin"
                        onClick={(e) => e.stopPropagation()}
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            const scrollRatio = target.scrollTop / (target.scrollHeight - target.clientHeight || 1);
                            if (scrollRatio < 0.35) setPdfPage(1);
                            else if (scrollRatio < 0.7) setPdfPage(2);
                            else setPdfPage(3);
                        }}
                        style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center" }}
                    >
                        {/* Page 1 */}
                        <div id="pdf-modal-page-1" className="w-full max-w-3xl p-10 rounded-2xl bg-white text-neutral-900 shadow-2xl border border-neutral-200 space-y-6 font-mono scroll-mt-6">
                            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 text-xs font-bold text-neutral-500">
                                <span>ADIDAYA STUDIO ARCHITECTURE</span>
                                <span>DOCUMENT #RAB-2026-08 · PAGE 01 / 03</span>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
                                    LAPORAN ANGGARAN & SPESIFIKASI PROYEK RAWAMANGUN
                                </h2>
                                <p className="text-xs text-neutral-500">
                                    Diterbitkan oleh: Team Finance & Site Engineer · Tanggal: 28 Agustus 2026
                                </p>
                            </div>

                            <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4 text-xs">
                                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-sm">
                                    1. RINGKASAN STRUKTUR UTAMA
                                </h4>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-200 text-neutral-500 text-[11px]">
                                            <th className="py-2">Item Pekerjaan</th>
                                            <th className="py-2">Volume</th>
                                            <th className="py-2">Harga Satuan</th>
                                            <th className="py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 text-[11px]">
                                        <tr>
                                            <td className="py-2">Pengecoran Plat Lt 3 Sisi Utara</td>
                                            <td className="py-2">12 m³</td>
                                            <td className="py-2">Rp 1.450.000</td>
                                            <td className="py-2 text-right font-bold">Rp 17.400.000</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2">Pembesian Besi Ulir 12mm</td>
                                            <td className="py-2">45 Sak</td>
                                            <td className="py-2">Rp 85.000</td>
                                            <td className="py-2 text-right font-bold">Rp 3.825.000</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Page 2 */}
                        <div id="pdf-modal-page-2" className="w-full max-w-3xl p-10 rounded-2xl bg-white text-neutral-900 shadow-2xl border border-neutral-200 space-y-6 font-mono scroll-mt-6">
                            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 text-xs font-bold text-neutral-500">
                                <span>ADIDAYA STUDIO ARCHITECTURE</span>
                                <span>DOCUMENT #RAB-2026-08 · PAGE 02 / 03</span>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                                    SPESIFIKASI TEKNIS PEMBESIAN & PENGUJIAN MUTU
                                </h2>
                                <p className="text-xs text-neutral-500">
                                    Standar Operasional Prosedur Lapangan
                                </p>
                            </div>

                            <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs leading-relaxed">
                                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-sm">
                                    2. METODE KERJA STRUCTURAL
                                </h4>
                                <ul className="list-disc pl-5 space-y-1.5 text-neutral-700">
                                    <li>Jarak sengkang balok induk 100mm pada area tumpuan dan 150mm pada area lapangan.</li>
                                    <li>Ketebalan selimut beton pondasi min 40mm untuk proteksi korosi lingkungan basah.</li>
                                    <li>Pemancangan tiang pancang mini pile 25x25cm dengan kedalaman keras 12 meter.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Page 3 */}
                        <div id="pdf-modal-page-3" className="w-full max-w-3xl p-10 rounded-2xl bg-white text-neutral-900 shadow-2xl border border-neutral-200 space-y-6 font-mono scroll-mt-6">
                            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 text-xs font-bold text-neutral-500">
                                <span>ADIDAYA STUDIO ARCHITECTURE</span>
                                <span>DOCUMENT #RAB-2026-08 · PAGE 03 / 03</span>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                                    PERSETUJUAN & OTORISASI SERTIFIKASI
                                </h2>
                            </div>

                            <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
                                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-sm">
                                    3. SERTIFIKASI HASIL UJI UTAK BETON
                                </h4>
                                <p className="text-neutral-700">
                                    Seluruh sampel beton K-350 telah melalui pengujian kuat tekan 28 hari di laboratorium terakreditasi KAN dengan nilai rata-rata 368 kg/cm².
                                </p>
                                <div className="pt-4 flex justify-between items-end text-neutral-600 border-t border-neutral-200">
                                    <div>
                                        <p className="font-bold">Project Manager</p>
                                        <p className="text-xs text-neutral-400 mt-8">Dian Rahma, S.T.</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">Site Engineer</p>
                                        <p className="text-xs text-neutral-400 mt-8">Hendra Kusuma, S.T.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
