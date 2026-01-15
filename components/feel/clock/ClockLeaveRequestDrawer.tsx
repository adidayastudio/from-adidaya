"use client";

import { useState, useMemo, useEffect } from "react";
import { Drawer } from "@/shared/ui/overlays/Drawer";
import { DrawerHeader } from "@/shared/ui/overlays/DrawerHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Calendar, ChevronDown, Clock, FileText, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { format, addDays, differenceInDays, isBefore, startOfToday } from "date-fns";
import { submitLeaveRequest, LeaveType, LeaveRequest } from "@/lib/api/clock";
import useUserProfile from "@/hooks/useUserProfile";

interface ClockLeaveRequestDrawerProps {
    open: boolean;
    onClose: () => void;
    editData?: LeaveRequest;
    readOnly?: boolean;
}

// MOCK USER DATA
const USER_JOIN_DATE = new Date("2023-01-15"); // > 1 year
const ANNUAL_LEAVE_BALANCE = 12;

const LEAVE_CATEGORIES = [
    { id: "annual", label: "Annual Leave", apiType: "Annual Leave", desc: "Paid leave for personal time off", minNotice: 7, requireFile: false },
    { id: "sick", label: "Sick Leave", apiType: "Sick Leave", desc: "Medical reasons (Certificate needed >2 days)", minNotice: 0, requireFile: true },
    { id: "permission", label: "Permission (Izin)", apiType: "Permission", desc: "Specific approved reasons", minNotice: 3, requireFile: false },
    { id: "unpaid", label: "Unpaid Leave", apiType: "Unpaid Leave", desc: "Deducted from salary", minNotice: 7, requireFile: false },
    { id: "maternity", label: "Maternity/Paternity", apiType: "Maternity Leave", desc: "Birth or adoption", minNotice: 30, requireFile: true },
];

const PERMISSION_TYPES = [
    { id: "half_day", label: "Half Day", maxDays: 0.5 },
    { id: "full_day", label: "Full Day", maxDays: 1 },
    { id: "menstrual", label: "First Day Menstrual", maxDays: 1 },
    { id: "marriage", label: "Marriage / Engagement", maxDays: 3 },
    { id: "grief", label: "Family Grief", maxDays: 3 },
];

export function ClockLeaveRequestDrawer({ open, onClose, editData, readOnly }: ClockLeaveRequestDrawerProps) {
    const { profile } = useUserProfile();
    // FORM STATE
    const [category, setCategory] = useState<string>("annual");
    const [subType, setSubType] = useState<string>("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // RESET ON OPEN
    useEffect(() => {
        if (open) {
            if (editData) {
                // Map API type back to local ID using apiType field
                const catId = LEAVE_CATEGORIES.find(c => c.apiType === editData.type)?.id || "annual";
                setCategory(catId);
                setStartDate(editData.startDate || "");
                setEndDate(editData.endDate || "");
                setNotes(editData.reason || "");
                setSubType(""); // TODO: If API supports subtype, map it here
                setFile(null);
            } else {
                setCategory("annual");
                setSubType("");
                setStartDate("");
                setEndDate("");
                setNotes("");
                setFile(null);
            }
            setIsSubmitting(false);
        }
    }, [open, editData]);

    // CALCULATIONS & VALIDATIONS
    const today = startOfToday();
    const joinDateObj = new Date(USER_JOIN_DATE);
    const tenureDays = differenceInDays(today, joinDateObj);
    const hasTenureForAnnual = tenureDays >= 365;

    const selectedCategory = LEAVE_CATEGORIES.find(c => c.id === category);

    // Date Info
    const startObj = startDate ? new Date(startDate) : null;
    const endObj = endDate ? new Date(endDate) : null;

    // Duration
    const durationDays = (startObj && endObj) ? differenceInDays(endObj, startObj) + 1 : 0;

    // Notice Period Check
    const daysNotice = startObj ? differenceInDays(startObj, today) : -1;
    const minNotice = selectedCategory?.minNotice || 0;
    const isNoticeValid = daysNotice >= minNotice;

    // Sick Leave File Rule
    const isSickFileRequired = category === "sick" && durationDays > 2;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Final Validations
        if (!isNoticeValid && category !== "sick") {
            // Permissive for now, user can submit with warning
        }
        if (category === "annual" && !hasTenureForAnnual) return;
        if (category === "sick" && isSickFileRequired && !file) return;
        if (!profile?.id) return;

        setIsSubmitting(true);
        try {
            // Use apiType from the selected category for consistency
            const leaveType = selectedCategory?.apiType as LeaveType || "Permission";

            await submitLeaveRequest({
                userId: profile.id,
                type: leaveType,
                startDate,
                endDate,
                reason: notes
            });

            onClose();
        } catch (err) {
            console.error("Error submitting leave:", err);
            alert("Failed to submit request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        return format(new Date(dateStr), "EEEE, dd MMM yyyy"); // e.g., Monday, 15 Jan 2026
    };

    return (
        <Drawer open={open} onClose={onClose} size="md">
            <div className="flex flex-col h-full bg-neutral-50/50">
                <DrawerHeader title={readOnly ? "Leave Request Details" : (editData ? "Edit Leave Request" : "New Leave Request")} onClose={onClose} />

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* TENURE WARNING */}
                    {category === "annual" && !hasTenureForAnnual && !readOnly && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 animate-in fade-in zoom-in-95">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-rose-800 text-sm">Eligibility Restriction</h4>
                                <p className="text-sm text-rose-700 mt-1">You need at least 1 year of tenure for Annual Leave. Please select Unpaid Leave or Permission.</p>
                            </div>
                        </div>
                    )}

                    {/* CATEGORY SELECTION */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Leave Category</label>
                        <div className="grid grid-cols-1 gap-2">
                            {LEAVE_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => { setCategory(cat.id); setSubType(""); }}
                                    className={clsx(
                                        "p-3 rounded-xl border text-left transition-all flex items-center justify-between group",
                                        category === cat.id
                                            ? "bg-white border-action-primary ring-1 ring-action-primary shadow-sm"
                                            : "bg-white border-neutral-200 hover:border-neutral-300",
                                        readOnly && "pointer-events-none opacity-80 bg-neutral-50"
                                    )}
                                >
                                    <div>
                                        <div className={clsx("text-sm font-semibold", category === cat.id ? "text-action-primary" : "text-neutral-700")}>{cat.label}</div>
                                        <div className="text-xs text-neutral-500 mt-0.5">{cat.desc}</div>
                                    </div>
                                    {category === cat.id && <CheckCircle2 className="w-5 h-5 text-action-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SUB-TYPE (Only for Permission) */}
                    {category === "permission" && (
                        <div className="space-y-3 animate-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-neutral-700">Permission Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PERMISSION_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() => setSubType(type.id)}
                                        className={clsx(
                                            "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                                            subType === type.id
                                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                                : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                                            readOnly && "pointer-events-none opacity-80"
                                        )}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DATES */}
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-neutral-700">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    disabled={readOnly}
                                    min={format(today, "yyyy-MM-dd")}
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


                        {/* NOTICES & WARNINGS */}
                        {startDate && !isNoticeValid && category !== "sick" && !readOnly && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm flex items-start gap-2 animate-in fade-in">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>
                                    <strong>Late Submission:</strong> {category === "annual" ? "Annual Leave" : "This leave"} requires {minNotice} days advance notice. Your request may be rejected by HR.
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

                    {/* FILE UPLOAD (Conditional) */}
                    {(category === "sick" || category === "maternity" || (category === "permission" && subType === "full_day")) && (
                        <div className="space-y-1.5 animate-in fade-in">
                            <label className="text-sm font-medium text-neutral-700 flex justify-between">
                                <span>Supporting Document {category === "sick" && durationDays <= 2 && <span className="text-neutral-400 font-normal">(Optional)</span>}</span>
                                {isSickFileRequired && <span className="text-xs text-rose-500 font-bold">Required for &gt;2 days</span>}
                            </label>
                            <div className={clsx("border border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white transition-colors relative", !readOnly && "hover:bg-neutral-50 cursor-pointer")}>
                                {!readOnly && (
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                )}
                                <FileText className="w-8 h-8 text-neutral-400 mb-2" />
                                <p className="text-sm text-neutral-600 font-medium">{file ? file.name : (readOnly ? "No document attached" : "Upload Doctor's Note / Proof")}</p>
                                {!readOnly && <p className="text-xs text-neutral-400 mt-1">PDF, JPG, PNG up to 5MB</p>}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700">Reason / Notes</label>
                        <textarea
                            required
                            value={notes}
                            disabled={readOnly}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Please describe why apply for this leave..."
                            className="w-full p-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary min-h-[100px] resize-none disabled:bg-neutral-100 disabled:text-neutral-500"
                        />
                    </div>

                </form>

                <div className="p-4 pb-24 md:pb-4 border-t border-neutral-200 bg-white flex items-center justify-end gap-3 rounded-b-xl z-10">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="!rounded-full px-6">{readOnly ? "Close" : "Cancel"}</Button>
                    {!readOnly && (
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            loading={isSubmitting}
                            className={clsx("!rounded-full px-8", (!isNoticeValid && category !== "sick") ? "bg-amber-500 hover:bg-amber-600 border-amber-600" : "")}
                            disabled={
                                (category === "annual" && !hasTenureForAnnual) ||
                                (category === "sick" && isSickFileRequired && !file) ||
                                (!startDate || !endDate || !notes)
                            }
                        >
                            {(!isNoticeValid && category !== "sick") ? "Submit with Warning" : (editData ? "Update Request" : "Submit Request")}
                        </Button>
                    )}
                </div>
            </div>
        </Drawer>
    );
}
