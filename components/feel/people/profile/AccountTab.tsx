"use client";

import { useState, useEffect } from "react";
import { Person } from "../types";
import { User, Shield, Mail, Key, Pencil, Check, X, AlertTriangle, Fingerprint, Activity, AtSign, Target } from "lucide-react"; // Using Activity instead of Password icon
import { Input } from "@/shared/ui/primitives/input/input";
import { Button } from "@/shared/ui/primitives/button/button";
import EditConfirmationModal from "../modals/EditConfirmationModal";
import clsx from "clsx";
import { updatePeopleProfile } from "@/lib/api/people";

export default function AccountTab({ person, isMe, onUpdate }: { person: Person, isMe: boolean, onUpdate?: () => void }) {
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [confirmingSection, setConfirmingSection] = useState<string | null>(null);

    // Mock form state
    const [accountType, setAccountType] = useState(person.account_type);
    const [includePerformance, setIncludePerformance] = useState(person.include_in_performance !== false);

    // Info state
    const [name, setName] = useState(person.name);
    const [nickname, setNickname] = useState(person.nickname);
    const [email, setEmail] = useState(person.email);
    const [isSaving, setIsSaving] = useState(false);

    console.log("[AccountTab] isMe:", isMe, "personId:", person.id);

    // Sync state if person prop updates (e.g. from parent refresh after save)
    useEffect(() => {
        setAccountType(person.account_type);
        setIncludePerformance(person.include_in_performance !== false);
        setName(person.name);
        setNickname(person.nickname);
        setEmail(person.email);
    }, [person]);

    const handleEditClick = (section: string) => {
        if (isMe) {
            setEditingSection(section);
        } else {
            setConfirmingSection(section);
        }
    };

    const handleConfirmEdit = () => {
        if (confirmingSection) {
            setEditingSection(confirmingSection);
            setConfirmingSection(null);
        }
    };

    const handleSaveTypeAndConfig = async () => {
        setIsSaving(true);
        try {
            const success = await updatePeopleProfile(person.id, {
                account_type: accountType,
                include_in_performance: includePerformance
            });
            if (success) {
                setEditingSection(null);
                if (onUpdate) onUpdate();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveInfo = async () => {
        setIsSaving(true);
        try {
            const success = await updatePeopleProfile(person.id, {
                name,
                nickname,
                email
            });
            if (success) {
                setEditingSection(null);
                if (onUpdate) onUpdate();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingSection(null);
        // Reset state
        setAccountType(person.account_type);
        setIncludePerformance(person.include_in_performance !== false);
        setName(person.name);
        setNickname(person.nickname);
        setEmail(person.email);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* LEFT COL: ACCOUNT TYPE & CONFIG */}
            <div className="space-y-6">
                <Section
                    id="type"
                    title="Account Type"
                    subtitle="Determines how this identity functions in the system."
                    icon={Shield}
                    color="purple"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "type"}
                    onSave={handleSaveTypeAndConfig}
                    onCancel={handleCancel}
                >
                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className={clsx("w-4 h-4 rounded-full ring-2 ring-offset-2", accountType === "human_account" ? "bg-blue-500 ring-blue-100" : "bg-neutral-500 ring-neutral-100")} />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-neutral-900 capitalize">
                                    {accountType === "human_account" ? "Human Account" : "System Account"}
                                </div>
                                <div className="text-xs text-neutral-500">
                                    {accountType === "human_account" ? "A real person with full profile capabilities." : "A bot/service account for automation."}
                                </div>
                            </div>
                        </div>

                        {editingSection === "type" && (
                            <div className="pt-3 border-t border-neutral-200 mt-1">
                                <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Change Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setAccountType("human_account");
                                        }}
                                        className={clsx("flex-1 py-2 rounded-lg text-xs font-medium border transition-all", accountType === "human_account" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-neutral-600 hover:bg-neutral-50")}
                                    >
                                        Human
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAccountType("system_account");
                                            setIncludePerformance(false);
                                        }}
                                        className={clsx("flex-1 py-2 rounded-lg text-xs font-medium border transition-all", accountType === "system_account" ? "bg-neutral-800 text-white border-neutral-900" : "bg-white text-neutral-600 hover:bg-neutral-50")}
                                    >
                                        System
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Section>

                <Section
                    id="config"
                    title="Performance Configuration"
                    subtitle="Manage inclusion in company metrics."
                    icon={Activity}
                    color="green"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "config"}
                    onSave={handleSaveTypeAndConfig}
                    onCancel={handleCancel}
                >
                    <div className={clsx("p-4 rounded-xl border transition-all", includePerformance ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100")}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-900">Include in Performance</span>
                            {editingSection === "config" ? (
                                <div
                                    onClick={() => {
                                        if (accountType !== "system_account") {
                                            setIncludePerformance(!includePerformance);
                                        }
                                    }}
                                    className={clsx(
                                        "w-10 h-6 rounded-full p-1 transition-colors duration-300",
                                        includePerformance ? "bg-emerald-500" : "bg-neutral-300",
                                        accountType === "system_account" ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                    )}
                                >
                                    <div className={clsx("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300", includePerformance ? "translate-x-4" : "translate-x-0")} />
                                </div>
                            ) : (
                                <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full border uppercase", includePerformance ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200")}>
                                    {includePerformance ? "Active" : "Excluded"}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                            {accountType === "system_account"
                                ? "System accounts are automatically excluded from all performance metrics."
                                : includePerformance
                                    ? "This account will appear in performance indexes, timesheets, and people analytics."
                                    : "This account is HIDDEN from performance metrics, timesheets, and analytics."}
                        </p>

                        <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-neutral-400" />
                                <span className="text-xs font-medium text-neutral-500">Performance Index</span>
                            </div>
                            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded border", accountType === "system_account" ? "bg-neutral-100 text-neutral-400 border-neutral-200" : "bg-blue-50 text-blue-600 border-blue-100")}>
                                {accountType === "system_account" ? "NOT APPLICABLE" : (person.performance?.performanceScore ? `${person.performance.performanceScore}/100` : "NO DATA")}
                            </span>
                        </div>
                    </div>
                </Section>
            </div>

            {/* RIGHT COL: ACCOUNT INFO */}
            <div className="space-y-6">
                <Section
                    id="info"
                    title="Account Information"
                    subtitle="Core identity credentials."
                    icon={Fingerprint}
                    color="blue"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "info"}
                    onSave={handleSaveInfo}
                    onCancel={handleCancel}
                >
                    <div className="space-y-4">
                        <InfoRow
                            icon={User}
                            label="Full Name"
                            value={name}
                            onChange={setName}
                            isEditing={editingSection === "info"}
                            placeholder="e.g. John Doe"
                        />
                        <InfoRow
                            icon={AtSign}
                            label="Nickname"
                            value={nickname || name.split(' ')[0]}
                            onChange={setNickname}
                            isEditing={editingSection === "info"}
                            placeholder="e.g. John"
                        />
                        <InfoRow
                            icon={Mail}
                            label="Email Address"
                            value={email || "No email set"}
                            onChange={setEmail}
                            isEditing={editingSection === "info"}
                            placeholder="john@example.com"
                        />
                        <InfoRow
                            icon={Key}
                            label="Password"
                            value="••••••••••••"
                            helperText="To reset password, please contact your administrator."
                            isEditing={editingSection === "info"}
                            sensitive
                            placeholder="Set new password..."
                            disabled
                        />
                    </div>
                </Section>
            </div>

            <EditConfirmationModal
                isOpen={!!confirmingSection}
                onClose={() => setConfirmingSection(null)}
                onConfirm={handleConfirmEdit}
            />
        </div>
    );
}

function Section({ id, title, subtitle, icon: Icon, color, children, onEdit, isEditing, onSave, onCancel }: any) {
    const colorClasses: any = {
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100"
    };

    return (
        <div className={clsx("bg-white p-6 rounded-2xl border shadow-sm transition-all duration-300", isEditing ? "border-blue-200 ring-2 ring-blue-500/10" : "border-neutral-200")}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center border", colorClasses[color] || colorClasses.blue)}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">{title}</h3>
                        <p className="text-xs text-neutral-500">{subtitle}</p>
                    </div>
                </div>

                {!isEditing && onEdit && (
                    <Button variant="text" size="sm" className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-900" onClick={() => onEdit(id)}>
                        <Pencil className="w-4 h-4" />
                    </Button>
                )}

                {isEditing && (
                    <div className="flex items-center gap-1">
                        <Button variant="secondary" size="sm" className="h-7 w-7 p-0" onClick={onCancel}>
                            <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="primary" size="sm" className="h-7 w-7 p-0 bg-blue-600 border-blue-600 hover:bg-blue-700" onClick={onSave}>
                            <Check className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}

function InfoRow({ icon: Icon, label, value, onChange, isEditing, sensitive, placeholder, helperText, disabled }: any) {
    return (
        <div className="flex items-start gap-3 py-1">
            {Icon && (
                <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide mb-1">{label}</div>
                {isEditing ? (
                    <div className="space-y-1">
                        <Input
                            defaultValue={sensitive ? "" : value}
                            onChange={(e) => onChange && onChange(e.target.value)}
                            placeholder={placeholder}
                            className={clsx("h-9 text-sm", disabled && "bg-neutral-100 text-neutral-400 cursor-not-allowed border-neutral-200")}
                            variant="filled"
                            type={sensitive ? "password" : "text"}
                            disabled={disabled}
                        />
                        {helperText && <div className="text-xs text-neutral-500 italic">{helperText}</div>}
                    </div>
                ) : (
                    <div>
                        <div className={clsx("text-sm font-medium", sensitive ? "text-neutral-400 font-mono tracking-widest" : "text-neutral-900")}>
                            {value}
                        </div>
                        {helperText && !isEditing && <div className="text-xs text-neutral-500 mt-0.5">{helperText}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
