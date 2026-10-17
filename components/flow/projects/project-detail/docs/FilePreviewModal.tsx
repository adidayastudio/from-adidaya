"use client";

import { useState, useEffect } from "react";
import { X, File, Download, Loader2, PlayCircle, Sheet, FileText } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { getProjectFileSignedUrl } from "@/lib/api/storage";

interface FilePreviewModalProps {
    open: boolean;
    onClose: () => void;
    file: {
        id: string;
        title: string;
        generatedName: string;
        type: string;
        version: string;
        storagePath?: string;
        url?: string;
    } | null;
}

export default function FilePreviewModal({ open, onClose, file }: FilePreviewModalProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch signed URL whenever file modal opens or changes
    useEffect(() => {
        if (open && file) {
            if (file.storagePath) {
                setIsLoading(true);
                getProjectFileSignedUrl(file.storagePath)
                    .then(url => setSignedUrl(url))
                    .catch(err => {
                        console.error("Failed to load signed URL:", err);
                        setSignedUrl(file.url || null);
                    })
                    .finally(() => setIsLoading(false));
            } else {
                setSignedUrl(file.url || null);
            }
        } else {
            setSignedUrl(null);
        }
    }, [open, file]);

    if (!file) return null;

    const fileNameLower = file.generatedName.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg"].some(ext => fileNameLower.endsWith(`.${ext}`)) || file.type === "VIZ";
    const isPdf = fileNameLower.endsWith(".pdf") || file.type === "CON";
    const isVideo = ["mp4", "webm", "ogg", "mov"].some(ext => fileNameLower.endsWith(`.${ext}`));
    const isExcel = ["xls", "xlsx", "csv"].some(ext => fileNameLower.endsWith(`.${ext}`)) || file.type === "RAB";
    const isWord = ["doc", "docx"].some(ext => fileNameLower.endsWith(`.${ext}`));

    const canPreview = isImage || isPdf || isVideo;

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500">
                            <File className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-neutral-900 leading-tight">{file.title}</h3>
                            <p className="text-xs text-neutral-500 font-mono">{file.generatedName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {signedUrl && (
                            <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
                                <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>
                                    Download
                                </Button>
                            </a>
                        )}
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                            <X className="w-5 h-5 text-neutral-500" />
                        </button>
                    </div>
                </div>

                {/* Content Panel */}
                <div className="flex-1 bg-neutral-100 overflow-auto flex items-center justify-center min-h-[450px] p-6 relative">
                    {isLoading ? (
                        <div className="text-center">
                            <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto mb-2" />
                            <p className="text-sm text-neutral-500">Loading document preview...</p>
                        </div>
                    ) : canPreview && signedUrl ? (
                        isImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={signedUrl} alt={file.title} className="max-w-full max-h-[70vh] rounded-lg shadow-sm object-contain" />
                        ) : isPdf ? (
                            <iframe 
                                src={`${signedUrl}#toolbar=0`} 
                                className="w-full h-[65vh] rounded-lg border border-neutral-200 bg-white" 
                                title={file.title}
                            />
                        ) : (
                            <video src={signedUrl} controls className="max-w-full max-h-[70vh] rounded-lg shadow-sm" />
                        )
                    ) : isExcel ? (
                        <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-neutral-200 max-w-md w-full">
                            <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 mx-auto flex items-center justify-center mb-4 border border-green-100">
                                <Sheet className="w-8 h-8" />
                            </div>
                            <h4 className="font-bold text-neutral-900 mb-1">Spreadsheet Preview</h4>
                            <p className="text-xs text-neutral-500 mb-6">
                                Spreadsheet preview is display-only. Please download the file to view and calculate formulas in Microsoft Excel or Google Sheets.
                            </p>
                            {signedUrl && (
                                <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
                                    <Button className="!bg-green-600 hover:!bg-green-700 !text-white" icon={<Download className="w-4 h-4" />}>
                                        Download Spreadsheet
                                    </Button>
                                </a>
                            )}
                        </div>
                    ) : isWord ? (
                        <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-neutral-200 max-w-md w-full">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4 border border-blue-100">
                                <FileText className="w-8 h-8" />
                            </div>
                            <h4 className="font-bold text-neutral-900 mb-1">Word Document</h4>
                            <p className="text-xs text-neutral-500 mb-6">
                                Microsoft Word previews are not fully rendering. You can download and edit this document in Word or Pages.
                            </p>
                            {signedUrl && (
                                <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
                                    <Button className="!bg-blue-600 hover:!bg-blue-700 !text-white" icon={<Download className="w-4 h-4" />}>
                                        Download Word File
                                    </Button>
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="text-center bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm max-w-md w-full">
                            <div className="w-16 h-16 rounded-2xl bg-neutral-100 mx-auto flex items-center justify-center mb-4 text-neutral-500">
                                <File className="w-8 h-8" />
                            </div>
                            <h4 className="font-bold text-neutral-900 mb-1">CAD Preview Not Supported</h4>
                            <p className="text-xs text-neutral-500 mb-6">
                                This file format ({file.type || file.generatedName.split('.').pop()?.toUpperCase()}) requires specialized local design tools like AutoCAD, SketchUp, or ArchiCAD.
                            </p>
                            {signedUrl && (
                                <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
                                    <Button icon={<Download className="w-4 h-4" />}>Download Design File</Button>
                                </a>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
