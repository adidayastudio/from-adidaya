"use client";

import { useState, useEffect } from "react";
import { ModalRoot, ModalHeader } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/primitives/button/button";
import { PeopleAvailability, WorkloadStatus } from "@/lib/types/people-types";
import { updatePeopleAvailability } from "@/lib/api/people";
import { toast } from "react-hot-toast";
import { CheckCircle2, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface StatusUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    currentStatus?: PeopleAvailability | null;
    onUpdate?: () => void;
}

export default function StatusUpdateModal({ isOpen, onClose, userId, currentStatus, onUpdate }: StatusUpdateModalProps) {
    const [status, setStatus] = useState<WorkloadStatus>("normal");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && currentStatus) {
            setStatus(currentStatus.workload_status);
            setNotes(currentStatus.notes || "");
        } else if (isOpen && !currentStatus) {
            setStatus("normal");
            setNotes("");
        }
    }, [isOpen, currentStatus]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updatePeopleAvailability(userId, status, "manual", notes);
            if (result) {
                toast.success("Status updated");
                onUpdate?.();
                onClose();
            }
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalRoot open={isOpen} onOpenChange={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <ModalHeader title="Update Workload Status" onClose={onClose} />

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                        <StatusOption
                            value="available"
                            current={status}
                            onClick={() => setStatus("available")}
                            icon={CheckCircle2}
                            label="Available"
                            color="text-emerald-600 bg-emerald-50 border-emerald-200"
                        />
                        <StatusOption
                            value="normal"
                            current={status}
                            onClick={() => setStatus("normal")}
                            icon={CheckCircle2}
                            label="Normal"
                            color="text-blue-600 bg-blue-50 border-blue-200"
                        />
                        <StatusOption
                            value="overloaded"
                            current={status}
                            onClick={() => setStatus("overloaded")}
                            icon={AlertCircle}
                            label="Overloaded"
                            color="text-red-600 bg-red-50 border-red-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Detailed Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Working on Project X deadline until Friday."
                            className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/[0.08] transition-all resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} loading={saving}>
                        Update Status
                    </Button>
                </div>
            </div>
        </ModalRoot>
    );
}

function StatusOption({ value, current, onClick, icon: Icon, label, color }: any) {
    const isSelected = value === current;
    return (
        <div
            onClick={onClick}
            className={clsx(
                "cursor-pointer rounded-xl border p-3 flex flex-col items-center gap-2 transition-all",
                isSelected ? `ring-2 ring-offset-1 ring-blue-500 ${color}` : "border-neutral-100 hover:border-neutral-200 bg-white"
            )}
        >
            <Icon className={clsx("w-6 h-6", isSelected ? "opacity-100" : "opacity-50 grayscale")} />
            <div className="text-xs font-semibold">{label}</div>
        </div>
    );
}
