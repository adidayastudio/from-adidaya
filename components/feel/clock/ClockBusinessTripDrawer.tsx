"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/shared/ui/overlays/Drawer";
import { DrawerHeader } from "@/shared/ui/overlays/DrawerHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { MapPin, FileText, AlertTriangle, CheckCircle2, Plane, Building2, DollarSign } from "lucide-react";
import clsx from "clsx";
import { format, differenceInDays, startOfToday } from "date-fns";
import { submitBusinessTrip, updateBusinessTrip, BusinessTrip } from "@/lib/api/clock";
import useUserProfile from "@/hooks/useUserProfile";

interface ClockBusinessTripDrawerProps {
    open: boolean;
    onClose: () => void;
    editData?: BusinessTrip;
    readOnly?: boolean;
}

const TRANSPORTATION_MODES = [
    { id: "plane", label: "Pesawat", icon: Plane },
    { id: "train", label: "Kereta", icon: Building2 },
    { id: "car", label: "Mobil/Rental", icon: MapPin },
    { id: "bus", label: "Bus", icon: Building2 },
    { id: "other", label: "Lainnya", icon: MapPin },
];

export function ClockBusinessTripDrawer({ open, onClose, editData, readOnly }: ClockBusinessTripDrawerProps) {
    const { profile } = useUserProfile();

    // FORM STATE
    const [destination, setDestination] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [purpose, setPurpose] = useState("");
    const [transportation, setTransportation] = useState("");
    const [accommodation, setAccommodation] = useState("");
    const [estimatedCost, setEstimatedCost] = useState("");
    const [notes, setNotes] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // RESET ON OPEN
    useEffect(() => {
        if (open) {
            if (editData) {
                setDestination(editData.destination || "");
                setStartDate(editData.startDate || "");
                setEndDate(editData.endDate || "");
                setPurpose(editData.purpose || "");
                setTransportation(editData.transportation || "");
                setAccommodation(editData.accommodation || "");
                setEstimatedCost(editData.estimatedCost?.toString() || "");
                setNotes(editData.notes || "");
                // File not supported yet for edit
            } else {
                setDestination("");
                setStartDate("");
                setEndDate("");
                setPurpose("");
                setTransportation("");
                setAccommodation("");
                setEstimatedCost("");
                setNotes("");
                setFile(null);
            }
        }
    }, [open, editData]);

    const today = startOfToday();
    const startObj = startDate ? new Date(startDate) : null;
    const endObj = endDate ? new Date(endDate) : null;
    const durationDays = (startObj && endObj) ? differenceInDays(endObj, startObj) + 1 : 0;

    // Notice period check (min 3 days for business trips)
    const daysNotice = startObj ? differenceInDays(startObj, today) : -1;
    const isNoticeValid = daysNotice >= 3;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;
        if (!destination || !startDate || !endDate || !purpose) return;

        setIsSubmitting(true);
        try {
            const tripData = {
                destination,
                startDate,
                endDate,
                purpose,
                transportation: transportation || undefined,
                accommodation: accommodation || undefined,
                estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
                notes: notes || undefined
            };

            if (editData) {
                await updateBusinessTrip(editData.id, tripData);
            } else {
                await submitBusinessTrip({
                    userId: profile.id,
                    ...tripData
                });
            }

            onClose();
            // Force refresh to update list
            window.location.reload();
        } catch (err) {
            console.error("Error submitting business trip:", err);
            alert("Failed to submit request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        return format(new Date(dateStr), "EEEE, dd MMM yyyy");
    };

    return (
        <Drawer open={open} onClose={onClose} size="md">
            <div className="flex flex-col h-full bg-neutral-50/50">
                <DrawerHeader title={readOnly ? "Business Trip Details" : "New Business Trip Request"} onClose={onClose} />

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* DESTINATION */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-action-primary" />
                            Destination
                        </label>
                        <input
                            type="text"
                            required
                            value={destination}
                            disabled={readOnly}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="e.g., Jakarta, Surabaya Site Visit"
                            className="w-full px-3 py-2.5 bg-white text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary disabled:bg-neutral-100 disabled:text-neutral-500"
                        />
                    </div>

                    {/* DATES */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-neutral-700">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    min={format(today, "yyyy-MM-dd")}
                                    disabled={readOnly}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary disabled:bg-neutral-100 disabled:text-neutral-500"
                                />
                                {startDate && <div className="text-xs text-neutral-500 font-medium">{formatDateDisplay(startDate)}</div>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-neutral-700">End Date</label>
                                <input
                                    type="date"
                                    required
                                    value={endDate}
                                    min={startDate}
                                    disabled={readOnly}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary disabled:bg-neutral-100 disabled:text-neutral-500"
                                />
                                {endDate && <div className="text-xs text-neutral-500 font-medium">{formatDateDisplay(endDate)}</div>}
                            </div>
                        </div>

                        {/* Notice Warning */}
                        {startDate && !isNoticeValid && !readOnly && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm flex items-start gap-2 animate-in fade-in">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>
                                    <strong>Short Notice:</strong> Business trips typically require 3 days advance notice. Your request may need special approval.
                                </p>
                            </div>
                        )}

                        {durationDays > 0 && (
                            <div className="bg-neutral-100 rounded-lg p-3 flex justify-between items-center">
                                <span className="text-sm text-neutral-600">Total Duration:</span>
                                <span className="font-bold text-neutral-900">{durationDays} Days</span>
                            </div>
                        )}
                    </div>

                    {/* PURPOSE */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700">Purpose of Trip</label>
                        <textarea
                            required
                            value={purpose}
                            disabled={readOnly}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="Describe the business purpose..."
                            className="w-full p-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary min-h-[80px] resize-none disabled:bg-neutral-100 disabled:text-neutral-500"
                        />
                    </div>

                    {/* TRANSPORTATION */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-700">Transportation Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                            {TRANSPORTATION_MODES.map(mode => (
                                <button
                                    key={mode.id}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => setTransportation(mode.id)}
                                    className={clsx(
                                        "px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5",
                                        transportation === mode.id
                                            ? "bg-blue-50 border-blue-200 text-blue-700"
                                            : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                                        readOnly && "pointer-events-none opacity-80 bg-neutral-50"
                                    )}
                                >
                                    <mode.icon className="w-3.5 h-3.5" />
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ACCOMMODATION */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-neutral-400" />
                            Accommodation Details
                        </label>
                        <input
                            type="text"
                            value={accommodation}
                            disabled={readOnly}
                            onChange={(e) => setAccommodation(e.target.value)}
                            placeholder="Hotel name, address (if known)"
                            className="w-full px-3 py-2 bg-white text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary disabled:bg-neutral-100 disabled:text-neutral-500"
                        />
                    </div>

                    {/* ESTIMATED COST */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-neutral-400" />
                            Estimated Cost (IDR)
                        </label>
                        <input
                            type="number"
                            value={estimatedCost}
                            disabled={readOnly}
                            onChange={(e) => setEstimatedCost(e.target.value)}
                            placeholder="e.g., 5000000"
                            className="w-full px-3 py-2 bg-white text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary disabled:bg-neutral-100 disabled:text-neutral-500"
                        />
                    </div>

                    {/* FILE UPLOAD */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700">Supporting Documents <span className="text-neutral-400 font-normal">(Optional)</span></label>
                        <div className={clsx("border border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white transition-colors relative", !readOnly && "cursor-pointer hover:bg-neutral-50")}>
                            {!readOnly && (
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                            )}
                            <FileText className="w-8 h-8 text-neutral-400 mb-2" />
                            <p className="text-sm text-neutral-600 font-medium">{file ? file.name : (readOnly ? "No document attached" : "Upload Invitation / Agenda")}</p>
                            {!readOnly && <p className="text-xs text-neutral-400 mt-1">PDF, JPG, PNG up to 5MB</p>}
                        </div>
                    </div>

                    {/* NOTES */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700">Additional Notes</label>
                        <textarea
                            value={notes}
                            disabled={readOnly}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional information..."
                            className="w-full p-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary min-h-[80px] resize-none disabled:bg-neutral-100 disabled:text-neutral-500"
                        />
                    </div>

                </form>

                <div className="p-4 border-t border-neutral-200 bg-white flex items-center justify-end gap-3 rounded-b-xl z-10">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="!rounded-full px-6">{readOnly ? "Close" : "Cancel"}</Button>
                    {!readOnly && (
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            loading={isSubmitting}
                            className={clsx("!rounded-full px-8", !isNoticeValid ? "bg-amber-500 hover:bg-amber-600 border-amber-600" : "")}
                            disabled={!destination || !startDate || !endDate || !purpose}
                        >
                            {!isNoticeValid ? "Submit with Warning" : "Submit Request"}
                        </Button>
                    )}
                </div>
            </div>
        </Drawer>
    );
}
