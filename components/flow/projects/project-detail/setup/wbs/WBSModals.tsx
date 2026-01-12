"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

type WBSModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
};

export function WBSModal({ isOpen, onClose, title, children }: WBSModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                    <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Add Discipline Modal with duplicate code validation
type AddDisciplineModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (code: string, nameEn: string, nameId?: string) => void;
    existingCodes?: string[]; // List of codes already in use
};

export function AddDisciplineModal({ isOpen, onClose, onAdd, existingCodes = [] }: AddDisciplineModalProps) {
    const [code, setCode] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [nameId, setNameId] = useState("");
    const [error, setError] = useState("");

    // Check for duplicate when code changes
    useEffect(() => {
        if (code.trim()) {
            const upperCode = code.toUpperCase();
            if (existingCodes.includes(upperCode)) {
                setError(`Code "${upperCode}" is already in use`);
            } else {
                setError("");
            }
        } else {
            setError("");
        }
    }, [code, existingCodes]);

    const handleSubmit = () => {
        if (!code.trim() || !nameEn.trim()) return;

        const upperCode = code.toUpperCase();
        if (existingCodes.includes(upperCode)) {
            setError(`Code "${upperCode}" is already in use`);
            return;
        }

        onAdd(upperCode, nameEn, nameId || undefined);
        setCode("");
        setNameEn("");
        setNameId("");
        setError("");
        onClose();
    };

    const handleClose = () => {
        setCode("");
        setNameEn("");
        setNameId("");
        setError("");
        onClose();
    };

    const isValid = code.trim() && nameEn.trim() && !error;

    return (
        <WBSModal isOpen={isOpen} onClose={handleClose} title="Add Discipline">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                        Code <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g., C, G, P"
                        maxLength={3}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${error
                                ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                                : "border-neutral-200 focus:ring-brand-red/20 focus:border-brand-red/40"
                            }`}
                    />
                    {error && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-red-500">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="text-xs">{error}</span>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                        Name (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        placeholder="e.g., Civil Works"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/40"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                        Name (Indonesian)
                    </label>
                    <input
                        type="text"
                        value={nameId}
                        onChange={(e) => setNameId(e.target.value)}
                        placeholder="e.g., Pekerjaan Sipil"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/40"
                    />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button size="sm" variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!isValid}
                    >
                        Add Discipline
                    </Button>
                </div>
            </div>
        </WBSModal>
    );
}

// Confirm Modal
type ConfirmModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: "primary" | "danger";
};

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    confirmVariant = "primary"
}: ConfirmModalProps) {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <WBSModal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <p className="text-sm text-neutral-600">{message}</p>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button size="sm" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleConfirm}
                        className={confirmVariant === "danger" ? "bg-red-500 hover:bg-red-600" : ""}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </WBSModal>
    );
}
