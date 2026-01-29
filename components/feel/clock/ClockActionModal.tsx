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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
            <div className="backdrop-blur-2xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(250,250,252,0.95) 100%)' }}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-200/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-neutral-500" />
                        <h2 className="font-semibold text-neutral-800">
                            Confirm Clock {type}
                        </h2>
                    </div>
                    <button onClick={onClose}
                        className="p-2 backdrop-blur-sm rounded-lg transition-all active:scale-95 border border-neutral-200/40"
                        style={{ background: 'linear-gradient(180deg, rgba(245,245,245,0.8) 0%, rgba(240,240,240,0.5) 100%)' }}>
                        <X className="w-4 h-4 text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-neutral-500 text-sm">
                        Are you sure you want to clock {type.toLowerCase()} now? The system will log your current location.
                    </p>

                    {/* Location Status Card */}
                    <div className={clsx(
                        "p-4 rounded-2xl backdrop-blur-sm border flex flex-col gap-3",
                        loading ? "border-neutral-200/40" :
                            isOutside ? "border-amber-200/40" :
                                isUnknown ? "border-neutral-200/40" :
                                    "border-emerald-200/40"
                    )}
                        style={{
                            background: loading ? 'linear-gradient(180deg, rgba(250,250,250,0.8) 0%, rgba(245,245,245,0.5) 100%)' :
                                isOutside ? 'linear-gradient(180deg, rgba(254,252,232,0.8) 0%, rgba(254,249,195,0.5) 100%)' :
                                    isUnknown ? 'linear-gradient(180deg, rgba(250,250,250,0.8) 0%, rgba(245,245,245,0.5) 100%)' :
                                        'linear-gradient(180deg, rgba(236,253,245,0.8) 0%, rgba(209,250,229,0.5) 100%)'
                        }}>
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
                                    "text-sm font-semibold",
                                    loading ? "text-neutral-700" :
                                        isOutside ? "text-amber-800" :
                                            "text-emerald-800"
                                )}>
                                    {loading ? "Detecting location..." :
                                        isOutside ? "Outside registered area" :
                                            isUnknown ? "Location unknown" :
                                                `Location detected: ${detection?.location?.code}`}
                                </p>
                                <p className={clsx(
                                    "text-xs mt-0.5",
                                    loading ? "text-neutral-500" :
                                        isOutside ? "text-amber-600" :
                                            "text-emerald-600"
                                )}>
                                    {loading ? "Verifying GPS coordinates..." :
                                        isOutside ? "You are not within any registered project or office area" :
                                            isUnknown ? "Failed to verify your proximity to known locations" :
                                                `${Math.round(detection?.distance || 0)} meters from ${detection?.location?.type}`}
                                </p>
                            </div>

                            {!loading && (
                                <button
                                    onClick={refresh}
                                    className="p-1.5 backdrop-blur-sm rounded-lg transition-all active:scale-95 border border-white/50"
                                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(250,250,250,0.5) 100%)' }}
                                    title="Refresh location"
                                >
                                    <Navigation className="w-4 h-4 text-neutral-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* error message from geolocation */}
                    {error && (
                        <div className="px-3 py-2 backdrop-blur-sm border border-red-200/40 rounded-xl text-[11px] text-red-600 flex items-center gap-2"
                            style={{ background: 'linear-gradient(180deg, rgba(254,242,242,0.8) 0%, rgba(254,226,226,0.5) 100%)' }}>
                            <AlertTriangle className="w-3 h-3" />
                            {error}
                        </div>
                    )}

                    {/* Remote Mode Selection (Outside only) */}
                    {needsRemoteMode && !loading && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                Select Remote Mode
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {remoteModes.map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setRemoteMode(mode.id)}
                                        className={clsx(
                                            "px-2 py-2.5 rounded-xl border transition-all flex items-center justify-center text-center leading-tight min-h-[48px] backdrop-blur-sm text-[10px] font-semibold active:scale-95",
                                            remoteMode === mode.id
                                                ? `${modeColors[mode.color].active} shadow-lg`
                                                : `border-neutral-200/40 text-neutral-500 ${modeColors[mode.color].inactive}`
                                        )}
                                        style={remoteMode !== mode.id ? { background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.7) 100%)' } : {}}
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
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                {remoteMode === "other" ? "Specify Reason" : "Reason & Notes"}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={remoteMode === "other" ? "Enter your specific reason for outside clocking..." : "E.g. Working from client's office, on the way to site..."}
                                className="w-full px-3 py-2 rounded-xl backdrop-blur-sm border border-neutral-200/40 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300/50 min-h-[80px] text-sm resize-none"
                                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.7) 100%)' }}
                            />
                        </div>
                    )}

                    {/* Blockage Message */}
                    {isBlocked && (
                        <div className="p-3 backdrop-blur-sm border border-red-200/40 rounded-xl flex items-start gap-2 animate-in shake duration-300"
                            style={{ background: 'linear-gradient(180deg, rgba(254,242,242,0.8) 0%, rgba(254,226,226,0.5) 100%)' }}>
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                            <p className="text-xs text-red-800 leading-relaxed font-medium">
                                Clocking is blocked. Crew members must be inside a registered project or office area to clock {type.toLowerCase()}.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-neutral-200/30 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-6 py-3 rounded-full text-sm font-semibold text-neutral-600 backdrop-blur-sm border border-neutral-200/50 active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(245,245,245,0.85) 100%)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || loading || isBlocked || (needsRemoteMode && !remoteMode) || (needsReason && !reason.trim())}
                        className={clsx(
                            "px-6 py-3 rounded-full text-sm font-semibold text-white min-w-[120px] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                            type === "IN" ? "shadow-lg shadow-blue-500/30" : "shadow-lg shadow-neutral-400/30"
                        )}
                        style={{
                            background: type === "IN"
                                ? 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)'
                                : 'linear-gradient(180deg, #404040 0%, #171717 100%)'
                        }}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Clock ${type}`}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
