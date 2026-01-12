"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import clsx from "clsx";

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: "md" | "lg" | "xl";
}

export default function Drawer({ isOpen, onClose, title, children, width = "md" }: DrawerProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    if (!isOpen) return null;

    const widthClass = { md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl" }[width];

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

            {/* Drawer Panel */}
            <div className={clsx("absolute right-0 top-0 bottom-0 w-full bg-white shadow-2xl animate-in slide-in-from-right duration-300", widthClass)}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto h-[calc(100vh-73px)]">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Form Field Components
export function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}

export function FormInput({ placeholder, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input type={type} placeholder={placeholder} className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors" {...props} />;
}

export function FormTextarea({ placeholder, rows = 3, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea placeholder={placeholder} rows={rows} className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors resize-none" {...props} />;
}

export function FormSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors bg-white" {...props}>{children}</select>;
}

export function FormActions({ onCancel, submitLabel = "Save" }: { onCancel: () => void; submitLabel?: string }) {
    return (
        <div className="flex gap-3 pt-6 border-t border-neutral-200 mt-6">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700 transition-colors">{submitLabel}</button>
        </div>
    );
}
