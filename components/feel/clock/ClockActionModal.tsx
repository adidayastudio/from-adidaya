"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Navigation,
    Clock as ClockIcon,
    Camera,
    RefreshCw,
    X
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/shared/ui/primitives/button/button";
import { useClockLocation } from "@/lib/clock/useClockLocation";
import { UserRole } from "@/hooks/useUserProfile";
import clsx from "clsx";
import useUserProfile from "@/hooks/useUserProfile";
import { createClient } from "@/utils/supabase/client";
import { CameraCapture } from "./CameraCapture";

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
    
    // Camera State
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    const { profile } = useUserProfile();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Clean up object URL when modal closes or blob changes to prevent memory leaks
    useEffect(() => {
        if (!isOpen) {
            setCapturedBlob(null);
            setReason("");
            setRemoteMode(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (capturedBlob) {
            const url = URL.createObjectURL(capturedBlob);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [capturedBlob]);

    // Role-based validation
    const isAdmin = userRole === "admin" || userRole === "superadmin" || userRole === "administrator";
    const isStaff = userRole === "staff" || userRole === "supervisor" || userRole === "pm" || userRole === "management";
    const isCrew = !isAdmin && !isStaff; // Simple fallback check

    // Logic for validation
    const isOutside = detection?.status === "outside";
    const isUnknown = detection?.status === "unknown";
    const needsRemoteMode = (isAdmin || isStaff) && isOutside;
    const needsReason = isStaff && isOutside;
    const isBlocked = isCrew && isOutside;

    const handleConfirm = async () => {
        if (isBlocked) return;
        if (needsRemoteMode && !remoteMode) return;
        if (needsReason && !reason.trim()) return;
        if (!capturedBlob) return; // Camera photo is mandatory

        setSubmitting(true);
        try {
            let photoUrl = undefined;
            if (capturedBlob) {
                const supabase = createClient();
                const fileName = `${profile?.id || 'unknown'}-${type}-${Date.now()}.jpg`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('attendance_photos')
                    .upload(fileName, capturedBlob, { contentType: 'image/jpeg' });
                
                if (!uploadError) {
                    const { data: pData } = supabase.storage.from('attendance_photos').getPublicUrl(fileName);
                    photoUrl = pData?.publicUrl;
                    
                    // Failsafe: if pData is somehow empty, construct the URL manually
                    if (!photoUrl) {
                        const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        if (projectUrl) {
                            photoUrl = `${projectUrl}/storage/v1/object/public/attendance_photos/${fileName}`;
                        }
                    }
                    console.log("✅ Photo uploaded and URL captured:", photoUrl);
                } else {
                    console.error("❌ Failed to upload photo:", uploadError);
                }
            }

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
                remoteMode: remoteMode || undefined,
                photoUrl: photoUrl
            };
            
            await onConfirm(metadata);
            
            // Ensure cache is cleared BEFORE triggering refresh
            const cacheModule = await import("@/lib/api/clock/clock.cache");
            cacheModule.clearClockCache();
            
            // Dispatch global event to refresh timesheets everywhere
            window.dispatchEvent(new CustomEvent("clock-action-success"));
            
            onClose();
        } catch (err) {
            // Ignore abort errors which happen due to route navigation unmounting component
            if ((err as Error).name !== 'AbortError') {
                console.error("Clock action failed:", err);
                toast.error("Clock action failed. Please check your connection and try again.");
            }
        } finally {
            if (mounted) {
                setSubmitting(false);
            }
        }
    };

    const remoteModes = [
        { id: "WFH", label: "WFH", color: "blue" as const },
        { id: "WFA", label: "WFA", color: "purple" as const },
        { id: "business_trip", label: "Business Trip", color: "orange" as const },
        { id: "other", label: "Other", color: "neutral" as const },
    ];

    const modeColors = {
        blue: { active: "bg-blue-600 border-blue-600 text-white shadow-blue-200", inactive: "hover:border-blue-200" },
        purple: { active: "bg-purple-600 border-purple-600 text-white shadow-purple-200", inactive: "hover:border-purple-200" },
        orange: { active: "bg-orange-600 border-orange-600 text-white shadow-orange-200", inactive: "hover:border-orange-200" },
        neutral: { active: "bg-neutral-900 border-neutral-900 text-white shadow-neutral-200", inactive: "hover:border-neutral-200" }
    };

    if (!mounted) return null;

    const drawerContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] isolate flex justify-end">
                    {/* BACKDROP */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" 
                    />
                    
                    {/* Drawer Content */}
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={clsx(
                            "absolute z-50 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 shadow-2xl transition-all duration-500 rounded-[56px] overflow-hidden flex flex-col",
                            "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[480px]"
                        )}
                    >
                        {/* Header */}
                        <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent flex items-center justify-between">
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 block">Live Activity</span>
                                <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white truncate tracking-tight">Confirm Clock {type}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar scrollbar-hide space-y-6">
                            <p className="text-neutral-500 text-sm font-medium">
                                Are you sure you want to clock {type.toLowerCase()} now? The system will log your current location in real-time.
                            </p>

                            {/* Location Status Card */}
                            <div className={clsx(
                                "p-4 rounded-3xl bg-white/50 border shadow-sm flex flex-col gap-3",
                                loading ? "border-neutral-200" :
                                    isOutside ? "border-amber-200" :
                                        isUnknown ? "border-neutral-200" :
                                            "border-emerald-200"
                            )}>
                                <div className="flex items-start gap-3">
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin mt-0.5" />
                                    ) : isOutside ? (
                                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
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
                                                    isUnknown ? "Failed to verify your proximity for check-in" :
                                                        `${Math.round(detection?.distance || 0)} meters from ${detection?.location?.type}`}
                                        </p>
                                    </div>

                                    {!loading && (
                                        <button
                                            type="button"
                                            onClick={refresh}
                                            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors border border-black/5 shadow-sm bg-white"
                                            title="Refresh location"
                                        >
                                            <Navigation className="w-4 h-4 text-neutral-500" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* error message from geolocation */}
                            {error && (
                                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-600 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
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
                                                type="button"
                                                onClick={() => setRemoteMode(mode.id)}
                                                className={clsx(
                                                    "px-2 py-2.5 rounded-2xl border transition-all flex items-center justify-center text-center leading-tight min-h-[48px] text-[11px] font-bold active:scale-95",
                                                    remoteMode === mode.id
                                                        ? `${modeColors[mode.color].active} shadow-lg`
                                                        : `bg-white/50 border-neutral-200 text-neutral-500 ${modeColors[mode.color].inactive}`
                                                )}
                                            >
                                                {mode.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reason Input */}
                            {isOutside && remoteMode && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                        {remoteMode === "other" ? "Specify Reason" : "Notes (Optional)"}
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder={remoteMode === "other" ? "Enter your specific reason for outside clocking..." : "Add any notes about your location or task..."}
                                        className="w-full px-3 py-2 rounded-2xl bg-white/50 border border-neutral-200/50 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300/50 min-h-[80px] text-sm resize-none shadow-sm"
                                    />
                                </div>
                            )}

                            {/* Blockage Message */}
                            {isBlocked && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 animate-in shake duration-300">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-red-800 leading-relaxed font-semibold tracking-wide">
                                        Clocking is blocked. Crew members must be inside a registered project or office area to clock {type.toLowerCase()}.
                                    </p>
                                </div>
                            )}
                            
                            {/* Camera Capture Section */}
                            {!isBlocked && (
                                <div className="pt-2 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {capturedBlob && previewUrl ? (
                                        <div className="p-4 bg-emerald-50/50 rounded-[32px] border border-emerald-100/50 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 relative group">
                                            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-white/50">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={previewUrl} alt="Captured preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-center justify-center">
                                                   <button 
                                                        type="button" 
                                                        onClick={() => setCapturedBlob(null)}
                                                        className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold hover:bg-white/30 transition-all flex items-center gap-1.5 active:scale-95"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                        Change Photo
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <CameraCapture 
                                            onCapture={(blob) => setCapturedBlob(blob)}
                                            locationText={detection?.location?.code || (userCoords ? `${userCoords.latitude.toFixed(6)}, ${userCoords.longitude.toFixed(6)}` : "Unknown Area")}
                                            userName={profile?.name || "User"}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex-none p-6 pt-2 bg-transparent grid grid-cols-2 gap-3 z-20 sticky bottom-0">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                disabled={submitting} 
                                className="w-full py-3 rounded-full text-sm font-bold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={submitting || !capturedBlob}
                                className={clsx(
                                    "w-full py-3 rounded-full text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                                    type === "IN" ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20" : "bg-neutral-800 hover:bg-neutral-900 shadow-lg shadow-neutral-900/20"
                                )}
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>Clock {type}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(drawerContent, document.body);
}
