"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { ArrowLeft, Phone, Mail, Building2, CreditCard, Edit2, Calendar, FileText, Download, Clock, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import {
    fetchCrewMemberById,
    fetchCrewProjectHistory,
    updateCrewMember,
    CrewMember,
    CrewProjectHistory,
} from "@/lib/api/crew";

interface CrewDetailProps {
    crewId: string;
    onBack: () => void;
}

const formatNum = (n: number) => n.toLocaleString("id-ID");
const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return words[0].substring(0, 2).toUpperCase();
};

const InputField = ({ label, value, onChange, type = "text" }: { label: string, value: string | number, onChange: (v: any) => void, type?: string }) => (
    <div>
        <label className="text-xs text-neutral-500 mb-1 block">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm font-medium border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
        />
    </div>
);

export function CrewDetail({ crewId, onBack }: CrewDetailProps) {
    const [crew, setCrew] = useState<CrewMember | null>(null);
    const [projectHistory, setProjectHistory] = useState<CrewProjectHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [activeTab, setActiveTab] = useState<"info" | "history" | "documents">("info");
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<CrewMember | null>(null);

    // Load crew data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [memberData, historyData] = await Promise.all([
                    fetchCrewMemberById(crewId),
                    fetchCrewProjectHistory(crewId)
                ]);
                setCrew(memberData);
                setFormData(memberData);
                setProjectHistory(historyData);
            } catch (err) {
                console.error("Failed to load crew detail:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [crewId]);

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        try {
            const result = await updateCrewMember(crewId, {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                nik: formData.nik,
                joinDate: formData.joinDate,
                baseDailyRate: formData.baseDailyRate,
                overtimeDailyRate: formData.overtimeDailyRate,
                otRate1: formData.otRate1,
                otRate2: formData.otRate2,
                otRate3: formData.otRate3,
                bankName: formData.bankName,
                bankAccount: formData.bankAccount,
                currentProjectCode: formData.currentProjectCode,
                notes: formData.notes,
            });
            if (result) {
                setCrew(result);
                setFormData(result);
                setIsEditing(false);
            }
        } catch (err) {
            console.error("Failed to save crew:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData(crew);
        setIsEditing(false);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // Not found
    if (!crew || !formData) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-500">Crew member not found.</p>
                <Button variant="secondary" onClick={onBack} className="mt-4">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-600" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                            {crew.initials || getInitials(crew.name)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900">{crew.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-neutral-500">{crew.role}</span>
                                <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", crew.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600")}>
                                    {crew.status === "ACTIVE" ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isEditing ? (
                        <>
                            <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={isSaving} icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}>
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </>
                    ) : (
                        <Button variant="secondary" onClick={() => setIsEditing(true)} icon={<Edit2 className="w-4 h-4" />}>Edit</Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-neutral-100 rounded-full p-1 w-fit">
                {(["info", "history", "documents"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={clsx("px-4 py-2 text-sm font-medium rounded-full transition-colors capitalize", activeTab === tab ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
                        {tab === "info" ? "Information" : tab === "history" ? "Project History" : "Documents"}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "info" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Contact */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
                        <h3 className="font-semibold text-neutral-900 flex items-center gap-2"><Phone className="w-4 h-4 text-blue-500" /> Contact</h3>
                        <div className="space-y-3">
                            {isEditing ? (
                                <>
                                    <InputField label="Phone" value={formData.phone || ""} onChange={(v) => setFormData({ ...formData, phone: v })} />
                                    <InputField label="Email" value={formData.email || ""} onChange={(v) => setFormData({ ...formData, email: v })} />
                                    <InputField label="NIK" value={formData.nik || ""} onChange={(v) => setFormData({ ...formData, nik: v })} />
                                    <InputField label="Join Date" type="date" value={formData.joinDate || ""} onChange={(v) => setFormData({ ...formData, joinDate: v })} />
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-neutral-400" /><div><div className="text-xs text-neutral-500">Phone</div><div className="font-medium">{crew.phone || "-"}</div></div></div>
                                    {crew.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-neutral-400" /><div><div className="text-xs text-neutral-500">Email</div><div className="font-medium">{crew.email}</div></div></div>}
                                    <div className="flex items-center gap-3"><CreditCard className="w-4 h-4 text-neutral-400" /><div><div className="text-xs text-neutral-500">NIK</div><div className="font-medium font-mono">{crew.nik || "-"}</div></div></div>
                                    <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-neutral-400" /><div><div className="text-xs text-neutral-500">Joined</div><div className="font-medium">{crew.joinDate ? new Date(crew.joinDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</div></div></div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Rates */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
                        <h3 className="font-semibold text-neutral-900 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-500" /> Daily Rates</h3>
                        {isEditing ? (
                            <div className="grid grid-cols-2 gap-3">
                                <InputField label="Base Rate" type="number" value={formData.baseDailyRate} onChange={(v) => setFormData({ ...formData, baseDailyRate: Number(v) })} />
                                <InputField label="Holiday Rate" type="number" value={formData.overtimeDailyRate} onChange={(v) => setFormData({ ...formData, overtimeDailyRate: Number(v) })} />
                                <InputField label="OT1 Rate" type="number" value={formData.otRate1} onChange={(v) => setFormData({ ...formData, otRate1: Number(v) })} />
                                <InputField label="OT2 Rate" type="number" value={formData.otRate2} onChange={(v) => setFormData({ ...formData, otRate2: Number(v) })} />
                                <InputField label="OT3 Rate" type="number" value={formData.otRate3} onChange={(v) => setFormData({ ...formData, otRate3: Number(v) })} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-neutral-50 rounded-lg p-3"><div className="text-xs text-neutral-500">Base / Day</div><div className="text-lg font-bold text-neutral-900">Rp {formatNum(crew.baseDailyRate)}</div></div>
                                <div className="bg-amber-50 rounded-lg p-3"><div className="text-xs text-amber-600">Holiday Rate / Day</div><div className="text-lg font-bold text-amber-700">Rp {formatNum(crew.overtimeDailyRate)}</div></div>
                                {crew.otRate1 > 0 && <div className="bg-blue-50 rounded-lg p-3"><div className="text-xs text-blue-600">OT1 / Hr</div><div className="text-lg font-bold text-blue-700">Rp {formatNum(crew.otRate1)}</div></div>}
                                {crew.otRate2 > 0 && <div className="bg-blue-50 rounded-lg p-3"><div className="text-xs text-blue-600">OT2 / Hr</div><div className="text-lg font-bold text-blue-700">Rp {formatNum(crew.otRate2)}</div></div>}
                                {crew.otRate3 > 0 && <div className="bg-blue-50 rounded-lg p-3"><div className="text-xs text-blue-600">OT3 / Hr</div><div className="text-lg font-bold text-blue-700">Rp {formatNum(crew.otRate3)}</div></div>}
                            </div>
                        )}
                    </div>

                    {/* Bank */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
                        <h3 className="font-semibold text-neutral-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-500" /> Bank Account</h3>
                        {isEditing ? (
                            <div className="space-y-3">
                                <InputField label="Bank Name" value={formData.bankName || ""} onChange={(v) => setFormData({ ...formData, bankName: v })} />
                                <InputField label="Account Number" value={formData.bankAccount || ""} onChange={(v) => setFormData({ ...formData, bankAccount: v })} />
                            </div>
                        ) : (
                            crew.bankName && crew.bankAccount ? (
                                <div className="space-y-2">
                                    <div><div className="text-xs text-neutral-500">Bank</div><div className="font-medium">{crew.bankName}</div></div>
                                    <div><div className="text-xs text-neutral-500">Account Number</div><div className="font-medium font-mono">{crew.bankAccount}</div></div>
                                </div>
                            ) : (
                                <div className="text-neutral-400 text-sm">No bank info</div>
                            )
                        )}
                    </div>

                    {/* Current Project */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
                        <h3 className="font-semibold text-neutral-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500" /> Current Project</h3>
                        {isEditing ? (
                            <InputField label="Project Code" value={formData.currentProjectCode || ""} onChange={(v) => setFormData({ ...formData, currentProjectCode: v })} />
                        ) : (
                            crew.currentProjectCode ? (
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1.5 bg-blue-100 text-blue-700 font-mono text-sm rounded-lg font-medium">{crew.currentProjectCode}</span>
                                </div>
                            ) : (
                                <div className="text-neutral-400 text-sm">Not assigned</div>
                            )
                        )}
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 lg:col-span-2">
                        <h3 className="font-semibold text-neutral-900 flex items-center gap-2"><FileText className="w-4 h-4 text-neutral-500" /> Notes</h3>
                        {isEditing ? (
                            <textarea
                                value={formData.notes || ""}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all min-h-[100px]"
                            />
                        ) : (
                            <p className="text-neutral-600 text-sm whitespace-pre-wrap">{crew.notes || "No notes"}</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    {projectHistory.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Project</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Period</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {projectHistory.map((p) => (
                                    <tr key={p.id} className="hover:bg-neutral-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{p.projectName || p.projectCode}</div>
                                            <div className="text-xs text-neutral-500 font-mono">{p.projectCode}</div>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600">
                                            {new Date(p.startDate).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                                            {" - "}
                                            {p.endDate ? new Date(p.endDate).toLocaleDateString("id-ID", { month: "short", year: "numeric" }) : "Present"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", p.status === "ongoing" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600")}>
                                                {p.status === "ongoing" ? "Active" : "Completed"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center">
                            <MapPin className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
                            <p className="text-neutral-500">No project history yet.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "documents" && (
                <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <h3 className="font-medium text-neutral-600 mb-2">No documents yet</h3>
                    <p className="text-sm text-neutral-400">Upload ID card, contracts, or other documents.</p>
                    <Button variant="secondary" className="mt-4" icon={<Download className="w-4 h-4" />}>Upload Document</Button>
                </div>
            )}
        </div>
    );
}

export default CrewDetail;
