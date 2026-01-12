"use client";

import { X, File, Download } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

interface FilePreviewModalProps {
    open: boolean;
    onClose: () => void;
    file: {
        title: string;
        generatedName: string;
        type: string;
        version: string;
    } | null;
}

export default function FilePreviewModal({ open, onClose, file }: FilePreviewModalProps) {
    if (!file) return null;

    const isImage = file.type === "VIZ" || file.generatedName.endsWith(".jpg") || file.generatedName.endsWith(".png");
    const canPreview = isImage || file.generatedName.endsWith(".pdf");

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
                        <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>Download</Button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                            <X className="w-5 h-5 text-neutral-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-neutral-100 overflow-auto flex items-center justify-center min-h-[400px] p-8">
                    {canPreview ? (
                        isImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src="/placeholder-image" alt="Preview" className="max-w-full max-h-full rounded-lg shadow-sm" />
                        ) : (
                            <div className="w-full h-full bg-white rounded-lg shadow-sm flex items-center justify-center border border-neutral-200">
                                <p className="text-neutral-400">PDF Preview Placeholder</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-2xl bg-neutral-200 mx-auto flex items-center justify-center mb-4">
                                <File className="w-10 h-10 text-neutral-400" />
                            </div>
                            <h4 className="font-bold text-neutral-900 mb-1">No Preview Available</h4>
                            <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-4">
                                This file type ({file.type}) cannot be previewed in the browser. Please download it to view.
                            </p>
                            <Button variant="outline" icon={<Download className="w-4 h-4" />}>Download File</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
