"use client";

import { useEffect, useState } from "react";
import { WorkSchedule } from "@/lib/types/organization";
import { fetchWorkSchedules, upsertWorkSchedule, deleteWorkSchedule } from "@/lib/api/employment";
import { PortalTooltip } from "../components/PortalTooltip";
import { SortableTable, Column } from "../components/SortableTable";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Info, Pencil, Trash2, Plus, AlertTriangle, X, Clock, Calendar } from "lucide-react";

export default function WorkScheduleTable({ isLocked }: { isLocked?: boolean }) {
    const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<WorkSchedule | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<WorkSchedule>>({
        name: "",
        type: "Fixed",
        start_time: "09:00",
        end_time: "17:00",
        break_duration_minutes: 60,
        timezone: "Asia/Jakarta",
        status: "Active"
    });

    useEffect(() => {
        loadData();
    }, []);

    // Listen for Mobile FAB
    useEffect(() => {
        const handleFabAction = (e: CustomEvent) => {
            if (e.detail?.id === 'EMPLOYMENT_ADD') {
                handleAdd();
            }
        };
        window.addEventListener('fab-action', handleFabAction as EventListener);
        return () => window.removeEventListener('fab-action', handleFabAction as EventListener);
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchWorkSchedules();
        setSchedules(data);
        setIsLoading(false);
    };

    const handleAdd = () => {
        setEditingSchedule(null);
        setFormData({
            name: "",
            type: "Fixed",
            start_time: "09:00",
            end_time: "17:00",
            break_duration_minutes: 60,
            timezone: "Asia/Jakarta",
            status: "Active"
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item: WorkSchedule) => {
        setEditingSchedule(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: WorkSchedule) => {
        setScheduleToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!scheduleToDelete) return;
        await deleteWorkSchedule(scheduleToDelete.id);
        setIsDeleteModalOpen(false);
        setScheduleToDelete(null);
        loadData();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSaving(true);
        try {
            const payload = { ...formData };
            if (editingSchedule) {
                payload.id = editingSchedule.id;
            }

            const result = await upsertWorkSchedule(payload);
            if (result) {
                setIsModalOpen(false);
                loadData();
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to parse config for day row
    const getDayConfig = (day: string) => {
        const config = formData.days_config || {};
        const isWorkingDay = config.working_days?.includes(day);
        const custom = config.custom_hours?.[day];
        return {
            isActive: isWorkingDay,
            start: custom?.start || formData.start_time,
            end: custom?.end || formData.end_time,
            break: custom?.break ?? formData.break_duration_minutes
        };
    };

    const handleDayToggle = (day: string, active: boolean) => {
        const currentConfig = formData.days_config || { working_days: [], custom_hours: {} };
        const currentDays = currentConfig.working_days || [];

        let newDays = active
            ? [...currentDays, day]
            : currentDays.filter((d: string) => d !== day);

        // Sort days logically
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        newDays.sort((a: string, b: string) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

        setFormData({
            ...formData,
            days_config: {
                ...currentConfig,
                working_days: newDays
            }
        });
    };

    const handleDayTimeChange = (day: string, field: 'start' | 'end', value: string) => {
        const currentConfig = formData.days_config || { working_days: [], custom_hours: {} };
        const customHours = currentConfig.custom_hours || {};

        // If value matches global default, remove custom entry to keep it clean? 
        // Or just always store custom if user touched it? Let's always store for robustness.
        setFormData({
            ...formData,
            days_config: {
                ...currentConfig,
                custom_hours: {
                    ...customHours,
                    [day]: {
                        ...(customHours[day] || { start: formData.start_time, end: formData.end_time }),
                        [field]: value
                    }
                }
            }
        });
    };

    const columns: Column<WorkSchedule>[] = [
        {
            key: "name",
            header: "Schedule Name",
            sortable: true,
            width: "25%",
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-neutral-900">{item.name}</span>
                    <span className="text-xs text-neutral-500">{item.timezone}</span>
                </div>
            )
        },
        {
            key: "days_config",
            header: "Schedule Details",
            width: "50%",
            render: (item) => {
                const config = item.days_config || {};

                // Helper for the icon shell
                const IconShell = ({ color, icon: Icon }: { color: string, icon: any }) => {
                    const colorClasses: Record<string, string> = {
                        orange: "bg-orange-50 text-orange-600",
                        blue: "bg-blue-50 text-blue-600",
                        purple: "bg-purple-50 text-purple-600",
                    };
                    return (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorClasses[color] || colorClasses.blue}`}>
                            <Icon className="w-4 h-4" />
                        </div>
                    );
                };

                // Flexible handling
                if (item.type === 'Flexible') {
                    return (
                        <div className="flex items-center gap-4 py-1">
                            <IconShell color="orange" icon={Calendar} />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-neutral-900 leading-tight">Flexible Schedule</span>
                                <span className="text-sm text-neutral-500">
                                    {config.days_per_week ? `${config.days_per_week} days / week` : 'Custom days'}
                                </span>
                            </div>
                        </div>
                    );
                }

                // Shift handling
                if (item.type === 'Shift') {
                    return (
                        <div className="flex items-center gap-4 py-1">
                            <IconShell color="purple" icon={Clock} />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-neutral-900 leading-tight">Shift Based</span>
                                <span className="text-sm text-neutral-500">Varies by roster</span>
                            </div>
                        </div>
                    );
                }

                // Fixed / Custom handling
                const workingDays = config.working_days || [];
                const customHours = config.custom_hours || {};

                // Detailed Mixed View Logic (reused for both simple and complex to keep style uniform)
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const activeDays = days.filter(d => workingDays.includes(d));

                // Group by time to consolidate
                const groups: Record<string, string[]> = {};
                activeDays.forEach(day => {
                    const custom = customHours[day];
                    const timeStr = custom
                        ? `${custom.start?.slice(0, 5)} - ${custom.end?.slice(0, 5)}`
                        : `${item.start_time?.slice(0, 5)} - ${item.end_time?.slice(0, 5)}`;

                    if (!groups[timeStr]) groups[timeStr] = [];
                    groups[timeStr].push(day);
                });

                return (
                    <div className="flex items-center gap-4 py-1">
                        <IconShell color="blue" icon={Clock} />
                        <div className="flex flex-col space-y-1">
                            {Object.entries(groups).map(([timeRange, grpDays]) => {
                                const isGroupMonFri = grpDays.length === 5 && grpDays[0] === 'Mon' && grpDays[4] === 'Fri';
                                const label = isGroupMonFri ? "Mon - Fri" : grpDays.join(", ");
                                return (
                                    <div key={label} className="flex items-center gap-2 text-sm">
                                        <span className="font-semibold text-neutral-900 w-20 truncate">{label}</span>
                                        <span className="text-neutral-400">•</span>
                                        <span className="text-neutral-600 font-medium tabular-nums">{timeRange}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
        },
        {
            key: "status",
            header: "Status",
            width: "100px",
            render: (item) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.status === "Active"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                    }`}>
                    {item.status}
                </span>
            )
        },
        {
            key: "actions",
            header: "",
            width: "100px",
            render: (item) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="text"
                        size="sm"
                        icon={<Pencil className="w-4 h-4 text-neutral-500" />}
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        disabled={isLocked}
                    />
                    <Button
                        variant="text"
                        size="sm"
                        className="text-red-500 hover:bg-red-50"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
                        disabled={isLocked}
                    />
                </div>
            )
        }
    ];

    const MobileCard = ({ item }: { item: WorkSchedule }) => {
        const config = item.days_config || {};

        // Detailed Mixed View Logic (reused/adapted from desktop)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const workingDays = config.working_days || [];
        const customHours = config.custom_hours || {};
        const activeDays = days.filter(d => workingDays.includes(d));

        // Group by time to consolidate
        const groups: Record<string, string[]> = {};
        activeDays.forEach(day => {
            const custom = customHours[day];
            const timeStr = custom
                ? `${custom.start?.slice(0, 5)} - ${custom.end?.slice(0, 5)}`
                : `${item.start_time?.slice(0, 5)} - ${item.end_time?.slice(0, 5)}`;

            if (!groups[timeStr]) groups[timeStr] = [];
            groups[timeStr].push(day);
        });

        const renderScheduleDetails = () => {
            if (item.type === 'Flexible') {
                return config.days_per_week ? `Flexible • ${config.days_per_week} days/week` : 'Flexible Schedule';
            }
            if (item.type === 'Shift') {
                return 'Shift Based • Varies by roster';
            }

            if (activeDays.length === 0) {
                return `${item.start_time?.slice(0, 5)} - ${item.end_time?.slice(0, 5)}`;
            }

            // Show all groups
            return (
                <div className="flex flex-col gap-0.5">
                    {Object.entries(groups).map(([timeRange, grpDays]) => {
                        const isGroupMonFri = grpDays.length === 5 && grpDays[0] === 'Mon' && grpDays[4] === 'Fri';
                        const label = isGroupMonFri ? "Mon-Fri" : grpDays.join(", ");
                        return (
                            <div key={label} className="flex flex-wrap gap-1">
                                <span className="font-medium">{label}</span>
                                <span className="text-neutral-400">•</span>
                                <span>{timeRange}</span>
                            </div>
                        );
                    })}
                </div>
            );
        };

        const getTooltipContent = () => {
            if (item.type === 'Flexible') return `Flexible Schedule: ${config.days_per_week || 0} days per week.`;
            if (item.type === 'Shift') return 'Shift Based: Schedule varies by roster.';

            return Object.entries(groups).map(([timeRange, grpDays]) => {
                const isGroupMonFri = grpDays.length === 5 && grpDays[0] === 'Mon' && grpDays[4] === 'Fri';
                const label = isGroupMonFri ? "Mon-Fri" : grpDays.join(", ");
                return `${label}: ${timeRange}`;
            }).join('\n');
        };

        return (
            <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-semibold text-neutral-900 text-sm">{item.name}</h4>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 ${item.status === "Active"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                        }`}>
                        {item.status}
                    </span>
                </div>
                <div className="flex items-end justify-between gap-4">
                    <div className="flex items-start gap-2 overflow-hidden py-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-neutral-600">
                            {renderScheduleDetails()}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="text"
                            size="sm"
                            iconOnly={<Pencil className="w-4 h-4 text-blue-600" />}
                            className="!p-1.5 h-8 w-8 hover:bg-blue-50 bg-blue-50/50 rounded-full"
                            onClick={() => handleEdit(item)}
                            disabled={isLocked}
                        />
                    </div>
                </div>
            </div>
        );
    };

    const typeOptions = [
        { label: "Fixed / Custom Days", value: "Fixed" },
        { label: "Flexible (Days/Week)", value: "Flexible" },
        { label: "Shift Based", value: "Shift" }
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-900">Work Schedule</h2>
                <Button
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 !rounded-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAdd}
                    disabled={isLocked}
                >
                    Add Schedule
                </Button>
            </div>

            <div className="hidden md:block">
                <SortableTable
                    data={schedules}
                    columns={columns}
                    isLoading={isLoading}
                />
            </div>

            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading...</div>
                ) : schedules.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No schedules found</div>
                ) : (
                    schedules.map(s => <MobileCard key={s.id} item={s} />)
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg ring-1 ring-black/5 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl shrink-0">
                            <h3 className="font-bold text-lg text-neutral-900">{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-neutral-700">Schedule Name</label>
                                        <input
                                            className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                            placeholder="e.g. Head Office"
                                            value={formData.name || ""}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-neutral-700">Schedule Type</label>
                                            <Select
                                                variant="filled"
                                                options={typeOptions}
                                                value={formData.type}
                                                onChange={(val) => setFormData({ ...formData, type: val as any })}
                                                placeholder="Select Type"
                                                accentColor="blue"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-neutral-700">Timezone</label>
                                            <input
                                                className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                                value={formData.timezone}
                                                onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Defaults / Globals */}
                                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 space-y-4">
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Default Settings</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-neutral-600">Start Time</label>
                                            <input
                                                type="time"
                                                className="w-full px-2 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                value={formData.start_time}
                                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-neutral-600">End Time</label>
                                            <input
                                                type="time"
                                                className="w-full px-2 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                value={formData.end_time}
                                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-neutral-600">Break (min)</label>
                                            <input
                                                type="number"
                                                className="w-full px-2 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                value={formData.break_duration_minutes}
                                                onChange={e => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Flexible Config */}
                                {formData.type === 'Flexible' && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-neutral-700">Days per Week</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                            value={formData.days_config?.days_per_week || 5}
                                            onChange={e => setFormData({
                                                ...formData,
                                                days_config: { ...formData.days_config, days_per_week: parseInt(e.target.value) }
                                            })}
                                            min={1} max={7}
                                        />
                                    </div>
                                )}

                                {/* Specific Days Config (Fixed/Custom) */}
                                {(formData.type === 'Fixed' || formData.type === 'Custom') && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-neutral-700 flex items-center justify-between">
                                            <span>Weekly Schedule</span>
                                            <span className="text-xs text-neutral-500 font-normal">Check days to include</span>
                                        </label>
                                        <div className="space-y-2">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                                const config = getDayConfig(day);
                                                return (
                                                    <div key={day} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${config.isActive ? 'bg-white border-blue-200 shadow-sm' : 'bg-neutral-50 border-transparent opacity-60 hover:opacity-100'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={config.isActive}
                                                            onChange={(e) => handleDayToggle(day, e.target.checked)}
                                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-neutral-300"
                                                        />
                                                        <span className="w-10 font-bold text-sm text-neutral-700">{day}</span>

                                                        <div className={`flex flex-1 items-center gap-2 transition-opacity ${config.isActive ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                                            <input
                                                                type="time"
                                                                className="flex-1 px-2 py-1.5 bg-transparent border border-neutral-200 rounded text-sm hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-transparent"
                                                                value={config.start || ""}
                                                                onChange={e => handleDayTimeChange(day, 'start', e.target.value)}
                                                                disabled={!config.isActive}
                                                            />
                                                            <span className="text-neutral-400">-</span>
                                                            <input
                                                                type="time"
                                                                className="flex-1 px-2 py-1.5 bg-transparent border border-neutral-200 rounded text-sm hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-transparent"
                                                                value={config.end || ""}
                                                                onChange={e => handleDayTimeChange(day, 'end', e.target.value)}
                                                                disabled={!config.isActive}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Status</label>
                                    <div className="flex bg-neutral-100 p-1 rounded-xl">
                                        {["Active", "Archived"].map((status) => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: status as any })}
                                                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${formData.status === status
                                                    ? "bg-white text-neutral-900 shadow-sm"
                                                    : "text-neutral-500 hover:text-neutral-700"
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white/50 backdrop-blur-sm -mx-6 -mb-6 p-6 border-t border-neutral-100">
                                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button
                                        type="submit"
                                        loading={isSaving}
                                        disabled={isSaving || isLocked}
                                        className="bg-blue-600 text-white min-w-[140px]"
                                    >
                                        {isLocked ? "Governance Locked" : editingSchedule ? "Update" : "Save"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && scheduleToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Archive Schedule?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to archive <span className="font-bold">{scheduleToDelete.name}</span>?
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmDelete}>Archive</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
