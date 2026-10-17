"use client";

import { ModalRoot, ModalHeader } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/primitives/button/button";
import { AlertTriangle } from "lucide-react";
import clsx from "clsx";

type EditConfirmationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: React.ReactNode;
};

export default function EditConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message
}: EditConfirmationModalProps) {
    return (
        <ModalRoot open={isOpen} onOpenChange={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <ModalHeader title="Edit Confirmation" onClose={onClose} />
                <div className="p-6 space-y-6">
                    <div className={clsx(
                        "flex items-start gap-4 p-4 rounded-xl border",
                        message ? "bg-blue-50 border-blue-100 text-blue-900" : "bg-amber-50 border-amber-100 text-amber-800"
                    )}>
                        <AlertTriangle className={clsx("w-5 h-5 shrink-0 mt-0.5", message ? "text-blue-600" : "text-amber-600")} />
                        <div className="text-sm leading-relaxed">
                            {message || (
                                <>
                                    <strong>Warning:</strong> You are an Admin/Superadmin. Do you really want to try editing this employee detail?
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" onClick={onConfirm}>
                        Yes, Edit Details
                    </Button>
                </div>
            </div>
        </ModalRoot>
    );
}
