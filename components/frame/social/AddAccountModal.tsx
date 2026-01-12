"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Platform, SocialAccount } from "./types/social.types";
import { Select } from "@/shared/ui/primitives/select/select";
import { Input } from "@/shared/ui/primitives/input/input";
import { Button } from "@/shared/ui/primitives/button/button";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: Omit<SocialAccount, "id"> & { id?: string; code?: string }) => void;
    accountToEdit?: SocialAccount;
    existingCodes?: string[];
};

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "TIKTOK", label: "TikTok" },
    { value: "LINKEDIN", label: "LinkedIn" },
    { value: "YOUTUBE", label: "YouTube" },
    { value: "FACEBOOK", label: "Facebook" },
];

export default function AddAccountModal({ isOpen, onClose, onSave, accountToEdit, existingCodes = [] }: Props) {
    const [form, setForm] = useState<{ platform: Platform; name: string; handle: string; code: string }>({
        platform: "INSTAGRAM",
        name: "",
        handle: "",
        code: ""
    });
    const [codeError, setCodeError] = useState<string>("");

    useEffect(() => {
        if (isOpen) {
            if (accountToEdit) {
                setForm({
                    platform: accountToEdit.platform,
                    name: accountToEdit.name,
                    handle: accountToEdit.handle,
                    code: accountToEdit.name.slice(0, 3).toUpperCase()
                });
            } else {
                setForm({ platform: "INSTAGRAM", name: "", handle: "", code: "" });
            }
            setCodeError("");
        }
    }, [isOpen, accountToEdit]);

    // Auto-generate code from name
    useEffect(() => {
        if (form.name && !accountToEdit) {
            const autoCode = form.name.slice(0, 3).toUpperCase();
            setForm(f => ({ ...f, code: autoCode }));
        }
    }, [form.name, accountToEdit]);

    if (!isOpen) return null;

    const validateCode = (code: string) => {
        if (code.length !== 3) {
            return "Code must be exactly 3 characters";
        }
        if (existingCodes.includes(code) && code !== accountToEdit?.name.slice(0, 3).toUpperCase()) {
            return "This code is already in use";
        }
        return "";
    };

    const handleCodeChange = (value: string) => {
        const upperCode = value.toUpperCase().slice(0, 3);
        setForm(f => ({ ...f, code: upperCode }));
        setCodeError(validateCode(upperCode));
    };

    const handleSubmit = () => {
        if (!form.name || !form.handle) return;

        const error = validateCode(form.code);
        if (error) {
            setCodeError(error);
            return;
        }

        onSave({
            id: accountToEdit?.id,
            platform: form.platform,
            name: form.name,
            handle: form.handle,
            code: form.code
        });
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={onClose} />

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-neutral-100">
                    <h3 className="text-base font-semibold text-neutral-900">
                        {accountToEdit ? "Edit Account" : "Add Social Account"}
                    </h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* PLATFORM */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-500">Platform</label>
                        <Select
                            value={form.platform}
                            options={PLATFORM_OPTIONS}
                            onChange={(v) => setForm(f => ({ ...f, platform: v as Platform }))}
                            selectSize="sm"
                        />
                    </div>

                    {/* NAME */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-500">Account Name</label>
                        <Input
                            placeholder="e.g. Adidaya Studio"
                            value={form.name}
                            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                            inputSize="sm"
                        />
                    </div>

                    {/* CODE */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-500">
                            Code <span className="text-neutral-400">(3 letters, unique)</span>
                        </label>
                        <Input
                            placeholder="ADI"
                            value={form.code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            inputSize="sm"
                            maxLength={3}
                            className="uppercase font-bold tracking-wider"
                        />
                        {codeError && <p className="text-xs text-red-500">{codeError}</p>}
                    </div>

                    {/* HANDLE */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-500">Handle / Username</label>
                        <Input
                            placeholder="@adidayastudio"
                            value={form.handle}
                            onChange={(e) => setForm(f => ({ ...f, handle: e.target.value }))}
                            inputSize="sm"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-5 pt-0">
                    <Button variant="secondary" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSubmit} icon={accountToEdit ? undefined : <Plus className="w-4 h-4" />}>
                        {accountToEdit ? "Save Changes" : "Add Account"}
                    </Button>
                </div>
            </div>
        </>
    );
}
