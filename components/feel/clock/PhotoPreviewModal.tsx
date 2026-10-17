import React from "react";
import { X, Calendar, MapPin, Download } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

interface PhotoPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    photoUrl: string | null;
    userName?: string;
    date?: string;
}

export function PhotoPreviewModal({ isOpen, onClose, photoUrl, userName, date }: PhotoPreviewModalProps) {
    if (!isOpen || !photoUrl) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm z-[100] animate-in fade-in transition-all duration-300 ease-out" />
                <Dialog.Content 
                    className="fixed left-[50%] top-[50%] z-[110] flex w-full max-w-[95%] md:max-w-xl translate-x-[-50%] translate-y-[-50%] flex-col rounded-3xl bg-white shadow-2xl focus:outline-none overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 md:slide-in-from-bottom-0 duration-300 ease-out"
                    aria-describedby={undefined}
                >
                    <Dialog.Title className="sr-only">Photo Preview</Dialog.Title>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 pl-6 border-b border-neutral-100">
                        <div className="flex flex-col">
                            <h2 className="text-base font-bold text-neutral-900 leading-tight">Attendance Photo</h2>
                            {(userName || date) && (
                                <p className="text-xs font-medium text-neutral-500 mt-0.5">
                                    {userName} {userName && date && '•'} {date}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors active:scale-95"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Image Area */}
                    <div className="relative bg-neutral-100/50 flex items-center justify-center p-6 md:p-8 border-b border-neutral-100">
                        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={photoUrl} 
                                alt="Attendance Capture" 
                                className="w-full h-auto object-contain block"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://placehold.co/600x800?text=Photo+Not+Available`;
                                }}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-neutral-50 flex items-center justify-between">
                        <div className="text-xs text-neutral-500 font-medium px-2">
                            Watermark generated at capture time
                        </div>
                        <a 
                            href={photoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            download
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
                        >
                            <Download className="w-4 h-4 text-neutral-500" />
                            Download
                        </a>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
