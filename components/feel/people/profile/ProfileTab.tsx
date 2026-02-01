"use client";

import { useState, useEffect, useRef } from "react";
import { Person } from "../types";
import {
    Mail, Phone, MapPin, Globe, CreditCard, FileText, User, Pencil, Check, X,
    Instagram, Linkedin, Youtube, Facebook, Twitter, Chrome, Plus, Trash2,
    Eye, EyeOff, Download, ExternalLink, Activity
} from "lucide-react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import EditConfirmationModal from "../modals/EditConfirmationModal";
import AddSocialModal from "../modals/AddSocialModal";
import {
    updatePeopleProfile,
    uploadUserDocument,
    deleteUserDocument,
    fetchUserDocuments,
    getDocumentUrl
} from "@/lib/api/people";
import { UserDocument } from "../types";

export default function ProfileTab({ person, isSystem, isMe, onUpdate }: { person: Person, isSystem: boolean, isMe: boolean, onUpdate?: () => void }) {
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [confirmingSection, setConfirmingSection] = useState<string | null>(null);
    const [isAddSocialModalOpen, setIsAddSocialModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- STATES ---

    // Identity State
    const [birthDate, setBirthDate] = useState(person.birth_date || person.birthday || "");
    const [nik, setNik] = useState(person.nik || "");
    const [nikError, setNikError] = useState("");

    // Contact State
    const [personalEmail, setPersonalEmail] = useState(person.personal_email || "");
    const [whatsapp, setWhatsapp] = useState(person.whatsapp || "");
    const [phoneNumber, setPhoneNumber] = useState(person.phone_number || "");
    const [emailError, setEmailError] = useState("");

    // Social State
    const [socialLinks, setSocialLinks] = useState<any>(person.social_links || { linkedin: "", instagram: "" });

    // Address State
    const [currentAddress, setCurrentAddress] = useState<any>(person.address?.current || {});
    const [homeAddress, setHomeAddress] = useState<any>(person.address?.home || {});
    const [isSameAddress, setIsSameAddress] = useState(person.address?.home?.is_same_as_current !== false);

    // Emergency State
    const [emergencyContact, setEmergencyContact] = useState(person.emergency_contact || { name: "", relation: "", phone: "" });

    // Finance State
    const [showAccountNumber, setShowAccountNumber] = useState(false);
    const [isCustomHolder, setIsCustomHolder] = useState(person.bank_info?.account_holder !== person.name && !!person.bank_info?.account_holder);
    const [bankInfo, setBankInfo] = useState(person.bank_info || { bank_name: "", account_number: "", account_holder: "" });

    // Documents
    const documentCategories = [
        { label: "KTP (ID Card)", category: "KTP" },
        { label: "NPWP (Tax ID)", category: "NPWP" },
        { label: "CV / Resume", category: "CV" },
        { label: "Latest Diploma", category: "Diploma" },
        { label: "Latest Transcript", category: "Transcript" }
    ];
    const [documents, setDocuments] = useState<UserDocument[]>(person.documents || []);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<string | null>(null); // Category being uploaded

    const loadDocuments = async () => {
        const docs = await fetchUserDocuments(person.id);
        setDocuments(docs);
    };

    useEffect(() => {
        loadDocuments();
    }, [person.id]);

    // Sync state if person prop updates (e.g. from parent refresh after save)
    useEffect(() => {
        setBirthDate(person.birth_date || person.birthday || "");
        setNik(person.nik || "");
        setPersonalEmail(person.personal_email || "");
        setWhatsapp(person.whatsapp || "");
        setPhoneNumber(person.phone_number || "");
        setSocialLinks(person.social_links || { linkedin: "", instagram: "" });
        setCurrentAddress(person.address?.current || {});
        setHomeAddress(person.address?.home || {});
        setIsSameAddress(person.address?.home?.is_same_as_current !== false);
        setEmergencyContact(person.emergency_contact || { name: "", relation: "", phone: "" });
        setBankInfo(person.bank_info || { bank_name: "", account_number: "", account_holder: "" });
        setIsCustomHolder(person.bank_info?.account_holder !== person.name && !!person.bank_info?.account_holder);
        setDocuments(person.documents || []);
    }, [person]);

    // --- HANDLERS ---

    const validateNik = (val: string) => {
        if (val && val.length !== 16) {
            setNikError("NIK must be exactly 16 digits.");
        } else if (val && !/^\d+$/.test(val)) {
            setNikError("NIK must contain only numbers.");
        } else {
            setNikError("");
        }
    };

    const validateEmail = (val: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (val && !regex.test(val)) {
            setEmailError("Invalid email format.");
        } else {
            setEmailError("");
        }
    };

    const handleUpload = async (category: string, file: File) => {
        setIsUploading(category);
        try {
            const newDoc = await uploadUserDocument(person.id, category, file);
            if (newDoc) {
                await loadDocuments();
            }
        } finally {
            setIsUploading(null);
        }
    };

    const handlePreview = async (doc: UserDocument) => {
        const url = await getDocumentUrl(doc.file_path);
        if (url) {
            setPreviewUrl(url);
            setPreviewType(doc.file_type || null);
            setPreviewName(doc.name);
            setIsPreviewOpen(true);
        }
    };

    const handleDelete = async (doc: UserDocument) => {
        if (confirm(`Are you sure you want to delete ${doc.name}?`)) {
            const success = await deleteUserDocument(doc.id, doc.file_path);
            if (success) {
                await loadDocuments();
            }
        }
    };

    const handleDownload = async (doc: UserDocument) => {
        const url = await getDocumentUrl(doc.file_path);
        if (url) {
            window.open(url, '_blank');
        }
    };

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

    const handleSave = async () => {
        if (editingSection === "identity" && nikError) return;
        if (editingSection === "contact" && emailError) return;

        setIsSaving(true);
        try {
            let updates: any = {};

            if (editingSection === "identity") {
                updates = { birth_date: birthDate, nik };
            } else if (editingSection === "contact") {
                updates = { personal_email: personalEmail, whatsapp, phone_number: phoneNumber };
            } else if (editingSection === "social") {
                updates = { social_links: socialLinks };
            } else if (editingSection === "address") {
                updates = {
                    address: {
                        current: currentAddress,
                        home: isSameAddress ? { ...currentAddress, is_same_as_current: true } : { ...homeAddress, is_same_as_current: false }
                    }
                };
            } else if (editingSection === "emergency") {
                updates = { emergency_contact: emergencyContact };
            } else if (editingSection === "finance") {
                updates = { bank_info: bankInfo };
            }

            const success = await updatePeopleProfile(person.id, updates);
            if (success) {
                setEditingSection(null);
                if (onUpdate) onUpdate();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset local states from person prop
        setBirthDate(person.birth_date || person.birthday || "");
        setNik(person.nik || "");
        setNikError("");
        setPersonalEmail(person.personal_email || "");
        setWhatsapp(person.whatsapp || "");
        setPhoneNumber(person.phone_number || "");
        setEmailError("");
        setSocialLinks(person.social_links || { linkedin: "", instagram: "" });
        setCurrentAddress(person.address?.current || {});
        setHomeAddress(person.address?.home || {});
        setIsSameAddress(person.address?.home?.is_same_as_current !== false);
        setEmergencyContact(person.emergency_contact || { name: "", relation: "", phone: "" });
        setBankInfo(person.bank_info || { bank_name: "", account_number: "", account_holder: "" });
        setIsCustomHolder(person.bank_info?.account_holder !== person.name && !!person.bank_info?.account_holder);
        setDocuments(person.documents || []);
        setEditingSection(null);
    };

    if (isSystem) {
        return (
            <div className="p-8 text-center text-neutral-500 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <User className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="font-medium text-neutral-900">Personal Data Disabled</h3>
                <p className="text-sm mt-1">System accounts do not have personal profile data.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LEFT COL: IDENTITY & CONTACT */}
            <div className="space-y-6">
                <Section
                    id="identity"
                    title="Identity"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "identity"}
                    isSaving={isSaving}
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <InfoRow label="Full Name" value={person.name} locked title="Editable in Account Tab" />
                    <InfoRow label="Nickname" value={person.nickname || "-"} locked title="Editable in Account Tab" />

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Birth Date</label>
                        {editingSection === "identity" ? (
                            <Input
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="h-8 text-sm"
                            />
                        ) : (
                            <div className="text-sm font-medium text-neutral-900">{birthDate || "Not set"}</div>
                        )}
                    </div>

                    <InfoRow
                        icon={User}
                        label="NIK (National ID)"
                        value={nik}
                        isEditing={editingSection === "identity"}
                        onChange={(val: string) => {
                            setNik(val);
                            validateNik(val);
                        }}
                        placeholder="16-digit NIK"
                        error={nikError}
                    />
                </Section>

                <Section
                    id="contact"
                    title="Contact"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "contact"}
                    isSaving={isSaving}
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <InfoRow icon={Mail} label="Email (Work)" value={person.email} locked />
                    <InfoRow
                        icon={Mail}
                        label="Personal Email"
                        value={personalEmail}
                        isEditing={editingSection === "contact"}
                        onChange={(val: string) => {
                            setPersonalEmail(val);
                            validateEmail(val);
                        }}
                        placeholder="example@gmail.com"
                        error={emailError}
                    />

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <InfoRow
                            icon={Phone}
                            label="WhatsApp"
                            value={whatsapp}
                            isEditing={editingSection === "contact"}
                            onChange={setWhatsapp}
                            placeholder="+62..."
                        />
                        <InfoRow
                            icon={Phone}
                            label="Phone Number"
                            value={phoneNumber}
                            isEditing={editingSection === "contact"}
                            onChange={setPhoneNumber}
                            placeholder="+62..."
                        />
                    </div>
                </Section>

                <Section
                    id="social"
                    title="Social"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "social"}
                    isSaving={isSaving}
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <div className="space-y-3">
                        {Object.entries(socialLinks).map(([platform, handle]) => (
                            <SocialRow
                                key={platform}
                                platform={platform.charAt(0).toUpperCase() + platform.slice(1)}
                                handle={handle}
                                isEditing={editingSection === "social"}
                                onChange={(val: string) => setSocialLinks({ ...socialLinks, [platform]: val })}
                                onRemove={() => {
                                    const newLinks = { ...socialLinks };
                                    delete newLinks[platform];
                                    setSocialLinks(newLinks);
                                }}
                            />
                        ))}
                        {editingSection === "social" && (
                            <button
                                onClick={() => setIsAddSocialModalOpen(true)}
                                className="w-full py-2 border border-dashed border-neutral-200 rounded-lg text-[10px] font-bold text-neutral-400 uppercase hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-3 h-3" />
                                Add Social Account
                            </button>
                        )}
                    </div>
                </Section>
            </div>

            {/* MIDDLE COL: ADDRESS & EMERGENCY */}
            <div className="space-y-6">
                <Section
                    id="address"
                    title="Address"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "address"}
                    isSaving={isSaving}
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <div className="space-y-6">
                        {/* Current Address */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Current Address</label>
                            </div>
                            <AddressFields
                                data={currentAddress}
                                isEditing={editingSection === "address"}
                                onChange={(field, val) => setCurrentAddress({ ...currentAddress, [field]: val })}
                            />
                        </div>

                        {/* Home Address */}
                        <div className="pt-4 border-t border-neutral-100">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Home Address (KTP)</label>
                                {editingSection === "address" && (
                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                        <div
                                            onClick={() => setIsSameAddress(!isSameAddress)}
                                            className={clsx("w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center", isSameAddress ? "bg-blue-600 border-blue-600" : "bg-white border-neutral-300 group-hover:border-neutral-400")}
                                        >
                                            {isSameAddress && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className="text-[10px] font-medium text-neutral-500">Same as current</span>
                                    </label>
                                )}
                            </div>
                            {!isSameAddress ? (
                                <AddressFields
                                    data={homeAddress}
                                    isEditing={editingSection === "address"}
                                    onChange={(field, val) => setHomeAddress({ ...homeAddress, [field]: val })}
                                />
                            ) : (
                                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 text-[11px] text-neutral-500 italic">
                                    Same as current address
                                </div>
                            )}
                        </div>
                    </div>
                </Section>

                <Section
                    id="emergency"
                    title="Emergency Contact"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "emergency"}
                    isSaving={isSaving}
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        label="Name"
                        value={emergencyContact.name || "-"}
                        isEditing={editingSection === "emergency"}
                        onChange={(val: string) => setEmergencyContact({ ...emergencyContact, name: val })}
                    />
                    <div className="mt-4">
                        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide mb-1.5 block">Relationship</label>
                        {editingSection === "emergency" ? (
                            <div className="relative">
                                <select
                                    value={emergencyContact.relation || ""}
                                    onChange={(e) => setEmergencyContact({ ...emergencyContact, relation: e.target.value })}
                                    className="w-full h-9 text-sm pl-3 pr-8 rounded-lg border border-neutral-200 bg-neutral-50 hover:border-neutral-300 focus:bg-white focus:border-blue-600 outline-none transition-all appearance-none cursor-pointer font-medium"
                                >
                                    <option value="">Select Relationship...</option>
                                    <option value="Parents">Parents</option>
                                    <option value="Siblings">Siblings</option>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Child">Child</option>
                                    <option value="Friend">Friend</option>
                                    <option value="Other">Other</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm font-medium text-neutral-900">{emergencyContact.relation || "-"}</div>
                        )}
                    </div>
                    <InfoRow
                        icon={Phone}
                        label="Phone"
                        value={emergencyContact.phone}
                        isEditing={editingSection === "emergency"}
                        onChange={(val: string) => setEmergencyContact({ ...emergencyContact, phone: val })}
                        placeholder="Phone number"
                    />
                </Section>
            </div>

            {/* RIGHT COL: FINANCE & DOCUMENTS */}
            <div className="space-y-6">
                <Section
                    id="finance"
                    title="Finance (Restricted)"
                    className="bg-neutral-50/50 border-neutral-200/60"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "finance"}
                    isSaving={isSaving}
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <div className="flex items-center gap-3 mb-4 text-neutral-400">
                        <CreditCard className="w-4 h-4" />
                        <div className="text-[10px] uppercase font-bold tracking-wider">Payroll & Bank Details</div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Bank Name</label>
                            {editingSection === "finance" ? (
                                <div className="relative">
                                    <select
                                        value={bankInfo.bank_name || ""}
                                        onChange={(e) => setBankInfo({ ...bankInfo, bank_name: e.target.value })}
                                        className="w-full h-9 text-sm pl-3 pr-8 rounded-lg border border-neutral-200 bg-neutral-50 hover:border-neutral-300 focus:bg-white focus:border-blue-600 outline-none transition-all appearance-none cursor-pointer font-medium"
                                    >
                                        <option value="">Select Bank...</option>
                                        <optgroup label="Common Banks">
                                            <option value="BCA">BCA (Bank Central Asia)</option>
                                            <option value="Mandiri">Mandiri</option>
                                            <option value="BNI">BNI</option>
                                            <option value="BRI">BRI</option>
                                            <option value="CIMB">CIMB Niaga</option>
                                            <option value="Permata">Bank Permata</option>
                                        </optgroup>
                                        <optgroup label="Digital Banks">
                                            <option value="Jago">Bank Jago</option>
                                            <option value="Blu">Blu by BCA</option>
                                            <option value="Jenius">Jenius (BTPN)</option>
                                            <option value="SeaBank">SeaBank</option>
                                        </optgroup>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm font-medium text-neutral-900">{bankInfo.bank_name || "Not set"}</div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Account Number</label>
                                <button
                                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                                >
                                    {showAccountNumber ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                            </div>
                            {editingSection === "finance" ? (
                                <Input
                                    placeholder="Account Number"
                                    value={bankInfo.account_number || ""}
                                    onChange={(e) => setBankInfo({ ...bankInfo, account_number: e.target.value })}
                                    className="h-8 text-sm"
                                />
                            ) : (
                                <div className="text-sm font-medium font-mono text-neutral-900">
                                    {showAccountNumber ? bankInfo.account_number : "•••• •••• ••••"}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Account Holder</label>
                            {editingSection === "finance" ? (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div
                                            onClick={() => {
                                                setIsCustomHolder(false);
                                                setBankInfo({ ...bankInfo, account_holder: person.name });
                                            }}
                                            className={clsx("w-3 h-3 rounded-full border transition-colors flex items-center justify-center", !isCustomHolder ? "bg-blue-600 border-blue-600" : "bg-white border-neutral-300")}
                                        >
                                            {!isCustomHolder && <div className="w-1 h-1 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-[10px] font-medium text-neutral-500">Same as Full Name</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div
                                            onClick={() => setIsCustomHolder(true)}
                                            className={clsx("w-3 h-3 rounded-full border transition-colors flex items-center justify-center", isCustomHolder ? "bg-blue-600 border-blue-600" : "bg-white border-neutral-300")}
                                        >
                                            {isCustomHolder && <div className="w-1 h-1 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-[10px] font-medium text-neutral-500">Custom Name</span>
                                    </label>
                                    {isCustomHolder && (
                                        <Input
                                            placeholder="Holder Name"
                                            value={bankInfo.account_holder || ""}
                                            onChange={(e) => setBankInfo({ ...bankInfo, account_holder: e.target.value })}
                                            className="h-8 text-sm mt-1"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm font-medium text-neutral-900">
                                    {isCustomHolder ? bankInfo.account_holder : person.name}
                                </div>
                            )}
                        </div>
                    </div>
                </Section>

                <Section title="Documents" collapsed>
                    <div className="space-y-3">
                        {documentCategories.map(({ label, category }) => {
                            const doc = documents.find(d => d.category === category);
                            return (
                                <DocumentRow
                                    key={category}
                                    name={doc?.name || label}
                                    status={doc?.status || "Missing"}
                                    isUploading={isUploading === category}
                                    onUpload={(file: File) => handleUpload(category, file)}
                                    onPreview={() => doc && handlePreview(doc)}
                                    onDownload={() => doc && handleDownload(doc)}
                                    onDelete={() => doc && handleDelete(doc)}
                                />
                            );
                        })}
                        <button className="w-full py-3 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl text-[10px] font-bold text-neutral-400 uppercase hover:bg-neutral-100 hover:border-neutral-300 transition-all flex items-center justify-center gap-2 group">
                            <Plus className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                            Add Document
                        </button>
                    </div>
                </Section>
            </div>

            <AddSocialModal
                isOpen={isAddSocialModalOpen}
                onClose={() => setIsAddSocialModalOpen(false)}
                onAdd={(platform, handle) => setSocialLinks({ ...socialLinks, [platform]: handle })}
                existingPlatforms={Object.keys(socialLinks)}
            />
            <EditConfirmationModal
                isOpen={!!confirmingSection}
                onClose={() => setConfirmingSection(null)}
                onConfirm={handleConfirmEdit}
            />
            <DocumentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => {
                    setIsPreviewOpen(false);
                    setPreviewUrl(null);
                }}
                url={previewUrl}
                type={previewType}
                name={previewName}
            />
        </div>
    );
}

function Section({ id, title, children, className, collapsed, onEdit, isEditing, isSaving, onSave, onCancel }: any) {
    return (
        <div className={clsx("bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all duration-300", isEditing && "ring-2 ring-blue-500/20 border-blue-200", className)}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={clsx("text-sm font-bold uppercase tracking-wide", isEditing ? "text-blue-600" : "text-neutral-900")}>{title}</h3>
                <div className="flex items-center gap-2">
                    {collapsed && <span className="text-[10px] text-neutral-400 font-medium bg-neutral-100 px-2 py-0.5 rounded-full">UI ONLY</span>}

                    {!collapsed && !isEditing && onEdit && (
                        <Button variant="text" size="sm" className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900" onClick={() => onEdit(id)}>
                            <Pencil className="w-3.5 h-3.5" />
                        </Button>
                    )}

                    {isEditing && (
                        <div className="flex items-center gap-1">
                            <Button variant="secondary" size="sm" className="h-7 w-7 p-0" onClick={onCancel}>
                                <X className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="primary" size="sm" className="h-7 w-7 p-0 bg-blue-600 border-blue-600 hover:bg-blue-700" onClick={onSave} disabled={isSaving}>
                                {isSaving ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <div className={clsx(isEditing ? "opacity-100" : "opacity-100")}>
                {children}
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value, locked, sensitive, isEditing, multiline, required, onChange, placeholder, error }: any) {
    return (
        <div className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">{label}</div>
                {locked && <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 ring-4 ring-neutral-50" title="Locked" />}
                {required && isEditing && <span className="text-blue-500 text-[10px] font-bold">*</span>}
            </div>

            <div className="flex items-center gap-2">
                {Icon && (
                    <div className={clsx(
                        "rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100 shrink-0 self-start",
                        isEditing ? "w-9 h-9" : "w-8 h-8"
                    )}>
                        <Icon className={isEditing ? "w-4 h-4" : "w-3.5 h-3.5"} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    {isEditing && !locked ? (
                        <>
                            {multiline ? (
                                <textarea
                                    value={value}
                                    onChange={(e) => onChange && onChange(e.target.value)}
                                    className={clsx(
                                        "w-full text-sm p-2 rounded-lg border bg-neutral-50 focus:bg-white outline-none transition-all resize-none",
                                        error ? "border-blue-500 ring-1 ring-blue-500/20" : "border-neutral-200 focus:border-blue-600"
                                    )}
                                    placeholder={placeholder}
                                    rows={3}
                                />
                            ) : (
                                <Input
                                    value={value}
                                    onChange={(e) => onChange && onChange(e.target.value)}
                                    className="h-9 text-sm"
                                    variant="filled"
                                    placeholder={placeholder}
                                    error={error}
                                />
                            )}
                            {error && multiline && <p className="text-[10px] text-blue-500 mt-1">{error}</p>}
                        </>
                    ) : (
                        <div className={clsx(
                            "text-sm font-medium break-words leading-relaxed",
                            sensitive ? "text-neutral-500 font-mono tracking-wider" : "text-neutral-900",
                            !Icon && "pl-0"
                        )}>
                            {value || "-"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SocialRow({ platform, handle, isEditing, onChange, onRemove }: any) {
    const isDefault = ["LinkedIn", "Instagram"].includes(platform);
    if (!handle && !isEditing && !isDefault) return null;

    const getUrl = () => {
        if (!handle) return "#";
        const cleanHandle = handle.replace('@', '');
        switch (platform.toLowerCase()) {
            case "instagram": return `https://instagram.com/${cleanHandle}`;
            case "linkedin": return `https://linkedin.com/in/${cleanHandle}`;
            case "x": return `https://x.com/${cleanHandle}`;
            case "youtube": return `https://youtube.com/@${cleanHandle}`;
            case "facebook": return `https://facebook.com/${cleanHandle}`;
            case "behance": return `https://behance.net/${cleanHandle}`;
            case "dribbble": return `https://dribbble.com/${cleanHandle}`;
            default: return handle.startsWith('http') ? handle : `https://${handle}`;
        }
    };

    return (
        <div className={clsx("flex items-center justify-between p-2 rounded-lg border transition-all", isEditing ? "bg-white border-neutral-200" : "border-neutral-100 bg-neutral-50/30")}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-neutral-400 uppercase w-16">{platform}</span>
                {isEditing ? (
                    <Input
                        value={handle || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-7 text-xs flex-1"
                        placeholder={`Username`}
                    />
                ) : (
                    <a
                        href={getUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                    >
                        {handle ? `@${handle.replace('@', '')}` : "Add account"}
                        {handle && <ExternalLink className="w-2.5 h-2.5" />}
                    </a>
                )}
            </div>
            {isEditing && !isDefault && (
                <button onClick={onRemove} className="ml-2 text-neutral-300 hover:text-blue-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

function DocumentRow({ name, status, onUpload, onPreview, onDownload, onDelete, isUploading }: any) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={clsx(
            "group p-3.5 rounded-2xl border transition-all",
            status === "Missing" ? "border-neutral-100 bg-white" : "border-blue-100 bg-blue-50/30 shadow-sm"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        status === "Missing" ? "bg-neutral-50 text-neutral-400" : "bg-blue-100 text-blue-600"
                    )}>
                        {isUploading ? <Activity className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="text-[13px] font-bold text-neutral-900 leading-tight mb-0.5">{name}</div>
                        <div className={clsx(
                            "text-[10px] font-bold uppercase tracking-wider",
                            status === "Verified" ? "text-emerald-500" :
                                status === "Missing" ? "text-neutral-300" : "text-blue-500"
                        )}>
                            {status}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {status !== "Missing" && (
                        <>
                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-full bg-white border-neutral-200 hover:border-blue-300 hover:text-blue-600 shadow-sm" onClick={onPreview} title="Preview">
                                <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-full bg-white border-neutral-200 hover:border-blue-300 hover:text-blue-600 shadow-sm" onClick={onDownload} title="Download">
                                <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-full bg-white border-neutral-200 hover:border-red-300 hover:text-red-500 shadow-sm" onClick={onDelete} title="Delete">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}

                    {status === "Missing" && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full bg-white border-neutral-200 hover:border-blue-300 hover:text-blue-600 shadow-sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            title="Upload"
                        >
                            {isUploading ? <Activity className="w-4 h-4 animate-spin text-blue-500" /> : <Plus className="w-4 h-4" />}
                        </Button>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUpload(file);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function DocumentPreviewModal({ isOpen, onClose, url, type, name }: any) {
    if (!isOpen) return null;

    const isImage = type?.startsWith('image/');
    const isPDF = type === 'application/pdf' || name?.toLowerCase().endsWith('.pdf');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
                <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900">{name}</h3>
                        <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">{type}</p>
                    </div>
                    <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex-1 bg-neutral-50 overflow-auto p-4 flex items-center justify-center">
                    {isImage && <img src={url} alt={name} className="max-w-full max-h-full object-contain shadow-lg rounded-lg" />}
                    {isPDF && <iframe src={url} className="w-full h-full border-0 rounded-lg shadow-lg" />}
                    {!isImage && !isPDF && (
                        <div className="text-center">
                            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                            <p className="text-sm text-neutral-500 font-medium">Preview not available for this file type.</p>
                            <Button variant="primary" size="sm" className="mt-4" onClick={() => window.open(url, '_blank')}>
                                Download instead
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


function AddressFields({ data, isEditing, onChange }: { data: any, isEditing: boolean, onChange: (field: string, val: string) => void }) {
    const fields = [
        { key: "street", label: "Street / Detail", multiline: true },
        { key: "village", label: "Village / Desa" },
        { key: "district", label: "District / Kecamatan" },
        { key: "city", label: "City / Kab" },
        { key: "province", label: "Province" },
        { key: "postal_code", label: "Post Code" }
    ];

    if (!isEditing) {
        if (!data || Object.keys(data).length === 0) return <div className="text-sm text-neutral-400 italic">No address details.</div>;
        return (
            <div className="text-[11px] leading-relaxed text-neutral-600">
                {data.street && <div className="font-medium text-neutral-900 mb-1">{data.street}</div>}
                <div className="flex flex-wrap gap-x-2">
                    {data.village && <span>{data.village},</span>}
                    {data.district && <span>{data.district},</span>}
                    {data.city && <span>{data.city},</span>}
                    {data.province && <span>{data.province}</span>}
                    {data.postal_code && <span className="text-neutral-400">{data.postal_code}</span>}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
                <div key={f.key} className={clsx("space-y-1", f.multiline ? "col-span-2" : "col-span-1")}>
                    <label className="text-[9px] uppercase font-bold text-neutral-400 tracking-wide">{f.label}</label>
                    {f.multiline ? (
                        <textarea
                            value={data[f.key] || ""}
                            onChange={(e) => onChange(f.key, e.target.value)}
                            rows={2}
                            className="w-full text-xs p-2 rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none"
                        />
                    ) : (
                        <Input
                            value={data[f.key] || ""}
                            onChange={(e) => onChange(f.key, e.target.value)}
                            className="h-7 text-xs"
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
