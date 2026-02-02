"use client";

import { useState, useEffect } from "react";
import {
    Briefcase, Building, BadgeCheck, FileClock, History, Clock,
    Lock, Pencil, Check, X, Activity, MapPin, Calendar, Plus, Trash2
} from "lucide-react";
import { Input } from "@/shared/ui/primitives/input/input";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import clsx from "clsx";
import EditConfirmationModal from "../modals/EditConfirmationModal";
import DeleteConfirmationModal from "../modals/DeleteConfirmationModal";
import AlertModal from "../modals/AlertModal";
import {
    WorkloadStatus,
    WorkloadSource,
    FeedbackVisibility
} from "@/lib/types/people-types";
import { Person } from "@/components/feel/people/types";
import { OrganizationRolePermission } from "@/lib/types/organization";
import { updatePeopleProfile, addCareerHistory, deleteCareerHistory, fetchPeopleDirectory } from "@/lib/api/people";
import {
    fetchDepartments,
    fetchPositions,
    fetchLevels
} from "@/lib/api/organization";
import {
    fetchEmploymentTypes,
    fetchWorkStatuses,
    fetchWorkSchedules
} from "@/lib/api/employment";

// Level code to Roman numeral conversion - will be replaced by fetched data
const DEFAULT_ROMAN_MAP: Record<number, string> = {
    0: "0",
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
    9: "IX",
};

// CSS to hide number input spinners
const hideSpinnerStyle = `
    input[type=number]::-webkit-outer-spin-button,
    input[type=number]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type=number] {
        -moz-appearance: textfield;
    }
`;

export default function EmploymentTab({ person, isSystem, isMe, onUpdate }: { person: Person, isSystem: boolean, isMe: boolean, onUpdate?: () => void }) {
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmingSection, setConfirmingSection] = useState<string | null>(null);
    const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // --- SETUP DATA ---
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [levels, setLevels] = useState<any[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
    const [workStatuses, setWorkStatuses] = useState<any[]>([]);
    const [workSchedules, setWorkSchedules] = useState<any[]>([]);
    const [takenSequences, setTakenSequences] = useState<string[]>([]);

    // --- FORM STATE ---
    // Role Section
    const [positionId, setPositionId] = useState(person.position_id || "");
    const [departmentId, setDepartmentId] = useState(person.department_id || "");
    const [levelId, setLevelId] = useState(person.level_id || "");

    // Status Section
    const [employmentTypeId, setEmploymentTypeId] = useState(person.employment_type_id || "");
    const [workStatusId, setWorkStatusId] = useState(person.work_status_id || "");

    // Identification Section
    const [idCode, setIdCode] = useState(person.id_code || person.display_id || "");
    // Extract sequence from existing ID Number (last 3 digits) or default to "001"
    const existingSeq = (person.id_number || person.system_id || "").slice(-3);
    const [orderNumber, setOrderNumber] = useState(existingSeq && existingSeq !== "000" ? existingSeq : "001");

    // Contract Section
    const [joinDate, setJoinDate] = useState(person.join_date || (person.joinedAt && !person.joinedAt.includes('Unknown') ? person.joinedAt : ""));

    // Schedule Section
    const [scheduleId, setScheduleId] = useState(person.schedule_id || "");
    const [office, setOffice] = useState(person.office || "Jakarta HQ");

    // History Add State
    const [isAddingHistory, setIsAddingHistory] = useState(false);
    const [newHistoryTitle, setNewHistoryTitle] = useState("");
    const [newHistoryDate, setNewHistoryDate] = useState("");
    const [newHistoryType, setNewHistoryType] = useState("Promotion");

    // Contract Details State
    const [contractEndDate, setContractEndDate] = useState(person.contract_end_date || "");
    const [isUnlimitedContract, setIsUnlimitedContract] = useState(!person.contract_end_date);
    const [probationStatus, setProbationStatus] = useState(person.probation_status || "");

    // ID Generation Logic - Dynamic from setup data
    const generateIds = () => {
        const dept = departments.find(d => d.id === departmentId);
        const pos = positions.find(p => p.id === positionId);
        const lvl = levels.find(l => l.id === levelId);

        // Extract codes from setup data
        const clusterCode = dept?.cluster_code?.toString() || "0";
        const posCode = pos?.category_code?.toString() || "0";
        const levelCode = lvl?.level_code?.toString() || "0";  // Use actual level code, no cap

        // Year from join date
        const year = joinDate ? new Date(joinDate).getFullYear().toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
        const fullYear = joinDate ? new Date(joinDate).getFullYear().toString() : new Date().getFullYear().toString();

        // Sequence - use user-selected orderNumber
        const sequence = orderNumber.padStart(3, '0');

        // Generate ID Number: [LEVEL][DEPT][POS][YY][SEQ]
        const idNumber = `${levelCode}${clusterCode}${posCode}${year}${sequence}`;

        // Generate ID Code: ADY-[ROMAN]-[DEPTCODE][POSCODE]-[YEAR][SEQ]
        const roman = lvl?.roman_code || DEFAULT_ROMAN_MAP[lvl?.level_code] || "0";
        const deptAbbr = dept?.code ? dept.code.split('-')[1] || "" : "";
        const posAbbr = pos?.code || "";
        const deptPosCode = (deptAbbr && posAbbr) ? `${deptAbbr}${posAbbr}` : "STAFF";
        const idCodeGenerated = `ADY-${roman}-${deptPosCode}-${fullYear}${sequence}`;

        // Always return calculated values based on current selections
        return {
            idNumber: idNumber,
            idCode: idCodeGenerated
        };
    };

    const ids = generateIds();

    useEffect(() => {
        loadSetupData();
    }, []);

    const loadSetupData = async () => {
        const [depts, pos, lvls, types, statuses, schedules] = await Promise.all([
            fetchDepartments(),
            fetchPositions(),
            fetchLevels(),
            fetchEmploymentTypes(),
            fetchWorkStatuses(),
            fetchWorkSchedules()
        ]);
        setDepartments(depts);
        setPositions(pos);
        setLevels(lvls);
        setEmploymentTypes(types);
        setWorkStatuses(statuses);
        setWorkSchedules(schedules);

        // Fetch taken sequences from all employees
        const people = await fetchPeopleDirectory();
        const sequences = people
            .filter(p => p.id !== person.id) // Exclude current person
            .map(p => (p.id_number || p.system_id || "").slice(-3))
            .filter(seq => seq && seq !== "000");
        setTakenSequences(sequences);
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
        setIsSaving(true);
        try {
            const updates: any = {};

            if (editingSection === "current-role") {
                updates.position_id = positionId;
                updates.department_id = departmentId;
                // Automatically update IDs when role changes
                updates.id_number = ids.idNumber;
                updates.display_id = ids.idCode;
            } else if (editingSection === "status") {
                updates.employment_type_id = employmentTypeId;
                updates.work_status_id = workStatusId;
                updates.level_id = levelId;
                // Automatically update IDs when level changes
                updates.id_number = ids.idNumber;
                updates.display_id = ids.idCode;
            } else if (editingSection === "identification") {
                updates.display_id = idCode || ids.idCode; // Will be mapped to id_code in API
                updates.id_number = ids.idNumber;
            } else if (editingSection === "schedule") {
                updates.schedule_id = scheduleId; // Will need backend support if not already
                updates.office = office;
            } else if (editingSection === "contract") {
                updates.join_date = joinDate;
                updates.contract_end_date = isUnlimitedContract ? null : contractEndDate;
                updates.probation_status = probationStatus;
            }

            const success = await updatePeopleProfile(person.id, updates);
            if (success) {
                setEditingSection(null);
                onUpdate?.();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingSection(null);
        // Reset local state to original values
        setPositionId(person.position_id || "");
        setDepartmentId(person.department_id || "");
        setLevelId(person.level_id || "");
        setEmploymentTypeId(person.employment_type_id || "");
        setWorkStatusId(person.work_status_id || "");
        setIdCode(person.id_code || person.display_id || "");
        setScheduleId(person.schedule_id || "");
        setJoinDate(person.join_date || (person.joinedAt && !person.joinedAt.includes('Unknown') ? person.joinedAt : ""));
        setContractEndDate(person.contract_end_date || "");
        setIsUnlimitedContract(!person.contract_end_date);
        setProbationStatus(person.probation_status || "");
        setOffice(person.office || "Jakarta HQ");
    };

    const handleAddHistory = async () => {
        if (!newHistoryTitle || !newHistoryDate) {
            setAlertMessage("Please fill in both the event title and date.");
            return;
        }

        setIsSaving(true);
        try {
            const success = await addCareerHistory({
                user_id: person.id,
                title: newHistoryTitle,
                event_date: newHistoryDate,
                type: newHistoryType
            });

            if (success) {
                setIsAddingHistory(false);
                setNewHistoryTitle("");
                setNewHistoryDate("");
                onUpdate?.();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteHistory = (id: string) => {
        setDeletingHistoryId(id);
    };

    const confirmDeleteHistory = async () => {
        if (!deletingHistoryId) return;

        try {
            const success = await deleteCareerHistory(deletingHistoryId);
            if (success) {
                onUpdate?.();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setDeletingHistoryId(null);
        }
    };

    if (isSystem) {
        return (
            <div className="p-8 text-center text-neutral-500 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <Briefcase className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="font-medium text-neutral-900">Employment Data Disabled</h3>
                <p className="text-sm mt-1">System accounts do not have employment records.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LEFT COL: CURRENT ROLE */}
            <div className="space-y-6">
                <Section
                    id="current-role"
                    title="Current Role"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "current-role"}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSaving={isSaving}
                >
                    <InfoRow
                        icon={Building}
                        label="Department"
                        value={person.department}
                        isEditing={editingSection === "current-role"}
                        type="select"
                        options={departments.map(d => ({ label: d.name, value: d.id }))}
                        selectedValue={departmentId}
                        onChange={(val: string) => {
                            setDepartmentId(val);
                            // Only reset position if the current position doesn't belong to the new department
                            const currentPos = positions.find(p => p.id === positionId);
                            if (currentPos && currentPos.department_id !== val) {
                                setPositionId("");
                            }
                        }}
                    />
                    <InfoRow
                        icon={Briefcase}
                        label="Position"
                        value={person.title}
                        isEditing={editingSection === "current-role"}
                        type="select"
                        options={positions.filter(p => !departmentId || p.department_id === departmentId).map(p => ({ label: p.name, value: p.id }))}
                        selectedValue={positionId}
                        onChange={setPositionId}
                    />
                </Section>

                <Section
                    id="status"
                    title="Employment Status"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "status"}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSaving={isSaving}
                >
                    <InfoRow
                        icon={FileClock}
                        label="Employment Type"
                        value={person.type}
                        isEditing={editingSection === "status"}
                        type="select"
                        options={employmentTypes.map(t => ({ label: t.name, value: t.id }))}
                        selectedValue={employmentTypeId}
                        onChange={(val: string) => {
                            setEmploymentTypeId(val);
                            const newType = employmentTypes.find(t => t.id === val);
                            const currentLvl = levels.find(l => l.id === levelId);
                            if (newType && currentLvl) {
                                if (currentLvl.level_code < (newType.min_level_code ?? 0) || currentLvl.level_code > (newType.max_level_code ?? 5)) {
                                    setLevelId("");
                                }
                            }
                        }}
                    />
                    <InfoRow
                        icon={BadgeCheck}
                        label="Level"
                        value={person.level || "-"}
                        isEditing={editingSection === "status"}
                        type="select"
                        options={levels.filter((l: any) => {
                            const selectedType = employmentTypes.find(t => t.id === employmentTypeId);
                            if (!selectedType) return true;
                            return l.level_code >= (selectedType.min_level_code ?? 0) && l.level_code <= (selectedType.max_level_code ?? 5);
                        }).map((l: any) => ({ label: `${l.roman_code} - ${l.name}`, value: l.id }))}
                        selectedValue={levelId}
                        onChange={setLevelId}
                    />
                    <InfoRow
                        icon={Activity}
                        label="Work Status"
                        value={person.status}
                        isEditing={editingSection === "status"}
                        type="select"
                        options={workStatuses.map(s => ({ label: s.name, value: s.id }))}
                        selectedValue={workStatusId}
                        onChange={setWorkStatusId}
                    />
                    {!editingSection && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-neutral-100 hidden">
                            <Badge variant="blue">{person.type}</Badge>
                            <Badge variant={person.status === "Active" ? "green" : "neutral"}>{person.status}</Badge>
                        </div>
                    )}
                </Section>
            </div>

            {/* MIDDLE COL: IDENTITY & IDs */}
            <div className="space-y-6">
                <Section
                    id="identification"
                    title="Employee Identification"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "identification"}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSaving={isSaving}
                >
                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 space-y-4">
                        <style>{hideSpinnerStyle}</style>
                        {/* Order Number - Editable */}
                        <div>
                            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide mb-1">Order Number</div>
                            {editingSection === "identification" ? (
                                <>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={999}
                                        value={orderNumber}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                            setOrderNumber(val || "1");
                                        }}
                                        placeholder="001"
                                        className={clsx(
                                            "font-mono text-lg font-bold text-neutral-700 bg-white h-10 w-24",
                                            takenSequences.includes(orderNumber.padStart(3, '0')) && "border-red-500 focus:ring-red-500"
                                        )}
                                    />
                                    {takenSequences.includes(orderNumber.padStart(3, '0')) && (
                                        <p className="text-xs text-red-500 mt-1 font-medium">
                                            ⚠️ Order #{orderNumber.padStart(3, '0')} is already taken
                                        </p>
                                    )}
                                </>
                            ) : (
                                <div className="font-mono text-lg font-bold text-neutral-700">{orderNumber.padStart(3, '0')}</div>
                            )}
                            <p className="text-[10px] text-neutral-400 mt-1">3-digit sequence (001-999)</p>
                        </div>

                        {/* ID Number - Auto Generated */}
                        <div className="pt-3 border-t border-neutral-200/50">
                            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide mb-1">ID Number (Auto)</div>
                            <div className="relative">
                                <div className="font-mono text-lg font-bold text-neutral-900 tracking-wider">
                                    {editingSection === "identification" ? ids.idNumber : (person.id_number || person.system_id || ids.idNumber)}
                                </div>
                                <Lock className="w-4 h-4 text-neutral-400 absolute right-0 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>

                        {/* ID Code - Derived */}
                        <div className="pt-3 border-t border-neutral-200/50">
                            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide mb-1">ID Code</div>
                            <div className="font-mono text-xs font-bold text-blue-600 truncate">
                                {editingSection === "identification" ? ids.idCode : (person.id_code || person.display_id || ids.idCode)}
                            </div>
                        </div>
                    </div>
                </Section>

                <Section
                    id="schedule"
                    title="Work Schedule"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "schedule"}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSaving={isSaving}
                >
                    {(() => {
                        const selectedSchedule = workSchedules.find(s => s.id === scheduleId);
                        const config = selectedSchedule?.days_config || {};
                        const type = selectedSchedule?.type || 'Fixed';

                        let scheduleDisplay = null;
                        let totalWeeklyHours = 0;

                        // Helper to calculate hours between two time strings
                        const calcHours = (start: string, end: string, breakMins: number) => {
                            if (!start || !end) return 0;
                            const [sH, sM] = start.split(':').map(Number);
                            const [eH, eM] = end.split(':').map(Number);
                            const minutes = (eH * 60 + eM) - (sH * 60 + sM) - breakMins;
                            return Math.max(0, Math.round(minutes / 60 * 10) / 10);
                        };

                        if (type === 'Flexible') {
                            const daysPerWeek = config.days_per_week || 5;
                            const dailyHours = calcHours(selectedSchedule?.start_time || '09:00', selectedSchedule?.end_time || '17:00', selectedSchedule?.break_duration_minutes || 60);
                            totalWeeklyHours = dailyHours * daysPerWeek;

                            scheduleDisplay = (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-orange-500" />
                                        <span className="text-xs font-medium text-neutral-700">Flexible Schedule</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-neutral-400" />
                                        <span className="text-xs font-medium text-neutral-700">{daysPerWeek} days / week</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs font-semibold text-blue-600">{totalWeeklyHours}h / week</span>
                                    </div>
                                </div>
                            );
                        } else if (type === 'Shift') {
                            scheduleDisplay = (
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs font-medium text-neutral-700">Shift Based (Varies by roster)</span>
                                </div>
                            );
                        } else {
                            // Fixed / Custom
                            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                            const workingDays = config.working_days || [];
                            const customHours = config.custom_hours || {};
                            const activeDays = days.filter(d => workingDays.includes(d));

                            // Group by time range
                            const groups: Record<string, string[]> = {};

                            activeDays.forEach(day => {
                                const custom = customHours[day];
                                const start = custom?.start || selectedSchedule?.start_time || '09:00';
                                const end = custom?.end || selectedSchedule?.end_time || '17:00';
                                const brk = custom?.break ?? selectedSchedule?.break_duration_minutes ?? 60;

                                // Add to total hours
                                totalWeeklyHours += calcHours(start, end, brk);

                                // Create group key
                                const timeStr = `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
                                if (!groups[timeStr]) groups[timeStr] = [];
                                groups[timeStr].push(day);
                            });

                            scheduleDisplay = (
                                <div className="space-y-1.5">
                                    {Object.entries(groups).map(([timeRange, grpDays]) => {
                                        const isGroupMonFri = grpDays.length === 5 && grpDays[0] === 'Mon' && grpDays[4] === 'Fri';
                                        const label = isGroupMonFri ? "Mon-Fri" : grpDays.join(", ");
                                        return (
                                            <div key={label} className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-neutral-400" />
                                                <div className="flex items-center gap-1.5 text-xs text-neutral-700">
                                                    <span className="font-semibold w-14">{label}</span>
                                                    <span className="text-neutral-400">•</span>
                                                    <span className="font-mono">{timeRange}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {activeDays.length === 0 && (
                                        <p className="text-xs text-neutral-500 italic">No working days configured</p>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-3">
                                <InfoRow
                                    icon={Clock}
                                    label="Schedule Type"
                                    value={selectedSchedule?.name || "Regular"}
                                    isEditing={editingSection === "schedule"}
                                    type="select"
                                    options={workSchedules.map(s => ({ label: s.name, value: s.id }))}
                                    selectedValue={scheduleId}
                                    onChange={setScheduleId}
                                />

                                {/* Schedule Details Card */}
                                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 space-y-3">
                                    {/* Dynamic Display based on Type */}
                                    {scheduleDisplay}

                                    {/* Weekly Summary (if applicable and not Flexible/Shift handled inside) */}
                                    {type === 'Fixed' && totalWeeklyHours > 0 && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/50">
                                            <Activity className="w-4 h-4 text-blue-500" />
                                            <span className="text-xs font-semibold text-blue-600">{totalWeeklyHours}h / week</span>
                                        </div>
                                    )}
                                </div>

                                <InfoRow
                                    icon={MapPin}
                                    label="Office Base"
                                    value={office}
                                    isEditing={editingSection === "schedule"}
                                    type="select"
                                    options={[{ label: "Jakarta HQ", value: "Jakarta HQ" }]}
                                    selectedValue={office}
                                    onChange={setOffice}
                                />
                            </div>
                        );
                    })()}
                </Section>
            </div>

            {/* RIGHT COL: CONTRACT & HISTORY */}
            <div className="space-y-6">
                <Section
                    id="contract"
                    title="Contract Details"
                    onEdit={handleEditClick}
                    isEditing={editingSection === "contract"}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSaving={isSaving}
                >
                    <InfoRow
                        icon={Calendar}
                        label="Join Date"
                        value={person.joinedAt}
                        isEditing={editingSection === "contract"}
                        type="date"
                        selectedValue={joinDate}
                        onChange={setJoinDate}
                    />

                    {/* End Date - Custom Logic for Unlimited Toggle */}
                    <div className="py-2">
                        <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide mb-1">End Date</div>
                        {editingSection === "contract" ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="unlimited-contract"
                                        checked={isUnlimitedContract}
                                        onChange={(e) => {
                                            setIsUnlimitedContract(e.target.checked);
                                            if (e.target.checked) setContractEndDate("");
                                        }}
                                        className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="unlimited-contract" className="text-sm text-neutral-700 font-medium select-none">
                                        Unlimited / Permanent
                                    </label>
                                </div>
                                {!isUnlimitedContract && (
                                    <Input
                                        type="date"
                                        value={contractEndDate}
                                        onChange={(e) => setContractEndDate(e.target.value)}
                                        className="h-9 text-xs"
                                        variant="filled"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="text-sm font-medium text-neutral-900">
                                {person.contract_end_date
                                    ? new Date(person.contract_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : "Unlimited"}
                            </div>
                        )}
                    </div>

                    {/* Probation End - Auto-calc Logic */}
                    {(() => {
                        // Calculate auto-pass status
                        const jDate = person.join_date ? new Date(person.join_date) : new Date();
                        const probEndDate = new Date(jDate);
                        probEndDate.setMonth(probEndDate.getMonth() + 3);
                        const isAutoPassed = new Date() > probEndDate;

                        // Default to auto-passed if not set and time has passed
                        const currentStatus = probationStatus || (isAutoPassed ? "Passed" : "On Probation");
                        // For display (not editing)
                        const displayStatus = person.probation_status || (isAutoPassed ? "Passed" : "On Probation");

                        // Formatted probation end date for display/info
                        const probEndDateStr = probEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                        return (
                            <div className="py-2">
                                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide mb-1">Probation Status</div>
                                {editingSection === "contract" ? (
                                    <div className="space-y-1">
                                        <Select
                                            variant="filled"
                                            options={[
                                                { label: "Passed", value: "Passed" },
                                                { label: "On Probation (3 Months)", value: "On Probation" },
                                                { label: "Extended", value: "Extended" },
                                                { label: "Failed", value: "Failed" }
                                            ]}
                                            value={currentStatus}
                                            onChange={setProbationStatus}
                                            className="h-8 text-xs"
                                            accentColor="blue"
                                        />
                                        {currentStatus === "On Probation" && (
                                            <p className="text-[10px] text-neutral-500">
                                                Ends on {probEndDateStr}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-medium text-neutral-900">{displayStatus}</div>
                                        {displayStatus === "On Probation" && (
                                            <Badge variant="blue">Ends {probEndDateStr}</Badge>
                                        )}
                                        {displayStatus === "Passed" && (
                                            <Badge variant="green">Passed</Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </Section>

                <Section
                    title="History"
                    className="relative"
                >
                    <div className="absolute top-5 right-5 z-10">
                        <Button
                            variant="text"
                            size="sm"
                            className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900"
                            onClick={() => setIsAddingHistory(!isAddingHistory)}
                        >
                            <Plus className={clsx("w-4 h-4 transition-transform", isAddingHistory && "rotate-45")} />
                        </Button>
                    </div>

                    {isAddingHistory && (
                        <div className="mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <input
                                placeholder="Event Title (e.g. Promoted to Lead)"
                                className="w-full text-xs font-medium bg-white border border-neutral-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={newHistoryTitle}
                                onChange={(e) => setNewHistoryTitle(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={newHistoryDate}
                                    onChange={(e) => setNewHistoryDate(e.target.value)}
                                    className="h-8 text-xs flex-1"
                                    variant="filled"
                                />
                                <Select
                                    variant="filled"
                                    options={[
                                        { label: "Promotion", value: "Promotion" },
                                        { label: "Contract", value: "Contract" },
                                        { label: "Join", value: "Join" },
                                        { label: "Transfer", value: "Transfer" },
                                        { label: "Other", value: "Other" }
                                    ]}
                                    value={newHistoryType}
                                    onChange={setNewHistoryType}
                                    className="h-8 text-xs flex-1"
                                    accentColor="blue"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <Button size="sm" variant="secondary" onClick={() => setIsAddingHistory(false)} className="h-7 text-xs">Cancel</Button>
                                <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={handleAddHistory}
                                    disabled={isSaving}
                                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                >
                                    {isSaving ? "Saving..." : "Add Event"}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 relative before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-100">
                        {(person.history || []).length > 0 ? (
                            (person.history || [])
                                .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
                                .map((h: any) => (
                                    <HistoryItem
                                        key={h.id}
                                        id={h.id}
                                        date={new Date(h.event_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                        title={h.title}
                                        type={h.type}
                                        onDelete={handleDeleteHistory}
                                        isManual={h.is_manual}
                                    />
                                ))
                        ) : (
                            <div className="pl-6 py-2 text-xs text-neutral-400 italic">
                                No history recorded yet.
                            </div>
                        )}
                    </div>
                </Section>
            </div>

            <EditConfirmationModal
                isOpen={!!confirmingSection}
                onClose={() => setConfirmingSection(null)}
                onConfirm={handleConfirmEdit}
            />

            <DeleteConfirmationModal
                isOpen={!!deletingHistoryId}
                onClose={() => setDeletingHistoryId(null)}
                onConfirm={confirmDeleteHistory}
                title="Delete Career Event"
                message="Are you sure you want to delete this career history event? This action cannot be undone."
            />

            <AlertModal
                isOpen={!!alertMessage}
                onClose={() => setAlertMessage(null)}
                title="Validation Error"
                message={alertMessage || ""}
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
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value, isEditing, type = "text", options = [], selectedValue, onChange, locked }: any) {
    return (
        <div className="py-2 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2 mb-1">
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">{label}</div>
                {locked && <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 ring-4 ring-neutral-50" title="Locked" />}
            </div>

            <div className="flex items-center gap-3">
                {Icon && (
                    <div className={clsx(
                        "rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100 shrink-0 self-start",
                        isEditing ? "w-8 h-8" : "w-7 h-7"
                    )}>
                        <Icon className={isEditing ? "w-3.5 h-3.5" : "w-3 h-3"} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    {isEditing && !locked ? (
                        <>
                            {type === "select" ? (
                                <Select
                                    variant="filled"
                                    options={options}
                                    value={selectedValue}
                                    onChange={onChange}
                                    className="h-8 text-xs"
                                    accentColor="blue"
                                />
                            ) : type === "date" ? (
                                <Input
                                    type="date"
                                    value={selectedValue}
                                    onChange={(e) => onChange && onChange(e.target.value)}
                                    className="h-8 text-xs"
                                    variant="filled"
                                />
                            ) : (
                                <Input
                                    value={selectedValue}
                                    onChange={(e) => onChange && onChange(e.target.value)}
                                    className="h-8 text-xs"
                                    variant="filled"
                                />
                            )}
                        </>
                    ) : (
                        <div className="text-sm font-medium text-neutral-900 truncate">
                            {value || "-"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Badge({ children, variant = "neutral" }: { children: React.ReactNode, variant?: "neutral" | "blue" | "green" }) {
    const styles = {
        neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        green: "bg-emerald-50 text-emerald-700 border-emerald-100"
    };

    return (
        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide", styles[variant])}>
            {children}
        </span>
    );
}

function HistoryItem({ id, date, title, type, onDelete, isManual }: any) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="flex gap-3 relative pl-5 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-blue-500 z-10" />
            <div className="flex-1">
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">{date}</div>
                <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-neutral-900">{title}</div>
                    {onDelete && isManual && (
                        <button
                            onClick={() => onDelete(id)}
                            className={clsx(
                                "text-neutral-300 hover:text-red-500 transition-colors p-1 -mr-2 -mt-1 opacity-0 group-hover:opacity-100",
                                "transition-opacity"
                            )}
                            title="Delete event"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                {type && <div className="text-xs text-neutral-500 mt-0.5">{type}</div>}
            </div>
        </div>
    );
}

