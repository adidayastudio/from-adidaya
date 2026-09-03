"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
    Download,
    FileText,
    FileCode,
    FileSpreadsheet,
    Presentation,
    Video,
    Image as ImageIcon,
    Box,
    ExternalLink,
    Check,
    Share2,
} from "lucide-react";

interface SharedFileInfo {
    id: string;
    name: string;
    size: string;
    type: string;
    typeName: string;
    uploadedBy: string;
    uploadedAt: string;
    url: string;
}

export default function PublicSharePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const fileId = (params?.fileId as string) || "file";

    const [fileInfo, setFileInfo] = useState<SharedFileInfo | null>(null);
    const [copied, setCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        // 1. Try reading from searchParams first
        const paramName = searchParams.get("name");
        const paramUrl = searchParams.get("url");
        const paramSize = searchParams.get("size") || "0.5 MB";
        const paramType = searchParams.get("type") || "pdf";
        const paramUploader = searchParams.get("uploader") || "Adidaya Admin";
        const paramDate = searchParams.get("date") || "Just now";

        if (paramName && paramUrl) {
            setFileInfo({
                id: fileId,
                name: paramName,
                size: paramSize,
                type: paramType,
                typeName: paramType.toUpperCase(),
                uploadedBy: paramUploader,
                uploadedAt: paramDate,
                url: paramUrl,
            });
            return;
        }

        // 2. Try looking into localStorage if in browser
        if (typeof window !== "undefined") {
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith("adidaya_uploaded_files_")) {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            const list = JSON.parse(raw);
                            if (Array.isArray(list)) {
                                const found = list.find((f: any) => f.id === fileId);
                                if (found) {
                                    setFileInfo(found);
                                    return;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error searching localStorage for shared file:", e);
            }
        }

        // 3. Fallback state
        setFileInfo({
            id: fileId,
            name: paramName || "Document.pdf",
            size: paramSize,
            type: paramType,
            typeName: paramType.toUpperCase(),
            uploadedBy: paramUploader,
            uploadedAt: paramDate,
            url: paramUrl || "",
        });
    }, [fileId, searchParams]);

    const handleDownload = async () => {
        if (!fileInfo?.url) return;
        setIsDownloading(true);
        try {
            const res = await fetch(fileInfo.url);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = fileInfo.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(fileInfo.url, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCopyLink = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!fileInfo) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white font-mono text-sm">
                Loading public preview...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between selection:bg-blue-500 selection:text-white">
            {/* Header Bar */}
            <header className="p-4 bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-800 flex items-center justify-between shrink-0 shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300 border border-neutral-700/60 shrink-0">
                        {fileInfo.type === "pdf" ? (
                            <FileText className="w-5 h-5 text-rose-400" />
                        ) : fileInfo.type === "image" ? (
                            <ImageIcon className="w-5 h-5 text-blue-400" />
                        ) : fileInfo.type === "video" ? (
                            <Video className="w-5 h-5 text-purple-400" />
                        ) : fileInfo.type === "excel" ? (
                            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <FileCode className="w-5 h-5 text-amber-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold font-mono text-white truncate">{fileInfo.name}</h1>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30 shrink-0">
                                Public View
                            </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate font-mono">
                            {fileInfo.uploadedBy} · {fileInfo.uploadedAt} · {fileInfo.size}
                        </p>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={handleCopyLink}
                        className="p-2 px-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-neutral-700"
                        title="Copy Share Link"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                        <span>{copied ? "Copied" : "Share"}</span>
                    </button>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="p-2 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        title="Download Original File"
                    >
                        <Download className="w-4 h-4" />
                        <span>{isDownloading ? "Downloading..." : "Download"}</span>
                    </button>
                </div>
            </header>

            {/* Main Content Viewer */}
            <main className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-[calc(100vh-80px)] overflow-auto">
                {fileInfo.type === "image" ? (
                    <div className="flex items-center justify-center w-full h-full">
                        <img
                            src={fileInfo.url}
                            alt={fileInfo.name}
                            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-neutral-800"
                        />
                    </div>
                ) : fileInfo.type === "pdf" ? (
                    <div className="w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center">
                        {fileInfo.url ? (
                            <iframe
                                src={fileInfo.url}
                                className="w-full h-full rounded-2xl bg-white border-0 shadow-2xl"
                                title={fileInfo.name}
                            />
                        ) : (
                            <div className="w-full max-w-md p-8 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-4 shadow-2xl">
                                <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                                <h2 className="text-base font-bold font-mono text-white">{fileInfo.name}</h2>
                                <p className="text-xs text-neutral-400">PDF preview is not available directly.</p>
                            </div>
                        )}
                    </div>
                ) : fileInfo.type === "video" ? (
                    <div className="flex items-center justify-center w-full h-full">
                        <video
                            controls
                            autoPlay
                            src={fileInfo.url}
                            className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl border border-neutral-800"
                        />
                    </div>
                ) : (
                    /* Generic / CAD / Office Document Preview Card */
                    <div className="w-full max-w-lg p-8 rounded-[36px] bg-neutral-900 border border-neutral-800 flex flex-col items-center text-center space-y-6 shadow-2xl text-white">
                        <div className="w-20 h-20 rounded-[28px] bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center shadow-xl text-neutral-300">
                            {fileInfo.type === "skp" || fileInfo.type === "pln" ? (
                                <Box className="w-9 h-9 text-neutral-300" />
                            ) : fileInfo.type === "excel" ? (
                                <FileSpreadsheet className="w-9 h-9 text-emerald-400" />
                            ) : fileInfo.type === "word" ? (
                                <FileText className="w-9 h-9 text-blue-400" />
                            ) : fileInfo.type === "ppt" ? (
                                <Presentation className="w-9 h-9 text-orange-400" />
                            ) : (
                                <FileCode className="w-9 h-9 text-neutral-300" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 inline-block border border-neutral-700">
                                {fileInfo.type.toUpperCase()} DOCUMENT
                            </div>
                            <h2 className="text-lg font-bold text-white font-mono break-all px-4">{fileInfo.name}</h2>
                            <p className="text-xs text-neutral-400 font-mono">{fileInfo.typeName} · {fileInfo.size}</p>
                        </div>

                        <button
                            onClick={handleDownload}
                            className="w-full py-3.5 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download ({fileInfo.size})</span>
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
