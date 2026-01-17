import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    MapPin,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    X,
    Navigation,
    Clock as ClockIcon
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { useClockLocation } from "@/lib/clock/useClockLocation";
import { UserRole } from "@/hooks/useUserProfile";
import clsx from "clsx";

interface ClockActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "IN" | "OUT";
    userRole: UserRole;
    onConfirm: (metadata: any) => Promise<void>;
}

export default function ClockActionModal({
    isOpen,
    onClose,
    type,
    userRole,
    onConfirm
}: ClockActionModalProps) {
    const { userCoords, detection, loading, error, refresh } = useClockLocation();
    const [reason, setReason] = useState("");
    const [remoteMode, setRemoteMode] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // If not open or not mounted yet, render nothing
    if (!isOpen || !mounted) return null;

    const isOutside = detection?.status === "outside";
    const isUnknown = detection?.status === "unknown";

    // Role-based validation
    const isAdmin = userRole === "admin" || userRole === "superadmin" || userRole === "administrator";
    const isStaff = userRole === "staff" || userRole === "supervisor" || userRole === "pm" || userRole === "management";
    const isCrew = !isAdmin && !isStaff; // Simple fallback check

    // Logic for validation
    const needsRemoteMode = (isAdmin || isStaff) && isOutside;
    const needsReason = isStaff && isOutside;
    const isBlocked = isCrew && isOutside;

    const handleConfirm = async () => {
        if (isBlocked) return;
        if (needsRemoteMode && !remoteMode) return;
        if (needsReason && !reason.trim()) return;

        setSubmitting(true);
        try {
            const metadata = {
                latitude: userCoords?.latitude,
                longitude: userCoords?.longitude,
                accuracy: userCoords?.accuracy,
                detectedLocationId: detection?.location?.id,
                detectedLocationCode: detection?.location?.code,
                detectedLocationType: detection?.location?.type,
                distanceMeters: detection?.distance,
                locationStatus: detection?.status,
                overrideReason: reason || undefined,
                remoteMode: remoteMode || undefined
            };
            await onConfirm(metadata);
            // Reset state
            setReason("");
            setRemoteMode(null);
            onClose();
        } catch (err) {
            console.error("Clock action failed:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const remoteModes = [
        { id: "WFH", label: "WFH", color: "blue" as const },
        { id: "WFA", label: "WFA", color: "purple" as const },
        { id: "business_trip", label: "Business Trip", color: "orange" as const },
        { id: "other", label: "Other", color: "neutral" as const },
    ];

    const modeColors = {
        blue: {
            active: "bg-blue-600 border-blue-600 text-white shadow-blue-200",
            inactive: "hover:border-blue-200"
        },
        purple: {
            active: "bg-purple-600 border-purple-600 text-white shadow-purple-200",
            inactive: "hover:border-purple-200"
        },
        orange: {
            active: "bg-orange-600 border-orange-600 text-white shadow-orange-200",
            inactive: "hover:border-orange-200"
        },
        neutral: {
            active: "bg-neutral-900 border-neutral-900 text-white shadow-neutral-200",
            inactive: "hover:border-neutral-200"
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-200`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-neutral-600" />
                        <h2 className="font-bold text-neutral-900">
                            Confirm Clock {type}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-neutral-600 text-sm">
                        Are you sure you want to clock {type.toLowerCase()} now? The system will log your current location.
                    </p>

                    {/* Location Status Card */}
                    <div className={clsx(
                        "p-4 rounded-xl border flex flex-col gap-3",
                        loading ? "bg-neutral-50 border-neutral-200" :
                            isOutside ? "bg-amber-50 border-amber-200" :
                                isUnknown ? "bg-neutral-50 border-neutral-200" :
                                    "bg-emerald-50 border-emerald-200"
                    )}>
                        <div className="flex items-start gap-3">
                            {loading ? (
                                <Loader2 className="w-5 h-5 text-neutral-400 animate-spin mt-0.5" />
                            ) : isOutside ? (
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                            )}

                            <div className="flex-1">
                                <p className={clsx(
                                    "text-sm font-bold",
                                    loading ? "text-neutral-700" :
                                        isOutside ? "text-amber-900" :
                                            "text-emerald-900"
                                )}>
                                    {loading ? "Detecting location..." :
                                        isOutside ? "Outside registered area" :
                                            `Location detected: ${detection?.location?.code}`}
                                </p>
                                <p className={clsx(
                                    "text-xs mt-0.5",
                                    loading ? "text-neutral-500" :
                                        isOutside ? "text-amber-700" :
                                            "text-emerald-700"
                                )}>
                                    {loading ? "Verifying GPS coordinates..." :
                                        isOutside ? "You are not within any registered project or office area" :
                                            `${Math.round(detection?.distance || 0)} meters from ${detection?.location?.type}`}
                                </p>
                            </div>

                            {!loading && (
                                <button
                                    onClick={refresh}
                                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                                    title="Refresh location"
                                >
                                    <Navigation className="w-4 h-4 text-neutral-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* error message from geolocation */}
                    {error && (
                        <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-600 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            {error}
                        </div>
                    )}

                    {/* Remote Mode Selection (Outside only) */}
                    {needsRemoteMode && !loading && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                                Select Remote Mode
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {remoteModes.map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setRemoteMode(mode.id)}
                                        className={clsx(
                                            "px-2 py-2.5 rounded-xl border-2 text-[10px] font-bold transition-all flex items-center justify-center text-center leading-tight min-h-[48px]",
                                            remoteMode === mode.id
                                                ? `${modeColors[mode.color].active} shadow-lg`
                                                : `bg-white border-neutral-100 text-neutral-500 ${modeColors[mode.color].inactive}`
                                        )}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reason Input (Conditional) */}
                    {(needsReason || remoteMode === "other") && isOutside && remoteMode && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                                {remoteMode === "other" ? "Specify Reason" : "Reason & Notes"}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={remoteMode === "other" ? "Enter your specific reason for outside clocking..." : "E.g. Working from client's office, on the way to site..."}
                                className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent min-h-[80px] text-sm resize-none"
                            />
                        </div>
                    )}

                    {/* Blockage Message */}
                    {isBlocked && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 animate-in shake duration-300">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                            <p className="text-xs text-red-800 leading-relaxed font-medium">
                                Clocking is blocked. Crew members must be inside a registered project or office area to clock {type.toLowerCase()}.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={submitting || loading || isBlocked || (needsRemoteMode && !remoteMode) || (needsReason && !reason.trim())}
                        className={clsx(
                            "min-w-[100px] border-2 transition-all",
                            type === "IN"
                                ? "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
                                : "bg-neutral-900 border-neutral-900 text-white"
                        )}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Clock ${type}`}
                    </Button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
