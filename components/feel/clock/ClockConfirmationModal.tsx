"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle2, MessageSquare, Trash2, Ban } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import clsx from "clsx";

interface ClockConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => Promise<void>;
    title: string;
    description: string;
    variant?: "default" | "danger" | "warning" | "success";
    requireReason?: boolean;
    confirmText?: string;
    cancelText?: string;

    // Correction Props
    enableCorrection?: boolean;
    initialStartTime?: string;
    initialEndTime?: string;
}

export function ClockConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    variant = "default",
    requireReason = false,
    confirmText = "Confirm",
    cancelText = "Cancel",
    enableCorrection = false,
    initialStartTime,
    initialEndTime
}: ClockConfirmationModalProps) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    // Correction state
    const [startTime, setStartTime] = useState(initialStartTime || "");
    const [endTime, setEndTime] = useState(initialEndTime || "");

    useEffect(() => {
        if (isOpen) {
            setStartTime(initialStartTime || "");
            setEndTime(initialEndTime || "");
        }
    }, [isOpen, initialStartTime, initialEndTime]);

    if (!isOpen) return null;

    // DEBUG
    console.log("Modal Open. Props:", { initialStartTime, initialEndTime, enableCorrection });

    const handleConfirm = async () => {
        if (requireReason && !reason.trim()) return;
        setLoading(true);
        try {
            // Pass correction data if enabled, otherwise just reason
            if (enableCorrection) {
                // We pass a composite object or arguments depending on how the parent expects it.
                // However, the parent callback `onConfirm` currently expects `(reason?: string)`.
                // We should probably update the parent to handle this, OR pass it as part of the reason argument?
                // Ideally onConfirm should accept dynamic args, but let's cast it in the parent.
                // Actually, let's update the interface to allow passing correction data.
                // But to keep it simple and type-safe for existing usages, let's pass it as a second arg if the handler supports it.
                // CAUTION: onConfirm is defined as `(reason?: string) => Promise<void>`.
                // We need to cast or update the type.

                // Let's assume the parent will handle the arguments based on context.
                // We'll pass an object with everything.
                await (onConfirm as any)(reason, { approvedStartTime: startTime, approvedEndTime: endTime });
            } else {
                await onConfirm(reason);
            }

            setReason("");
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        default: {
            icon: <CheckCircle2 className="w-6 h-6 text-blue-600" />,
            header: "bg-blue-50/50",
            button: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
            border: "border-blue-100"
        },
        danger: {
            icon: <Trash2 className="w-6 h-6 text-rose-600" />,
            header: "bg-rose-50/50",
            button: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600",
            border: "border-rose-100"
        },
        warning: {
            icon: <Ban className="w-6 h-6 text-amber-600" />,
            header: "bg-amber-50/50",
            button: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500",
            border: "border-amber-100"
        },
        success: {
            icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
            header: "bg-emerald-50/50",
            button: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
            border: "border-emerald-100"
        }
    };

    const currentStyle = styles[variant];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-200">
                {/* Header */}
                <div className={clsx("px-6 py-4 border-b flex items-center justify-between", currentStyle.header, currentStyle.border)}>
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-full bg-white shadow-sm border", currentStyle.border)}>
                            {currentStyle.icon}
                        </div>
                        <h2 className="font-bold text-neutral-900 text-lg">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                        disabled={loading}
                    >
                        <X className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-neutral-600 leading-relaxed">
                        {description}
                    </p>

                    {/* Correction Inputs */}
                    {enableCorrection && (
                        <div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 text-sm text-blue-700 font-medium mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Correct Duration (Optional)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-600 mb-1 block">Start Time</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-neutral-600 mb-1 block">End Time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-blue-600/80">
                                Original: {initialStartTime?.slice(0, 5)} - {initialEndTime?.slice(0, 5)}
                            </p>
                        </div>
                    )}

                    {requireReason && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Reason (Required)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Please explain why..."
                                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent min-h-[100px] text-sm resize-none bg-neutral-50 focus:bg-white transition-all placeholder:text-neutral-400"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
                    <Button
                        variant="text"
                        onClick={onClose}
                        disabled={loading}
                        className="hover:bg-neutral-100 text-neutral-600"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || (requireReason && !reason.trim())}
                        className={clsx(
                            "min-w-[120px] transition-all shadow-sm font-bold",
                            currentStyle.button
                        )}
                    >
                        {loading ? "Processing..." : confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
